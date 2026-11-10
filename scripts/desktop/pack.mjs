import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';

const root = path.join(import.meta.dirname, '..', '..');
const dist = path.join(root, 'dist');
const payload = path.join(dist, 'desktop-payload');
const windows = process.platform === 'win32';
const nodeName = windows ? 'node.exe' : 'node';

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { cwd: root, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${path.basename(command)} exited with ${result.status}`);
}

function buildPayload() {
  run(process.execPath, [fileURLToPath(import.meta.resolve('next/dist/bin/next')), 'build'], {
    ...process.env, TRUEDRAFT_DESKTOP_BUILD: '1', NEXT_TELEMETRY_DISABLED: '1',
    BETTER_AUTH_SECRET: randomBytes(32).toString('hex'),
  });
  fs.rmSync(payload, { recursive: true, force: true });
  fs.cpSync(path.join(root, '.next', 'standalone'), payload, { recursive: true, dereference: true });
  for (const file of fs.readdirSync(payload)) {
    if (/^\.env(?:\.|$)/.test(file)) fs.unlinkSync(path.join(payload, file));
  }
  fs.cpSync(path.join(root, '.next', 'static'), path.join(payload, '.next', 'static'), { recursive: true });
  if (fs.existsSync(path.join(root, 'public'))) fs.cpSync(path.join(root, 'public'), path.join(payload, 'public'), { recursive: true });
  fs.copyFileSync(process.execPath, path.join(payload, nodeName));
  for (const folder of [path.dirname(process.execPath), path.dirname(path.dirname(process.execPath)),
    path.join(path.dirname(path.dirname(process.execPath)), 'node_modules', `node-bin-${process.platform}-${process.arch}`)]) {
    const license = path.join(folder, 'LICENSE');
    if (fs.existsSync(license)) {
      fs.copyFileSync(license, path.join(payload, 'NODE-LICENSE.txt'));
      break;
    }
  }
  fs.copyFileSync(path.join(import.meta.dirname, 'launch.mjs'), path.join(payload, 'launch.mjs'));
  fs.cpSync(path.join(root, 'drizzle-sqlite'), path.join(payload, 'drizzle-sqlite'), { recursive: true });
  const nativeFile = `${process.platform}-${process.arch}.node`;
  const tracedModules = path.join(payload, '.next', 'node_modules');
  const aliases = fs.existsSync(tracedModules) ? fs.readdirSync(tracedModules).filter(name => name.startsWith('better-sqlite3-')) : [];
  for (const moduleDir of [path.join(payload, 'node_modules', 'better-sqlite3'), ...aliases.map(name => path.join(tracedModules, name))]) {
    const nativePath = path.join(moduleDir, 'prebuilds');
    fs.mkdirSync(nativePath, { recursive: true });
    fs.copyFileSync(path.join(root, 'node_modules', 'better-sqlite3', 'prebuilds', nativeFile), path.join(nativePath, nativeFile));
    for (const file of fs.readdirSync(nativePath)) {
      if (file !== nativeFile) fs.unlinkSync(path.join(nativePath, file));
    }
  }

  const starter = path.join(payload, 'starter.sqlite');
  const env = { ...process.env, DATABASE_PATH: starter };
  for (const script of ['migrate', 'seed', 'import-scorecard', 'import-cds']) {
    run(process.execPath, [fileURLToPath(import.meta.resolve('tsx/cli')), '--conditions=react-server', `scripts/${script}.ts`], env);
  }
  buildSync({
    absWorkingDir: root, entryPoints: ['scripts/migrate.ts', 'scripts/retention.ts'], outdir: payload,
    outExtension: { '.js': '.cjs' }, bundle: true, platform: 'node', target: 'node22',
    conditions: ['react-server'], external: ['better-sqlite3'],
  });
}

function packMac() {
  const bundle = path.join(dist, 'TrueDraft.app');
  const contents = path.join(bundle, 'Contents');
  fs.rmSync(bundle, { recursive: true, force: true });
  fs.cpSync(payload, path.join(contents, 'Resources'), { recursive: true });
  fs.mkdirSync(path.join(contents, 'MacOS'));
  fs.copyFileSync(path.join(import.meta.dirname, 'mac-launch.sh'), path.join(contents, 'MacOS', 'TrueDraft'));
  fs.chmodSync(path.join(contents, 'MacOS', 'TrueDraft'), 0o755);
  fs.copyFileSync(path.join(import.meta.dirname, 'Info.plist'), path.join(contents, 'Info.plist'));
  run('codesign', ['--force', '--deep', '--sign', '-', bundle]);
  const zip = path.join(dist, `TrueDraft-macOS-${process.arch}.zip`);
  if (fs.existsSync(zip)) fs.unlinkSync(zip);
  run('ditto', ['-c', '-k', '--keepParent', bundle, zip]);
}

buildPayload();
if (windows) run('pwsh', ['-NoProfile', '-File', path.join(import.meta.dirname, 'pack-windows.ps1')]);
else if (process.platform === 'darwin') packMac();
