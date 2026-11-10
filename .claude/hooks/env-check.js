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
const { readHub, hubDirectories } = require('../../tools/unity-hub.js');
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

function checkVersion(label, commandLine, installHint) {
    const result = run(commandLine);
    if (result.ok === true)
        return { label, level: 'ok', detail: result.out.split(/\r?\n/)[0] };
    return { label, level: 'missing', detail: `미설치 (${installHint})` };
}

// Windows의 python은 Microsoft Store 안내용 가짜 실행 파일(WindowsApps)일 수 있다 — "Python 3.x" 형태가 나와야 설치로 본다.
function checkPython() {
    for (const commandLine of ['py --version', 'python --version']) {
        const result = run(commandLine);
        if (result.ok === true && /^Python \d/.test(result.out) === true)
            return { label: 'Python', level: 'ok', detail: result.out.replace(/^Python /, '') };
    }
    return { label: 'Python', level: 'missing', detail: '미설치 (winget install Python.Python.3.13)' };
}

// Unity 에디터 설치 여부. Hub 기본 경로와 Hub가 기록한 보조 설치 경로의 Editor 폴더를 훑는다.
function checkUnityEditor() {
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const hubExe = path.join(programFiles, 'Unity Hub', 'Unity Hub.exe');
    const editorRoots = [path.join(programFiles, 'Unity', 'Hub', 'Editor')];
    const secondary = path.join(process.env.APPDATA || '', 'UnityHub', 'secondaryInstallPath.json');
    try {
        const extra = JSON.parse(fs.readFileSync(secondary, 'utf8').replace(/^\uFEFF/, ''));
        if (typeof extra === 'string' && extra.length > 0)
            editorRoots.push(extra);
    } catch (error) {
        // 보조 경로를 설정하지 않았으면 파일이 없다.
    }

    const versions = [];
    for (const root of editorRoots) {
        try {
            for (const name of fs.readdirSync(root)) {
                if (fs.existsSync(path.join(root, name, 'Editor', 'Unity.exe')))
                    versions.push(name);
            }
        } catch (error) {
            // 폴더가 없으면 그 경로엔 설치가 없다.
        }
    }

    // 스토어판 Hub는 WindowsApps에 설치되므로 Hub가 기록한 hubInfo.json의 실행 경로도 본다.
    const hubExes = [hubExe];
    for (const directory of hubDirectories()) {
        try {
            const info = JSON.parse(fs.readFileSync(path.join(directory, 'hubInfo.json'), 'utf8').replace(/^﻿/, ''));
            if (typeof info.executablePath === 'string' && info.executablePath.length > 0)
                hubExes.push(info.executablePath);
        } catch (error) {
            // Hub를 한 번도 실행하지 않았으면 파일이 없다.
        }
    }
    const hubNote = hubExes.some((exe) => fs.existsSync(exe)) ? 'Hub 있음' : 'Hub 없음';
    if (versions.length > 0)
        return { label: 'Unity 에디터', level: 'ok', detail: `${versions.join(', ')} (${hubNote})` };
    return { label: 'Unity 에디터', level: 'missing', detail: `미설치 (${hubNote})` };
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
    const hub = readHub();
    return { label: 'Unity Hub', level: hub.sources.length && !hub.errors.length ? 'ok' : 'warn',
        detail: hub.sources.length ? `${hub.sources.map(filename => path.basename(filename)).join(', ')} · 프로젝트 ${hub.projects.length}개${hub.errors.length ? ' (일부 읽기 실패)' : ''}` : 'JSON/SQLite 목록 못 읽음 (프로젝트 목록 비어 보일 수 있음)' };
}

// Unity MCP 브릿지가 살아 있는지. **세션이 열리는 이 순간**이 중요하다 —
// MCP는 세션 시작 때 한 번만 연결을 시도하고, 뒤늦게 브릿지가 살아나도 재연결하지 않는다.
// 그래서 Unity가 꺼진 채 세션을 열면 그 세션에서는 Play Mode 검증을 아예 못 한다.
// (2026-09-11~12에 Claude 세션과 Codex 세션이 연달아 이 상태로 열려 QA가 세 번 막혔다)
function checkUnityBridge() {
    // 포트가 열려 있는지만 본다. 실제 MCP 핸드셰이크는 클라이언트가 하고,
    // 여기서 무거운 요청을 보내면 세션 시작이 그만큼 늦어진다.
    const probe = run(`powershell -NoProfile -Command "(Test-NetConnection -ComputerName 127.0.0.1 -Port 8080 -InformationLevel Quiet)"`);
    const alive = (probe.ok === true && /true/i.test(probe.out) === true);

    if (alive === true)
        return { label: 'Unity MCP', level: 'ok', detail: '브릿지 응답 (8080)' };

    return {
        label: 'Unity MCP',
        level: 'warn',
        detail: '브릿지 없음 — 이 세션에서는 Play Mode 검증 불가',
        action: 'Unity MCP 브릿지(127.0.0.1:8080)가 응답하지 않는다. **MCP는 세션 시작 때 한 번만 붙으므로 지금 에디터를 켜도 이 세션에는 안 붙는다.** 사용자에게 이 사실을 알리고, Play Mode 검증이 필요한 작업이면 Unity를 먼저 켠 뒤 세션을 새로 열어야 한다고 알려라(Codex 세션도 같은 제약을 받는다). 검증이 필요 없는 작업이면 그대로 진행한다.'
    };
}

