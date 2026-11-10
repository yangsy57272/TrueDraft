import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const dataHome = process.env.XDG_DATA_HOME && path.isAbsolute(process.env.XDG_DATA_HOME)
  ? process.env.XDG_DATA_HOME : path.join(os.homedir(), '.local', 'share');
const applications = path.join(dataHome, 'applications');
// Desktop Entry Exec has its own escaping rules and does not invoke a shell.
const quote = value => '"' + value.replace(/[%]/g, '%%').replace(/[\\"$`]/g, character => '\\' + character) + '"';
const node = path.join(import.meta.dirname, 'payload', 'node');
const script = path.join(import.meta.dirname, 'payload', 'launch.mjs');
fs.mkdirSync(applications, { recursive: true });
fs.writeFileSync(path.join(applications, 'TrueDraft.desktop'), [
  '[Desktop Entry]', 'Type=Application', 'Name=TrueDraft',
  'Comment=College applications and essay workspace',
  `Exec=${quote(node)} ${quote(script)}`, 'Terminal=false', 'Categories=Education;', '',
].join('\n'), { mode: 0o644 });
console.log('TrueDraft is now in your applications menu. Keep this extracted folder in place.');
