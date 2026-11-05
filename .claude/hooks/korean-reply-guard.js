// Stop 훅 — 마지막 응답이 한국어가 아니면 멈추지 못하게 막고 한국어로 다시 쓰게 한다.
// 근거: 2026-11-05. CLAUDE.md "모든 대화는 한국어로"가 있는데도 영어 응답이 나가 사용자가 여러 번 지적했다.
// 문서·메모리로는 이미 실패했으므로 승격 사다리 3단계(훅)로 올린다.
const fs = require('fs');

function readStdin() {
    try {
        return JSON.parse(fs.readFileSync(0, 'utf8'));
    } catch (error) {
        return {};
    }
}

function lastAssistantText(transcriptPath) {
    const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');
    for (let i = lines.length - 1; i >= 0; --i) {
        if (lines[i].trim() === '')
            continue;
        let entry;
        try {
            entry = JSON.parse(lines[i]);
        } catch (error) {
            continue;
        }
        if (entry.type !== 'assistant' || entry.message == null || Array.isArray(entry.message.content) === false)
            continue;
        const texts = entry.message.content.filter((block) => block.type === 'text').map((block) => block.text);
        if (texts.length > 0)
            return texts.join('\n');
    }
    return '';
}

function isMostlyEnglish(text) {
    const prose = text
        .replace(/```[\s\S]*?```/g, ' ')   // 코드 블록
        .replace(/`[^`]*`/g, ' ')          // 인라인 코드
        .replace(/https?:\/\/\S+/g, ' ')   // URL
        .replace(/[A-Za-z]:[\\/]\S*/g, ' ') // 윈도우 경로
        .replace(/\S*[\\/]\S*/g, ' ');     // 기타 경로
    const hangul = (prose.match(/[가-힣]/g) || []).length;
    const latin = (prose.match(/[A-Za-z]/g) || []).length;
    if (latin < 40)
        return false;
    return hangul / (hangul + latin) < 0.3;
}

const input = readStdin();
if (input.stop_hook_active === true)
    process.exit(0); // 이미 한 번 되돌렸으면 무한 반복 방지

// 훅 입력의 last_assistant_message를 우선 쓴다(Claude Code 2.1.318 스키마에서 확인).
// 트랜스크립트는 Stop 시점에 아직 안 쓰여 이전 응답을 읽을 수 있다 — 2026-11-05 이 때문에 한국어 답을 오탐했다
let checkedText = '';
if (typeof input.last_assistant_message === 'string')
    checkedText = input.last_assistant_message;
else if (typeof input.transcript_path === 'string' && fs.existsSync(input.transcript_path) === true)
    checkedText = lastAssistantText(input.transcript_path);
else
    process.exit(0);

if (isMostlyEnglish(checkedText) === true) {
    process.stdout.write(JSON.stringify({
        decision: 'block',
        reason: '[한국어 규칙] 방금 응답이 영어로 나갔다. 사용자는 한국어로 읽는다. 같은 내용을 한국어로 다시 써서 답하라(코드·명령·경로만 원문 유지). 근거: CLAUDE.md 커뮤니케이션, 2026-11-05 사용자 반복 지적.'
    }));
}
process.exit(0);
