const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');
const { readHub, resolveProject } = require('./unity-hub');

test('JSON·SQLite·WAL 목록과 실제 picker·환경 행·PowerShell 버전 조회', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orca-hub-'));
    const workspace = path.join(root, 'workspace');
    const env = { ...process.env, APPDATA: path.join(root, 'roaming'), LOCALAPPDATA: path.join(root, 'local'), ProgramFiles: path.join(root, 'programs') };
    for (const key of Object.keys(env)) if (key.toLowerCase() === 'programfiles') env[key] = path.join(root, 'programs');
    const jsonDirectory = path.join(env.APPDATA, 'UnityHub');
    const dbDirectory = path.join(env.LOCALAPPDATA, 'Packages', 'UnityTechnologies.UnityHub_fixture', 'LocalCache', 'Roaming', 'UnityHub');
    const project = path.join(root, '한글 프로젝트');
    const fallbackProject = path.join(root, 'Fallback');
    const version = '6000.3.7f1';
    let db;
    const write = (filename, text) => { fs.mkdirSync(path.dirname(filename), { recursive: true }); fs.writeFileSync(filename, text); };
    const execute = (executable, args, input = '') => spawnSync(executable, args, { env, input, encoding: 'utf8', windowsHide: true, timeout: 20000 });
    const picker = () => {
        const result = execute(process.execPath, [path.join(workspace, '.claude/hooks/session-start-project-picker.js')], '{"session_id":"fixture"}');
        assert.equal(result.status, 0, result.stderr);
        return JSON.parse(result.stdout);
    };
    const hubRow = () => {
        const filename = path.join(workspace, '.claude/hooks/env-check.js');
        const result = execute(process.execPath, ['-e', `process.stdout.write(JSON.stringify(require(${JSON.stringify(filename)}).checkUnityHub()))`]);
        assert.equal(result.status, 0, result.stderr);
        return JSON.parse(result.stdout);
    };
    const psQuote = text => "'" + text.replace(/'/g, "''") + "'";
    const runScript = (name, input = '') => {
        const code = `[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false); & ${psQuote(path.join(workspace, name))}`;
        return execute('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', Buffer.from(code, 'utf16le').toString('base64')], input);
    };
    const open = target => {
        const code = `[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false); & ${psQuote(path.join(workspace, 'OpenUnityProject.ps1'))} -ProjectPath ${psQuote(target)}`;
        return execute('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', Buffer.from(code, 'utf16le').toString('base64')]);
    };
    try {
        for (const file of ['tools/unity-hub.js', 'tools/UnityHub.ps1', '.claude/hooks/session-start-project-picker.js', '.claude/hooks/env-check.js', 'OpenUnityProject.ps1', 'UnityLauncher.ps1', 'SetupLocalPaths.ps1']) {
            write(path.join(workspace, file), fs.readFileSync(path.join(__dirname, '..', file)));
        }
        write(path.join(project, 'Assets', '.keep'), '');
        write(path.join(fallbackProject, 'ProjectSettings/ProjectVersion.txt'), `m_EditorVersion: ${version}\nm_EditorVersionWithRevision: ${version} (abc)\n`);
        write(path.join(workspace, 'LocalPaths.json'), JSON.stringify({ projects: { absent: null } }));
        const jsonFile = path.join(jsonDirectory, 'projects-v1.json');
        write(jsonFile, '\ufeff' + JSON.stringify({ data: { [project]: { path: project, title: '한글 게임', version, lastModified: 1234 } } }));
        assert.equal(readHub(env).projects[0].title, '한글 게임');
        assert.match(picker().systemMessage, /한글 게임/);
        assert.match(hubRow().detail, /projects-v1.json.*1개/);
        let result = open(project);
        assert.equal(result.status, 1, result.stderr);
        assert.match(result.stdout, /버전 찾음: 6000.3.7f1 \(Unity Hub\)/);
        assert.match(result.stdout, /에디터가 설치돼 있지 않습니다/);
        // 래퍼 없는 구형 JSON도 지원한다.
        write(jsonFile, JSON.stringify({ [project]: { path: project, version } }));
        assert.equal(readHub(env).projects[0].version, version);
        fs.mkdirSync(dbDirectory, { recursive: true });
        const dbFile = path.join(dbDirectory, 'hub.db');
        db = new DatabaseSync(dbFile);
        db.exec('PRAGMA journal_mode=WAL; CREATE TABLE projects(path TEXT PRIMARY KEY, data TEXT, updated_at INTEGER)');
        const insert = db.prepare('INSERT INTO projects VALUES (?, ?, ?)');
        insert.run(project, JSON.stringify({ title: 'DB 게임', version, lastModified: 5000 }), 5000);
        insert.run(fallbackProject, '{손상된 JSON', 2000);
        const secondary = path.join(root, '보조 에디터');
        write(path.join(dbDirectory, 'secondaryInstallPath.json'), JSON.stringify(secondary));
        const before = fs.readFileSync(dbFile);
        const walBefore = fs.readFileSync(dbFile + '-wal');
        const hub = readHub(env);
        assert.equal(hub.projects.length, 2);
        assert.equal(hub.projects[0].title, 'DB 게임');
        assert.equal(hub.projects[1].path, fallbackProject);
        assert.equal(hub.projects[1].version, '');
        assert.match(picker().systemMessage, /DB 게임/);
        assert.match(hubRow().detail, /hub.db.*2개/);
        result = open(project);
        assert.equal(result.status, 1, result.stderr);
        assert.match(result.stdout, /버전 찾음: 6000.3.7f1 \(Unity Hub\)/);
        result = open(fallbackProject);
        assert.equal(result.status, 1, result.stderr);
        assert.match(result.stdout, /버전 찾음: 6000.3.7f1 \(ProjectVersion.txt\)/);
        assert.ok(result.stdout.includes(secondary));
        // PowerShell 5.1 Out-File -Encoding utf8와 같은 BOM·CRLF를 포함해 검증한다.
        for (const bom of ['', '\ufeff']) {
            for (const newline of ['\n', '\r\n']) {
                write(path.join(fallbackProject, 'ProjectSettings/ProjectVersion.txt'),
                    `${bom}m_EditorVersion: ${version}${newline}m_EditorVersionWithRevision: ${version} (abc)${newline}`);
                result = open(fallbackProject);
                assert.equal(result.status, 1, result.stderr);
                assert.match(result.stdout, /버전 찾음: 6000.3.7f1 \(ProjectVersion.txt\)/);
                assert.match(result.stdout, /에디터가 설치돼 있지 않습니다/);
            }
        }
        // 대체 조회를 제거한 변이는 실제 PowerShell 출력 검증에서 실패해야 한다.
        const readerPath = path.join(workspace, 'tools/unity-hub.js');
        const original = fs.readFileSync(readerPath, 'utf8');
        fs.writeFileSync(readerPath, original.replace('hubVersion || projectVersion(resolved)', 'hubVersion'));
        const mutant = open(fallbackProject);
        assert.throws(() => assert.match(mutant.stdout, /버전 찾음: 6000.3.7f1 \(ProjectVersion.txt\)/), assert.AssertionError);
        fs.writeFileSync(readerPath, original);
        assert.deepEqual(fs.readFileSync(dbFile), before);
        assert.deepEqual(fs.readFileSync(dbFile + '-wal'), walBefore);
        result = runScript('UnityLauncher.ps1', '\n');
        assert.equal(result.status, 0, result.stderr);
        assert.match(result.stdout, /DB 게임/);
        assert.match(result.stdout, /취소했습니다/);
        fs.mkdirSync(path.join(workspace, 'Unity/DB 게임'), { recursive: true });
        result = runScript('SetupLocalPaths.ps1', '1\n\n');
        assert.equal(result.status, 0, result.stderr);
        assert.equal(JSON.parse(fs.readFileSync(path.join(workspace, 'LocalPaths.json'), 'utf8')).projects['DB 게임'], project);
        const fakeEditor = path.join(secondary, version, 'Editor/Unity.exe');
        write(fakeEditor, '실행 금지 fixture');
        assert.equal(resolveProject(fallbackProject, readHub(env)).editorPath, fakeEditor);
        fs.unlinkSync(fakeEditor); // OpenUnityProject가 fixture 파일을 실행할 수 없게 제거한다.
        // 프로젝트 경로로 탈출하는 버전 문자열은 사용하지 않는다.
        db.prepare('UPDATE projects SET data=? WHERE path=?').run(JSON.stringify({ version: '../../escape' }), project);
        assert.equal(resolveProject(project, readHub(env)).version, '');
        db.exec('DELETE FROM projects');
        // 같은 데이터 폴더의 JSON이 남아 있어도 정상인 빈 DB가 우선이다.
        write(path.join(dbDirectory, 'projects-v1.json'), fs.readFileSync(jsonFile));
        fs.unlinkSync(jsonFile);
        assert.equal(readHub(env).projects.length, 0);
        assert.equal(picker().systemMessage, '프로젝트가 없습니다.');
        assert.match(hubRow().detail, /hub.db.*0개/);
        result = open(fallbackProject);
        assert.equal(result.status, 1, result.stderr);
        assert.match(result.stdout, /ProjectVersion.txt/);
        // SQLite 읽기 실패 시 같은 위치의 JSON으로 대체한다.
        db.close(); db = undefined;
        fs.renameSync(dbFile, dbFile + '.saved');
        fs.writeFileSync(dbFile, '손상된 DB');
        assert.equal(readHub(env).projects.length, 1);
        assert.equal(hubRow().level, 'warn');
    } finally {
        if (db) db.close();
        assert.equal(path.dirname(root), os.tmpdir());
        assert.ok(path.basename(root).startsWith('orca-hub-'));
        fs.rmSync(root, { recursive: true, force: true });
    }
});
