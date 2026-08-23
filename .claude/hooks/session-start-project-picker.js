// SessionStart hook — 세션이 열리면 Unity Hub에 등록된 프로젝트 목록을 주입한다.
// 첫 응답에서 이 목록을 그대로 보여주고 어떤 프로젝트를 열지 사용자에게 묻는다.
//
// 목록을 다시 조회할 필요가 없도록 여기서 전부 만들어 넘긴다.
// 실제 "물었는지" 강제는 UserPromptSubmit 가드(user-prompt-project-guard.js)가 맡는다 —
// 세션당 1회 주입은 한 번 흘려보내면 복구 지점이 없기 때문이다.

const fs = require('fs');
const path = require('path');

const WORKSPACE_ROOT = path.resolve(__dirname, '..', '..');
const HUB_PROJECTS = path.join(process.env.APPDATA || '', 'UnityHub', 'projects-v1.json');
const LOCAL_PATHS = path.join(WORKSPACE_ROOT, 'LocalPaths.json');
const SESSION_PROJECT_DIR = path.join(WORKSPACE_ROOT, '.claude', 'session-project');

const MAX_ROWS = 12;
const SUMMARY_CHARS = 220;
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

function buildContext(sessionId) {
    const hub = readJson(HUB_PROJECTS);
    const localPaths = readJson(LOCAL_PATHS);
    const registered = (localPaths && localPaths.projects) ? localPaths.projects : {};

    const registeredByPath = new Map();
    for (const name of Object.keys(registered)) {
        registeredByPath.set(path.resolve(registered[name]).toLowerCase(), name);
    }

    const markerPath = path.join(SESSION_PROJECT_DIR, `${sessionId}.json`);

    const lines = [];
    lines.push('작업 디렉토리가 여러 Unity 프로젝트를 품은 워크스페이스 루트다.');
    lines.push('**이번 세션의 첫 응답에서 아래 목록을 사용자에게 보여주고, 어떤 프로젝트를 열지 AskUserQuestion으로 먼저 물어봐야 한다.**');
    lines.push('사용자가 지정하기 전에 임의로 한 프로젝트를 골라 작업을 시작하지 않는다. 목록을 다시 조회할 필요는 없다.');
    lines.push('');
    lines.push('목록은 번호를 매겨서 보여준다 — 사용자가 번호나 프로젝트명 아무거나 쳐서 고를 수 있게.');
    lines.push('사용자가 고르면 아래 파일을 만들어 확정을 기록한다(안 만들면 매 턴 미확정 알림이 계속 뜬다):');
    lines.push(`  ${markerPath}`);
    lines.push('  {"title": "<이름>", "path": "<프로젝트 절대경로>", "source": "asked", "confirmedAt": "<ISO8601>"}');
    lines.push('');

    if (hub === null || hub.data === undefined) {
        lines.push(`(Unity Hub 목록을 읽지 못했다: ${HUB_PROJECTS})`);
        return lines.join('\n');
    }

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

    process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
            hookEventName: 'SessionStart',
            additionalContext: buildContext(sessionId)
        }
    }));
}

main();
