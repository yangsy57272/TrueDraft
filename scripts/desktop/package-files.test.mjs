import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { allowedPackageFile, assertPackageContents } from './package-files.mjs';
test('excludes old bundles, research caches, development mail and environment files while keeping runtime package dist folders', () => {
  const root = path.resolve('synthetic-source');
  for (const rel of ['dist/TrueDraft/payload/server.js', 'tmp/research.pdf', '.dev-mailbox/link.json', '.env.local', 'nested/.env', '.truedraft/user.sqlite', 'data/cds/research/index.json', 'data/admission-deadlines/research/audit.json']) assert.equal(allowedPackageFile(path.join(root, rel), root), false);
  for (const rel of ['server.js', 'node_modules/example/dist/index.js', '.next/server/app/page.js', 'data/cds/2025-2026.json']) assert.equal(allowedPackageFile(path.join(root, rel), root), true);
});
test('payload verification rejects sensitive local files and permits only the starter reference database', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'td-package-check-'));
  try {
    fs.writeFileSync(path.join(root, 'starter.sqlite'), ''); assert.doesNotThrow(() => assertPackageContents(root));
    for (const name of ['.env', 'user.sqlite', 'test.db']) {
      fs.writeFileSync(path.join(root, name), ''); assert.throws(() => assertPackageContents(root)); fs.unlinkSync(path.join(root, name));
    }
    fs.mkdirSync(path.join(root, '.dev-mailbox')); assert.throws(() => assertPackageContents(root));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
