// 실제 훅 프로세스와 SQLite를 사용한다. Orca 실행과 프로세스 조회는 fixture로 대체한다.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');

const SOURCE = fs.readFileSync(path.join(__dirname, 'orca-chat-default.js'), 'utf8');
const BASE_ENV = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(ORCA_|CLAUDE_)/i.test(key)));

function fixture(context, settings = { agentDefaultSurface: 'terminal', nativeChatProviders: { claude: true } }) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orca chat hook '));
    context.after(() => {
        assert.equal(path.dirname(root), os.tmpdir());
        assert.ok(path.basename(root).startsWith('orca chat hook '));
        fs.rmSync(root, { recursive: true, force: true });
    });
    const hooks = path.join(root, '.claude/hooks');
    fs.mkdirSync(hooks, { recursive: true });
    const script = path.join(hooks, 'orca-chat-default.js');
    fs.writeFileSync(script, SOURCE);
    for (const name of ['orca-chat-session.js', 'orca-chat-processes.ps1'])
        fs.copyFileSync(path.join(__dirname, name), path.join(hooks, name));
    fs.writeFileSync(path.join(root, 'chain.json'), JSON.stringify([
        { name: 'node.exe', commandLine: 'node orca-chat-default.js' },
        { name: 'bash.exe', commandLine: 'bash -c hook' },
        { name: 'claude.exe', commandLine: 'claude.exe' },
        { name: 'Orca.exe', commandLine: 'Orca.exe' },
    ]));
    const preload = path.join(root, 'process-fixture.cjs');
    fs.writeFileSync(preload, `
        const fs = require('node:fs');
        const path = require('node:path');
        const child = require('node:child_process');
        const original = child.spawnSync;
        child.spawnSync = (command, ...args) => {
            if (command !== 'powershell.exe') return original(command, ...args);
            fs.appendFileSync(path.join(__dirname, 'process-calls'), '1');
            const mode = fs.existsSync(path.join(__dirname, 'process-mode'))
                ? fs.readFileSync(path.join(__dirname, 'process-mode'), 'utf8') : '';
            if (mode === 'failure') return { status: 1, stdout: '' };
            if (mode === 'timeout') return { status: null, error: { code: 'ETIMEDOUT' }, stdout: '' };
            return { status: 0, stdout: fs.readFileSync(path.join(__dirname, 'chain.json'), 'utf8') };
        };
    `);
    const profile = path.join(root, 'user data/profiles/local-default');
    fs.mkdirSync(profile, { recursive: true });
    const databasePath = path.join(profile, 'profile-state.db');
    const database = new DatabaseSync(databasePath);
    database.exec('CREATE TABLE profile_state_documents(domain TEXT, payload TEXT)');
    database.prepare('INSERT INTO profile_state_documents VALUES (?, ?)').run('settings', JSON.stringify(settings));
    database.close();
    fs.writeFileSync(path.join(root, 'agent'), `
        const fs = require('node:fs');
        fs.appendFileSync('calls.jsonl', JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd() }) + '\\n');
        const mode = fs.existsSync('mode') ? fs.readFileSync('mode', 'utf8') : 'success';
        if (mode === 'timeout') Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20000);
        if (mode === 'invalid') { console.log('invalid'); process.exit(0); }
        if (mode === 'failure') { console.log(JSON.stringify({ ok: false, error: { message: '시험 launch 실패' } })); process.exit(1); }
        console.log(JSON.stringify({ ok: true, result: {
            outcome: { kind: mode === 'fallback' ? 'terminal' : 'structured', handle: 'test-handle' },
            receipt: { detail: '시험 채팅 미지원' }
        } }));
    `);
    const env = { ...BASE_ENV, ORCA_USER_DATA_PATH: path.join(root, 'user data'),
        ORCA_CLI_COMMAND: process.execPath, CLAUDE_CODE_ENTRYPOINT: 'cli', NODE_OPTIONS: `--require "${preload.replace(/\\/g, '/')}"` };
    const call = (overrides = {}, input = '{"source":"startup"}') => spawnSync(process.execPath, [script], {
        env: { ...env, ...overrides }, input, encoding: 'utf8', windowsHide: true, timeout: 13000,
        // cwd가 달라도 launch는 훅이 설치된 체크아웃으로 가야 한다.
        cwd: os.tmpdir(),
    });
    const calls = () => fs.existsSync(path.join(root, 'calls.jsonl'))
        ? fs.readFileSync(path.join(root, 'calls.jsonl'), 'utf8').trim().split('\n').map(JSON.parse) : [];
    return { root, script, databasePath, env, call, calls };
}

