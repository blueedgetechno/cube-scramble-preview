// Element picker: hover to highlight, click to save a CSS selector for this site. Esc cancels.
(() => {
  if (window.__cubePreviewPicking) return;
  window.__cubePreviewPicking = true;
  const host = window.__cubePreviewHost || location.hostname;

  const box = document.createElement('div');
  Object.assign(box.style, {
    position: 'fixed', zIndex: 2147483647, pointerEvents: 'none',
    border: '2px solid #1f9d55', background: 'rgba(31,157,85,.12)', borderRadius: '3px',
    transition: 'all 60ms ease-out', display: 'none',
  });
  const tip = document.createElement('div');
  Object.assign(tip.style, {
    position: 'fixed', zIndex: 2147483647, left: '50%', top: '12px', transform: 'translateX(-50%)',
    background: '#1d1d1f', color: '#fff', font: '600 13px Nunito, "Segoe UI", sans-serif',
    padding: '8px 14px', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,.3)', pointerEvents: 'none',
  });
  tip.textContent = 'Click the scramble text · Esc to cancel';
  document.documentElement.append(box, tip);

  const isIdent = (s) => /^[A-Za-z_][\w-]*$/.test(s);
  function selectorFor(el) {
    const parts = [];
    while (el && el.nodeType === 1 && el !== document.documentElement) {
      if (el.id && isIdent(el.id) && document.querySelectorAll('#' + CSS.escape(el.id)).length === 1) {
        parts.unshift('#' + CSS.escape(el.id));
        break;
      }
      let part = el.tagName.toLowerCase();
      const parent = el.parentElement;
      if (parent) {
        const same = [...parent.children].filter((c) => c.tagName === el.tagName);
        if (same.length > 1) part += `:nth-of-type(${same.indexOf(el) + 1})`;
      }
      parts.unshift(part);
      if (el === document.body) break;
      el = parent;
    }
    return parts.join(' > ');
  }

  let current = null;
  function onMove(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === box || el === tip) return;
    current = el;
    const r = el.getBoundingClientRect();
    Object.assign(box.style, {
      display: 'block', left: r.left - 2 + 'px', top: r.top - 2 + 'px',
      width: r.width + 4 + 'px', height: r.height + 4 + 'px',
    });
  }
  function block(e) { e.preventDefault(); e.stopPropagation(); }

  async function onClick(e) {
    block(e);
    if (!current) return;
    const selector = selectorFor(current);
    cleanup();
    const { sites = {} } = await chrome.storage.local.get('sites');
    sites[host] = { ...(sites[host] || {}), enabled: true, selector };
    await chrome.storage.local.set({ sites });
    toast('Selector saved: ' + selector + ' — reopen the extension');
  }
  function onKey(e) {
    if (e.key === 'Escape') { block(e); cleanup(); }
  }

  function toast(msg) {
    tip.textContent = msg;
    document.documentElement.append(tip);
    setTimeout(() => tip.remove(), 3500);
  }

  function cleanup() {
    window.__cubePreviewPicking = false;
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('mousedown', block, true);
    document.removeEventListener('mouseup', block, true);
    document.removeEventListener('keydown', onKey, true);
    box.remove();
    tip.remove();
  }

  document.addEventListener('mousemove', onMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('mousedown', block, true);
  document.addEventListener('mouseup', block, true);
  document.addEventListener('keydown', onKey, true);
})();
