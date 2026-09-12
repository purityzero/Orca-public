// SessionStart hook — 이 세션이 제대로 굴러갈 환경이 갖춰졌는지 확인한다.
//
// 왜 필요한가: 훅·서브에이전트·codex·Unity 실행 스크립트는 전부 "설치돼 있다"를 전제로 배선돼 있다.
// 하나라도 빠지면 조용히 안 돌고(예: node 부재 시 훅 전체가 실패), 한참 뒤에야 발견된다.
// 그래서 세션이 열릴 때마다 한 번 훑어서, 정상이면 "node ... OK" 식 요약을 화면에 찍고,
// 빠진 게 있으면 additionalContext로 "첫 응답에서 사용자에게 설치/pull 여부를 물어라"라고 지시한다.
// (훅은 직접 프롬프트를 못 띄우므로, 물어보는 건 세션 쪽 몫이다.)

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const WORKSPACE_ROOT = path.resolve(__dirname, '..', '..');
const SETTINGS_PATH = path.join(WORKSPACE_ROOT, '.claude', 'settings.json');
const AGENTS_MASTER = path.join(WORKSPACE_ROOT, 'agents');
const OPEN_PROJECT_SCRIPT = path.join(WORKSPACE_ROOT, 'OpenUnityProject.ps1');
const HUB_PROJECTS = path.join(process.env.APPDATA || '', 'UnityHub', 'projects-v1.json');
const REQUIRED_HOOKS = ['session-agents.js', 'session-start-project-picker.js', 'user-prompt-project-guard.js'];

const CODEX_INSTALL_HINT = 'npm install -g @openai/codex';

function run(commandLine) {
    try {
        const result = spawnSync(commandLine, { encoding: 'utf8', shell: true, timeout: 8000 });
        if (result.status === 0)
            return { ok: true, out: String(result.stdout || '').trim() };
        return { ok: false, out: String(result.stderr || result.stdout || '').trim() };
    } catch (error) {
        return { ok: false, out: String(error && error.message || error) };
    }
}

// 한글은 length 1이지만 터미널에서 2칸을 먹는다 — 표 열을 맞추려면 표시 폭으로 계산한다.
function displayWidth(text) {
    let width = 0;
    for (const char of text) {
        width += (char.codePointAt(0) > 0x2E7F) ? 2 : 1;
    }
    return width;
}

function padLabel(text, targetWidth) {
    return text + ' '.repeat(Math.max(0, targetWidth - displayWidth(text)));
}

function checkNode() {
    // 이 훅이 실행됐다는 것 자체가 node가 있다는 증거다. 버전만 보고한다.
    return { label: 'node', level: 'ok', detail: process.version };
}

function checkGit() {
    const result = run('git --version');
    if (result.ok === true)
        return { label: 'git', level: 'ok', detail: result.out.replace(/^git version /, '') };
    return { label: 'git', level: 'missing', detail: '미설치' };
}

function checkCodex() {
    const result = run('codex --version');
    if (result.ok === true)
        return { label: 'codex CLI', level: 'ok', detail: result.out.split(/\r?\n/)[0] };
    return {
        label: 'codex CLI',
        level: 'missing',
        detail: '미설치',
        action: `codex CLI가 없다. CODEX.md·AGENT.MD가 Git 마무리와 읽기전용 교차검증을 codex에 맡기도록 배선돼 있어, 없으면 그 흐름이 전부 막힌다. 사용자에게 지금 설치할지 AskUserQuestion으로 물어라 — 설치 명령: \`${CODEX_INSTALL_HINT}\`. "나중에"를 고르면 이번 세션은 codex 없이 진행하고, Git 마무리가 필요한 시점에 다시 알린다.`
    };
}

function checkPowerShell() {
    const hasScript = fs.existsSync(OPEN_PROJECT_SCRIPT);
    const hasShell = run('powershell.exe -NoProfile -Command "exit 0"').ok;
    if (hasScript === true && hasShell === true)
        return { label: 'PowerShell', level: 'ok', detail: 'OpenUnityProject.ps1' };
    if (hasShell === false)
        return { label: 'PowerShell', level: 'missing', detail: 'powershell.exe 없음' };
    return { label: 'PowerShell', level: 'warn', detail: 'OpenUnityProject.ps1 없음' };
}

function checkHooks() {
    const missing = REQUIRED_HOOKS.filter((name) => fs.existsSync(path.join(__dirname, name)) === false);
    let settingsText = '';
    try {
        settingsText = fs.readFileSync(SETTINGS_PATH, 'utf8');
    } catch (error) {
        return { label: '훅', level: 'warn', detail: 'settings.json 못 읽음' };
    }

    const unregistered = REQUIRED_HOOKS.filter((name) => settingsText.includes(name) === false);
    if (missing.length > 0)
        return { label: '훅', level: 'missing', detail: `파일 없음: ${missing.join(', ')}` };
    if (unregistered.length > 0)
        return { label: '훅', level: 'warn', detail: `settings.json 미등록: ${unregistered.join(', ')}` };
    return { label: '훅', level: 'ok', detail: `${REQUIRED_HOOKS.length}종` };
}