function output(result) {
    assert.equal(result.status, 0, result.stderr);
    const value = JSON.parse(result.stdout);
    assert.equal(value.hookSpecificOutput.hookEventName, 'SessionStart');
    assert.ok(value.hookSpecificOutput.additionalContext.includes(value.systemMessage.replace('[Orca 채팅 안내] ', '')));
    assert.equal(value.continue, undefined);
    return value.systemMessage;
}

test('SessionStart 등록: 기존 훅 유지, 15초 제한', () => {
    const hooks = JSON.parse(fs.readFileSync(path.join(__dirname, '../settings.json'), 'utf8')).hooks.SessionStart.flatMap(entry => entry.hooks);
    assert.equal(hooks.filter(entry => entry.command.includes('orca-chat-default.js')).length, 1);
    assert.equal(hooks.find(entry => entry.command.includes('orca-chat-default.js')).timeout, 15);
    for (const name of ['session-agents.js', 'session-start-project-picker.js', 'env-check.js'])
        assert.ok(hooks.some(entry => entry.command.includes(name)));
});

test('최초 CLI 열기·두 번째 억제·설정 DB 불변·cwd와 인수', context => {
    const item = fixture(context);
    const before = fs.readFileSync(item.databasePath);
    assert.match(output(item.call()), /채팅 탭을 열었습니다.*Chat으로/);
    assert.match(output(item.call()), /이미 자동 열기를 시도/);
    assert.deepEqual(item.calls(), [{ args: ['launch', '--agent', 'claude', '--surface', 'chat', '--json'], cwd: item.root }]);
    assert.deepEqual(fs.readFileSync(item.databasePath), before);
});

test('채팅 신호 각각 및 Orca 밖 CLI: 출력·파일·호출 0', context => {
    const item = fixture(context);
    for (const env of [
        { ORCA_STRUCTURED_SESSION: '1' }, { ORCA_CHAT_SCRATCH_DIR: 'chat' }, { CLAUDE_CODE_ENTRYPOINT: 'sdk-ts' },
        { ORCA_USER_DATA_PATH: '', ORCA_CLI_COMMAND: '' },
    ]) {
        const result = item.call(env);
        assert.equal(result.status, 0);
        assert.equal(result.stdout, '');
        assert.equal(result.stderr, '');
        assert.equal(fs.existsSync(path.join(item.root, '.local')), false);
    }
    assert.equal(item.calls().length, 0);
});

test('이미 Chat 기본·채팅 활성: 설정 변경 안내 없음', context => {
    const item = fixture(context, { agentDefaultSurface: 'chat', nativeChatProviders: { claude: true } });
    assert.doesNotMatch(output(item.call()), /Chat으로 바꿔|읽기 실패/);
});

test('채팅 비활성·미정 설정 안내', context => {
    const disabled = fixture(context, { agentDefaultSurface: 'terminal', nativeChatProviders: { claude: false } });
    assert.match(output(disabled.call()), /채팅 지원이 꺼져/);
    const unknown = fixture(context, {});
    assert.match(output(unknown.call()), /채팅 지원 설정을 확인할 수 없습니다/);
});

test('DB 없음·잘못된 JSON·settings 행 없음이어도 launch와 세션 계속', context => {
    for (const mode of ['missing', 'invalid', 'no-row']) {
        const item = fixture(context);
        if (mode === 'missing') fs.unlinkSync(item.databasePath);
        else {
            const database = new DatabaseSync(item.databasePath);
            database.exec(mode === 'invalid' ? "UPDATE profile_state_documents SET payload='invalid'" : 'DELETE FROM profile_state_documents');
            database.close();
        }
        assert.match(output(item.call()), /채팅 탭을 열었습니다.*설정 읽기 실패/);
        assert.equal(item.calls().length, 1);
        if (mode === 'missing') assert.equal(fs.existsSync(item.databasePath), false);
    }
});

