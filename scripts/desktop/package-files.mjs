import fs from 'node:fs';
import path from 'node:path';
const blocked = new Set(['dist', 'tmp', '.dev-mailbox', '.truedraft', '.codex', 'test-results', 'playwright-report']);
export function allowedPackageFile(file, sourceRoot) {
  const rel = path.relative(sourceRoot, file);
  if (!rel) return true;
  const parts = rel.split(path.sep);
  return !blocked.has(parts[0]) && !parts.some(part => /^\.env(?:\.|$)/.test(part))
    && !(parts[0] === 'data' && ['cds', 'admission-deadlines'].includes(parts[1]) && parts[2] === 'research');
}
export function assertPackageContents(directory) {
  for (const name of blocked) if (fs.existsSync(path.join(directory, name))) throw new Error(`Unexpected development directory in desktop payload: ${name}`);
  for (const rel of fs.readdirSync(directory, { recursive: true })) {
    if (/^\.env(?:\.|$)/.test(path.basename(rel))) throw new Error('An environment file was included in the desktop payload.');
    if (/\.(sqlite3?|db)(?:-wal|-shm)?$/.test(rel) && rel !== 'starter.sqlite') throw new Error('A non-reference database was included in the desktop payload.');
  }
}
