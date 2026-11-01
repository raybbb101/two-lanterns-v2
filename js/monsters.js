// v2 のオリジナルの魔物。pixelfx と同じ作法（左上から光、3〜4 段の平らな色、1px の墨の輪郭）で、ピクセルを直接組み立てる。
// どれも右向きで描き、左向きは左右反転する。返すのは { w, h, ox, oy, rgba, glows }（足元が原点）。

const INK = 0xff1c1214;
const hexc = (h) => {
  const n = parseInt(h.slice(1), 16);
  return (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | (n >> 16)) >>> 0;
};
const R = (...h) => h.map(hexc);
const L = (() => { const v = [-0.55, -0.65, 0.55], l = Math.hypot(...v); return v.map((x) => x / l); })();

class Sprite {
  constructor(w, h, ox, oy) {
    this.w = w; this.h = h; this.ox = ox; this.oy = oy;
    this.c = new Uint32Array(w * h);
    this.glows = [];
  }
  set(x, y, col) {
    x = Math.round(x) - this.ox; y = Math.round(y) - this.oy;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.c[y * this.w + x] = col;
  }
  get(x, y) {
    x -= this.ox; y -= this.oy;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.c[y * this.w + x];
  }
  // 球のような明暗の楕円。bias で全体を暗く（奥側の部品など）
  ball(cx, cy, rx, ry, ramp, bias = 0) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, d = nx * nx + ny * ny;
        if (d > 1) continue;
        const nz = Math.sqrt(1 - d);
        const k = nx * L[0] + ny * L[1] + nz * L[2] - bias;
        this.set(x, y, ramp[k > 0.82 ? 0 : k > 0.5 ? 1 : k > 0.18 ? 2 : 3]);
      }
  }
  // 多角形を縦の明暗で塗る
  poly(pts, ramp, fn) {
    let y0 = 1e9, y1 = -1e9, x0 = 1e9, x1 = -1e9;
    for (const [x, y] of pts) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++)
      for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
        const px = x + 0.5, py = y + 0.5;
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
        }
        if (!inside) continue;
        const u = (py - y0) / Math.max(1, y1 - y0), v = (px - x0) / Math.max(1, x1 - x0);
        const t = fn ? fn(u, v) : u * 0.8 + v * 0.5;
        this.set(x, y, ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor(t * ramp.length)))]);
      }
  }
  line(x0, y0, x1, y1, col) {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let i = 0; i <= n; i++) this.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, col);
  }
  rect(x, y, w, h, col) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, col); }
  glow(x, y, r, col, k = 1) { this.glows.push({ x, y, r, col, k }); }
  // 墨の輪郭
  outline() {
    const { w, h, c } = this, add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (c[y * w + x]) continue;
      if ((x > 0 && c[y * w + x - 1] && c[y * w + x - 1] !== INK) || (x < w - 1 && c[y * w + x + 1] && c[y * w + x + 1] !== INK) ||
        (y > 0 && c[(y - 1) * w + x] && c[(y - 1) * w + x] !== INK) || (y < h - 1 && c[(y + 1) * w + x] && c[(y + 1) * w + x] !== INK)) add.push(y * w + x);
    }
    for (const i of add) c[i] = INK;
  }
  finish(flip) {
    this.outline();
    const { w, h, c } = this, rgba = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const col = c[y * w + (flip ? w - 1 - x : x)];
      if (!col) continue;
      const j = (y * w + x) * 4;
      rgba[j] = col & 255; rgba[j + 1] = (col >>> 8) & 255; rgba[j + 2] = (col >>> 16) & 255; rgba[j + 3] = 255;
    }
    const ox = flip ? -(this.w + this.ox) + 1 : this.ox;
    const glows = this.glows.map((g) => ({ ...g, x: flip ? -g.x : g.x }));
    return { w, h, ox, oy: this.oy, rgba, glows };
  }
}