test('사용 중인 WAL DB의 최신 설정을 읽고 payload를 변경하지 않음', context => {
    const item = fixture(context);
    const database = new DatabaseSync(item.databasePath);
    try {
        database.exec('PRAGMA journal_mode=WAL');
        const payload = JSON.stringify({ agentDefaultSurface: 'chat', nativeChatProviders: { claude: true } });
        database.prepare('UPDATE profile_state_documents SET payload=?').run(payload);
        assert.doesNotMatch(output(item.call()), /Chat으로 바꿔|읽기 실패/);
        assert.equal(database.prepare('SELECT payload FROM profile_state_documents').get().payload, payload);
    } finally { database.close(); }
});

test('launch 실패·fallback·손상 응답은 성공으로 보고하지 않고 재시도 0', context => {
    for (const mode of ['failure', 'fallback', 'invalid']) {
        const item = fixture(context);
        fs.writeFileSync(path.join(item.root, 'mode'), mode);
        const first = output(item.call());
        assert.match(first, mode === 'fallback' ? /채팅 대신 터미널/ : /채팅 탭 열기 실패/);
        assert.doesNotMatch(first, /채팅 탭을 열었습니다/);
        assert.match(output(item.call()), /이미 자동 열기를 시도/);
        assert.equal(item.calls().length, 1);
    }
});

test('실행 파일 없음 및 잘못된 경로는 실패 안내, 셸 해석 없음', context => {
    const item = fixture(context);
    assert.match(output(item.call({ ORCA_CLI_COMMAND: path.join(item.root, 'missing & command.exe') })), /열기 실패/);
    assert.equal(item.calls().length, 0);
});

test('표시 저장 실패·손상된 표시: launch 0', context => {
    const item = fixture(context);
    fs.writeFileSync(path.join(item.root, '.local'), '폴더 생성 차단');
    assert.match(output(item.call()), /중복 방지 표시 저장 실패/);
    assert.equal(item.calls().length, 0);
    fs.unlinkSync(path.join(item.root, '.local'));
    output(item.call());
    const marker = path.join(item.root, '.local', fs.readdirSync(path.join(item.root, '.local'))[0]);
    fs.writeFileSync(marker, '{');
    assert.match(output(item.call()), /결과는 확인되지/);
    assert.equal(item.calls().length, 1);
});

test('동시 세션 시작도 launch 1회', async context => {
    const item = fixture(context);
    const start = () => new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [item.script], { env: item.env, windowsHide: true });
        let stdout = '', stderr = '';
        child.stdout.on('data', data => stdout += data);
        child.stderr.on('data', data => stderr += data);
        child.on('error', reject);
        child.on('exit', status => resolve({ status, stdout, stderr }));
        child.stdin.end('{"source":"startup"}');
    });
    const messages = (await Promise.all([start(), start()])).map(output);
    assert.equal(messages.filter(message => message.includes('채팅 탭을 열었습니다')).length, 1);
    assert.equal(messages.filter(message => message.includes('이미 자동 열기를 시도')).length, 1);
    assert.equal(item.calls().length, 1);
});

test('8초 launch 제한 안에서 실패 안내하고 다음 시작에서 재시도 0', context => {
    const item = fixture(context);
    fs.writeFileSync(path.join(item.root, 'mode'), 'timeout');
    const start = Date.now();
    assert.match(output(item.call()), /8초 응답 제한 초과/);
    assert.ok(Date.now() - start < 12000);
    assert.match(output(item.call()), /이미 자동 열기를 시도/);
    assert.equal(item.calls().length, 1);
});

test('중복 방지 제거 변이를 정상 검증이 검출', context => {
    const item = fixture(context);
    const mutant = SOURCE.replace("{ flag: 'wx' }", "{ flag: 'w' }");
    assert.notEqual(mutant, SOURCE);
    fs.writeFileSync(item.script, mutant);
    output(item.call());
    output(item.call());
    assert.throws(() => assert.equal(item.calls().length, 1), assert.AssertionError);
});

