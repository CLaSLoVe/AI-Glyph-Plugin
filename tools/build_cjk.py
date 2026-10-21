import re, json, sys, numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage
IDS = sys.argv[1] if len(sys.argv) > 1 else '/tmp/ids/ids.txt'
OUT = sys.argv[2] if len(sys.argv) > 2 else '/workspace/ai-glyph-ext/cjkdata.js'
N = 100; B = 32                      # 渲染尺寸、条带数
FONTS = [ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', N, index=2),
         ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', N, index=2) if __import__('os').path.exists('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc') else None,
         ]
FONTS = [f for f in FONTS if f][:1]
THIN = set('一丨丶丿乙亅')
chars = []
for hi in range(0xB0, 0xD8):
    for lo in range(0xA1, 0xFF):
        try: chars.append(bytes([hi, lo]).decode('gb2312'))
        except: pass
for hi in range(0xA4, 0xC7):
    for lo in list(range(0x40, 0x7F)) + list(range(0xA1, 0xFF)):
        try:
            c = bytes([hi, lo]).decode('big5')
            if '\u4e00' <= c <= '\u9fff': chars.append(c)
        except: pass
chars = list(dict.fromkeys(chars)); CHARSET = set(chars)
ARITY = {c: 2 for c in '⿰⿱⿴⿵⿶⿷⿸⿹⿺⿻'}; ARITY['⿲'] = 3; ARITY['⿳'] = 3
def parse(s, i=0):
    c = s[i]
    if c in ARITY:
        kids = []; j = i + 1
        for _ in range(ARITY[c]):
            k, j = parse(s, j); kids.append(k)
        return (c, kids), j
    return c, i + 1
def flat(t): return t if isinstance(t, str) else t[0] + ''.join(flat(k) for k in t[1])
ids = {}; exist = set(); char_of = {}
for line in open(IDS, encoding='utf-8'):
    if line.startswith('#'): continue
    p = line.rstrip('\n').split('\t')
    if len(p) < 3: continue
    ch = p[1]
    for alt in p[2:]:
        alt = re.sub(r'\[.*?\]', '', alt); alt = re.sub(r'&[^;]+;', '?', alt)
        if not alt or alt == ch: continue
        try: t, _ = parse(alt)
        except Exception: continue
        if isinstance(t, tuple):
            ids.setdefault(ch, t)
            if ch not in CHARSET: continue      # 只和常用字（GB2312 一级 + Big5 常用）比：生僻扩展区字对读者来说等于"不存在"
            if len(t[1]) == 2: exist.add((t[0], flat(t[1][0]), flat(t[1][1])))
            if len(t[1]) == 3:
                o2 = '⿰' if t[0] == '⿲' else '⿱'; k = [flat(x) for x in t[1]]
                exist.add((o2, k[0], o2 + k[1] + k[2])); exist.add((o2, o2 + k[0] + k[1], k[2]))
            char_of.setdefault(flat(t), ch)
# 部件的展开形式也算同一个部件（如 "㐱" 与其 IDS）
def norm(x): return x
def render(c, font):
    im = Image.new('L', (N, N), 0); d = ImageDraw.Draw(im)
    d.text((0, int(N * .88)), c, font=font, fill=255, anchor='ls')
    return np.asarray(im) > 100
def split_parts(m, axis):
    """axis=0: 左右；返回 (A掩膜, B掩膜) 或 None。axis=1 时先转置。"""
    if axis == 1: m = m.T
    prof = m.sum(axis=0)
    lab, n = ndimage.label(m, structure=np.ones((3, 3)))
    er = ndimage.binary_erosion(m, iterations=2)
    lab2, n2 = ndimage.label(er, structure=np.ones((3, 3)))
    if n2 > n:   # 腐蚀后能分开粘连处：每个原像素归给最近的腐蚀连通域
        _, (iy, ix) = ndimage.distance_transform_edt(lab2 == 0, return_indices=True)
        lab = np.where(m, lab2[iy, ix], 0); n = n2
    comps = []
    for i in range(1, n + 1):
        comp = lab == i; xs = np.where(comp)[1]
        if xs.size: comps.append((comp, xs.min(), xs.max(), xs.mean()))
    best = None
    for x0 in sorted(range(22, 79), key=lambda x: prof[x]):
        A = np.zeros_like(m); Bm = np.zeros_like(m); ok = True
        for comp, mn, mx, mean in comps:
            if mx <= x0 + 6 and mean < x0: A |= comp
            elif mn >= x0 - 6 and mean > x0: Bm |= comp
            else: ok = False; break
        if ok and A.sum() >= 0.12 * m.sum() and Bm.sum() >= 0.12 * m.sum(): best = (A, Bm); break
    if not best: return None
    A, Bm = best
    if axis == 1: A, Bm = A.T, Bm.T
    return A, Bm