// ---------------- 胞子キノコ（スライムの役） ----------------
const CAPS = [
  [R('#ff8a6a', '#e0483a', '#a82a30', '#6e1828'), R('#fff2d8')],
  [R('#d8a0ff', '#a060e0', '#6a38a8', '#40206a'), R('#f6e8ff')],
  [R('#ffd070', '#f08a2a', '#b0501a', '#702a10'), R('#fff0b0')],
  [R('#c8f0ff', '#78c0e8', '#4080b8', '#24507a'), R('#ffffff')],
];
const STEM = R('#fff4e0', '#e8d4b4', '#bba080', '#806650');
function sporeling(f, s) {
  const S = f.big ? 1.45 : 1;
  const [cap, spot] = CAPS[f.v % 4];
  const sp = new Sprite(Math.ceil(40 * S), Math.ceil(44 * S), Math.floor(-20 * S), Math.floor(-40 * S));
  let sq = 0, z = 0;
  if (f.state === 'wind') sq = 0.25 * f.k;
  else if (f.state === 'atk') { sq = -0.22; z = Math.sin(f.k * Math.PI) * 9; }
  else if (f.moving) { const ph = f.ph; z = Math.max(0, Math.sin(ph * Math.PI * 2)) * 4; sq = Math.sin(ph * Math.PI * 2) < 0 ? 0.12 : -0.08; }
  else sq = Math.sin(f.ph * Math.PI * 2) * 0.05;
  const sx = (1 + sq) * S, sy = (1 - sq) * S;
  const base = -z * S;
  // 足
  for (const d of [-1, 1]) sp.ball(d * 4 * sx, base - 1.5 * sy, 2.6 * S, 1.8 * S, STEM, 0.2);
  // 柄（体）
  sp.ball(0, base - 7 * sy, 7 * sx, 7 * sy, STEM);
  // 目
  const ex = 2 * S, ey = base - 7 * sy;
  for (const d of [-1, 1]) { sp.set(ex + d * 2.5 * S, ey, INK); sp.set(ex + d * 2.5 * S, ey + 1, INK); }
  if (f.state === 'wind' || f.state === 'atk') { sp.set(ex - 3.5 * S, ey - 2, INK); sp.set(ex + 1.5 * S, ey - 2, INK); }
  sp.set(ex, ey + 3 * S, hexc('#a86a5a'));
  // かさ
  const cy = base - 14 * sy;
  sp.ball(0, cy, 13 * sx, 8 * sy, cap);
  sp.poly([[-13 * sx, cy + 1], [13 * sx, cy + 1], [9 * sx, cy + 4 * sy], [-9 * sx, cy + 4 * sy]], [cap[2], cap[3]], (u) => u);
  // 斑点
  for (const [dx, dy, r] of [[-6, -3, 2.2], [3, -5, 2.6], [8, -1, 1.6], [-2, 0, 1.4]]) sp.ball(dx * sx, cy + dy * sy, r * S, r * 0.8 * S, [spot[0], spot[0], hexc('#e8d8c0'), hexc('#c0a890')]);
  if (f.v % 4 === 2) sp.glow(0, cy, 14 * S, '#ff9040', 0.3);
  if (f.v % 4 === 1) sp.glow(0, cy, 14 * S, '#b070ff', 0.25);
  sp.shadowR = 12 * S;
  return sp;
}

