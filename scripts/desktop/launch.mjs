import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const dataDir = path.resolve(process.env.TRUEDRAFT_DESKTOP_DATA_DIR || (
  process.platform === 'win32' ? path.join(process.env.LOCALAPPDATA, 'TrueDraft')
    : process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support', 'TrueDraft')
      : path.join(process.env.XDG_DATA_HOME && path.isAbsolute(process.env.XDG_DATA_HOME) ? process.env.XDG_DATA_HOME : path.join(os.homedir(), '.local', 'share'), 'TrueDraft')
));
const settingsFile = path.join(dataDir, 'settings.json');
const instanceId = createHash('sha256').update(dataDir).digest('hex').slice(0, 24);
const controlAddress = process.platform === 'win32' ? `\\\\.\\pipe\\TrueDraft-${instanceId}`
  : path.join(os.tmpdir(), `td-${instanceId}.sock`);
const verify = process.argv.includes('--verify');
const stop = process.argv.includes('--stop');
const localHost = '127.0.0.1';

function listen(server, ...address) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(...address, () => {
      server.removeListener('error', reject);
      resolve();
    });
  });
}

function askInstance() {
  return new Promise((resolve, reject) => {
    const client = net.createConnection(controlAddress);
    client.setTimeout(30000, () => client.destroy(new Error('The running app did not respond.')));
    let result = '';
    client.setEncoding('utf8');
    client.on('error', reject);
    client.on('data', chunk => { result += chunk; });
    client.on('end', () => resolve(result));
    client.on('connect', () => {
      try {
        const { authSecret } = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
        client.write(`${stop ? 'stop' : 'open'} ${authSecret}\n`);
      } catch (error) {
        client.destroy(error);
      }
    });
  });
}

function readSettings() {
  if (!fs.existsSync(settingsFile)) {
    const staging = `${settingsFile}.new`;
    fs.writeFileSync(staging, JSON.stringify({
      authSecret: randomBytes(32).toString('hex'),
      encryptionKeys: `local:${randomBytes(32).toString('base64')}`,
      email: 'local@truedraft.invalid',
    }, null, 2) + '\n', { mode: 0o600 });
    fs.renameSync(staging, settingsFile);
  }
  const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
  if (typeof settings.authSecret !== 'string' || settings.authSecret.length < 32 || !settings.encryptionKeys
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email)) {
    throw new Error('The local settings file is invalid.');
  }
  return settings;
}

async function startWebApp(settings) {
  const portProbe = net.createServer();
  await listen(portProbe, 0, localHost);
  const port = portProbe.address().port;
  await new Promise(resolve => portProbe.close(resolve));
  const origin = `http://${localHost}:${port}`;
  const database = path.join(dataDir, 'truedraft.sqlite');
  const mailbox = path.join(dataDir, 'mailbox');
  fs.mkdirSync(mailbox, { recursive: true, mode: 0o700 });
  if (!fs.existsSync(database)) {
    const staging = `${database}.new`;
    fs.copyFileSync(path.join(import.meta.dirname, 'starter.sqlite'), staging);
    fs.renameSync(staging, database);
  }
  // Optional local AI configuration is kept separate from generated credentials.
  const environment = path.join(dataDir, '.env');
  if (fs.existsSync(environment)) process.loadEnvFile(environment);
  Object.assign(process.env, {
    PORT: String(port), HOSTNAME: localHost, APP_URL: origin, BETTER_AUTH_URL: origin,
    DATABASE_PATH: database, BETTER_AUTH_SECRET: settings.authSecret, ENCRYPTION_KEYS: settings.encryptionKeys,
    TRUEDRAFT_AI_SETTINGS_PATH: path.join(dataDir, 'ai-connection.enc'), TRUEDRAFT_DESKTOP_EMAIL: settings.email,
    TRUEDRAFT_DESKTOP: '1', TRUEDRAFT_DESKTOP_TOKEN: randomBytes(32).toString('hex'), TRUEDRAFT_MAILBOX_DIR: mailbox,
    EMAIL_TRANSPORT: 'file', AUTH_RATE_LIMIT: 'on', TRUEDRAFT_DEMO_MODE: '', NEXT_TELEMETRY_DISABLED: '1',
  });
  const migration = spawnSync(process.execPath, [path.join(import.meta.dirname, 'migrate.cjs')], { cwd: import.meta.dirname, windowsHide: true });
  if (migration.status !== 0) throw new Error('Could not update the SQLite database.');
  function runRetention() {
    const job = spawn(process.execPath, [path.join(import.meta.dirname, 'retention.cjs')], { cwd: import.meta.dirname, windowsHide: true, stdio: 'ignore' });
    job.on('error', () => console.error('Unable to start the retention job.'));
  }
  runRetention();
  setInterval(runRetention, 86_400_000).unref();
  await import('./server.js');
  for (let attempt = 0; attempt < 150; attempt++) {
    try {
      const response = await fetch(`${origin}/sign-in`, { signal: AbortSignal.timeout(1000) });
      if (response.ok && (await response.text()).includes('TrueDraft')) return { origin, mailbox };
    } catch { /* The server is still starting. */ }
    await delay(200);
  }
  throw new Error('The local web app did not start.');
}

