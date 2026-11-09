// Orca의 Claude CLI에서 최초 한 번 채팅 탭을 열고, 기본 surface는 UI에서 바꾸도록 안내한다.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { isInteractiveStartup } = require('./orca-chat-session');

const ROOT = path.resolve(__dirname, '../..');
const MACHINE = createHash('sha256').update(os.hostname()).digest('hex').slice(0, 16);
const MARKER = path.join(ROOT, '.local', `orca-chat-default-${MACHINE}.json`);
const LAUNCH_TIMEOUT = 8000;

function isOrcaCli(env) {
    return Boolean(env.ORCA_USER_DATA_PATH || env.ORCA_CLI_COMMAND)
        && env.ORCA_STRUCTURED_SESSION !== '1'
        && !env.ORCA_CHAT_SCRATCH_DIR
        && env.CLAUDE_CODE_ENTRYPOINT !== 'sdk-ts';
}

function settingsNotice(env) {
    let database;
    try {
        const directory = env.ORCA_USER_DATA_PATH || (env.APPDATA && path.join(env.APPDATA, 'orca'));
        if (!directory) throw new Error('Orca 사용자 데이터 경로 없음');
        const { DatabaseSync } = require('node:sqlite');
        database = new DatabaseSync(path.join(directory, 'profiles/local-default/profile-state.db'), { readOnly: true });
        database.exec('PRAGMA busy_timeout=200');
        const row = database.prepare("SELECT payload FROM profile_state_documents WHERE domain = 'settings'").get();
        if (!row) throw new Error('settings 행 없음');
        const settings = JSON.parse(row.payload);
        const notices = [];
        if (settings.agentDefaultSurface !== 'chat')
            notices.push('앞으로 채팅으로 시작하려면 Orca의 Claude Chat | CLI 선택을 Chat으로 바꿔 주세요.');
        if (settings.nativeChatProviders?.claude === false)
            notices.push('Claude 채팅 지원이 꺼져 있습니다. Orca UI에서 Claude 채팅을 켜 주세요.');
        else if (settings.nativeChatProviders?.claude !== true)
            notices.push('Claude 채팅 지원 설정을 확인할 수 없습니다. Orca UI의 Claude Chat | CLI 선택을 확인해 주세요.');
        return notices.join(' ');
    } catch (error) {
        return `Orca 설정 읽기 실패: ${error.message}. Orca UI의 Claude Chat | CLI 선택을 확인해 주세요.`;
    } finally {
        if (database) database.close();
    }
}

function launchChat(env) {
    const command = env.ORCA_CLI_COMMAND || 'orca';
    // 셸을 거치지 않아 공백이 있는 실행 경로도 단일 인자로 전달한다.
    const launch = spawnSync(command, ['agent', 'launch', '--agent', 'claude', '--surface', 'chat', '--json'], {
        cwd: ROOT, env, encoding: 'utf8', timeout: LAUNCH_TIMEOUT, windowsHide: true, maxBuffer: 1024 * 1024,
    });
    if (launch.error) {
        const reason = launch.error.code === 'ETIMEDOUT' ? '8초 응답 제한 초과 (탭 생성 여부 미확인)' : launch.error.message;
        return { status: 'failed', message: `채팅 탭 열기 실패: ${reason}.` };
    }
    let reply;
    try { reply = JSON.parse(launch.stdout); }
    catch { return { status: 'failed', message: `채팅 탭 열기 실패: Orca 응답이 JSON이 아닙니다 (종료 코드 ${launch.status}).` }; }
    const result = reply.result;
    const detail = String(result?.receipt?.detail || reply.error?.message || reply.error?.code || `종료 코드 ${launch.status}`).slice(0, 400);
    if (launch.status === 0 && reply.ok === true && result?.outcome?.kind === 'structured')
        return { status: 'opened', handle: result.outcome.handle, message: '같은 워크스페이스에 Claude 채팅 탭을 열었습니다. 그쪽으로 옮겨 주세요.' };
    if (result?.outcome?.kind === 'terminal')
        return { status: 'fallback', handle: result.outcome.handle, message: `채팅 대신 터미널이 열렸습니다: ${detail}. Orca UI에서 채팅 탭을 직접 열어 주세요.` };
    return { status: 'failed', message: `채팅 탭 열기 실패: ${detail}.` };
}

function redirectOnce(env) {
    let directoryReady = false;
    try {
        fs.mkdirSync(path.dirname(MARKER), { recursive: true });
        directoryReady = true;
        // launch 전에 선점한다. 실패·timeout·fallback도 자동 재시도하지 않아 중복/재귀 생성을 막는다.
        fs.writeFileSync(MARKER, JSON.stringify({ status: 'attempted', attemptedAt: new Date().toISOString() }), { flag: 'wx' });
    } catch (error) {
        if (!directoryReady || error.code !== 'EEXIST')
            return `중복 방지 표시 저장 실패로 자동 열기를 건너뜁니다: ${error.message}. Orca UI에서 채팅 탭을 직접 열어 주세요.`;
        let previous;
        try { previous = JSON.parse(fs.readFileSync(MARKER, 'utf8')); } catch { /* 중간 쓰기 또는 손상된 표시도 재시도하지 않는다. */ }
        const reason = previous?.status === 'opened' ? '기존 채팅 탭을 확인하고, 닫았다면 Orca UI에서 직접 열어 주세요.'
            : `${previous?.message || '이전 자동 열기 결과는 확인되지 않았습니다.'} Orca UI에서 채팅 탭을 확인해 주세요.`;
        return `이 PC의 이 체크아웃에서는 이미 자동 열기를 시도해 새 탭을 열지 않습니다. ${reason}`;
    }
    const result = launchChat(env);
    try {
        fs.writeFileSync(MARKER, JSON.stringify({ ...result, attemptedAt: new Date().toISOString() }, null, 2));
    } catch { /* 최초 선점 파일이 남으므로 결과 기록 실패에도 중복 실행하지 않는다. */ }
    return result.message;
}

function main() {
    if (!isOrcaCli(process.env)) return;
    // 훅의 stdin은 파이프이므로 isTTY로 대화형 CLI 여부를 판정할 수 없다.
    try {
        const input = JSON.parse(fs.readFileSync(0, 'utf8'));
        if (!isInteractiveStartup(input)) return;
    } catch { return; }
    let message;
    try {
        const notice = settingsNotice(process.env);
        message = [redirectOnce(process.env), notice].filter(Boolean).join(' ');
    } catch (error) {
        message = `Orca 채팅 안내 처리 실패: ${error.message}. 이 CLI 세션은 계속 사용할 수 있습니다.`;
    }
    process.stdout.write(JSON.stringify({
        systemMessage: `[Orca 채팅 안내] ${message}`,
        hookSpecificOutput: {
            hookEventName: 'SessionStart',
            additionalContext: `[Orca 채팅 안내]\n${message}\n첫 응답에서 위 실행 결과와 설정 안내를 한국어로 짧게 전달하라. 이 안내를 근거로 탭을 추가로 열거나, 터미널을 닫거나, Orca 설정 DB를 수정하지 마라. 사용자가 CLI 사용을 선택하면 이 세션에서 계속한다.`,
        },
    }));
}

if (require.main === module) main();
