(function (root) {
  'use strict';

  function hash(str) {            // FNV-1a 32bit
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }
  function rng(seed) {            // mulberry32
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (r, s) => { const a = Array.from(s); return a[Math.floor(r() * a.length)]; };

  const HOMO = {
    a: 'аàäâąαɑ', b: 'ьƀþ', c: 'сçćĉ', d: 'ďđɗ', e: 'еèéëêęɘ', f: 'ƒſ',
    g: 'ğģqɡ', h: 'һħɦ', i: 'ıíìïîɩl', j: 'јĵ', k: 'κķĸ', l: 'Iłľɭ',
    m: 'ɱмṁ', n: 'ñńпŋη', o: 'оøöóòôσ', p: 'рþρ', q: 'գɋg', r: 'ŗřгɾ',
    s: 'ѕšşś', t: 'ţťŧ', u: 'üúùûµυ', v: 'νѵ', w: 'ωŵẅ', x: 'х', y: 'уýÿɣ', z: 'žźżʐ',
    A: 'ΑАÀÄÅΛ', B: 'ΒВß', C: 'СÇĆ', D: 'ÐĎ', E: 'ΕЕÈËΞ', F: 'ϜҒ', G: 'ĞĢ', H: 'ΗНĦ',
    I: 'ΙІÌÏl', J: 'ЈĴ', K: 'ΚКĶ', L: 'ŁĹĽ', M: 'ΜМ', N: 'ΝÑИ', O: 'ΟОØÖQ', P: 'ΡРÞ',
    Q: 'ǪO', R: 'ŘЯ', S: 'ЅŠ', T: 'ΤТŢ', U: 'ÜÙЦ', V: 'ѴV', W: 'ŴШ', X: 'ΧХ', Y: 'ΥҮÝ', Z: 'ΖŽ',
    '0': 'OØ', '1': 'lI', '2': 'Z', '3': 'Ʒ', '5': 'S', '6': 'b', '8': 'B', '9': 'g'
  };
  const MULTI = [['rn', 'm'], ['m', 'rn'], ['cl', 'd'], ['d', 'cl'], ['vv', 'w'], ['w', 'vv'],
                 ['nn', 'm'], ['li', 'h'], ['h', 'li'], ['ri', 'n'], ['ii', 'u'], ['oo', 'œ'], ['ae', 'æ']];
  const SHAPE = { asc: 'bdfhklt', desc: 'gjpqy', x: 'acemnorsuvwxz', i: 'i' };
  const SHAPE_OF = {};
  for (const k in SHAPE) for (const ch of SHAPE[k]) SHAPE_OF[ch] = SHAPE[k];

  function garbleWord(word, t) {
    if (word.length < 2) {
      const r = rng(hash('1' + word));
      return (HOMO[word] && r() < t * 0.4) ? pick(r, HOMO[word]) : word;
    }
    const r = rng(hash(word));
    let ch = Array.from(word);
    const n = ch.length;
    const out = [];
    for (let i = 0; i < n; i++) {
      const c = ch[i];
      const edge = (i === 0 || i === n - 1);
      const roll = r(), kind = r(), alt = r();
      if (edge) {
        if (roll < t * 0.18 && HOMO[c]) out.push(pick(() => alt, HOMO[c])); else out.push(c);
        continue;
      }
      if (roll < t * 0.42) {
        const two = c + (ch[i + 1] || '');
        const multi = MULTI.find(([a]) => a === two || a === c);
        if (kind < 0.18 && multi && i + multi[0].length < n) {
          out.push(multi[1]); i += multi[0].length - 1;
        } else if (kind < 0.30 && i + 1 < n - 1) {
          out.push(ch[i + 1], c); i++;
        } else if (kind < 0.40) {
          out.push(c, c);
        } else if (kind < 0.48 && n > 4) {
        } else if (HOMO[c]) {
          out.push(pick(() => alt, HOMO[c]));
        } else out.push(c);
      } else if (t > 0.55 && roll < 0.42 + (t - 0.55) * 1.2 && SHAPE_OF[c.toLowerCase()]) {
        const s = pick(() => alt, SHAPE_OF[c.toLowerCase()]);
        out.push(c === c.toUpperCase() ? s.toUpperCase() : s);
      } else out.push(c);
    }
    return out.join('');
  }

  const CJK_GROUPS = `己已巳 末未 人入八 大太犬天夫 土士工干 千于干 王玉主壬 日曰目旦 白自百 田由甲申电
  刀力刃万方 午牛 失矢夭 免兔 戊戌戍成 贝见 买卖 问间同 休体 往住注柱驻 侯候 准淮 治冶 汩汨 拔拨
  折拆析 壶壶 茶荼 崇祟 辨辩辫瓣 撤撒 墨默 赢嬴羸 鸟乌岛 刁习 今令仑仓 冈风凤 夕歹 毛手 木本禾术未
  东车 了子孑孓 么幺 门们闩问 广厂 内肉 区匹 尤龙 不丕 下卞 上止 正五 天无元 水永冰 寸才 小少 之乏
  尸户 予矛 月丹用 叉又 义乂 丸凡几 但担 圆园 汽气 话活 洒酒 侍待持特诗 悔晦 历厉 坐座 晴睛清情请静精
  竞竟 段锻 蓝篮监 栗粟 微徽 雪雷 季李 冒昌 蜜密 粉纷 级极 输渝喻偷愉榆 赛塞寨 辛幸 杨扬肠场汤
  银很跟根恨痕 码玛吗妈骂 跑抱泡炮饱袍 盲育 采菜彩 船般舶 栽载裁哉戴 籍藉 慕幕暮墓募 陪赔培部倍
  楼搂 迟迅 拾恰洽 浅钱线践 现观规 刺剌 苦若 苟荀 埋理 哀衰衷 毫豪亳 管菅 博搏 拂佛 仿访防纺妨坊
  记纪 读续 村树 呆杏 早旱 我找 伐代 处外 兵乒乓 毋母 旧归 识织职 祝视 礼札扎 甩用 的约 是足 有右
  在任 他地也她 这还 个介 中申 来米 为办 和知 国围园 到倒 以似 说话 时时 要耍 就京 出击 会全 可司
  对村 生牛 能熊 而面 那哪 得很 于干 着看差 下卜 自目 之乏 年午 过边 发友 后后 作做 里理 用甩 道遭
  行衍 所斩 然燃 家冢 种秤 事争 成戊 多夕 经轻 去丢 法去 学字 如奴 都部 同伺 没设 动功 面而 起赵
  看着 定走 天夭 分兮 还环 进讲 好奸 部陪 其甚 些此 主玉 样祥 理埋 心必 本木 前剪 开升 因困 只兄
  从丛 想相 实买 意音 无天 力刀 它宅 与马 长卡 把吧 机几 十千 民氏 第弟 公仑 此些 已己 使便 情清
  明朋 性姓 知如 全金 三王 又叉 关美 点占 正止 业亚 外处 将择 两雨 高亮 问向 很狠 最量 重童 并开
  物牧 手毛 应庄 向问 头买 文义 体休 政攻 美关 相想 见贝 被披 利刹 什计 二三 等待 产彦 或戎 新亲
  制刺 身射 果呆 加如 西酉 斯期 月且 话诸 合会 回四 特持 代伐 内肉 信言 表衣 化仑 老考 给拾 世也
  位泣 次欠 度席 门闩 任仔 常赏 先失 海每 通遇 教孝 儿几 原源 东东 声严 提堤 立辛 及汲 比此 员贝
  解角 名各 真直 论伦 处外 走赵 义叉 各名 入人 几凡 口日 认队 条务 平半 系糸 气乞 题提 活话 尔东
  更便 别另 打订 女安 变恋 四西 神伸 总忌 何河 电甩 数娄 安女 少小 报服 才寸 结洁 反友 受爱 目自
  太大 量童 再再 感咸 建健 务条 做作 接按 必心 场汤 件伴 计什 管官 期斯 直真 德穗 资咨 命令 山出
  金全 指拍 克兄 许午 统充 区匹 保呆 至到 队坠 形刑 社杜 便使 空穴 决快 治台 展屉 马与 科料 司可
  五丑 基其 眼跟 书韦 非韭 则测 听斤 白日 却脚 界介 达这 光先 放效 强虽 即既 像象 难准 且具 权杈
  思恩 象像 完宗 设没 式试 色巴 路洛 记纪 南苗 品晶 住往 告吉 类米 求永 据剧 程呈 北比 边过 死列
  张弓 该孩 交父 规观 万方 取耶 拉粒 格洛 望忘 觉党 术木 领岭 共其 确角 传转 师帅 观现 清晴 今令
  切功 院完 让认 识织 候侯 带常 导异 争事 运云 笑哭 飞气 风凤 步走 改政 收牧 根很 干千 造告 言信
  联关 持特 组姐 每海 济挤 车东 亲新 极级 林材 服报 快决 办为 议仪 往住 元无 英央 士土 证正 近斤
  失矢 转传 夫天 令今 准淮 布市 始治 怎作 呢泥 存在 未末 远园 叫斗 台治 单革 影景 具且 罗夕 字学
  爱受 击出 流充 备各 兵乒 连运 调周 深探 商商 算箅 质贡 团困 集焦 百白 需雷 价介 花化 党堂 华毕
  城域 石右 级圾 整敕 府付 离禽 况兄 亚业 请清 技枝 际标 约的 示宗 复夏 病丙 息自 究九 线浅 官宫
  火灭 断继 精睛 满两 支枝 视规 消销 越超 器哭 容客 照昭 须顺 九丸 增赠 研形 写与 称你 企止 八入`;
  const CJK_MAP = {};
  for (const g of CJK_GROUPS.split(/\s+/)) {
    const cs = Array.from(new Set(Array.from(g)));
    for (const c of cs) {
      const others = cs.filter(o => o !== c);
      if (!others.length) continue;
      CJK_MAP[c] = Array.from(new Set((CJK_MAP[c] || []).concat(others)));
    }
  }
  function cjkNeighbor(c, r) {
    const cp = c.codePointAt(0);
    for (let tries = 0; tries < 4; tries++) {
      const d = (1 + Math.floor(r() * 3)) * (r() < 0.5 ? -1 : 1);
      const n = cp + d;
      if (n >= 0x4E00 && n <= 0x9FA5) return String.fromCodePoint(n);
    }
    return c;
  }
  function garbleHan(run, t) {
    const base = hash(run);
    let out = '';
    let i = 0;
    for (const c of run) {
      const r = rng(base ^ Math.imul(i + 1, 0x9E3779B1)); i++;
      const roll = r();
      const m = CJK_MAP[c];
      if (m && roll < 0.12 + t * 0.78) out += m[Math.floor(r() * m.length)];
      else if (roll < t * 0.55) out += cjkNeighbor(c, r);
      else out += c;
    }
    return out;
  }

  let CJK = null;
  function cjkTables() {
    if (CJK) return CJK;
    const D = root.AIGlyphCJK || { bands: 20, fake: '', prof: '', split: '' };
    const fake = new Map(), prof = new Map(), split = new Map(), cut = new Map();
    for (const row of (D.cut || '').split(' ')) {
      const a = Array.from(row);
      if (a.length < 6) continue;
      const list = [];
      for (let i = 1; i + 5 <= a.length; i += 5)
        list.push({ d: a[i], o: a[i + 1], p: +(a[i + 2] + a[i + 3]), keepFirst: a[i + 4] === '0' });
      cut.set(a[0], list);
    }
    for (const row of D.fake.split(' ')) {
      if (!row) continue;
      const a = Array.from(row), slash = a.indexOf('/');
      fake.set(a[0], { op: a[1], rep2: a.slice(2, slash), rep1: a.slice(slash + 1) });
    }
    const P = Array.from(D.prof), L = 1 + 2 * D.bands;
    for (let i = 0; i + L <= P.length; i += L) {
      const v = P.slice(i + 1, i + L).map(ch => (ch.charCodeAt(0) - 48) * 100 / 70);
      prof.set(P[i], { lo: v.slice(0, D.bands), hi: v.slice(D.bands) });
    }
    for (const w of D.split.split(' ')) { const a = Array.from(w); if (a.length === 3) split.set(a[0], [a[1], a[2]]); }
    CJK = { fake, prof, split, cut, B: D.bands };
    return CJK;
  }
  const f1 = x => (Math.round(x * 10) / 10) + '%';
  function seam(pc, pd, B) {
    const s = new Array(B).fill(null);
    for (let b = 0; b < B; b++) {
      const lo = Math.max(pc.lo[b], pd.lo[b]), hi = Math.min(pc.hi[b], pd.hi[b]);
      if (lo <= 0.5 && hi >= 99.5) continue;
      s[b] = Math.round((hi > lo ? (lo + hi) / 2 : lo) * 2) / 2;
    }
    let last = null;
    for (let b = 0; b < B; b++) if (s[b] != null) { last = s[b]; } else if (last != null) s[b] = last;
    last = 50;
    for (let b = B - 1; b >= 0; b--) if (s[b] != null) last = s[b]; else s[b] = last;
    return s;
  }
  function poly(op, s, first) {
    const B = s.length, step = 100 / B, pts = [];
    const Y = y => (y <= -20 || y >= 120) ? f1(y) : `calc(var(--aig-o,0em) + ${f1(y)})`;
    if (op === 'h') {
      const edge = first ? '-25%' : '125%';
      pts.push(`${edge} -40%`, `${f1(s[0])} -40%`);
      for (let b = 1; b < B; b++) if (s[b] !== s[b - 1]) pts.push(`${f1(s[b - 1])} ${Y(b * step)}`, `${f1(s[b])} ${Y(b * step)}`);
      pts.push(`${f1(s[B - 1])} 140%`, `${edge} 140%`);
    } else {
      const edge = first ? '-40%' : '140%';
      pts.push(`-25% ${edge}`, `-25% ${Y(s[0])}`);
      for (let b = 1; b < B; b++) if (s[b] !== s[b - 1]) pts.push(`${f1(b * step)} ${Y(s[b - 1])}`, `${f1(b * step)} ${Y(s[b])}`);
      pts.push(`125% ${Y(s[B - 1])}`, `125% ${edge}`);
    }
    return `polygon(${pts.join(',')})`;
  }
  function cutPoly(o, p, first) {
    const Y = y => `calc(var(--aig-o,0em) + ${y}%)`;
    if (o === 'h') return first ? `polygon(-25% -40%,125% -40%,125% ${Y(p)},-25% ${Y(p)})`
                                : `polygon(-25% ${Y(p)},125% ${Y(p)},125% 140%,-25% 140%)`;
    return first ? `polygon(-25% -40%,${p}% -40%,${p}% 140%,-25% 140%)`
                 : `polygon(${p}% -40%,125% -40%,125% 140%,${p}% 140%)`;
  }
  function fakeCut(c, r) {
    const l = cjkTables().cut.get(c);
    if (!l) return null;
    const x = l[Math.floor(r() * l.length)];
    return { k: 'han', o: c, d: x.d, keepFirst: x.keepFirst, clipC: cutPoly(x.o, x.p, x.keepFirst), clipD: cutPoly(x.o, x.p, !x.keepFirst) };
  }
  function fakeHan(c, r) {
    const T = cjkTables();
    const f = T.fake.get(c), pc = T.prof.get(c);
    if (!f || !pc) return fakeCut(c, r);
    let keepFirst = r() < 0.7, list = keepFirst ? f.rep2 : f.rep1;
    if (!list.length) { keepFirst = !keepFirst; list = keepFirst ? f.rep2 : f.rep1; }
    if (!list.length) return null;
    const d = list[Math.floor(r() * Math.min(list.length, 4))];
    const pd = T.prof.get(d);
    if (!pd) return null;
    const s = seam(pc, pd, T.B);
    return { k: 'han', o: c, d, keepFirst, clipC: poly(f.op, s, keepFirst), clipD: poly(f.op, s, !keepFirst) };
  }

  function makeHan(c, d, keepFirst) {
    const T = cjkTables(), f = T.fake.get(c), pc = T.prof.get(c), pd = T.prof.get(d);
    const s = seam(pc, pd, T.B);
    return { k: 'han', o: c, d, keepFirst, clipC: poly(f.op, s, keepFirst), clipD: poly(f.op, s, !keepFirst) };
  }

  const LAT_PAIRS = ('ae an ar ao as au ce ca co cs ea ec en eo es eu ez na nc ne no ns nz oa oe os ou ' +
    'ra rc re ro rs sa sc se so su sn ua uc ue uo us za ze zo zs mo me ms mc wa wo we ' +
    'pd bq gd hq pq ' +
    'AB AH AK AR BE BK BR CE DB DE DP EB ED EH ER GD HA HB HK HR KA KB KD KH KR NK NA ND NR ' +
    'OD OB PB PD PH PK RB RD RE RH RK SB SD SE UD UB UK ZE ZB').split(' ');
  const LAT_BY = {};
  for (const p of LAT_PAIRS) {
    (LAT_BY[p[0]] = LAT_BY[p[0]] || []).push({ L: p[0], R: p[1] });
    (LAT_BY[p[1]] = LAT_BY[p[1]] || []).push({ L: p[0], R: p[1] });
  }
  function fakeLatin(c, r) {
    const l = LAT_BY[c];
    if (!l) return null;
    const p = l[Math.floor(r() * l.length)];
    return { k: 'lat', o: c, L: p.L, R: p.R };
  }

  const TOKEN = /([A-Za-z0-9\u00C0-\u024F]+)|([\u3400-\u4DBF\u4E00-\u9FFF]+)/g;
  function segWord(word, t, out, salt) {
    const r = rng(hash('L' + word) ^ salt);
    const chars = Array.from(word);
    const n = chars.length;
    const roll = r();
    const pWord = Math.min(0.97, t * 1.3) * (n >= 3 ? 1 : n === 2 ? 0.45 : 0);
    if (roll < pWord) {
      let idx = [];
      for (let i = 1; i < n - 1; i++) if (LAT_BY[chars[i]]) idx.push(i);
      if (!idx.length) for (let i = 0; i < n; i++) if (LAT_BY[chars[i]]) idx.push(i);
      if (idx.length) {
        const k = (n >= 6 && idx.length >= 2 && r() < t * 0.8) ? 2 : 1;
        const pickd = new Set();
        while (pickd.size < k) {
          const i = idx[Math.floor(r() * idx.length)];
          if ([...pickd].some(j => Math.abs(j - i) < 2)) { idx = idx.filter(j => j !== i); if (!idx.length) break; continue; }
          pickd.add(i);
        }
        const parts = [];
        let buf = '';
        for (let i = 0; i < n; i++) {
          if (pickd.has(i)) { if (buf) parts.push(buf); buf = ''; parts.push(fakeLatin(chars[i], r)); }
          else buf += chars[i];
        }
        if (buf) parts.push(buf);
        out.push({ k: 'word', o: word, parts });
        return;
      }
    }
    out.push(roll > 1 - t * 0.06 ? garbleWord(word, t * 0.4) : word);
  }
  function segHan(run, t, out) {
    const base = hash(run);
    const T = cjkTables();
    let buf = '', i = 0;
    for (const c of run) {
      const r = rng(base ^ Math.imul(i + 1, 0x9E3779B1)); i++;
      const roll = r();
      let g = null;
      if (roll < Math.min(0.97, t * 1.12) && (T.fake.has(c) || T.cut.has(c))) {
        if (T.split.has(c) && r() < 0.1) { buf += T.split.get(c).join(''); continue; }
        g = fakeHan(c, r);
      }
      if (g) { if (buf) out.push(buf); buf = ''; out.push(g); continue; }
      const m = CJK_MAP[c];
      if (m && roll > 1 - t * 0.03) buf += m[Math.floor(r() * m.length)];
      else buf += c;
    }
    if (buf) out.push(buf);
  }
  function segment(text, intensity) {
    const t = Math.max(0, Math.min(1, intensity));
    const out = [];
    let last = 0, m, k = 0;
    const th = hash(text);
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(text))) {
      if (m.index > last) out.push(text.slice(last, m.index));
      if (m[1]) segWord(m[1], t, out, Math.imul(th ^ (++k), 0x9E3779B1)); else segHan(m[2], t, out);
      last = TOKEN.lastIndex;
    }
    if (last < text.length) out.push(text.slice(last));
    const merged = [];
    for (const s of out) {
      if (typeof s === 'string' && typeof merged[merged.length - 1] === 'string') merged[merged.length - 1] += s;
      else merged.push(s);
    }
    return merged;
  }
  function garbleText(text, intensity) {
    return segment(text, intensity).map(s => typeof s === 'string' ? s : s.o).join('');
  }
  function el(doc, tag, cls, txt) {
    const e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function renderSegments(segs, doc) {
    const frag = doc.createDocumentFragment();
    for (const s of segs) {
      if (typeof s === 'string') { frag.appendChild(doc.createTextNode(s)); continue; }
      if (s.k === 'word') {
        const n = el(doc, 'aig-n');
        n.appendChild(renderSegments(s.parts, doc));
        frag.appendChild(n);
        continue;
      }
      const f = el(doc, 'aig-f', s.k === 'han' ? 'aig-han' : 'aig-lat');
      if (s.k === 'han') {
        const a = el(doc, 'aig-p', 'aig-base', s.o); a.style.clipPath = s.clipC;
        const b = el(doc, 'aig-p', 'aig-ov', s.d); b.style.clipPath = s.clipD;
        b.setAttribute('aria-hidden', 'true');
        f.append(a, b);
      } else {
        const a = el(doc, 'aig-p', 'aig-base', s.L);
        const b = el(doc, 'aig-p', 'aig-ov', s.R);
        b.setAttribute('aria-hidden', 'true');
        f.append(a, b);
      }
      frag.appendChild(f);
    }
    return frag;
  }

  root.AIGlyph = { _fake: makeHan, _cutPoly: cutPoly, garbleText, segment, renderSegments, CJK_MAP, hash, rng, cjkTables };
})(typeof globalThis !== 'undefined' ? globalThis : this);
