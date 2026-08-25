// 서브에이전트 정의를 이 세션이 실제로 읽는 위치에 깔았다가, 세션이 끝나면 치운다.
//
// 왜 필요한가: Claude Code는 subagent_type을 **작업 디렉토리**의 `.claude/agents/`에서 찾는다.
// 이 워크스페이스는 세션을 루트(<ORCA>)에서 열고 그 안에서 Unity 프로젝트를 고르는 구조라,
// 프로젝트 원본(<원본:{P}>\.claude\agents\)에 8개가 멀쩡히 있어도 cwd가 거기가 아니라 안 잡힌다.
// 그래서 마스터(<ORCA>\agents\)를 세션용 임시 사본으로 <ORCA>\.claude\agents\에 깐다.
//
// 마스터는 일부러 `.claude` 밖에 둔 영구본이다 — 옮기거나 지우지 않는다
// (ParallelWorkContract.MD §11, Unity\README.md §4-1).
// 여기서 만드는 사본만 세션 종료 시 삭제한다. .gitignore로 커밋에서도 제외된다.
//
// 사용: node session-agents.js sync     (SessionStart)
//       node session-agents.js cleanup  (SessionEnd)

const fs = require('fs');
const path = require('path');

const WORKSPACE_ROOT = path.resolve(__dirname, '..', '..');
const MASTER_DIR = path.join(WORKSPACE_ROOT, 'agents');
const SESSION_DIR = path.join(WORKSPACE_ROOT, '.claude', 'agents');

function listMasterAgents() {
    try {
        return fs.readdirSync(MASTER_DIR).filter((name) => name.endsWith('.md'));
    } catch (error) {
        return [];
    }
}

function sync() {
    const names = listMasterAgents();
    if (names.length === 0)
        return `서브에이전트 마스터를 찾지 못했다(${MASTER_DIR}) — 이번 세션에선 위임 불가.`;

    fs.mkdirSync(SESSION_DIR, { recursive: true });
    for (const name of names) {
        fs.copyFileSync(path.join(MASTER_DIR, name), path.join(SESSION_DIR, name));
    }

    return `서브에이전트 ${names.length}개를 이번 세션용으로 깔았다(.claude/agents/, 종료 시 자동 삭제). `
        + `AGENT.MD 라우팅 기준대로 위임할 것 — 마스터는 agents/에 그대로 있다.`;
}

function cleanup() {
    try {
        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
    } catch (error) {
        // 세션 종료 경로라 실패해도 알릴 곳이 없다 — 다음 sync가 어차피 덮어쓴다.
    }
    return '';
}

const mode = process.argv[2];
const context = (mode === 'cleanup') ? cleanup() : sync();

if (context.length > 0) {
    process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
            hookEventName: 'SessionStart',
            additionalContext: context
        }
    }));
}
