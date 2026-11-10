// Used only by desktop CI to simulate upgrading a profile with no bundled prompt data.
import Database from 'better-sqlite3';
import path from 'node:path';
import assert from 'node:assert/strict';
assert.ok(process.env.TRUEDRAFT_DESKTOP_DATA_DIR, 'Use an isolated test profile');
const db = new Database(path.join(process.env.TRUEDRAFT_DESKTOP_DATA_DIR, 'truedraft.sqlite'));
db.prepare('DELETE FROM school_supplements').run();
db.close();