async function signInLink({ origin, mailbox }, email) {
  const response = await fetch(`${origin}/api/auth/sign-in/magic-link`, {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json', 'x-truedraft-desktop-token': process.env.TRUEDRAFT_DESKTOP_TOKEN },
    body: JSON.stringify({ email, callbackURL: '/journey', errorCallbackURL: '/sign-in?error=link' }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`Local sign-in failed (${response.status}).`);
  const name = email.toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
  const messageFile = path.join(mailbox, `${name}.json`);
  const { url } = JSON.parse(fs.readFileSync(messageFile, 'utf8'));
  fs.unlinkSync(messageFile);
  const link = new URL(url);
  if (link.origin !== origin || link.pathname !== '/api/auth/magic-link/verify') throw new Error('Unexpected local sign-in URL.');
  return link.href;
}

function openBrowser(url) {
  const command = process.platform === 'win32' ? 'rundll32.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['url.dll,FileProtocolHandler', url] : [url];
  const child = spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: true });
  child.on('error', () => console.error('Unable to open the default browser.'));
  child.unref();
}

async function verifyApp(app, url) {
  const { origin } = app;
  const blocked = await fetch(`${origin}/api/auth/sign-in/magic-link`, {
    method: 'POST', headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'unauthorised@truedraft.invalid' }),
  });
  assert.equal(blocked.status, 403);
  const login = await fetch(url, { redirect: 'manual' });
  const cookie = login.headers.getSetCookie().map(value => value.split(';', 1)[0]).join('; ');
  assert.match(cookie, /td\.session_token=/);
  const journey = await fetch(`${origin}/journey`, { headers: { cookie }, redirect: 'manual' });
  assert.equal(journey.status, 200);
  // Exercise the actual settings API against a loopback-only synthetic provider.
  // No essays/profile are sent; the saved encrypted connection must survive a restart.
  const settingsPage = await fetch(`${origin}/settings`, { headers: { cookie } });
  assert.match(await settingsPage.text(), /AI connection settings/);
  const savedBefore = await (await fetch(`${origin}/api/settings/ai`, { headers: { cookie } })).json();
  if (process.argv.includes('--expect-existing')) {
    assert.equal(savedBefore.connection.model, 'desktop-smoke-model');
    assert.equal(savedBefore.connection.hasKey, true);
  }
  const syntheticKey = 'desktop-smoke-secret';
  const synthetic = http.createServer((request, response) => {
    if (request.headers.authorization !== `Bearer ${syntheticKey}`) { response.writeHead(401).end(); return; }
    if (request.url === '/v1/models') {
      response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ data: [{ id: 'desktop-smoke-model' }] }));
    } else if (request.url === '/v1/chat/completions') {
      response.writeHead(200, { 'content-type': 'text/event-stream' });
      response.end(`data: ${JSON.stringify({ model: 'desktop-smoke-model', choices: [{ delta: { content: '{"ok":true}' }, finish_reason: 'stop' }] })}\n\n`);
    } else response.writeHead(404).end();
  });
  await listen(synthetic, 0, localHost);
  try {
    const connection = { provider: 'openai-compatible', baseUrl: `http://${localHost}:${synthetic.address().port}`, apiKey: syntheticKey, model: 'desktop-smoke-model', noKey: false };
    const send = async (path, method, body) => {
      const response = await fetch(`${origin}${path}`, { method, headers: { cookie, origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
      assert.equal(response.status, 200);
      const text = await response.text();
      assert.ok(!text.includes(syntheticKey));
      return JSON.parse(text);
    };
    const models = await send('/api/settings/ai/test', 'POST', { ...connection, action: 'models' });
    assert.deepEqual(models.models, ['desktop-smoke-model']);
    assert.equal((await send('/api/settings/ai/test', 'POST', { ...connection, action: 'test' })).connected, true);
    await send('/api/settings/ai', 'PUT', connection);
    assert.ok(!fs.readFileSync(path.join(dataDir, 'ai-connection.enc'), 'utf8').includes(syntheticKey));
  } finally {
    synthetic.closeAllConnections();
    await new Promise(resolve => synthetic.close(resolve));
  }
  const schools = await fetch(`${origin}/schools?q=Harvard`);
  assert.match(await schools.text(), /Harvard University/);
  const recommendations = await fetch(`${origin}/schools/recommended?field=11`, { headers: { cookie } });
  assert.equal(recommendations.status, 200);
  const expandedCds = await fetch(`${origin}/schools/bowdoin-college`);
  assert.match(await expandedCds.text(), /bowdoin-cds_2025-2026\.pdf/);
  const guide = await fetch(`${origin}/guides/personal-statement`);
  assert.equal(guide.status, 200);
  const stAndrews = await fetch(`${origin}/schools/university-of-st-andrews`);
  assert.match(await stAndrews.text(), /course|subjects/);
  const supplements = await fetch(`${origin}/schools/university-of-california-berkeley`);
  assert.match(await supplements.text(), /350 words/);
  const essays = async () => {
    const response = await fetch(`${origin}/api/essays`, { headers: { cookie } });
    assert.equal(response.status, 200);
    return (await response.json()).essays;
  };
  const listResponse = await fetch(`${origin}/api/list`, { headers: { cookie } });
  const entries = (await listResponse.json()).entries;
  const scheduleSchool = 'Fictional schedule school';
  if (!entries.some(e => e.schoolName === scheduleSchool)) {
    assert.equal(process.argv.includes('--expect-existing'), false);
    const added = await fetch(`${origin}/api/list`, { method: 'POST', headers: { cookie, origin, 'content-type': 'application/json' }, body: JSON.stringify({ customSchoolName: scheduleSchool }) });
    assert.equal(added.status, 201);
  }
  const planPage = await fetch(`${origin}/my-list/plan`, { headers: { cookie } });
  assert.match(await planPage.text(), /My application plan/);
  const planResponse = await fetch(`${origin}/api/schedule`, { headers: { cookie } });
  assert.equal(planResponse.status, 200);
  const plan = await planResponse.json();
  assert.ok(plan.plan.tasks.some(t => t.school === scheduleSchool));
  if (process.argv.includes('--expect-existing')) assert.equal(plan.state.preferences.weeklyHours, 4);
  const savedPlan = await fetch(`${origin}/api/schedule`, { method: 'PUT', headers: { cookie, origin, 'content-type': 'application/json' }, body: JSON.stringify({ ...plan.state.preferences, weeklyHours: 4, timeZone: 'UTC' }) });
  assert.equal(savedPlan.status, 200);
  const calendar = await fetch(`${origin}/api/schedule/calendar`, { headers: { cookie } });
  assert.equal(calendar.status, 200);
  assert.match(await calendar.text(), /BEGIN:VCALENDAR/);
  const title = 'Desktop packaging smoke test';
  if (!process.argv.includes('--expect-existing')) {
    const response = await fetch(`${origin}/api/essays`, {
      method: 'POST', headers: { cookie, origin, 'content-type': 'application/json' },
      body: JSON.stringify({ title, applicationType: 'personal_statement', promptText: 'What changed your mind?', draft: 'A fictional draft.', feedbackLanguage: 'en' }),
    });
    assert.equal(response.status, 201);
  }
  const essay = (await essays()).find(essay => essay.title === title);
  assert.ok(essay);
  const detail = await fetch(`${origin}/api/essays/${essay.id}`, { headers: { cookie } });
  assert.equal(detail.status, 200);
  assert.equal((await detail.json()).essay.draft, 'A fictional draft.');
  console.log('Desktop smoke passed: local sign-in, seeded schools, SQLite draft.');
}

async function main() {
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  let settings;
  let app;
  let queue = Promise.resolve();
  const control = net.createServer(socket => {
    socket.setTimeout(30000, () => socket.destroy());
    socket.setEncoding('utf8');
    socket.on('error', () => socket.destroy());
    let request = '';
    socket.on('data', chunk => {
      request += chunk;
      if (request.length > 256) return socket.destroy();
      if (!request.endsWith('\n')) return;
      const [action, token] = request.trim().split(' ');
      if (!settings || token !== settings.authSecret) return socket.end('denied');
      if (action === 'stop') return socket.end('ok', () => process.exit(0));
      if (action !== 'open') return socket.end('denied');
      queue = queue.then(async () => {
        const url = await signInLink(await app, settings.email);
        openBrowser(url);
        socket.end('ok');
      }).catch(() => socket.end('failed'));
    });
  });
  try {
    await listen(control, controlAddress);
  } catch (error) {
    if (error.code !== 'EADDRINUSE' || verify) throw error;
    try {
      if (await askInstance() !== 'ok') throw new Error('The running app could not complete the request.');
      return;
    } catch (connectError) {
      if (process.platform === 'win32' || connectError.code !== 'ECONNREFUSED') throw connectError;
      fs.unlinkSync(controlAddress);
      await listen(control, controlAddress);
    }
  }
  if (stop) return control.close();
  settings = readSettings();
  app = startWebApp(settings);
  queue = app.then(async ready => {
    const link = await signInLink(ready, settings.email);
    if (verify) await verifyApp(ready, link);
    else openBrowser(link);
  });
  await queue;
  if (verify) control.close(() => process.exit(0));
}

main().catch(error => {
  const message = `TrueDraft could not start: ${error.message}`;
  console.error(message);
  if (process.platform === 'win32') {
    try { fs.appendFileSync(path.join(dataDir, 'desktop.log'), `${message}\n`, { mode: 0o600 }); } catch { /* Directory is unavailable. */ }
  }
  process.exit(1);
});
