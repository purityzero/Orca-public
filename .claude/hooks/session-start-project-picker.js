// SessionStart hook — 이번 세션의 대상 Unity 프로젝트를 확정한다.
//
// 우선순위
//   1) 런처(UnityLauncher.ps1)가 남긴 .claude/selected-project.json 이 신선하면 → 그 프로젝트로 확정, 묻지 않는다.
//   2) 없거나 오래됐으면 → Unity Hub 목록을 보여주고 물어보게 한다(폴백).
//
// 배경: 사용자는 런처에서 이미 프로젝트를 골랐는데 그 선택이 세션에 전달되지 않아,
//       "물어봐라"는 지시문에만 의존하다 반복해서 누락됐다. 선택을 데이터로 넘겨 질문 자체를 없앤다.

const fs = require('fs');
const path = require('path');

const WORKSPACE_ROOT = path.resolve(__dirname, '..', '..');
const CLAUDE_DIR = path.join(WORKSPACE_ROOT, '.claude');
const HUB_PROJECTS = path.join(process.env.APPDATA || '', 'UnityHub', 'projects-v1.json');
const LOCAL_PATHS = path.join(WORKSPACE_ROOT, 'LocalPaths.json');
const SELECTED_PROJECT = path.join(CLAUDE_DIR, 'selected-project.json');
const SESSION_PROJECT_DIR = path.join(CLAUDE_DIR, 'session-project');

const MAX_ROWS = 12;
const SUMMARY_CHARS = 220;
const SELECTION_FRESH_HOURS = 12;
const MARKER_KEEP_DAYS = 7;

function parseJson(text) {
    try {
        return JSON.parse(String(text).replace(/^﻿/, ''));
    } catch (error) {
        return null;
    }
}