// ---------------- 石翼のインプ（コウモリの役） ----------------
const STONE = R('#b8b0c8', '#867e9a', '#5a546e', '#3a3648');
const WING = R('#8a7e9e', '#62587a', '#433c58', '#2a2638');
function imp(f) {
  const S = f.elite ? 1.2 : 1;
  const sp = new Sprite(Math.ceil(56 * S), Math.ceil(64 * S), Math.floor(-28 * S), Math.floor(-58 * S));
  const flap = Math.sin(f.ph * Math.PI * 2);
  const z = (f.state === 'atk' ? 12 : 24 + Math.sin(f.t * 4) * 3) * S;
  const by = -z;
  // 奥の翼
  const wing = (dir, bias) => {
    const tipY = by - 12 * S - flap * 9 * S, midY = by - 4 * S - flap * 4 * S;
    sp.poly([[dir * 3 * S, by - 4 * S], [dir * 14 * S, tipY], [dir * 21 * S, midY + 2 * S], [dir * 16 * S, by + 3 * S], [dir * 10 * S, by + 1 * S], [dir * 4 * S, by + 3 * S]],
      bias ? WING.map((c, i) => WING[Math.min(3, i + 1)]) : WING, (u, v) => u * 0.7 + (dir > 0 ? v : 1 - v) * 0.3);
    sp.line(dir * 3 * S, by - 4 * S, dir * 14 * S, tipY, STONE[1]);
    sp.line(dir * 14 * S, tipY, dir * 16 * S, by + 3 * S, WING[3]);
  };
  wing(-1, true);
  // しっぽ
  sp.line(-3 * S, by + 5 * S, -9 * S, by + 10 * S, STONE[2]);
  sp.set(-10 * S, by + 11 * S, STONE[1]); sp.set(-9 * S, by + 11 * S, STONE[1]);
  // 体と頭
  sp.ball(0, by + 1 * S, 6 * S, 7 * S, STONE);
  sp.ball(2 * S, by - 7 * S, 5.5 * S, 5 * S, STONE);
  // 角
  sp.line(-1 * S, by - 11 * S, -3 * S, by - 15 * S, STONE[0]);
  sp.line(4 * S, by - 11 * S, 6 * S, by - 15 * S, STONE[0]);
  // 腕と爪
  sp.line(3 * S, by + 1 * S, 7 * S, by + 4 * S, STONE[2]);
  sp.set(8 * S, by + 5 * S, hexc('#fff0d0'));
  wing(1, false);
  // ひび割れ
  sp.set(-2 * S, by, STONE[3]); sp.set(-1 * S, by + 1 * S, STONE[3]); sp.set(-1 * S, by + 2 * S, STONE[3]);
  // 光る目
  const eyeC = f.elite ? '#ffd040' : '#ff7a2a';
  for (const dx of [2, 5]) { sp.set(dx * S, by - 7 * S, hexc(eyeC)); sp.glow(dx * S, by - 7 * S, 4, eyeC, 0.9); }
  sp.set(4 * S, by - 4 * S, hexc('#2a1a1a'));
  sp.shadowR = 7 * S;
  sp.shadowA = 0.25;
  return sp;
}

// ---------------- 錆鎧（スケルトンの役） ----------------
const RUST = R('#e8c8a8', '#b88a6a', '#7a5444', '#4a302c');
const IRON = R('#c8d0dc', '#8a94a8', '#5a6278', '#363c4e');
function armor(f) {
  const S = f.elite ? 1.12 : 1;
  const sp = new Sprite(Math.ceil(70 * S), Math.ceil(64 * S), Math.floor(-30 * S), Math.floor(-58 * S));
  const M = f.elite ? IRON : RUST;
  const walk = f.moving ? Math.sin(f.ph * Math.PI * 2) : 0;
  // 足
  for (const [d, bias] of [[-1, 0.25], [1, 0]]) {
    const fx = d * 3 * S + walk * d * 3 * S, lift = Math.max(0, walk * d) * 2 * S;
    sp.poly([[fx - 2.5 * S, -13 * S], [fx + 2.5 * S, -13 * S], [fx + 3 * S, -2 * S - lift], [fx - 3 * S, -2 * S - lift]], bias ? M.slice(1).concat(M[3]) : M);
    sp.rect(Math.round(fx - 3 * S), Math.round(-3 * S - lift), Math.round(7 * S), Math.round(3 * S), M[3]);
  }
  // 腰布（ぼろぼろ）
  sp.poly([[-6 * S, -16 * S], [6 * S, -16 * S], [5 * S, -9 * S], [2 * S, -11 * S], [0, -8 * S], [-3 * S, -11 * S], [-6 * S, -9 * S]], R('#8a3a3a', '#6a2a30', '#4a1c24', '#341420'));
  // 胴
  sp.poly([[-8 * S, -30 * S], [8 * S, -30 * S], [6 * S, -16 * S], [-6 * S, -16 * S]], M, (u, v) => u * 0.5 + v * 0.6);
  sp.line(0, -29 * S, 0, -18 * S, M[3]);
  for (const y of [-25, -21]) sp.line(-5 * S, y * S, 5 * S, y * S, M[2]);
  // 肩当て
  sp.ball(-7 * S, -29 * S, 4 * S, 3 * S, M, 0.15);
  // 兜
  sp.ball(1 * S, -37 * S, 6.5 * S, 6.5 * S, M);
  sp.rect(Math.round(-1 * S), Math.round(-38 * S), Math.round(8 * S), Math.round(2 * S), hexc('#120a10'));
  const eyeC = f.elite ? '#ffb040' : '#7ae0ff';
  sp.set(3 * S, -37 * S, hexc(eyeC)); sp.set(5 * S, -37 * S, hexc(eyeC));
  sp.glow(4 * S, -37 * S, 5, eyeC, 0.9);
  if (f.elite) { sp.line(1 * S, -44 * S, 1 * S, -48 * S, hexc('#e8c060')); sp.line(0, -48 * S, 2 * S, -48 * S, hexc('#e8c060')); }
  // 剣の腕
  let a = -1.0;
  if (f.state === 'wind') a = -2.3 - f.k * 0.5;
  else if (f.state === 'atk') a = -2.8 + Math.min(1, f.k * 2.2) * 3.6;
  const hx = 7 * S + Math.cos(a) * 7 * S, hy = -26 * S + Math.sin(a) * 7 * S;
  sp.line(7 * S, -28 * S, hx, hy, M[1]);
  const bx = hx + Math.cos(a) * 22 * S, byy = hy + Math.sin(a) * 22 * S;
  const ca = Math.cos(a), sa = Math.sin(a);
  for (let i = 3; i <= 22 * S; i += 0.5) {
    const x = hx + ca * i, y = hy + sa * i;
    sp.set(x, y, i > 20 * S ? IRON[0] : IRON[1]);
    sp.set(x - sa, y + ca, IRON[2]);
  }
  sp.line(hx - sa * 3, hy + ca * 3, hx + sa * 3, hy - ca * 3, hexc('#a07030'));
  sp.line(hx - ca * 3, hy - sa * 3, hx, hy, hexc('#5a3020'));
  sp.ball(hx, hy, 2 * S, 2 * S, M);
  sp.shadowR = 11 * S;
  sp.tip = [bx, byy];
  return sp;
}

