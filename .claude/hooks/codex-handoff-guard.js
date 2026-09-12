#!/usr/bin/env node
// orca terminal send 로 다른 에이전트에 작업을 넘길 때, 결과를 이 터미널로 돌려달라는
// 요구가 인계문에 없으면 막는다.
//
// 왜 훅인가 — 이 규칙은 CODEX.md §5 와 AGENT.MD 에 이미 문서로 있었는데 안 지켜졌다.
// 2026-09-12 에 Codex 가 Orca Git 마무리를 끝낸 뒤 사용자에게만 답하고 직접 반환을 건너뛰었고,
// 사용자가 알려줘서 겨우 드러났다. 돌려주지 않으면 세션이 결과를 모른 채 다음 작업을 시작하고,
// 사용자가 중간에서 결과를 옮기는 구조가 된다.
// 문서에 적는 것으로는 이미 실패했으므로 강제로 올린다.
//
// 조건을 채우면 스스로 조용해진다 — 반환 요구를 적었거나 반환불필요를 명시하면 통과한다.

const RETURN_PATTERNS = [
    'accepted',          // accepted: true 확인 요구
    '이 터미널',
    '돌려주',
    '직접 반환',
    '직접 전송',
];

const EXEMPT = '반환불필요';

function deny(reason) {
    process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason: reason,
        },
    }));
    process.exit(0);
}

let raw = '';
process.stdin.on('data', chunk => { raw += chunk; });
process.stdin.on('end', () => {
    let payload;
    try {
        payload = JSON.parse(raw);
    } catch {
        process.exit(0);   // 판단할 수 없으면 통과시킨다. 훅이 작업을 막는 쪽으로 실패하지 않게.
    }

    if (payload.tool_name !== 'Bash')
        process.exit(0);

    const command = (payload.tool_input && payload.tool_input.command) || '';
    if (command.includes('orca terminal send') === false)
        process.exit(0);

    if (command.includes(EXEMPT) === true)
        process.exit(0);

    const hasReturnRequest = RETURN_PATTERNS.some(p => command.includes(p));
    if (hasReturnRequest === true)
        process.exit(0);

    deny(
        '인계문에 결과 반환 요구가 없다. `CODEX.md` §5 · `AGENT.MD`는 넘긴 작업의 결과를 ' +
        '원래 Claude Code 터미널로 직접 보내고 `accepted: true`까지 확인하도록 요구한다. ' +
        '문서에만 있으면 안 지켜져서(2026-09-12 실제 누락) 인계문에 직접 적는 것으로 바꿨다.\n\n' +
        '인계문 끝에 한 줄을 넣어라 — 예: "작업이 끝나면 이 터미널로 결과를 직접 보내주시고 ' +
        'accepted: true 까지 확인해 주세요."\n\n' +
        '반환이 필요 없는 전송(중단 통보, 단순 질문 등)이면 텍스트에 `반환불필요`를 넣어 통과시킨다.'
    );
});