def profile(A, Bm, axis):
    """每个条带里：A 的最远边、B 的最近边（0..100）"""
    if axis == 1: A, Bm = A.T, Bm.T
    lo, hi = [], []
    for b in range(B):
        r0, r1 = b * N // B, (b + 1) * N // B
        a = np.where(A[r0:r1].any(axis=0))[0]; c = np.where(Bm[r0:r1].any(axis=0))[0]
        lo.append(int(a.max()) + 1 if a.size else 0)
        hi.append(int(c.min()) if c.size else N)
    return np.array(lo), np.array(hi)
def feat(mask):
    v = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).resize((12, 12), Image.BILINEAR), dtype=float).ravel()
    n = np.linalg.norm(v); return v / n if n else v
from PIL import ImageFilter
def pfeat(mask):
    v = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5)).resize((16, 16), Image.BILINEAR), dtype=np.float32).ravel()
    v = v - v.mean(); n = np.linalg.norm(v); return v / n if n else v
info = {}
for c in chars:
    t = ids.get(c)
    if not t or t[0] not in '⿰⿱⿲⿳': continue
    if len(t[1]) == 3:     # 三部件：先试 前|后两件，再试 前两件|后
        o2 = '⿰' if t[0] == '⿲' else '⿱'; k = [flat(x) for x in t[1]]
        opts = [(o2, k[0], o2 + k[1] + k[2]), (o2, o2 + k[0] + k[1], k[2])]
    else:
        opts = [(t[0], flat(t[1][0]), flat(t[1][1]))]
    m0 = render(c, FONTS[0]); pick_ = None
    for op_, a_, b_ in opts:
        sp_ = split_parts(m0, 0 if op_ == '⿰' else 1)
        if sp_:
            lo_, hi_ = profile(*sp_, 0 if op_ == '⿰' else 1)
            if (hi_ - lo_ >= 1).all(): pick_ = (op_, a_, b_); break
    if not pick_: continue
    t = (pick_[0], None); a, b = pick_[1], pick_[2]
    if '?' in a + b or a in THIN or b in THIN: continue
    axis = 0 if t[0] == '⿰' else 1
    los, his, ok, fa, fb, ia, ib = [], [], True, None, None, 0, 0
    for k, f in enumerate(FONTS):
        m = render(c, f)
        sp = split_parts(m, axis)
        if not sp: ok = False; break
        lo, hi = profile(*sp, axis)
        los.append(lo); his.append(hi)
        if k == 0: fa, fb, ia, ib, full, pa, pb = feat(sp[0]), feat(sp[1]), sp[0].sum(), sp[1].sum(), m, pfeat(sp[0]), pfeat(sp[1])
    if not ok: continue
    lo = np.max(los, axis=0); hi = np.min(his, axis=0)
    if (hi - lo < 1).any(): continue          # 自身就切不开
    info[c] = dict(op=t[0], a=a, b=b, lo=lo, hi=hi, fa=fa, fb=fb, ia=ia, ib=ib, m=full, pa=pa, pb=pb)
print('charset', len(chars), 'usable', len(info), 'h', sum(v['op'] == '⿰' for v in info.values()))
def seam_ok(v, w):
    lo = np.maximum(v['lo'], w['lo']); hi = np.minimum(v['hi'], w['hi'])
    return (hi - lo >= 1).all()
