// 실제 훅 프로세스에 stdin을 보내 검사한다. 임시 복제본에서만 상태를 만든다.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

test('C# 규칙 읽기 게이트와 차단 제거 변이 검증', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orca-code-gate-'));
    const hooks = path.join(root, '.claude/hooks');
    fs.mkdirSync(hooks, { recursive: true });
    fs.mkdirSync(path.join(root, 'runbook'));
    fs.writeFileSync(path.join(root, 'CODE.MD'), '코드 규칙\n');
    fs.writeFileSync(path.join(root, 'runbook/coding-principles.md'), '코딩 원칙\n');
    const script = path.join(hooks, 'code-rules-gate.js');
    const source = fs.readFileSync(path.join(__dirname, 'code-rules-gate.js'), 'utf8');
    fs.writeFileSync(script, source);
    const call = (payload, target = script) => {
        const result = spawnSync(process.execPath, [target], {
            input: JSON.stringify(payload), encoding: 'utf8', cwd: os.tmpdir(), windowsHide: true,
        });
        assert.equal(result.status, 0, result.stderr);
        return result.stdout ? JSON.parse(result.stdout) : null;
    };
    const edit = (session, file, tool = 'Edit') => ({
        session_id: session, hook_event_name: 'PreToolUse', tool_name: tool,
        tool_input: { file_path: file },
    });
    const read = (session, file, extra = {}, response = { file: { startLine: 1, numLines: 1, totalLines: 1 } }) => ({
        session_id: session, cwd: root, hook_event_name: 'PostToolUse', tool_name: 'Read',
        tool_input: { file_path: file, ...extra }, tool_response: response,
    });
    const blocked = output => assert.equal(output?.hookSpecificOutput?.permissionDecision, 'deny');
    try {
        const inside = path.join(root, 'Example.cs');
        const outside = path.join(os.tmpdir(), 'ExternalUnity', 'Example.cs');
        blocked(call(edit('first', inside)));
        blocked(call(edit('first', outside)));
        for (const tool of ['Write', 'MultiEdit']) blocked(call(edit('first', outside, tool)));
        assert.equal(call(edit('first', path.join(root, 'notes.md'))), null);
        call(read('first', 'CODE.MD'));
        blocked(call(edit('first', outside)));
        call(read('first', 'runbook/coding-principles.md'));
        for (const tool of ['Edit', 'Write', 'MultiEdit']) assert.equal(call(edit('first', outside, tool)), null);
        blocked(call(edit('second', outside)));
        blocked(call(edit('', outside)));

        // 부분 읽기·실패·동명 사본은 정본 읽기로 인정하지 않는다.
        call(read('partial', 'CODE.MD', { limit: 1 }, { file: { startLine: 1, numLines: 1, totalLines: 10 } }));
        call(read('partial', 'runbook/coding-principles.md'));
        blocked(call(edit('partial', outside)));
        call(read('failed', 'CODE.MD', {}, { is_error: true }));
        call(read('failed', 'runbook/coding-principles.md'));
        blocked(call(edit('failed', outside)));
        const copy = path.join(root, 'copy'); fs.mkdirSync(copy);
        fs.writeFileSync(path.join(copy, 'CODE.MD'), '사본');
        call(read('copy', path.join(copy, 'CODE.MD')));
        call(read('copy', 'runbook/coding-principles.md'));
        blocked(call(edit('copy', outside)));

        // 읽는 순서가 반대여도 두 문서를 읽기 전까지 차단한다.
        call(read('reverse', 'runbook/coding-principles.md'));
        blocked(call(edit('reverse', outside)));
        call(read('reverse', 'CODE.MD'));
        assert.equal(call(edit('reverse', outside)), null);

        const mutant = path.join(hooks, 'no-gate.js');
        fs.writeFileSync(mutant, source.replace('if (!editing && !reading) return;', 'return;'));
        assert.throws(() => blocked(call(edit('mutant', inside), mutant)), assert.AssertionError);
        console.log('필수 7개 시나리오 및 Write·MultiEdit·부분 읽기·실패·사본·역순 읽기 검증 통과. 차단 제거 변이는 검증 실패를 확인.');
    } finally {
        assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep));
        assert.ok(path.basename(root).startsWith('orca-code-gate-'));
        fs.rmSync(root, { recursive: true, force: true });
    }
});
