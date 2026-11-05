#!/usr/bin/env node
// C# 수정 전에 정본 규칙 두 파일을 Read로 읽었는지 세션별로 확인한다.
// Bash/PowerShell 등 셸 쓰기는 검사하지 않는다. 외부 Unity 경로도 검사한다.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '../..');
const REQUIRED = ['CODE.MD', 'runbook/coding-principles.md'];

function canonical(filePath) {
    const resolved = fs.realpathSync(filePath);
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function deny() {
    process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason: 'C# 수정 전 ' + path.join(ROOT, REQUIRED[0]) +
                '와 ' + path.join(ROOT, REQUIRED[1]) +
                '를 Read로 끝까지 읽고 다시 시도하세요. 두 파일 모두 이번 세션에서 읽어야 합니다.',
        },
    }));
}

function handle(payload) {
    const input = payload.tool_input || {};
    const editing = payload.hook_event_name === 'PreToolUse' &&
        /^(Edit|Write|MultiEdit)$/.test(payload.tool_name) &&
        typeof input.file_path === 'string' && /\.cs$/i.test(input.file_path);
    const reading = payload.hook_event_name === 'PostToolUse' && payload.tool_name === 'Read';
    if (!editing && !reading) return;
    if (typeof payload.session_id !== 'string' || !payload.session_id) {
        if (editing) deny();
        return;
    }

    // session_id를 경로로 직접 쓰지 않는다. 문서별 표시로 병렬 Read의 갱신 유실을 막는다.
    const sessionKey = crypto.createHash('sha256').update(payload.session_id).digest('hex');
    const stateDir = path.join(ROOT, '.claude/session-state', sessionKey);
    const marker = index => path.join(stateDir, index + '.json');
    if (editing) {
        if (!REQUIRED.every((file, index) => fs.existsSync(marker(index)))) deny();
        return;
    }

    if (typeof input.file_path !== 'string') return;
    const requested = path.resolve(payload.cwd || ROOT, input.file_path);
    const index = REQUIRED.findIndex(file => canonical(path.join(ROOT, file)) === canonical(requested));
    if (index < 0) return;
    const response = payload.tool_response;
    if (!response || response.is_error === true || response.isError === true || response.error) return;
    const file = response.file;
    if (file && Number.isInteger(file.startLine) && Number.isInteger(file.numLines) &&
        Number.isInteger(file.totalLines)) {
        if (file.startLine !== 1 || file.numLines < file.totalLines) return;
    } else if (input.offset !== undefined || input.limit !== undefined) {
        // 응답에 범위 정보가 없는 부분 읽기는 전체 읽기로 기록하지 않는다.
        return;
    }
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(marker(index), JSON.stringify({ file: REQUIRED[index], read: true }) + '\n');
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { raw += chunk; });
process.stdin.on('end', () => {
    let payload;
    try {
        payload = JSON.parse(raw);
        handle(payload);
    } catch (error) {
        if (payload && payload.hook_event_name === 'PreToolUse') deny();
        else {
            process.stderr.write('코드 규칙 읽기 상태 확인 실패: ' + error.message + '\n');
            process.exitCode = 1;
        }
    }
});