test('r2: source·entrypoint·명시적 skip 제외는 프로세스 조회도 0', context => {
    const item = fixture(context);
    const cases = [
        [{ ORCA_SKIP_CHAT_REDIRECT: '1' }, '{"source":"startup"}'],
        [{ CLAUDE_CODE_ENTRYPOINT: 'sdk-ts' }, '{"source":"startup"}'],
        [{ CLAUDE_CODE_ENTRYPOINT: 'sdk-cli' }, '{"source":"startup"}'],
        [{ CLAUDE_CODE_ENTRYPOINT: '' }, '{"source":"startup"}'],
        ...['resume', 'clear', 'compact', 'fork', 'unknown'].map(source => [{}, JSON.stringify({ source })]),
        [{}, '{}'], [{}, '{'],
    ];
    for (const [env, input] of cases) {
        const result = item.call(env, input);
        assert.equal(result.status, 0);
        assert.equal(result.stdout, '');
        assert.equal(result.stderr, '');
    }
    assert.equal(fs.existsSync(path.join(item.root, 'process-calls')), false);
    assert.equal(fs.existsSync(path.join(item.root, '.local')), false);
    assert.equal(item.calls().length, 0);
});

test('r2: 비대화형·에이전트 조상·프로세스 판정 불가는 조용히 종료', context => {
    const item = fixture(context);
    const owner = { name: 'claude.exe', commandLine: 'claude.exe' };
    const chains = [
        [{ ...owner, commandLine: 'claude.exe -p hi' }],
        [{ ...owner, commandLine: 'claude.exe --print=hi' }],
        [{ ...owner, commandLine: 'claude.exe --output-format stream-json' }],
        [{ ...owner, commandLine: 'claude.exe --init-only' }],
        [{ ...owner, commandLine: 'claude.exe --background' }],
        [owner, { name: 'powershell.exe' }, { name: 'codex.exe' }],
        [owner, { name: 'bash.exe' }, owner],
        [{ name: 'node.exe', commandLine: 'node "C:\\npm\\@anthropic-ai\\claude-code\\cli.js" -p hi' }],
        [owner, { name: 'node.exe', commandLine: 'node "C:\\npm\\@openai\\codex\\bin\\codex.js"' }],
        [owner, { name: 'node.exe', commandLine: 'node /npm/@anthropic-ai/claude-code/cli.js' }],
        [{ name: 'Orca.exe' }], [{ name: 'claude.exe', commandLine: null }], null,
    ];
    for (const chain of chains) {
        fs.writeFileSync(path.join(item.root, 'chain.json'), JSON.stringify(chain));
        const result = item.call();
        assert.equal(result.status, 0);
        assert.equal(result.stdout, '');
        assert.equal(item.calls().length, 0);
        assert.equal(fs.existsSync(path.join(item.root, '.local')), false);
    }
    fs.writeFileSync(path.join(item.root, 'chain.json'), 'invalid');
    assert.equal(item.call().stdout, '');
});

test('프로세스 조회 실패·시간 초과: 세션을 막지 않고 출력·표시·launch 0', context => {
    const item = fixture(context);
    for (const mode of ['failure', 'timeout']) {
        fs.writeFileSync(path.join(item.root, 'process-mode'), mode);
        const result = item.call();
        assert.equal(result.status, 0);
        assert.equal(result.stdout, '');
        assert.equal(result.stderr, '');
        assert.equal(item.calls().length, 0);
        assert.equal(fs.existsSync(path.join(item.root, '.local')), false);
    }
});

test('r2: 소유 Claude 자체를 조상으로 세지 않고 이름 속 claude와 인용된 -p 오인 방지', () => {
    const { isHumanCliChain } = require('./orca-chat-session');
    assert.equal(isHumanCliChain([
        { name: 'node.exe', commandLine: 'node C:/claude/orca-chat-default.js' },
        { name: 'claude.exe', commandLine: 'claude.exe --name "작업 -p 메모"' },
        { name: 'Orca.exe', commandLine: 'Orca.exe' },
    ]), true);
});
