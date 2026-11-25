// Stop 훅: 이번 턴에 읽은 흔적이 없는 C# 파일의 줄 번호 인용을 막는다.
// 알려진 한계: 셸 명령에 파일명이 있으면 읽기로 간주하며, 읽은 줄 범위는 검사하지 않는다.
const fs = require('fs');

function normalize(value) {
    return value.trim().replace(/^[`'"]+|[`'"]+$/g, '').replace(/\\/g, '/').toLowerCase();
}

function matches(value, citation) {
    if (typeof value !== 'string') return false;
    const target = normalize(citation);
    const text = normalize(value);
    const absolute = path => /^(?:[a-z]:\/|\/)/i.test(path);
    const candidates = [text, ...text.matchAll(/(?:[a-z]:\/|\/)?[\p{L}\p{N}_.~/-]+\.cs/giu)].map(item => normalize(typeof item === 'string' ? item : item[0]));
    return candidates.some(path => {
        if (!path.endsWith('.cs')) return false;
        if (!target.includes('/')) return path === target || path.endsWith('/' + target);
        if (absolute(target)) return path === target || (!absolute(path) && target.endsWith('/' + path));
        return path === target || path.endsWith('/' + target);
    });
}

function blocks(entry) {
    return Array.isArray(entry.message?.content) ? entry.message.content : [];
}

function currentTurn(file) {
    const fd = fs.openSync(file, 'r');
    const entries = [];
    try {
        let position = fs.fstatSync(fd).size;
        let pending = Buffer.alloc(0);
        while (position > 0) {
            const length = Math.min(position, 65536);
            position -= length;
            const chunk = Buffer.alloc(length);
            fs.readSync(fd, chunk, 0, length, position);
            const data = Buffer.concat([chunk, pending]);
            let end = data.length;
            for (let i = data.length - 1; i >= 0; --i) {
                if (data[i] !== 10) continue;
                const line = data.subarray(i + 1, end).toString('utf8').trim();
                end = i;
                if (!line) continue;
                const entry = JSON.parse(line);
                const content = entry.message?.content;
                if (entry.type === 'user' && (typeof content === 'string' ||
                    (Array.isArray(content) && content.some(block => block.type !== 'tool_result')))) return entries.reverse();
                entries.push(entry);
            }
            pending = data.subarray(0, end);
        }
        if (pending.toString('utf8').trim()) entries.push(JSON.parse(pending.toString('utf8')));
        return entries.reverse();
    } finally {
        fs.closeSync(fd);
    }
}

function handle(input) {
    if (input.stop_hook_active === true) return;
    const turn = currentTurn(input.transcript_path);
    let text = typeof input.last_assistant_message === 'string' ? input.last_assistant_message : '';
    if (typeof input.last_assistant_message !== 'string') {
        for (let i = turn.length - 1; i >= 0; --i) {
            if (turn[i].type !== 'assistant') continue;
            const parts = blocks(turn[i]).filter(block => block.type === 'text' && typeof block.text === 'string');
            if (parts.length) { text = parts.map(block => block.text).join('\n'); break; }
        }
    }
    const citations = [...text.matchAll(/`([^`\r\n]+\.cs:\d+)`|((?:[a-zA-Z]:[\\/]|\/)?[\p{L}\p{N}_.~\\/-]+\.cs:\d+)/giu)]
        .map(match => (match[1] || match[2]).replace(/:\d+$/, ''));
    const calls = [];
    const results = new Map();
    const failed = new Set();
    for (const entry of turn) {
        for (const block of blocks(entry)) {
            if (entry.type === 'assistant' && block.type === 'tool_use') calls.push(block);
            if (entry.type === 'user' && block.type === 'tool_result') {
                if (entry.is_error === true || block.is_error === true || block.content?.is_error === true ||
                    (Array.isArray(block.content) && block.content.some(item => item.type === 'error' || item.is_error === true))) failed.add(block.tool_use_id);
                else results.set(block.tool_use_id, JSON.stringify(block.content));
            }
        }
    }
    const missing = [...new Set(citations.filter(citation => !calls.some(call => {
        const args = call.input || {};
        if (failed.has(call.id)) return false;
        if (/^(Read|Edit|MultiEdit)$/i.test(call.name)) return matches(args.file_path, citation);
        if (/^Grep$/i.test(call.name)) return matches(args.path, citation) || matches(results.get(call.id), citation);
        if (/^(Bash|PowerShell)$/i.test(call.name)) return matches(args.command, citation);
        if (/^(Agent|Task)$/i.test(call.name)) return matches(results.get(call.id), citation);
        return false;
    })))];
    if (missing.length) process.stdout.write(JSON.stringify({
        decision: 'block',
        reason: `이번 턴에 다시 읽지 않은 파일의 줄 번호를 인용했습니다: ${missing.join(', ')}. 파일을 다시 읽고 답을 고쳐 주세요.`,
    }));
}

try {
    handle(JSON.parse(fs.readFileSync(0, 'utf8')));
} catch (_) {
    // transcript와 훅 입력 오류는 대화를 막지 않는다.
}