function readJson(filePath) {
    try {
        return parseJson(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        return null;
    }
}

function formatDate(milliseconds) {
    const date = new Date(milliseconds);
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function describeElapsed(milliseconds) {
    const minutes = Math.floor(milliseconds / 60000);
    if (minutes < 1)
        return '방금';
    if (minutes < 60)
        return `${minutes}분 전`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24)
        return `${hours}시간 전`;

    return `${Math.floor(hours / 24)}일 전`;
}

// UNFINISHED.md에서 헤더(# 미완료 작업)를 건너뛰고 실제 항목의 첫 줄을 요약으로 뽑는다.
function summarizeUnfinished(projectPath) {
    const filePath = path.join(projectPath, '.claude', 'UNFINISHED.md');
    let text;
    try {
        text = fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        return 'UNFINISHED.md 없음';
    }

    const lines = text.split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && line !== '# 미완료 작업' && line !== '---');

    if (lines.length <= 0)
        return '미완료 항목 없음 (파일 비어 있음)';

    const summary = lines.slice(0, 2).join(' / ').replace(/^#+\s*/, '');
    return (summary.length > SUMMARY_CHARS) ? `${summary.slice(0, SUMMARY_CHARS)}…` : summary;
}

function sanitizeSessionId(sessionId) {
    return String(sessionId || '').replace(/[^A-Za-z0-9_-]/g, '_');
}

function markerPath(sessionId) {
    return path.join(SESSION_PROJECT_DIR, `${sessionId}.json`);
}

// 세션 마커를 남겨두면 UserPromptSubmit 가드(user-prompt-project-guard.js)가 조용해진다.
function writeSessionMarker(sessionId, selection) {
    if (sessionId.length <= 0)
        return;

    try {
        fs.mkdirSync(SESSION_PROJECT_DIR, { recursive: true });
        fs.writeFileSync(markerPath(sessionId), JSON.stringify({
            title: selection.title,
            path: selection.path,
            version: selection.version || '',
            source: 'launcher',
            confirmedAt: new Date().toISOString()
        }, null, 2), 'utf8');
    } catch (error) {
        // 마커를 못 남겨도 최악의 경우 가드 알림이 계속 뜰 뿐이라 무시한다.
    }
}

function pruneOldMarkers() {
    try {
        const limit = Date.now() - (MARKER_KEEP_DAYS * 24 * 60 * 60 * 1000);
        for (const name of fs.readdirSync(SESSION_PROJECT_DIR)) {
            const filePath = path.join(SESSION_PROJECT_DIR, name);
            if (fs.statSync(filePath).mtimeMs < limit)
                fs.unlinkSync(filePath);
        }
    } catch (error) {
        // 폴더가 없거나 지울 수 없으면 그냥 넘어간다.
    }
}

function readFreshSelection() {
    const selection = readJson(SELECTED_PROJECT);
    if (selection === null || !selection.path)
        return null;

    const selectedAt = Date.parse(selection.selectedAt || '');
    if (Number.isNaN(selectedAt) === true)
        return null;

    const elapsed = Date.now() - selectedAt;
    if (elapsed < 0 || elapsed > SELECTION_FRESH_HOURS * 60 * 60 * 1000)
        return null;

    if (fs.existsSync(selection.path) === false)
        return null;

    selection.elapsed = elapsed;
    selection.selectedAtMs = selectedAt;
    return selection;
}

function buildConfirmedContext(selection, sessionId) {
    const lines = [];
    lines.push('이번 세션의 대상 Unity 프로젝트는 런처(UnityLauncher.ps1)에서 사용자가 이미 선택했다.');
    lines.push('**어떤 프로젝트로 작업할지 다시 묻지 않는다.**');
    lines.push('');
    lines.push(`- 프로젝트: ${selection.title}`);
    lines.push(`- 경로: ${selection.path}`);
    lines.push(`- Unity: ${selection.version || '?'}`);
    lines.push(`- 선택 시각: ${formatDate(selection.selectedAtMs)} (${describeElapsed(selection.elapsed)})`);
    lines.push(`- 미완료: ${summarizeUnfinished(selection.path)}`);
    lines.push('');
    lines.push('첫 응답에서 위 프로젝트와 미완료 요약을 한 줄로 확인만 하고 바로 작업에 들어간다.');
    lines.push(`사용자가 다른 프로젝트를 지목하면 그쪽을 따르고, 그때 ${markerPath(sessionId)} 의 내용을 새 대상으로 덮어쓴다.`);
    return lines.join('\n');
}

function buildFallbackContext(sessionId) {
    const hub = readJson(HUB_PROJECTS);
    const localPaths = readJson(LOCAL_PATHS);
    const registered = (localPaths && localPaths.projects) ? localPaths.projects : {};

    const registeredByPath = new Map();
    for (const name of Object.keys(registered)) {
        registeredByPath.set(path.resolve(registered[name]).toLowerCase(), name);
    }

    const lines = [];
    lines.push('작업 디렉토리가 여러 Unity 프로젝트를 품은 워크스페이스 루트인데, 런처가 남긴 선택 정보가 없거나 오래됐다(런처를 안 거치고 Orca를 직접 켠 경우 등).');
    lines.push('**이번 세션의 첫 응답에서 아래 목록을 사용자에게 보여주고, 어떤 프로젝트를 열지 AskUserQuestion으로 먼저 물어봐야 한다.**');
    lines.push('사용자가 지정하기 전에 임의로 한 프로젝트를 골라 작업을 시작하지 않는다. 목록을 다시 조회할 필요는 없다.');
    lines.push('');
    lines.push('사용자가 프로젝트를 지정하면 아래 파일을 만들어 대상 확정을 기록한다(안 만들면 매 턴 미확정 알림이 계속 뜬다):');
    lines.push(`  ${markerPath(sessionId)}`);
    lines.push('  {"title": "<이름>", "path": "<프로젝트 절대경로>", "source": "asked", "confirmedAt": "<ISO8601>"}');
    lines.push('');

    if (hub === null || hub.data === undefined) {
        lines.push(`(Unity Hub 목록을 읽지 못했다: ${HUB_PROJECTS})`);
    } else {
        const rows = Object.values(hub.data)
            .filter((entry) => entry && entry.path)
            .sort((left, right) => (right.lastModified || 0) - (left.lastModified || 0))
            .slice(0, MAX_ROWS);

        lines.push('## Unity Hub 등록 프로젝트 (최근 수정순, ★ = LocalPaths.json 등록됨)');
        lines.push('');
        for (const row of rows) {
            const key = path.resolve(row.path).toLowerCase();
            const isRegistered = registeredByPath.has(key);
            const marker = (isRegistered === true) ? '★ ' : '  ';
            lines.push(`- ${marker}${formatDate(row.lastModified || 0)} | ${row.title} | ${row.path} | Unity ${row.version || '?'}`);
            if (isRegistered === true)
                lines.push(`    └ 미완료: ${summarizeUnfinished(row.path)}`);
        }
    }

    return lines.join('\n');
}

function readStdin() {
    return new Promise((resolve) => {
        if (process.stdin.isTTY === true) {
            resolve('');
            return;
        }

        let data = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (chunk) => { data += chunk; });
        process.stdin.on('end', () => resolve(data));
        process.stdin.on('error', () => resolve(''));
        setTimeout(() => resolve(data), 3000).unref();
    });
}

async function main() {
    const input = parseJson(await readStdin());
    const sessionId = sanitizeSessionId(input && input.session_id);

    pruneOldMarkers();

    const selection = readFreshSelection();
    let context;
    if (selection !== null) {
        writeSessionMarker(sessionId, selection);
        context = buildConfirmedContext(selection, sessionId);
    } else {
        context = buildFallbackContext(sessionId);
    }

    process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
            hookEventName: 'SessionStart',
            additionalContext: context
        }
    }));
}

main();
