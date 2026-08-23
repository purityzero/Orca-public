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
const OPEN_PROJECT_SCRIPT = path.join(WORKSPACE_ROOT, 'OpenUnityProject.ps1');

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

// Hub 목록을 최근 수정순으로 뽑고, 워크스페이스 등록 여부/미완료 요약을 붙인다.
function collectRows() {
    const hub = readJson(HUB_PROJECTS);
    if (hub === null || hub.data === undefined)
        return null;

    const localPaths = readJson(LOCAL_PATHS);
    const registered = (localPaths && localPaths.projects) ? localPaths.projects : {};

    const registeredPaths = new Set();
    for (const name of Object.keys(registered)) {
        registeredPaths.add(path.resolve(registered[name]).toLowerCase());
    }

    return Object.values(hub.data)
        .filter((entry) => entry && entry.path)
        .sort((left, right) => (right.lastModified || 0) - (left.lastModified || 0))
        .slice(0, MAX_ROWS)
        .map((entry) => ({
            title: entry.title,
            path: entry.path,
            version: entry.version || '?',
            modified: entry.lastModified || 0,
            isRegistered: registeredPaths.has(path.resolve(entry.path).toLowerCase())
        }));
}

// 세션이 열리자마자 사용자 화면에 그대로 뜨는 목록(훅 JSON의 systemMessage).
// 세션은 사용자가 말을 걸기 전엔 응답을 못 하므로, "목록 보여주기"를 이 통로가 대신한다.
function buildScreenMessage(rows) {
    if (rows === null)
        return `Unity Hub 목록을 읽지 못했습니다: ${HUB_PROJECTS}`;

    const lines = [];
    lines.push('작업할 Unity 프로젝트를 고르세요 — 번호나 이름을 입력하면 됩니다.');
    lines.push('');
    for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const marker = (row.isRegistered === true) ? '★' : ' ';
        lines.push(`${String(index + 1).padStart(2)}. ${marker} ${formatDate(row.modified)}  ${row.version.padEnd(12)}  ${row.title}`);
        if (row.isRegistered === true)
            lines.push(`         └ 미완료: ${summarizeUnfinished(row.path)}`);
    }

    return lines.join('\n');
}

function buildContext(sessionId, rows) {
    const markerPath = path.join(SESSION_PROJECT_DIR, `${sessionId}.json`);

    const lines = [];
    lines.push('작업 디렉토리가 여러 Unity 프로젝트를 품은 워크스페이스 루트다.');
    lines.push('아래 번호 매긴 목록은 세션이 열릴 때 **이미 사용자 화면에 출력됐다**. 같은 목록을 다시 나열하지 않는다.');
    lines.push('사용자가 번호나 프로젝트명을 말하면 그 프로젝트로 확정하고 바로 작업에 들어간다.');
    lines.push('사용자가 지정하기 전에 임의로 한 프로젝트를 골라 작업을 시작하지 않는다.');
    lines.push('아직 안 골랐는데 다른 얘기를 먼저 꺼내면, 그 얘기에 답하면서 어느 프로젝트인지 한 줄로 되묻는다.');
    lines.push('');
    lines.push('사용자가 고르면 즉시 두 가지를 한다:');
    lines.push(`  1) Unity 에디터 실행 — PowerShell 툴로: & "${OPEN_PROJECT_SCRIPT}" -ProjectPath "<프로젝트 절대경로>"`);
    lines.push('     (이미 그 프로젝트로 켜져 있으면 스크립트가 알아서 건너뛴다)');
    lines.push(`  2) 확정 기록 — ${markerPath}`);
    lines.push('     {"title": "<이름>", "path": "<프로젝트 절대경로>", "source": "asked", "confirmedAt": "<ISO8601>"}');
    lines.push('     (안 만들면 매 턴 미확정 알림이 계속 뜬다)');
    lines.push('');

    if (rows === null) {
        lines.push(`(Unity Hub 목록을 읽지 못했다: ${HUB_PROJECTS})`);
        return lines.join('\n');
    }

    lines.push('## 화면에 출력된 목록 (최근 수정순, ★ = LocalPaths.json 등록됨)');
    lines.push('');
    for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const marker = (row.isRegistered === true) ? '★ ' : '  ';
        lines.push(`${index + 1}. ${marker}${formatDate(row.modified)} | ${row.title} | ${row.path} | Unity ${row.version}`);
        if (row.isRegistered === true)
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

    const rows = collectRows();

    process.stdout.write(JSON.stringify({
        systemMessage: buildScreenMessage(rows),
        hookSpecificOutput: {
            hookEventName: 'SessionStart',
            additionalContext: buildContext(sessionId, rows)
        }
    }));
}

main();
