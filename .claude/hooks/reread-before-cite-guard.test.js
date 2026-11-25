const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

test('이번 턴의 C# 인용과 도구 읽기 흔적을 검사합니다', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orca-reread-'));
    const transcript = path.join(dir, 'transcript.jsonl');
    const user = text => ({ type: 'user', message: { content: text } });
    const assistant = (...content) => ({ type: 'assistant', message: { content } });
    const text = value => ({ type: 'text', text: value });
    const call = (name, input, id = 'tool1') => ({ type: 'tool_use', id, name, input });
    const result = (content, id = 'tool1') => ({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, content }] } });
    const run = (entries, extra = {}) => {
        fs.writeFileSync(transcript, typeof entries === 'string' ? entries : entries.map(entry => JSON.stringify(entry)).join('\n'));
        const proc = spawnSync(process.execPath, [path.join(__dirname, 'reread-before-cite-guard.js')], {
            input: JSON.stringify({ transcript_path: transcript, ...extra }), encoding: 'utf8', windowsHide: true,
        });
        assert.equal(proc.status, 0, proc.stderr);
        assert.equal(proc.stderr, '');
        return proc.stdout ? JSON.parse(proc.stdout) : null;
    };
    const answer = assistant(text('`PoolingObjectGroup.cs:18`'));
    const read = assistant(call('Read', { file_path: 'C:\\Unity\\PoolingObjectGroup.cs' }));
    const blocked = output => { assert.equal(output?.decision, 'block'); assert.match(output.reason, /PoolingObjectGroup\.cs/); };
    try {
        assert.equal(run([user('검토'), read, result('내용'), answer]), null);
        blocked(run([user('검토'), answer]));
        assert.equal(run([user('검토'), assistant(call('Bash', { command: 'grep foo PoolingObjectGroup.cs' })), answer]), null);
        blocked(run([user('이전'), read, result('내용'), user('다시 검토'), answer]));
        assert.equal(run([user('검토'), assistant(text('인용 없음'))]), null);
        assert.equal(run([user('검토'), answer], { stop_hook_active: true }), null);
        assert.equal(run('{broken'), null);
        assert.equal(run([user('검토'), assistant(text('README.md:12'))]), null);
        assert.equal(run([user('검토'), assistant(call('Grep', { path: 'src' })), result('src/PoolingObjectGroup.cs:18:match'), answer]), null);
        assert.equal(run([user('검토'), assistant(call('Agent', {})), result('C:/Unity/PoolingObjectGroup.cs'), answer]), null);
        assert.equal(run([user('검토'), assistant(call('Edit', { file_path: 'poolingobjectgroup.CS' })), answer]), null);
        blocked(run([user('검토'), assistant(call('Read', { file_path: 'C:/Other/PoolingObjectGroup.cs' })), assistant(text('C:\\Unity\\PoolingObjectGroup.cs:130'))]));
        blocked(run([user('검토'), assistant(call('Read', { file_path: 'OtherPoolingObjectGroup.cs' })), answer]));
        blocked(run([user('검토'), assistant(text('이전 응답'))], { last_assistant_message: 'PoolingObjectGroup.cs:18' }));
        blocked(run([user('검토'), read, { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'tool1', is_error: true, content: '실패' }] } }, answer]));
        blocked(run([user('검토'), assistant(call('Write', { file_path: 'PoolingObjectGroup.cs' })), answer]));
        assert.equal(run([user('검토'), assistant(call('Read', { file_path: 'A/Foo.cs' })), assistant(text('B/Foo.cs:1'))])?.decision, 'block');
        assert.equal(run([user('검토'), assistant(call('Read', { file_path: 'A/Foo.cs' })), assistant(text('C:/Project/A/Foo.cs:1'))]), null);
        assert.equal(run([user('검토'), assistant(call('Read', { file_path: 'C:/My Project/Foo.cs' })), assistant(text('`C:/My Project/Foo.cs:1`'))]), null);
        assert.equal(run([user('검토'), assistant(call('Read', { file_path: 'C:/Other Project/Foo.cs' })), assistant(text('`C:/My Project/Foo.cs:1`'))])?.decision, 'block');
        const old = Array.from({ length: 10000 }, (_, i) => assistant(text(`이전 기록 ${i}`)));
        const start = performance.now();
        blocked(run([...old, user('검토'), answer]));
        const elapsed = performance.now() - start;
        console.log(`큰 transcript 10000줄 처리 시간: ${elapsed.toFixed(2)}ms`);
        assert.ok(elapsed < 2000, `처리 시간 초과: ${elapsed}ms`);
        console.log('필수 8개 사례와 Grep 결과, Agent 결과, Edit, 절대 경로, 이름 경계 및 마지막 응답 검증 통과.');
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});
