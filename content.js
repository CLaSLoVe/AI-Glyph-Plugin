(function () {
  'use strict';
  if (window.__aiGlyphLoaded) return;
  window.__aiGlyphLoaded = true;
  const G = globalThis.AIGlyph;

  const DEFAULTS = { enabled: true, intensity: 50 };
  let settings = Object.assign({}, DEFAULTS);

  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'TITLE',
                        'CODE', 'PRE', 'KBD', 'SAMP', 'SVG', 'MATH', 'TEMPLATE', 'IFRAME', 'CANVAS',
                        'AIG-W', 'AIG-F']);
  const LETTER = /[A-Za-z0-9\u00C0-\u024F\u3400-\u9FFF]/;

  const entries = new Map();
  let observer = null;

  function skipElement(el) {
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      if (SKIP.has(e.tagName.toUpperCase())) return true;
      if (e.isContentEditable) return true;
    }
    return false;
  }
  function hasText(node) { return !!node.nodeValue && LETTER.test(node.nodeValue); }

  const ctx = document.createElement('canvas').getContext('2d');
  const offCache = new Map();
  function emOffset(el) {
    const cs = getComputedStyle(el);
    const key = cs.font || (cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily);
    let v = offCache.get(key);
    if (v == null) {
      v = 0.056;
      try {
        ctx.font = key;
        const m = ctx.measureText('国');
        const size = parseFloat(cs.fontSize) || 16;
        if (m.fontBoundingBoxAscent) {
          const a = m.fontBoundingBoxAscent / size, d = m.fontBoundingBoxDescent / size;
          v = (a - d + 1) / 2 - 0.88;
        }
      } catch (e) {}
      v = Math.max(-0.2, Math.min(0.25, v));
      offCache.set(key, v);
    }
    return v;
  }

  function collect(rootNode, out) {
    if (!rootNode) return;
    if (rootNode.nodeType === 3) {
      if (hasText(rootNode) && !skipElement(rootNode.parentElement)) out.push(rootNode);
      return;
    }
    if (rootNode.nodeType !== 1 && rootNode.nodeType !== 11) return;
    if (rootNode.nodeType === 1 && skipElement(rootNode)) return;
    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode(n) {
        if (n.nodeType === 1) {
          if (SKIP.has(n.tagName.toUpperCase()) || n.isContentEditable) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_SKIP;
        }
        return hasText(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    while (walker.nextNode()) out.push(walker.currentNode);
  }

  function unwrap(e) {
    if (e.wrap) { e.wrap.remove(); e.wrap = null; }
  }

  function plan(n) {
    let e = entries.get(n);
    if (e) {
      if (n.nodeValue === e.set) return null;
      e.orig = n.nodeValue; e.stale = true;
    } else {
      e = { orig: n.nodeValue, set: null, wrap: null };
      entries.set(n, e);
    }
    if (!e.orig || !LETTER.test(e.orig)) return { n, e, plain: n.nodeValue };
    const segs = G.segment(e.orig, settings.intensity / 100);
    if (segs.length === 1 && typeof segs[0] === 'string') return { n, e, plain: segs[0] };
    const parent = n.parentNode;
    if (!parent) return null;
    const off = emOffset(parent.nodeType === 1 ? parent : document.body);
    return { n, e, segs, off };
  }
  function commit(p) {
    const { n, e } = p;
    if (e.stale) { unwrap(e); e.stale = false; }
    if (p.plain != null) {
      if (n.nodeValue !== p.plain) n.nodeValue = p.plain;
      e.set = p.plain;
      return;
    }
    const w = document.createElement('aig-w');
    w.style.setProperty('--aig-o', p.off.toFixed(3) + 'em');
    w.appendChild(G.renderSegments(p.segs, document));
    n.parentNode.insertBefore(w, n.nextSibling);
    n.nodeValue = '';
    e.set = ''; e.wrap = w;
  }
  function processNodes(nodes) {
    const plans = [];
    for (const n of nodes) { const p = plan(n); if (p) plans.push(p); }
    for (const p of plans) commit(p);
  }

  function restoreAll() {
    for (const [node, e] of entries) {
      unwrap(e);
      if (node.nodeValue === e.set) node.nodeValue = e.orig;
    }
    entries.clear();
    document.querySelectorAll('aig-w').forEach(w => w.remove());
  }

  function withObserverPaused(fn) {
    if (observer) observer.disconnect();
    try { fn(); } finally { if (settings.enabled) startObserver(); }
  }
  function startObserver() {
    observer.observe(document.documentElement, { childList: true, characterData: true, subtree: true });
  }
  const inOurs = n => { const p = n.nodeType === 1 ? n : n.parentElement; return !!(p && p.closest && p.closest('aig-w')); };
  observer = new MutationObserver(muts => {
    if (!settings.enabled) return;
    const todo = new Set();
    for (const m of muts) {
      if (m.type === 'characterData') { if (!inOurs(m.target)) todo.add(m.target); }
      else {
        m.addedNodes.forEach(n => { if (!inOurs(n)) todo.add(n); });
        m.removedNodes.forEach(n => {
          if (n.nodeType === 3 && entries.has(n)) { unwrap(entries.get(n)); entries.delete(n); }
        });
      }
    }
    if (!todo.size) return;
    withObserverPaused(() => {
      const nodes = [];
      todo.forEach(n => { if (n.isConnected) collect(n, nodes); });
      processNodes(nodes);
    });
  });

  function apply() {
    withObserverPaused(() => {
      restoreAll();
      if (!settings.enabled) return;
      const nodes = [];
      collect(document.body || document.documentElement, nodes);
      processNodes(nodes);
    });
    if (!settings.enabled) observer.disconnect();
  }

  const store = (typeof chrome !== 'undefined' && chrome.storage) ? chrome.storage.sync : null;
  function migrate(s) {
    const out = Object.assign({}, DEFAULTS);
    if (s && typeof s.enabled === 'boolean') out.enabled = s.enabled;
    if (s && typeof s.intensity === 'number') out.intensity = Math.min(100, Math.max(5, s.intensity));
    return out;
  }
  function init(s) { settings = migrate(s); apply(); }
  if (store) {
    store.get(null, raw => {
      init(raw || {});
      const stale = ['nudge', 'wobble', 'poster'].filter(k => raw && k in raw);
      if (stale.length) store.remove(stale, () => void chrome.runtime.lastError);
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      let dirty = false;
      for (const k of ['enabled', 'intensity']) {
        if (changes[k]) { settings[k] = changes[k].newValue; dirty = true; }
      }
      if (dirty) apply();
    });
  } else init({});

  window.__aiGlyph = {
    apply, restoreAll,
    get settings() { return settings; },
    set(s) { settings = migrate(Object.assign({}, settings, s)); apply(); }
  };
})();
