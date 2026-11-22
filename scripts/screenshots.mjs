// Screenshots für die Doku (docs/screenshots/) über das Chrome DevTools Protocol, ohne Playwright.
// Braucht einen laufenden Dev-Server und Chrome oder Edge.
//   npm run screenshots [-- --url http://localhost:3000] [--out docs/screenshots] [name ...]
// Gezeigt werden das neueste Outfit und das neueste aktive Teil, das in einem Outfit vorkommt (eigene Daten).
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readItems, readOutfits } from './lib/data.mjs';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i < 0 ? fallback : args.splice(i, 2)[1];
};
const base = opt('--url', 'http://localhost:3000').replace(/\/$/, '');
const outDir = opt('--out', 'docs/screenshots');
const only = args;

const CHROMES = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const chromePath = CHROMES.find((p) => existsSync(p));
if (!chromePath) throw new Error('Kein Chrome gefunden, Pfad per CHROME=… angeben');

const byNewest = (a, b) => b.id.localeCompare(a.id);
const outfits = (await readOutfits()).sort(byNewest);
const outfit = outfits[0];
const inOutfit = new Set(outfits.flatMap((o) => o.data.items ?? []));
const items = (await readItems()).filter((i) => i.data.status === 'aktiv' && i.data.photos?.length).sort(byNewest);
const item = items.find((i) => inOutfit.has(i.id)) ?? items[0];

const DESK = { width: 1280, height: 900, mobile: false };
const PHONE = { width: 390, height: 844, mobile: true };
const OPEN_FILTER = "[...document.querySelectorAll('label,button')].find((e) => e.textContent.trim().startsWith('Filter'))?.click()";
const SCROLL_TO_GAPS =
  "(() => { const h = [...document.querySelectorAll('h2,h3,p,div')].find((e) => e.childElementCount === 0 && e.textContent.trim().startsWith('Welche Farbe fehlt')); if (h) scrollTo(0, h.getBoundingClientRect().top + scrollY - 90); })()";

const shots = [
  { name: 'schrank', url: '/', vp: DESK, js: OPEN_FILTER },
  { name: 'teil', url: `/items/${item?.id}`, vp: DESK },
  { name: 'neues-teil', url: '/items/new', vp: DESK, js: "document.querySelector('input[name=name]').focus()", type: 'Dunkelgrünes Leinenhemd kurzarm Relaxed Fit', after: 'scrollTo(0, 330)' },
  { name: 'outfits', url: '/outfits', vp: DESK },
  { name: 'builder', url: `/outfits/builder?outfit=${outfit?.id}`, vp: { ...DESK, height: 1000 } },
  { name: 'wunschliste', url: '/wishlist', vp: DESK },
  { name: 'empfehlungen', url: '/empfehlungen', vp: DESK, js: SCROLL_TO_GAPS },
  { name: 'statistik', url: '/stats', vp: { ...DESK, height: 1000 } },
  // nur „Typ & Farben“, ohne Körpermaße
  { name: 'profil', url: '/profile', vp: { ...DESK, height: 630 } },
  { name: 'handy-schrank', url: '/', vp: PHONE },
  { name: 'handy-builder', url: `/outfits/builder?outfit=${outfit?.id}`, vp: PHONE },
  { name: 'swipen', url: '/outfits/swipen', vp: PHONE },
];

const PORT = 9333;
const chrome = spawn(chromePath, [
  '--headless=new', `--remote-debugging-port=${PORT}`, '--hide-scrollbars', '--no-first-run',
  `--user-data-dir=${join(tmpdir(), 'fashion-tracker-screenshots')}`, 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let version;
for (let i = 0; i < 50 && !version; i++) {
  try {
    version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
  } catch {
    await sleep(200);
  }
}
const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let nextId = 0;
const pending = new Map();
const listeners = new Set();
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  const p = m.id && pending.get(m.id);
  if (p) {
    pending.delete(m.id);
    m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
  } else for (const l of listeners) l(m);
});
const send = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
const evaluate = (expression, sessionId) => send('Runtime.evaluate', { expression, awaitPromise: true }, sessionId);

// sichtbare Bilder abwarten (höchstens 8 s), Next.js-Dev-Symbol ausblenden
const SETTLE = `Promise.race([new Promise((r) => setTimeout(r, 8000)), Promise.all([...document.images]
  .filter((i) => i.getBoundingClientRect().top < innerHeight)
  .map((i) => i.complete || new Promise((r) => { i.onload = i.onerror = r; })))])
  .then(() => { const s = document.createElement('style'); s.textContent = 'nextjs-portal{display:none!important}'; document.head.append(s); })`;

mkdirSync(outDir, { recursive: true });
try {
  for (const s of shots) {
    if (only.length && !only.includes(s.name)) continue;
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    await send('Page.enable', {}, sessionId);
    await send('Emulation.setDeviceMetricsOverride', { width: s.vp.width, height: s.vp.height, deviceScaleFactor: 1, mobile: s.vp.mobile }, sessionId);
    if (s.vp.mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, sessionId);
    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-color-scheme', value: 'dark' }, { name: 'prefers-reduced-motion', value: 'reduce' }],
    }, sessionId);
    let onLoad;
    const loaded = new Promise((r) => {
      onLoad = (m) => m.sessionId === sessionId && m.method === 'Page.loadEventFired' && r();
      listeners.add(onLoad);
    });
    await send('Page.navigate', { url: base + s.url }, sessionId);
    await Promise.race([loaded, sleep(60000)]);
    listeners.delete(onLoad);
    await evaluate(SETTLE, sessionId);
    if (s.js) await evaluate(s.js, sessionId);
    if (s.type) {
      await send('Input.insertText', { text: s.type }, sessionId);
      await sleep(1000);
      await evaluate('document.activeElement.blur()', sessionId);
    }
    if (s.after) await evaluate(s.after, sessionId);
    await sleep(1500);
    const { data } = await send('Page.captureScreenshot', { format: 'webp', quality: 80 }, sessionId);
    writeFileSync(join(outDir, `${s.name}.webp`), Buffer.from(data, 'base64'));
    console.log(`${s.name}.webp`);
    await send('Target.closeTarget', { targetId });
  }
} finally {
  ws.close();
  chrome.kill();
}
