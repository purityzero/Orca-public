const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

test('실제 훅 진입점에서 Git 위임 차단과 통과 경로 검증', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orca-exec-git-'));
    const script = path.join(__dirname, 'codex-exec-git-guard.js');
    const call = (command, tool = 'Bash', target = script) => {
        const result = spawnSync(process.execPath, [target], {
            input: JSON.stringify({ tool_name: tool, cwd: root, tool_input: { command } }),
            encoding: 'utf8', windowsHide: true, cwd: os.tmpdir(),
        });
        assert.equal(result.status, 0, result.stderr);
        return result.stdout ? JSON.parse(result.stdout).hookSpecificOutput : null;
    };
    const deny = (command, tool, target) => {
        const output = call(command, tool, target);
        assert.equal(output?.permissionDecision, 'deny', command);
        assert.match(output.permissionDecisionReason, /orca terminal list --json/);
        assert.match(output.permissionDecisionReason, /orca agent launch --agent codex --surface terminal/);
        assert.match(output.permissionDecisionReason, /orca terminal send/);
        assert.match(output.permissionDecisionReason, /runbook\/codex-handoff.md/);
    };
    try {
        fs.mkdirSync(path.join(root, '.claude/briefs'), { recursive: true });
        const brief = '.claude/briefs/2026-11-06-readme-push.md';
        fs.writeFileSync(path.join(root, brief), '변경을 커밋하고 public으로 push해줘.');
        fs.writeFileSync(path.join(root, 'qa brief.md'), 'QA를 수행하고 결과를 보고해줘.');
        fs.writeFileSync(path.join(root, 'git brief.md'), 'git add 후 커밋과 푸시를 수행해줘.');
        const actual = `codex exec --approve-for-me --color never -m gpt-5.6-luna -c model_reasoning_effort=low -C "C:/AI/Orca" - < ${brief}`;
        deny(actual);
        deny('codex exec - < "git brief.md"', 'PowerShell');
        deny('Get-Content -Raw -LiteralPath "git brief.md" | codex exec -', 'PowerShell');
        deny('cat "git brief.md" | codex exec -');
        deny('& "C:\\tools\\codex.exe" exec "변경을 병합해줘"', 'PowerShell');
        for (const prompt of ['git add .', 'git stage .', 'commit changes', 'merge branch', 'push origin main', '커밋해줘', '푸시해줘', '병합해줘', '스테이징해줘']) {
            deny(`codex exec "${prompt}"`);
        }
        for (const command of [
            'codex exec "QA 수행"', 'codex exec "읽기 전용으로 커밋 이력을 분석해줘"',
            'codex exec "read-only review of git push behavior"', 'codex exec "커밋 금지. QA만 수행"',
            'codex exec "commit history review"', 'codex exec --help "push"', 'codex exec -h',
            'codex --help', 'git push origin main', 'echo codex exec push',
            'echo "codex exec push"', 'codex exec "QA"; git push origin main',
            'codex exec "QA" # push', 'codex exec - < missing.md',
            'codex exec - < "qa brief.md"', 'codex exec -C "push" -o "commit" "QA"',
        ]) assert.equal(call(command), null, command);
        assert.equal(call('Get-Content -Raw "qa brief.md" | codex exec -', 'PowerShell'), null);
        assert.equal(call(actual, 'Read'), null);
        deny('codex exec "QA"; codex exec "커밋해줘"');
        const settings = JSON.parse(fs.readFileSync(path.join(__dirname, '../settings.json'), 'utf8'));
        assert.ok(settings.hooks.PreToolUse.some(entry => entry.matcher === 'Bash|PowerShell' &&
            entry.hooks.some(hook => hook.command.includes('codex-exec-git-guard.js'))));
        const mutant = path.join(root, 'mutant.js');
        fs.writeFileSync(mutant, fs.readFileSync(script, 'utf8').replace('if (!blocked(payload)) return;', 'return;'));
        assert.throws(() => deny(actual, 'Bash', mutant), assert.AssertionError);
    } finally {
        assert.equal(path.dirname(root), os.tmpdir());
        assert.ok(path.basename(root).startsWith('orca-exec-git-'));
        fs.rmSync(root, { recursive: true, force: true });
    }
});