// Orca 저장소가 origin 대비 최신인지. 세션 시작마다 실제 fetch 한다(사용자 선택).
// 워크트리 작업 브랜치는 원격에 짝이 없는 경우가 많아, 그럴 땐 origin/main과 비교한다.
// 표기: -N = 원격보다 N커밋 뒤, +N = 로컬이 N커밋 앞.
function checkRepo() {
    const branchResult = run(`git -C "${WORKSPACE_ROOT}" rev-parse --abbrev-ref HEAD`);
    if (branchResult.ok === false)
        return { label: 'Orca 저장소', level: 'warn', detail: 'git 저장소 아님' };

    const branch = branchResult.out.trim();
    const fetchResult = run(`git -C "${WORKSPACE_ROOT}" fetch --quiet origin`);
    if (fetchResult.ok === false)
        return { label: 'Orca 저장소', level: 'warn', detail: '원격 확인 실패 (오프라인?)' };

    const hasTwin = run(`git -C "${WORKSPACE_ROOT}" rev-parse --verify --quiet origin/${branch}`).ok;
    const upstream = (hasTwin === true) ? `origin/${branch}` : 'origin/main';

    const countResult = run(`git -C "${WORKSPACE_ROOT}" rev-list --left-right --count HEAD...${upstream}`);
    if (countResult.ok === false)
        return { label: 'Orca 저장소', level: 'warn', detail: `${upstream} 비교 실패` };

    const parts = countResult.out.split(/\s+/);
    const ahead = parseInt(parts[0], 10) || 0;
    const behind = parseInt(parts[1], 10) || 0;
    const where = `${branch} → ${upstream}`;

    if (behind > 0) {
        const aheadNote = (ahead > 0) ? ` / +${ahead} (로컬 커밋 있음 — 충돌 가능)` : '';
        return {
            label: 'Orca 저장소',
            level: 'warn',
            detail: `-${behind}${aheadNote}  (${where})`,
            action: (ahead > 0)
                ? `Orca 저장소가 ${upstream}보다 ${behind}커밋 뒤이면서 로컬도 ${ahead}커밋 앞이다. 자동 pull은 위험하니, 사용자에게 상태를 보이고 어떻게 할지(rebase pull / 그냥 두기 / 직접 확인) AskUserQuestion으로 물어라.`
                : `Orca 저장소가 ${upstream}보다 ${behind}커밋 뒤이고 로컬 커밋은 없다. 사용자에게 지금 \`git -C "${WORKSPACE_ROOT}" merge --ff-only ${upstream}\`로 받을지 AskUserQuestion으로 물어라. 워킹트리에 미커밋 변경이 있으면 받기 전에 알릴 것.`
        };
    }
    if (ahead > 0)
        return { label: 'Orca 저장소', level: 'ok', detail: `최신 / +${ahead}  (${where})` };
    return { label: 'Orca 저장소', level: 'ok', detail: `최신  (${where})` };
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
        checkVersion('npm', 'npm --version', 'node.js와 함께 설치'),
        checkGit(),
        checkPython(),
        checkVersion('Claude Code', 'claude --version', 'npm install -g @anthropic-ai/claude-code'),
        checkCodex(),
        checkVersion('Orca CLI', 'orca --version', 'Orca 앱 설치'),
        checkUnityEditor(),
        checkPowerShell(),
        checkHooks(),
        checkAgents(),
        checkUnityHub(),
        checkUnityBridge(),
        checkRepo()
    ];

    const labelWidth = Math.max(...checks.map((check) => displayWidth(check.label)));
    const lines = ['[환경 체크]'];
    for (const check of checks) {
        lines.push(`  ${padLabel(check.label, labelWidth)}  ${iconFor(check.level)} ${check.detail}`);
    }

    const actions = checks.filter((check) => check.action !== undefined).map((check) => check.action);
    const output = { systemMessage: lines.join('\n') };
    const context = [];

    // Orca 채팅은 /시작 또는 /Start 명령으로 표를 요청할 때 보여준다.
    if (process.env.ORCA_CHAT_SCRATCH_DIR) {
        context.push('환경 체크 표는 사용자가 /시작 또는 /Start를 보내면 보여준다. 첫 응답에 자동으로 보여주지 않는다.');
    }

    if (actions.length > 0) {
        context.push(
            '[환경 체크 — 사용자 확인 필요]',
            '아래 항목은 첫 응답에서 사용자에게 물어 처리한다. 임의로 설치하거나 pull 하지 않는다.',
            '',
            ...actions.map((action, index) => `${index + 1}. ${action}`)
        );
    }

    if (context.length > 0) {
        output.hookSpecificOutput = {
            hookEventName: 'SessionStart',
            additionalContext: context.join('\n')
        };
    }

    process.stdout.write(JSON.stringify(output));
}

module.exports = { checkUnityHub };
if (require.main === module) main();
