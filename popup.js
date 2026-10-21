const DEFAULTS = { enabled: true, intensity: 50 };
const $ = id => document.getElementById(id);
const SAMPLE = ['Fresh Bread & Hot Coffee', 'Welcome to the corner cafe', '珍珠奶茶 · 第二杯半价', '新鲜现烤面包，欢迎光临！'];
const PREVIEW_SAMPLE = {
  en: ['Fresh Bread & Hot Coffee', 'Welcome to the corner cafe', 'The second cup is half price', 'Warm bread, just out of the oven'],
  'zh-CN': ['新鲜面包和热咖啡', '欢迎光临街角咖啡店', '珍珠奶茶 · 第二杯半价', '新鲜现烤面包，欢迎光临！']
};
let previewT = null;
const LEVEL = [[25, 'levelSlight', 'Slight'], [50, 'levelClear', 'Clear'], [80, 'levelHeavy', 'Heavy'], [101, 'levelMax', 'Max']];
const chromeApi = (typeof chrome !== 'undefined') ? chrome : null;
const store = (chromeApi && chromeApi.storage && chromeApi.storage.sync) ? chromeApi.storage.sync : null;
const i18n = (chromeApi && chromeApi.i18n) ? chromeApi.i18n : null;

function t(name, substitutions) {
  if (!i18n) return '';
  const text = i18n.getMessage(name, substitutions);
  if (!text) throw new Error('Missing i18n message: ' + name);
  return text;
}

function previewLang() {
  if (i18n) return null;
  return new URLSearchParams(location.search).get('lang');
}

const PREVIEW_PACK = {
  en: {
    extName: 'AI Glyph', enabled: 'Enabled', intensity: 'Intensity', preview: 'Preview',
    levelSlight: 'Slight', levelClear: 'Clear', levelHeavy: 'Heavy', levelMax: 'Max',
    intensityValue: '$value$ ($level$)'
  },
  'zh-CN': {
    extName: 'AI Glyph', enabled: '启用', intensity: '强度', preview: '预览',
    levelSlight: '轻微', levelClear: '明显', levelHeavy: '浓重', levelMax: '最强',
    intensityValue: '$value$ ($level$)'
  }
};

function previewMessage(lang, name, substitutions) {
  const pack = PREVIEW_PACK[lang];
  if (!pack || !pack[name]) throw new Error('Missing i18n message: ' + name);
  let msg = pack[name];
  if (substitutions) {
    msg = msg.replace(/\$value\$/gi, substitutions[0]).replace(/\$level\$/gi, substitutions[1]);
  }
  return msg;
}

function text(name, substitutions) {
  if (i18n) return t(name, substitutions);
  return previewMessage(previewLang(), name, substitutions);
}

function installLocale() {
  if (i18n) {
    document.documentElement.lang = i18n.getUILanguage();
    document.title = t('extName');
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    return;
  }
  const lang = previewLang();
  if (!lang) return;
  if (!PREVIEW_PACK[lang]) throw new Error('Unsupported preview lang: ' + lang);
  previewT = true;
  document.documentElement.lang = lang;
  document.title = previewMessage(lang, 'extName');
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = previewMessage(lang, el.dataset.i18n); });
}

function levelName(v) {
  const row = LEVEL.find(([max]) => v < max);
  return (i18n || previewT) ? text(row[1]) : row[2];
}

function intensityText(v) {
  const level = levelName(v);
  return (i18n || previewT) ? text('intensityValue', [String(v), level]) : `${v} (${level})`;
}

function sampleLines() {
  const lang = previewLang();
  return (lang && PREVIEW_SAMPLE[lang]) || SAMPLE;
}

function render(s) {
  $('ilabel').textContent = intensityText(s.intensity);
  const box = $('preview');
  box.textContent = '';
  box.style.setProperty('--aig-o', '0.056em');
  sampleLines().forEach((line, i) => {
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

installLocale();

if (chromeApi && chromeApi.runtime && typeof chromeApi.runtime.getManifest === 'function') {
  const ver = document.querySelector('h1 small');
  if (ver) ver.textContent = 'v' + chromeApi.runtime.getManifest().version;
}

if (store) store.get(DEFAULTS, bind);
else bind(DEFAULTS);
