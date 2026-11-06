#!/usr/bin/env node
// 셸을 실행하지 않고 리터럴 인수와 stdin 파일만 검사한다.
const fs = require('fs');
const path = require('path');

function tokenize(command, powershell) {
    const tokens = [];
    let word = '', quote = '', started = false;
    const flush = () => {
        if (started) tokens.push({ value: word, operator: false });
        word = ''; started = false;
    };
    for (let index = 0; index < command.length; index++) {
        const character = command[index];
        if ((powershell ? character === '`' : character === '\\') && quote !== "'") {
            const next = command[index + 1];
            if (next !== undefined && (powershell || /[\s"'\\$`|&;<>]/.test(next))) {
                word += next; started = true; index++; continue;
            }
        }
        if (quote) {
            if (character === quote) {
                if (powershell && command[index + 1] === quote) { word += quote; index++; }
                else quote = '';
            } else word += character;
        } else if (character === '"' || character === "'") {
            quote = character; started = true;
        } else if (character === '#' && !started) {
            while (index < command.length && command[index] !== '\n') index++;
            flush(); tokens.push({ value: ';', operator: true });
        } else if (/[|&;<>\n()]/.test(character)) {
            flush(); tokens.push({ value: character, operator: true });
        } else if (/\s/.test(character)) flush();
        else { word += character; started = true; }
    }
    flush();
    return tokens;
}

function gitFinishing(text) {
    // 읽기 전용 분석과 명시적인 금지 문장은 실행 위임으로 취급하지 않는다.
    const remaining = text.replace(/[^\n.!?。]*(?:읽기\s*전용|read[- ]only)[^\n.!?。]*/gi, '')
        .replace(/(?:git\s+)?(?:add|stage|commit|merge|push|커밋|푸시|병합)(?:은|는|을|를)?\s*(?:금지|하지\s*(?:마|말)|하지\s*않)[^\n.!?。]*/gi, '')
        .replace(/\b(?:commit|merge|push|stage)\s+(?:history|log|analysis|review)\b/gi, '')
        .replace(/(?:커밋|푸시|병합)\s*(?:이력|내역|로그|분석|리뷰)/g, '');
    return /\bgit\s+(?:add|stage|commit|merge|push)\b|\b(?:stage|commit|merge|push)\b|커밋|푸시|병합|스테이징/i.test(remaining);
}

function blocked(payload) {
    if (!['Bash', 'PowerShell'].includes(payload.tool_name)) return false;
    const command = payload.tool_input?.command;
    if (typeof command !== 'string') return false;
    const tokens = tokenize(command, payload.tool_name === 'PowerShell');
    const cwd = payload.cwd || process.cwd();
    const read = filename => {
        try { return fs.readFileSync(path.resolve(cwd, filename), 'utf8'); }
        catch { return ''; } // 파일 읽기 실패는 통과: 오탐보다 누락을 허용한다.
    };
    for (let index = 0; index < tokens.length - 1; index++) {
        const token = tokens[index];
        if (token.operator || !/(?:^|[\\/])codex(?:\.exe|\.cmd)?$/i.test(token.value)) continue;
        // echo 등의 문자열 인수는 실행 명령으로 보지 않는다.
        const previous = tokens[index - 1];
        if (previous && !previous.operator && !['command', 'env'].includes(previous.value)) continue;
        if (tokens[index + 1].value !== 'exec' || tokens[index + 1].operator) continue;
        let end = index + 2;
        while (end < tokens.length && !(tokens[end].operator && /[|&;\n)]/.test(tokens[end].value))) end++;
        const args = tokens.slice(index + 2, end);
        if (args.some(item => !item.operator && ['--help', '-h'].includes(item.value))) continue;
        let content = '';
        const valueOptions = new Set(['-m', '--model', '-c', '--config', '-C', '--cd', '-o', '--output-last-message', '--color', '--sandbox', '-s', '--profile', '-p', '--image', '-i']);
        for (let offset = 0; offset < args.length; offset++) {
            const item = args[offset];
            if (item.operator) {
                if (item.value === '<' && args[offset + 1] && !args[offset + 1].operator) content += '\n' + read(args[++offset].value);
                else if (item.value === '>') offset++;
                continue;
            }
            if (valueOptions.has(item.value)) { offset++; continue; }
            if (!item.value.startsWith('-')) content += '\n' + item.value;
        }
        // PowerShell의 Get-Content -Raw 파일 | codex exec - 형태.
        if (previous?.value === '|') {
            let start = index - 2;
            while (start >= 0 && !tokens[start].operator) start--;
            const input = tokens.slice(start + 1, index - 1).map(item => item.value);
            if (/^(?:Get-Content|gc|cat|type)$/i.test(input[0] || '')) {
                for (let offset = 1; offset < input.length; offset++) {
                    if (/^-(?:Encoding|ReadCount|TotalCount|Tail)$/i.test(input[offset])) { offset++; continue; }
                    if (!input[offset].startsWith('-')) content += '\n' + read(input[offset]);
                }
            }
        }
        if (gitFinishing(content)) return true;
    }
    return false;
}

let raw = '';
process.stdin.on('data', chunk => { raw += chunk; });
process.stdin.on('end', () => {
    let payload;
    try { payload = JSON.parse(raw); } catch { return; }
    if (!blocked(payload)) return;
    process.stdout.write(JSON.stringify({ hookSpecificOutput: {
        hookEventName: 'PreToolUse', permissionDecision: 'deny',
        permissionDecisionReason: 'Git 마무리는 Orca Codex 탭(메인 세션)으로 인계해야 한다. `orca terminal list --json`에서 codex 탭을 찾고, 없으면 `orca agent launch --agent codex --surface terminal`로 연다. 브리프 경로를 `orca terminal send`로 전달한다. 근거: runbook/codex-handoff.md 「금지」. Git 마무리를 codex exec로 대신할 수 없다.',
    } }));
});
