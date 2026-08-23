// UserPromptSubmit hook — 대상 프로젝트가 아직 확정되지 않았으면 매 프롬프트마다 알린다.
//
// SessionStart 주입은 세션당 1회뿐이라 한 번 흘려보내면 그대로 잘못된 프로젝트로 작업이 시작된다.
// 이 가드는 확정 마커(.claude/session-project/{sessionId}.json)가 생길 때까지 매 턴 다시 알려서,
// 한 번 놓쳐도 다음 턴에 반드시 걸리게 한다. 마커가 생기면 스스로 조용해진다.

const fs = require('fs');
const path = require('path');

const WORKSPACE_ROOT = path.resolve(__dirname, '..', '..');
const SESSION_PROJECT_DIR = path.join(WORKSPACE_ROOT, '.claude', 'session-project');

function parseJson(text) {
    try {
        return JSON.parse(String(text).replace(/^﻿/, ''));
    } catch (error) {
        return null;
    }
}

function sanitizeSessionId(sessionId) {
    return String(sessionId || '').replace(/[^A-Za-z0-9_-]/g, '_');
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
    if (input === null)
        return;

    // 프로젝트 폴더 안에서 직접 띄운 세션은 cwd가 곧 대상이라 가드가 필요 없다.
    const cwd = path.resolve(String(input.cwd || '')).toLowerCase();
    if (cwd !== WORKSPACE_ROOT.toLowerCase())
        return;

    const sessionId = sanitizeSessionId(input.session_id);
    const markerPath = path.join(SESSION_PROJECT_DIR, `${sessionId}.json`);
    if (fs.existsSync(markerPath) === true)
        return;

    const lines = [];
    lines.push('[대상 프로젝트 미확정] 이번 세션에서 어떤 Unity 프로젝트로 작업할지 아직 사용자에게 확인받지 않았다.');
    lines.push('코드/프리팹/테이블을 건드리기 전에 AskUserQuestion으로 먼저 묻는다(SessionStart에 주입된 Hub 목록 사용).');
    lines.push('사용자가 이미 지정했다면 아래 파일을 만들어 이 알림을 끈다:');
    lines.push(`  ${markerPath}`);
    lines.push('  {"title": "<이름>", "path": "<프로젝트 절대경로>", "source": "asked", "confirmedAt": "<ISO8601>"}');

    process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
            hookEventName: 'UserPromptSubmit',
            additionalContext: lines.join('\n')
        }
    }));
}

main();
