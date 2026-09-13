#!/usr/bin/env node
// Unity 에디터를 켠 직후, MCP 브릿지가 **실제로 올라온 순간**을 잡아 Codex 세션에 알린다.
//
// 왜 필요한가 — MCP는 세션이 열릴 때 한 번만 연결을 시도한다. Unity가 꺼진 상태로 세션이
// 열리면 그 세션은 Play Mode 검증을 아예 못 하고, 뒤늦게 에디터를 켜도 스스로 재연결하지 않는다.
// 2026-09-11~13에 Claude 세션과 Codex 세션이 연달아 이 상태로 열려 QA가 세 번 막혔다.
// Codex 쪽은 알림을 받으면 `codex mcp list`로 확인해 재시도할 수 있다(2026-09-11 실측).
//
// 왜 두 단계인가 — Unity 로드는 수십 초 걸린다. 훅이 그걸 기다리면 타임아웃에 걸리므로,
// 훅은 감시 프로세스만 띄우고 즉시 반환한다.

const net = require('net');
const { execFileSync, spawn } = require('child_process');

const PORT = 8080;
const POLL_INTERVAL_MS = 5000;
const MAX_WAIT_MS = 240000;   // 4분. 이보다 오래 걸리면 로드 실패로 보고 포기한다.

function isBridgeAlive() {
    return new Promise((resolve) => {
        const socket = net.connect({ host: '127.0.0.1', port: PORT });
        const done = (alive) => {
            socket.destroy();
            resolve(alive);
        };
        socket.setTimeout(2000);
        socket.on('connect', () => done(true));
        socket.on('error', () => done(false));
        socket.on('timeout', () => done(false));
    });
}

function findCodexTerminal() {
    try {
        const out = execFileSync('orca', ['terminal', 'list', '--json'], {
            encoding: 'utf8',
            windowsHide: true,
        });
        const rows = (JSON.parse(out).result.terminals || [])
            .filter((t) => t.agentIdentity === 'codex' && t.writable !== false)
            .sort((left, right) => (right.lastOutputAt || 0) - (left.lastOutputAt || 0));
        return (rows.length > 0) ? rows[0].handle : null;
    } catch {
        return null;
    }
}

const MESSAGE = [
    '[자동 알림] Unity MCP 브릿지가 방금 올라왔습니다 (127.0.0.1:8080 응답 확인).',
    '',
    'MCP 도구가 아직 안 잡히면 지금이 재시도 타이밍입니다 — codex mcp list 로 unityMCP 등록을 확인하고,',
    '필요하면 세션을 새로 열어주세요. MCP 는 세션 시작 때 한 번만 연결을 시도하므로,',
    'Unity 가 꺼진 상태로 열린 세션은 스스로 재연결하지 않습니다.',
    '',
    '반환불필요 — 이 알림은 상태 통보라 회신이 필요 없습니다.',
].join('\n');

async function watch() {
    // 감시를 시작하는 시점에 이미 살아 있으면, 에디터가 원래 떠 있었다는 뜻이라 알릴 게 없다.
    if (await isBridgeAlive() === true)
        return;

    const deadline = Date.now() + MAX_WAIT_MS;
    while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

        if (await isBridgeAlive() === false)
            continue;

        const handle = findCodexTerminal();
        if (handle === null)
            return;   // 알릴 상대가 없으면 조용히 끝낸다. 브릿지는 살아났으니 목적은 이뤄졌다.

        try {
            execFileSync('orca', [
                'terminal', 'send', '--terminal', handle,
                '--enter', '--text', MESSAGE,
            ], { encoding: 'utf8', windowsHide: true });
        } catch {
            // 전송 실패는 조용히 넘긴다 — 훅이 사용자 작업을 막아서는 안 된다.
        }
        return;
    }
}

if (process.argv.includes('--watch') === true) {
    watch();
    return;
}

// ── 훅 본체: Unity 실행 명령을 감지하면 감시만 띄우고 즉시 반환한다 ──
let raw = '';
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => {
    let payload;
    try {
        payload = JSON.parse(raw);
    } catch {
        process.exit(0);
    }

    const command = (payload.tool_input && payload.tool_input.command) || '';
    if (command.includes('OpenUnityProject.ps1') === false)
        process.exit(0);

    const child = spawn(process.execPath, [__filename, '--watch'], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
    });
    child.unref();

    process.exit(0);
});