function checkAgents() {
    let count = 0;
    try {
        count = fs.readdirSync(AGENTS_MASTER).filter((name) => name.endsWith('.md')).length;
    } catch (error) {
        return { label: '서브에이전트', level: 'missing', detail: `마스터 폴더 없음 (${AGENTS_MASTER})` };
    }
    if (count <= 0)
        return { label: '서브에이전트', level: 'missing', detail: '마스터 .md 0개' };
    return { label: '서브에이전트', level: 'ok', detail: `${count}개` };
}

function checkUnityHub() {
    try {
        JSON.parse(fs.readFileSync(HUB_PROJECTS, 'utf8').replace(/^﻿/, ''));
        return { label: 'Unity Hub', level: 'ok', detail: 'projects-v1.json' };
    } catch (error) {
        return { label: 'Unity Hub', level: 'warn', detail: 'projects-v1.json 못 읽음 (프로젝트 목록 비어 보일 수 있음)' };
    }
}

// Orca 저장소가 origin 대비 최신인지. 세션 시작마다 실제 fetch 한다(사용자 선택).
function checkRepo() {
    const branchResult = run(`git -C "${WORKSPACE_ROOT}" rev-parse --abbrev-ref HEAD`);
    if (branchResult.ok === false)
        return { label: 'Orca 저장소', level: 'warn', detail: 'git 저장소 아님' };

    const branch = branchResult.out.trim();
    const fetchResult = run(`git -C "${WORKSPACE_ROOT}" fetch --quiet origin ${branch}`);
    if (fetchResult.ok === false)
        return { label: 'Orca 저장소', level: 'warn', detail: '원격 확인 실패 (오프라인?)' };

    const countResult = run(`git -C "${WORKSPACE_ROOT}" rev-list --left-right --count HEAD...origin/${branch}`);
    if (countResult.ok === false)
        return { label: 'Orca 저장소', level: 'warn', detail: `origin/${branch} 비교 실패` };

    const parts = countResult.out.split(/\s+/);
    const ahead = parseInt(parts[0], 10) || 0;
    const behind = parseInt(parts[1], 10) || 0;

    if (behind > 0) {
        const aheadNote = (ahead > 0) ? ` (로컬도 ${ahead}커밋 앞 — 충돌 가능, pull 전 확인)` : '';
        return {
            label: 'Orca 저장소',
            level: 'warn',
            detail: `origin/${branch}보다 ${behind}커밋 뒤${aheadNote}`,
            action: (ahead > 0)
                ? `Orca 저장소가 origin/${branch}보다 ${behind}커밋 뒤이면서 로컬도 ${ahead}커밋 앞이다. 자동 pull은 위험하니, 사용자에게 상태를 보이고 어떻게 할지(rebase pull / 그냥 두기 / 직접 확인) AskUserQuestion으로 물어라.`
                : `Orca 저장소가 origin/${branch}보다 ${behind}커밋 뒤이고 로컬 변경은 없다. 사용자에게 지금 \`git -C "${WORKSPACE_ROOT}" pull --ff-only\`로 받을지 AskUserQuestion으로 물어라. 워킹트리에 미커밋 변경이 있으면 pull 전에 알릴 것.`
        };
    }
    if (ahead > 0)
        return { label: 'Orca 저장소', level: 'ok', detail: `최신 (로컬이 ${ahead}커밋 앞)` };
    return { label: 'Orca 저장소', level: 'ok', detail: '최신' };
}

function iconFor(level) {
    if (level === 'ok')
        return 'OK ';
    if (level === 'warn')
        return '⚠  ';
    return '✗  ';
}

function main() {
    const checks = [
        checkNode(),
        checkGit(),
        checkCodex(),
        checkPowerShell(),
        checkHooks(),
        checkAgents(),
        checkUnityHub(),
        checkRepo()
    ];

    const labelWidth = Math.max(...checks.map((check) => displayWidth(check.label)));
    const lines = ['[환경 체크]'];
    for (const check of checks) {
        lines.push(`  ${padLabel(check.label, labelWidth)}  ${iconFor(check.level)} ${check.detail}`);
    }

    const actions = checks.filter((check) => check.action !== undefined).map((check) => check.action);
    const output = { systemMessage: lines.join('\n') };

    if (actions.length > 0) {
        output.hookSpecificOutput = {
            hookEventName: 'SessionStart',
            additionalContext: [
                '[환경 체크 — 사용자 확인 필요]',
                '아래 항목은 첫 응답에서 사용자에게 물어 처리한다. 임의로 설치하거나 pull 하지 않는다.',
                '',
                ...actions.map((action, index) => `${index + 1}. ${action}`)
            ].join('\n')
        };
    }

    process.stdout.write(JSON.stringify(output));
}

main();
