// Unity Hub의 JSON/SQLite 목록을 모든 진입점에서 같은 규칙으로 읽는다.
const fs = require('node:fs');
const path = require('node:path');

function readJson(filename) {
    return JSON.parse(fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/, ''));
}
function hubDirectories(env = process.env) {
    const directories = [];
    if (env.LOCALAPPDATA) {
        const packages = path.join(env.LOCALAPPDATA, 'Packages');
        try {
            for (const name of fs.readdirSync(packages).sort()) {
                if (name.startsWith('UnityTechnologies.UnityHub_'))
                    directories.push(path.join(packages, name, 'LocalCache', 'Roaming', 'UnityHub'));
            }
        } catch { /* 스토어판이 없는 PC */ }
    }
    if (env.APPDATA) directories.push(path.join(env.APPDATA, 'UnityHub'));
    return [...new Set(directories)];
}
function validVersion(value) {
    return typeof value === 'string' && /^\d{4}\.\d+\.\d+[abfp]\d+(?:[\w.-]*)$/.test(value) ? value : '';
}
function projectVersion(projectPath) {
    try {
        const text = fs.readFileSync(path.join(projectPath, 'ProjectSettings', 'ProjectVersion.txt'), 'utf8').replace(/^\uFEFF/, '');
        return validVersion(text.match(/^m_EditorVersion:\s*(\S+)/m)?.[1]);
    } catch { return ''; }
}
function normalize(entry, fallbackPath, updated = 0) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) entry = {};
    const projectPath = typeof fallbackPath === 'string' && fallbackPath ? fallbackPath : entry.path;
    if (typeof projectPath !== 'string' || !path.isAbsolute(projectPath)) return null;
    return {
        path: projectPath,
        title: typeof entry.title === 'string' && entry.title ? entry.title : path.basename(projectPath),
        projectName: typeof entry.projectName === 'string' ? entry.projectName : '',
        version: validVersion(entry.version),
        lastModified: Number.isFinite(Number(entry.lastModified)) ? Number(entry.lastModified) : Number(updated) || 0,
    };
}
function readHub(env = process.env) {
    const directories = hubDirectories(env), sources = [], errors = [], projects = new Map();
    const editorRoots = [path.join(env.ProgramFiles || env.PROGRAMFILES || 'C:\\Program Files', 'Unity', 'Hub', 'Editor')];
    for (const directory of directories) {
        try {
            const secondary = readJson(path.join(directory, 'secondaryInstallPath.json'));
            if (typeof secondary === 'string' && path.isAbsolute(secondary)) editorRoots.push(secondary);
        } catch { /* 보조 경로 미설정은 정상 */ }
        let entries;
        const database = path.join(directory, 'hub.db');
        if (fs.existsSync(database)) {
            let db;
            try {
                const { DatabaseSync } = require('node:sqlite');
                db = new DatabaseSync(database, { readOnly: true });
                db.exec('PRAGMA busy_timeout=200');
                entries = db.prepare('SELECT path, data, updated_at FROM projects').all().map(row => {
                    let data;
                    try { data = JSON.parse(row.data); } catch { data = {}; }
                    return normalize(data, row.path, row.updated_at);
                });
                sources.push(database);
            } catch (error) { errors.push(`${database}: ${error.message}`); }
            finally { if (db) db.close(); }
        }
        // 정상 DB는 0행도 그대로 채택해 오래된 JSON의 삭제 항목을 되살리지 않는다.
        if (entries === undefined) {
            const filename = path.join(directory, 'projects-v1.json');
            if (fs.existsSync(filename)) {
                try {
                    const raw = readJson(filename), data = raw?.data ?? raw;
                    if (!data || typeof data !== 'object') throw new Error('프로젝트 목록 형식이 올바르지 않음');
                    entries = Object.entries(data).map(([key, value]) => normalize(value, value?.path || key));
                    sources.push(filename);
                } catch (error) { errors.push(`${filename}: ${error.message}`); }
            }
        }
        for (const entry of entries || []) {
            if (!entry) continue;
            const key = path.resolve(entry.path).toLowerCase();
            if (!projects.has(key)) projects.set(key, entry);
        }
    }
    return { projects: [...projects.values()].sort((a, b) => b.lastModified - a.lastModified),
        sources, errors, directories, editorRoots: [...new Set(editorRoots)] };
}
function resolveProject(projectPath, hub = readHub()) {
    const resolved = path.resolve(projectPath);
    const entry = hub.projects.find(item => path.resolve(item.path).toLowerCase() === resolved.toLowerCase());
    const hubVersion = entry?.version || '';
    const version = hubVersion || projectVersion(resolved);
    const editorCandidates = version ? hub.editorRoots.map(root => path.join(root, version, 'Editor', 'Unity.exe')) : [];
    return { path: resolved, version, versionSource: hubVersion ? 'Unity Hub' : version ? 'ProjectVersion.txt' : '',
        editorPath: editorCandidates.find(filename => fs.existsSync(filename)) || '', editorCandidates };
}
module.exports = { readHub, resolveProject, projectVersion, hubDirectories };
if (require.main === module) {
    const hub = readHub();
    process.stdout.write(JSON.stringify(process.argv[2] === '--resolve' && process.argv[3] ? resolveProject(process.argv[3], hub) : hub));
}