byop = {'⿰': [], '⿱': []}
for c, v in info.items(): byop[v['op']].append(c)
# ---- 视觉查重：拼出来的字不能长得像任何真字（含原字） ----
from PIL import ImageFilter
def small(m):
    v = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2)).resize((20, 20), Image.BILINEAR), dtype=np.float32).ravel()
    v = v - v.mean(); n = np.linalg.norm(v); return v / n if n else v
ALL = list(chars)
REF = np.stack([small(render(c, FONTS[0])) for c in ALL])
print('ref matrix', REF.shape)
def enc_vals(arr): return np.array([int(min(max(x, 0), 100) * 70 // 100) * 100 / 70 for x in arr])
def seam_js(v, w):
    lo = np.maximum(enc_vals(v['lo']), enc_vals(w['lo'])); hi = np.minimum(enc_vals(v['hi']), enc_vals(w['hi']))
    s = [None] * B
    for b in range(B):
        if lo[b] <= 0.5 and hi[b] >= 99.5: continue
        s[b] = round(((lo[b] + hi[b]) / 2 if hi[b] > lo[b] else lo[b]) * 2) / 2
    last = None
    for b in range(B):
        if s[b] is not None: last = s[b]
        elif last is not None: s[b] = last
    last = 50
    for b in range(B - 1, -1, -1):
        if s[b] is not None: last = s[b]
        else: s[b] = last
    return s
def compose(v, w, part):
    s = seam_js(v, w); first = np.zeros((N, N), bool)
    for b in range(B):
        r0, r1 = b * N // B, (b + 1) * N // B
        first[r0:r1, :int(round(s[b]))] = True
    if v['op'] == '⿱': first = first.T
    keep_first = (part == 'b')
    mc = v['m'] & (first if keep_first else ~first); md = w['m'] & (~first if keep_first else first)
    return mc | md
# 部件级查重：若存在真字 X，其"保留部件"≈本字的保留部件、且"换入部件"≈供体的换入部件 → 拼出来会被认成 X，丢弃
KEYS = list(info.keys()); KI = {c: i for i, c in enumerate(KEYS)}
PA = np.stack([info[c]['pa'] for c in KEYS]); PB = np.stack([info[c]['pb'] for c in KEYS])
OPS = np.array([info[c]['op'] == '⿰' for c in KEYS])
PART_TAU = float(__import__('os').environ.get('PART_TAU', '0.80'))
def looks_real(c, d, part):
    i, j = KI[c], KI[d]
    if part == 'b': keep = PA @ PA[i]; swap = PB @ PB[j]
    else: keep = PB @ PB[i]; swap = PA @ PA[j]
    score = np.minimum(keep, swap); score[OPS != OPS[i]] = -1
    k = int(score.argmax()); return float(score[k]), KEYS[k]
# 形近部件归一：拼出来的部件组合若"形近于"任何真字的组合（如 禾艮≈根、冫每≈海、日才≈时），也算真字
CONF = ['木禾朩扌才寸', '氵冫', '日目曰月', '亻彳', '讠言訁', '纟糹糸', '钅金釒', '贝貝見见', '土士工', '王玉𤣩',
        '口囗', '艹卄', '宀冖', '阝卩', '子孑了', '己已巳', '夂攵', '礻衤', '未末', '尸户', '厂广', '力刀', '弋戈', '大太犬丈', '人入八', '未末朱', '乃几儿', '子予于孑', '干千', '夫天', '令今', '申甲由田', '白自', '矢失',
        '母毋', '戊戌戍', '尤龙', '旦且', '兑兊', '东车', '鸟乌']
CMAP = {}
for g in CONF:
    for ch in g: CMAP[ch] = g[0]
ATOM = re.compile(r'[⿰-⿻]')
def cnorm(x): return ''.join(CMAP.get(ch, ch) for ch in x)
def atoms(x): return set(cnorm(ATOM.sub('', x)))
EXIST_C = {(op, cnorm(a), cnorm(b)) for op, a, b in exist}
# 三部件字也登记其子部件的形近组合
for op, a, b in list(exist):
    for ch in b:
        pass
def conf_real(v, w, part):
    old, new = (v['b'], w['b']) if part == 'b' else (v['a'], w['a'])
    oa, na = atoms(old), atoms(new)
    if oa <= na or na <= oa: return True            # 换入部件与原部件包含关系（字/学 的 子）
    if cnorm(old) == cnorm(new): return True
    combo = (v['op'], cnorm(v['a']), cnorm(w['b'])) if part == 'b' else (v['op'], cnorm(w['a']), cnorm(v['b']))
    if combo in EXIST_C: return True
    # 也和"末级部件"比：⿱冖子 → 子
    last = lambda x: cnorm(ATOM.sub('', x))[-1:] ; first = lambda x: cnorm(ATOM.sub('', x))[:1]
    na_, nb_ = (v['a'], w['b']) if part == 'b' else (w['a'], v['b'])
    for A_ in {cnorm(na_), first(na_), last(na_)}:
        for B_ in {cnorm(nb_), first(nb_), last(nb_)}:
            if (v['op'], A_, B_) in EXIST_C: return True
    return False
SIM_MAX = float(__import__('os').environ.get('SIM_MAX', '0.93'))
DBG = {}
rows = []; K = 4; used = set(); rejected = 0
for c, v in info.items():
    out = []
    for part in ('b', 'a'):   # 'b' = 换右/下部件（保留部首）；'a' = 换左/上部件
        cands = []
        for d in byop[v['op']]:
            if d == c: continue
            w = info[d]
            if w['a'] == v['a'] or w['b'] == v['b']: continue
            combo = (v['op'], v['a'], w['b']) if part == 'b' else (v['op'], w['a'], v['b'])
            if combo in exist or flat((combo[0], [combo[1], combo[2]])) in char_of: continue
            if not seam_ok(v, w): continue
            if conf_real(v, w, part): rejected += 1; continue
            f1, f2 = v['f' + part], w['f' + part]; r = w['i' + part] / max(v['i' + part], 1)
            if not 0.55 < r < 1.8: continue
            cands.append((float(f1 @ f2) - abs(np.log(r)) * 0.2, d))
        cands.sort(reverse=True)
        cands = cands[:14]
        good = []
        if cands:
            comp = np.stack([small(compose(v, info[d], part)) for _, d in cands])
            S = comp @ REF.T; sim = S.max(axis=1); arg = S.argmax(axis=1)
            for (sc, d), sm, ag in zip(cands, sim, arg):
                DBG[(c, part, d)] = (float(sm), ALL[ag])
                if sm < SIM_MAX: good.append(d)
                else: rejected += 1
        out.append(''.join(good[:K])); used.update(out[-1])
    if out[0] or out[1]:
        rows.append((c, v, out))
enc = lambda arr: ''.join(chr(48 + int(min(max(x, 0), 100) * 70 // 100)) for x in arr)   # 0..100 -> '0'..'v'
prof = {}
for c, v, out in rows: prof[c] = enc(v['lo']) + enc(v['hi'])
for d in used:
    if d not in prof: prof[d] = enc(info[d]['lo']) + enc(info[d]['hi'])
fake = ' '.join(f"{c}{'h' if v['op']=='⿰' else 'v'}{out[0]}/{out[1]}" for c, v, out in rows)
profs = ''.join(k + p for k, p in prof.items())
split = ' '.join(f"{c}{v['a']}{v['b']}" for c, v in info.items() if v['op'] == '⿰' and v['a'] in CHARSET and v['b'] in CHARSET and v['a'] != v['b'])

# ======================================================================
# 第二类：直线"剪接"。给没有部件表的字（独体字、半包围、拆不开的字）用：
# 在某条横线/竖线处把本字和另一个字接起来；要求切线上两字的笔画位置几乎重合（笔画能接上），
# 而另一半明显不同、整体又不像任何常用字 → 多一笔/少一笔/换半边的"假字"。
# ======================================================================
covered = set(c for c, v, out in rows)
RM = {c: render(c, FONTS[0]) for c in chars}
CI = {c: i for i, c in enumerate(chars)}
POS = list(range(28, 73, 4))
def line(m, o, p_):
    band = m[p_ - 1:p_ + 2, :].any(axis=0) if o == 'h' else m[:, p_ - 1:p_ + 2].any(axis=1)
    return ndimage.binary_dilation(band, iterations=1)
LINES = {}
for o in 'hv':
    for p_ in POS:
        LINES[(o, p_)] = np.stack([line(RM[c], o, p_) for c in chars]).astype(np.float32)
INK = np.array([RM[c].sum() for c in chars], np.float32)
targets = [c for c in chars if c not in covered and RM[c].sum() > 150]
print('cut targets', len(targets))
cutrows = []; cut_rej = 0
for c in targets:
    i = CI[c]; mc = RM[c]
    cands = []
    for (o, p_), L in LINES.items():
        lc = L[i]; inter = L @ lc; uni = L.sum(axis=1) + lc.sum() - inter
        iou = np.where(uni > 0, inter / np.maximum(uni, 1), 0.0)
        if lc.sum() < 2: continue                    # 切线上没笔画：接不出"连贯"的效果，跳过
        top = np.argsort(-iou)[:40]
        for j in top:
            if j == i or iou[j] < 0.72: continue
            cands.append((float(iou[j]), j, o, p_))
    cands.sort(reverse=True)
    good = []; seen = set()
    for sc, j, o, p_ in cands:
        d = chars[j]
        if d in seen: continue
        md = RM[d]
        if not 0.75 < INK[j] / INK[i] < 1.35: continue      # 繁简程度要接近，保持整体轮廓
        if float(small(mc) @ small(md)) < 0.45: continue    # 供体字整体也要和本字有点像
        for side in (0, 1):
            first = np.zeros((N, N), bool)
            if o == 'h': first[:p_, :] = True
            else: first[:, :p_] = True
            keep = first if side == 0 else ~first          # 本字保留的区域
            other = ~keep
            xd = (mc ^ md) & other; ud = (mc | md) & other
            xk = (mc ^ md) & keep; uk = (mc | md) & keep
            if ud.sum() == 0 or uk.sum() == 0: continue
            if xd.sum() / ud.sum() < 0.35: continue       # 换进来的半边要明显不同
            if xk.sum() / uk.sum() < 0.30: continue       # 也不能整个就是供体字
            r = (md & other).sum() / max((mc & other).sum(), 1)
            if not 0.7 < r < 1.4: continue
            kept = (mc & keep).sum() / mc.sum()
            if not 0.4 <= kept <= 0.8: continue            # 本字要保留一大半，才认得出"像某个字"
            if float(small(mc) @ small((mc & keep) | (md & other))) < 0.65: continue   # 整体轮廓不能跑太远
            comp = (mc & keep) | (md & other)
            sim = float((REF @ small(comp)).max())
            if sim >= 0.90: cut_rej += 1; continue
            good.append(f"{d}{o}{p_:02d}{side}"); seen.add(d); break
        if len(good) >= 3: break
    if good: cutrows.append(c + ''.join(good))
print('cut rows', len(cutrows), 'rejected', cut_rej)
cut = ' '.join(cutrows)
js = ("/* 自动生成：tools/build_cjk.py —— 假汉字拼合表（纯本地数据）\n"
      " * fake : 字 + h(左右)/v(上下) + 「换右/下部件」的供体字 + '/' + 「换左/上部件」的供体字\n"
      f" * prof : 每字 1+{2*B} 个字符：每个条带里前一部件的最远边、后一部件的最近边（'0'..'v' = 0..100%）\n"
      " * split: 可拆成两个独立字的字（奶→女乃）\n"
      " * cut  : 直线剪接：字 + 若干组(供体字 + h横切/v竖切 + 位置% + 0保留上/左|1保留下/右) */\n"
      "(function (root) {\n  root.AIGlyphCJK = {\n    bands: " + str(B) + ",\n    fake: " + json.dumps(fake, ensure_ascii=False) +
      ",\n    prof: " + json.dumps(profs, ensure_ascii=False) + ",\n    split: " + json.dumps(split, ensure_ascii=False) + ",\n    cut: " + json.dumps(cut, ensure_ascii=False) +
      "\n  };\n})(typeof globalThis !== 'undefined' ? globalThis : this);\n")
open(OUT, 'w', encoding='utf-8').write(js)
print('rejected-as-real', rejected, 'rows', len(rows), 'profiles', len(prof), 'split', len(split.split()), 'bytes', len(js.encode()))