// ---------------- 蝋燭の祈祷師（術師の役） ----------------
const WAX = R('#fffaf0', '#f0e2c8', '#cdb592', '#94785a');
const ROBE = R('#7a4aa0', '#55307a', '#3a2058', '#24143a');
function priest(f) {
  const S = f.elite ? 1.12 : 1;
  const sp = new Sprite(Math.ceil(48 * S), Math.ceil(70 * S), Math.floor(-24 * S), Math.floor(-64 * S));
  const z = (5 + Math.sin(f.t * 2) * 2) * S;
  const b = -z;
  // ローブ（裾が揺れる）
  const sw = Math.sin(f.t * 2.4) * 1.5;
  const hem = [];
  for (let i = 0; i <= 6; i++) hem.push([(-11 + i * 3.7) * S + sw * (1 - i / 6), b + (i % 2 ? -2 : 0)]);
  sp.poly([[-6 * S, b - 28 * S], [6 * S, b - 28 * S], ...hem.reverse()], ROBE, (u, v) => u * 0.4 + v * 0.7);
  sp.line(-10 * S, b - 2, 10 * S, b - 2, hexc('#d8b060'));
  // 蝋の体（溶けて垂れる）
  sp.ball(0, b - 31 * S, 6 * S, 7 * S, WAX);
  for (const [dx, l] of [[-4, 4], [-1, 6], [3, 3]]) sp.line(dx * S, b - 27 * S, dx * S, b - (27 - l) * S, WAX[1]);
  // 顔の穴
  sp.set(1 * S, b - 32 * S, hexc('#2a1a20')); sp.set(4 * S, b - 32 * S, hexc('#2a1a20'));
  sp.line(2 * S, b - 29 * S, 3 * S, b - 29 * S, hexc('#7a5a4a'));
  // 頭の上の蝋燭
  for (const [dx, h] of [[-4, 5], [0, 7], [4, 4]]) {
    sp.rect(Math.round(dx * S - 1), Math.round(b - (37 + h) * S), 2, Math.round(h * S), WAX[1]);
    const fy = b - (38 + h) * S, fl = Math.sin(f.t * 12 + dx) > 0 ? 1 : 0;
    sp.set(dx * S, fy - fl, hexc('#fff6c0')); sp.set(dx * S, fy - 1 - fl, hexc('#ffb040'));
    sp.glow(dx * S, fy - 1, 7, '#ffb040', 0.9);
  }
  // 腕と香炉
  const charge = f.state === 'wind' ? f.k : 0;
  const hx = 9 * S, hy = b - 20 * S;
  sp.line(4 * S, b - 24 * S, hx, hy, ROBE[1]);
  sp.ball(hx + 2 * S, hy + 2 * S, 3 * S, 3 * S, R('#ffe6a0', '#e0a040', '#a06020', '#603010'));
  sp.glow(hx + 2 * S, hy + 2 * S, 6 + charge * 10, '#ff8a3a', 0.7 + charge * 0.5);
  sp.orb = [hx + 2 * S, hy + 2 * S, charge];
  sp.shadowR = 9 * S;
  sp.shadowA = 0.3;
  return sp;
}

