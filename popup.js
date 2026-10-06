const $ = (id) => document.getElementById(id);
const FACE_ORDER = ['U', 'L', 'F', 'R', 'B', 'D'];
const POLL_MS = 1500;

let tab = null;
let host = '';
let site = { enabled: false, selector: '' };
let pollTimer = null;
let manualEdit = false;
let lastScramble = null;

async function getSites() {
  const { sites } = await chrome.storage.local.get('sites');
  return sites || {};
}

async function saveSite(patch) {
  const sites = await getSites();
  site = { ...site, ...(sites[host] || {}), ...patch };
  sites[host] = site;
  await chrome.storage.local.set({ sites });
}

// Injected into the page: must be fully self-contained.
function detectScramble(selector) {
  const MOVE = /^([URFDLB]w|[URFDLB]|[urfdlb]|[MESxyz])[1-3]?'?$/;
  const clean = (t) => t.replace(/^\(|\)$/g, '');
  const tokensOf = (text) =>
    String(text || '')
      .replace(/[’′‘`´]/g, "'")
      .replace(/(\d)\s+'/g, "$1'")
      .split(/[\s,]+/)
      .filter(Boolean);
  const longestRun = (text) => {
    const tokens = tokensOf(text);
    let best = [], cur = [];
    for (const t of tokens) {
      if (MOVE.test(clean(t))) {
        cur.push(clean(t));
        if (cur.length > best.length) best = cur.slice();
      } else cur = [];
    }
    return { moves: best, total: tokens.length };
  };
  const textOf = (el) => ('value' in el && typeof el.value === 'string' && el.value) || el.innerText || el.textContent || '';
  const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  const describe = (el) => el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.classList[0] ? '.' + el.classList[0] : '');

  if (selector) {
    let els;
    try { els = document.querySelectorAll(selector); }
    catch (e) { return { error: 'Invalid CSS selector' }; }
    if (!els.length) return { error: 'Selector matched nothing' };
    let best = null;
    for (const el of els) {
      const run = longestRun(textOf(el));
      if (run.moves.length && (!best || (visible(el) && !best.vis) || run.moves.length > best.moves.length))
        best = { moves: run.moves, vis: visible(el) };
    }
    if (!best) return { error: 'No moves in selected element' };
    return { scramble: best.moves.join(' '), source: selector };
  }

  // 1) Elements that look like a scramble container.
  let best = null;
  const named = document.querySelectorAll('[id*="scramble" i], [class*="scramble" i], [data-scramble]');
  for (const el of named) {
    if (!visible(el)) continue;
    const run = longestRun(textOf(el));
    if (run.moves.length >= 3 && run.moves.length >= run.total * 0.6 && (!best || run.moves.length > best.moves.length))
      best = { moves: run.moves, el };
  }
  if (best) return { scramble: best.moves.join(' '), source: describe(best.el) };

  // 2) A visible line of text that is (mostly) moves.
  const lines = (document.body.innerText || '').split('\n');
  for (const line of lines) {
    const run = longestRun(line);
    if (run.moves.length >= 6 && run.moves.length >= run.total * 0.7 && (!best || run.moves.length > best.moves.length))
      best = { moves: run.moves };
  }
  if (best) return { scramble: best.moves.join(' '), source: 'page text' };
  return { error: 'No scramble found — set a selector in settings' };
}

function renderNet(text) {
  const net = $('net');
  const { faces, parsed } = Cube.stateFromScramble(text);
  net.textContent = '';
  for (const name of FACE_ORDER) {
    const face = document.createElement('div');
    face.className = 'face ' + name;
    face.title = name;
    for (const row of faces[name]) {
      for (const color of row) {
        const s = document.createElement('div');
        s.className = 'sticker ' + color;
        face.appendChild(s);
      }
    }
    net.appendChild(face);
  }
  const warn = $('warning');
  if (parsed.invalid.length) {
    warn.textContent = 'Ignored: ' + parsed.invalid.join(' ');
    warn.classList.remove('hidden');
  } else warn.classList.add('hidden');
}

function setStatus(text, isError = false) {
  const el = $('status');
  el.textContent = text;
  el.title = text;
  el.classList.toggle('error', isError);
}

async function detect() {
  if (!tab || manualEdit) return;
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: detectScramble,
      args: [site.selector || ''],
    });
    const out = res && res.result;
    if (!out || out.error) {
      setStatus(out ? out.error : 'Detection failed', true);
      if (lastScramble === null) { $('scramble').textContent = ''; renderNet(''); }
      return;
    }
    setStatus((site.selector ? 'Selector: ' : 'Auto: ') + out.source);
    if (out.scramble !== lastScramble) {
      lastScramble = out.scramble;
      if (document.activeElement !== $('scramble')) $('scramble').textContent = out.scramble;
      renderNet(out.scramble);
    }
  } catch (e) {
    setStatus('Cannot access this page', true);
  }
}

function startPolling() {
  stopPolling();
  detect();
  pollTimer = setInterval(detect, POLL_MS);
}
function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

function applyEnabledUI() {
  document.querySelectorAll('.enable-toggle').forEach((t) => (t.checked = !!site.enabled));
  $('on').classList.toggle('hidden', !site.enabled);
  $('off').classList.toggle('hidden', !!site.enabled);
  if (site.enabled) {
    manualEdit = false;
    lastScramble = null;
    startPolling();
  } else {
    stopPolling();
    setStatus('Disabled on this site');
  }
}

function toggleSettings(force) {
  const panel = $('settings');
  const show = force ?? panel.classList.contains('hidden');
  panel.classList.toggle('hidden', !show);
  $('gear').classList.toggle('active', show);
  if (show) {
    $('selector').value = site.selector || '';
    $('selector').focus();
  }
}

async function init() {
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let url;
  try { url = new URL(tab.url); } catch { url = null; }
  if (!url || !/^https?:$/.test(url.protocol)) {
    host = '';
    document.querySelectorAll('.enable-toggle').forEach((t) => (t.disabled = true));
    $('enabled').parentElement.classList.add('hidden');
    $('gear').disabled = true;
    $('off').classList.remove('hidden');
    $('off').querySelector('.off-title').textContent = 'Not available here';
    $('off').querySelector('.off-text').textContent = 'Open a regular website (http/https) with a scramble.';
    return;
  }
  host = url.hostname;
  $('off-host').textContent = host;
  $('settings-host').textContent = host;

  const sites = await getSites();
  site = { enabled: false, selector: '', ...(sites[host] || {}) };
  applyEnabledUI();
}

document.querySelectorAll('.enable-toggle').forEach((toggle) =>
  toggle.addEventListener('change', async (e) => {
    await saveSite({ enabled: e.target.checked });
    applyEnabledUI();
  })
);

$('gear').addEventListener('click', () => toggleSettings());

$('save').addEventListener('click', async () => {
  await saveSite({ selector: $('selector').value.trim() });
  manualEdit = false;
  lastScramble = null;
  if (site.enabled) startPolling();
  toggleSettings(false);
});

$('selector').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('save').click();
});

$('reset').addEventListener('click', async () => {
  $('selector').value = '';
  $('save').click();
});

$('pick').addEventListener('click', async () => {
  if (!tab || !host) return;
  if (!site.enabled) await saveSite({ enabled: true });
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (h) => { window.__cubePreviewHost = h; },
    args: [host],
  });
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['picker.js'] });
  window.close();
});

$('refresh').addEventListener('click', () => {
  if (!site.enabled) return;
  manualEdit = false;
  lastScramble = null;
  const on = $('on');
  on.classList.add('refreshing');
  stopPolling();
  setTimeout(() => {
    startPolling();
    on.classList.remove('refreshing');
  }, 200);
});

$('scramble').addEventListener('input', () => {
  manualEdit = true;
  setStatus('Edited manually — ↻ to re-detect');
  renderNet($('scramble').textContent);
});
$('scramble').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
});
$('scramble').addEventListener('paste', (e) => {
  e.preventDefault();
  document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
});

init();
