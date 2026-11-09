const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function commandTokens(commandLine) {
    // 프로세스 인수의 공백/따옴표를 구분한다. 프롬프트 문장 안의 -p는 옵션으로 보지 않는다.
    return (commandLine.match(/(?:[^\s"]|"[^"]*")+/g) || []).map(token => token.replace(/"/g, ''));
}

function agentKind(processInfo) {
    const name = String(processInfo.name || '').toLowerCase();
    if (/^(claude|codex)(\.exe)?$/.test(name)) return name.replace(/\.exe$/, '');
    if (!/^node(\.exe)?$/.test(name)) return '';
    const script = commandTokens(processInfo.commandLine || '')[1] || '';
    if (/[@\\/]anthropic-ai[\\/]claude-code[\\/].*\.(?:c?js|mjs)$/i.test(script)) return 'claude';
    if (/[@\\/]openai[\\/]codex[\\/].*\.(?:c?js|mjs)$/i.test(script)) return 'codex';
    return '';
}

function isHumanCliChain(chain) {
    if (!Array.isArray(chain)) return false;
    const ownerIndex = chain.findIndex(processInfo => agentKind(processInfo) === 'claude');
    if (ownerIndex < 0 || !chain[ownerIndex].commandLine) return false;
    const ownerArgs = commandTokens(chain[ownerIndex].commandLine).slice(1);
    if (ownerArgs.some(argument => /^(?:-p|--print|--input-format|--output-format|--bg|--background|--init-only)(?:=|$)/.test(argument))) return false;
    // 첫 Claude는 훅을 실행한 세션 자체다. 그 위에 Claude/Codex가 있으면 에이전트가 실행한 세션이다.
    return !chain.slice(ownerIndex + 1).some(processInfo => Boolean(agentKind(processInfo)));
}

function isInteractiveStartup(input, env = process.env) {
    if (env.ORCA_SKIP_CHAT_REDIRECT === '1' || input?.source !== 'startup'
        || env.CLAUDE_CODE_ENTRYPOINT !== 'cli') return false;
    // 이 워크스페이스의 Windows 실행 경로만 확인했다. 판정 불가이면 조용히 제외한다.
    if (process.platform !== 'win32') return false;
    const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
        `& { ${fs.readFileSync(path.join(__dirname, 'orca-chat-processes.ps1'), 'utf8')} } -HookProcessId ${process.pid}`], {
        encoding: 'utf8', timeout: 3000, windowsHide: true, maxBuffer: 1024 * 1024,
    });
    if (result.error || result.status !== 0) return false;
    try { return isHumanCliChain(JSON.parse(result.stdout.replace(/^\uFEFF/, ''))); }
    catch { return false; }
}

module.exports = { isInteractiveStartup, isHumanCliChain, agentKind };