// ---------------- 苔の巨像（ボス） ----------------
const ROCK = [R('#c8c0b0', '#968e7e', '#6a6456', '#423e36'), R('#a8c098', '#748c66', '#4c6244', '#2e3e2a'), R('#d0a088', '#a0705a', '#704a3c', '#46302a'), R('#c8d4e4', '#94a2b8', '#66728a', '#40485c')];
function colossus(f) {
  const sp = new Sprite(130, 120, -65, -112);
  const M = ROCK[f.v % 4];
  const moss = R('#a8d070', '#78a848', '#4e7a30', '#2e4e1e');
  const walk = f.moving ? Math.sin(f.ph * Math.PI * 2) : 0;
  let armY = 0, armX = 0, lean = 0;
  if (f.state === 'wind' && f.atk === 'slam') { armY = -22 * f.k; lean = -2 * f.k; }
  else if (f.state === 'atk' && f.atk === 'slam') { armY = -22 + Math.min(1, f.k * 3) * 34; lean = 3; }
  else if (f.state === 'wind' && f.atk === 'throw') { armY = -16 * f.k; armX = -6 * f.k; }
  const bob = Math.abs(walk) * 2;
  // 脚
  for (const d of [-1, 1]) sp.ball(d * 12, -9 - Math.max(0, walk * d) * 2, 9, 9, M, d < 0 ? 0.2 : 0);
  // 奥の腕
  const arm = (d) => {
    const ax = d * 30 + (d > 0 ? armX : 0) + lean, ay = -44 + armY - bob;
    sp.ball(ax, ay, 10, 9, M, d < 0 ? 0.2 : 0);
    sp.ball(ax + d * 2, ay + 17 + armY * 0.15, 11, 10, M, d < 0 ? 0.25 : 0);
    sp.ball(ax + d * 2, ay + 13, 6, 3, moss, 0.1);
  };
  arm(-1);
  // 胴
  sp.ball(lean, -42 - bob, 24, 22, M);
  sp.ball(lean - 6, -60 - bob, 14, 5, moss);
  sp.ball(lean + 12, -56 - bob, 8, 3, moss);
  for (let i = 0; i < 6; i++) sp.line(lean - 16 + i * 6, -60 - bob, lean - 15 + i * 6, -55 - bob + (i % 2) * 3, moss[2]);
  // 核の結晶
  const core = f.enraged ? '#ff4a2a' : '#7affd0';
  const cc = f.enraged ? R('#ffd0c0', '#ff6a40', '#c02a1a', '#6a1010') : R('#e0fff4', '#7affd0', '#30b090', '#146050');
  sp.poly([[lean, -50 - bob], [lean + 5, -42 - bob], [lean, -34 - bob], [lean - 5, -42 - bob]], cc, (u, v) => v * 0.6 + u * 0.4);
  sp.glow(lean, -42 - bob, 22, core, 0.8);
  // 頭
  sp.ball(lean + 3, -68 - bob, 11, 9, M);
  sp.rect(lean + 4, -69 - bob, 6, 2, hexc('#120c08'));
  sp.set(lean + 7, -69 - bob, hexc(core)); sp.glow(lean + 7, -69 - bob, 7, core, 1);
  arm(1);
  sp.shadowR = 34;
  sp.shadowA = 0.42;
  return sp;
}

const BUILD = { slime: sporeling, slimeL: (f) => sporeling({ ...f, big: true }), bat: imp, skel: armor, mage: priest, golem: colossus };

/** f: { type, v, elite, state, k(状態の進み 0..1), moving, ph(歩きの位相 0..1), t, atk, enraged }、flip で左向き */
export function monsterPixels(f, flip) {
  const sp = BUILD[f.type](f);
  const out = sp.finish(flip);
  out.shadowR = sp.shadowR || 10;
  out.shadowA = sp.shadowA || 0.38;
  if (sp.orb) out.orb = [flip ? -sp.orb[0] : sp.orb[0], sp.orb[1], sp.orb[2]];
  return out;
}

export const MONSTER_NAMES = { slime: '胞子キノコ', slimeL: '大胞子キノコ', bat: '石翼のインプ', skel: '錆鎧', mage: '蝋燭の祈祷師', golem: '苔の巨像' };
