const DEFAULTS = { enabled: true, intensity: 50 };
const $ = id => document.getElementById(id);
const SAMPLE = ['Fresh Bread & Hot Coffee', 'Welcome to the corner cafe', '珍珠奶茶 · 第二杯半價', '新鲜现烤面包，欢迎光临！'];
const label = v => v < 25 ? 'Slight' : v < 50 ? 'Clear' : v < 80 ? 'Heavy' : 'Max';
const chromeApi = (typeof chrome !== 'undefined') ? chrome : null;
const store = (chromeApi && chromeApi.storage && chromeApi.storage.sync) ? chromeApi.storage.sync : null;

function render(s) {
  $('ilabel').textContent = `${s.intensity} (${label(s.intensity)})`;
  const box = $('preview');
  box.textContent = '';
  box.style.setProperty('--aig-o', '0.056em');
  SAMPLE.forEach((line, i) => {
    if (i) box.appendChild(document.createElement('br'));
    if (s.enabled) box.appendChild(AIGlyph.renderSegments(AIGlyph.segment(line, s.intensity / 100), document));
    else box.appendChild(document.createTextNode(line));
  });
}

function bind(cur) {
  cur = {
    enabled: typeof cur.enabled === 'boolean' ? cur.enabled : DEFAULTS.enabled,
    intensity: typeof cur.intensity === 'number' ? cur.intensity : DEFAULTS.intensity
  };
  $('enabled').checked = cur.enabled;
  $('intensity').value = cur.intensity;
  render(cur);
  const now = () => ({ enabled: $('enabled').checked, intensity: +$('intensity').value });
  const save = () => {
    const ns = now();
    render(ns);
    if (store) store.set(ns);
  };
  $('enabled').addEventListener('change', save);
  $('intensity').addEventListener('input', () => render(now()));
  $('intensity').addEventListener('change', save);
}

if (chromeApi && chromeApi.runtime && typeof chromeApi.runtime.getManifest === 'function') {
  const ver = document.querySelector('h1 small');
  if (ver) ver.textContent = 'v' + chromeApi.runtime.getManifest().version;
}

if (store) store.get(DEFAULTS, bind);
else bind(DEFAULTS);
