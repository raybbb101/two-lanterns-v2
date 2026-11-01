// 主人公：pixelfx の 3D 骨格キャラクター（rig）をポーズで動かし、衣装の色に塗り替えて描く。
import { posed, posedParts } from '../pixelfx/src/core/rig.js';
import { hex } from '../pixelfx/src/core/color.js';
import { DUMMY_PAL } from '../pixelfx/src/core/actor.js';
import { READY } from '../pixelfx/src/core/poses.js';

const C = (h) => hex(h) >>> 0;
const W0 = 24, H0 = 38;

// マネキンの色 → 明るさの段（0 が一番明るい）
const TONE = new Map([
  [C(DUMMY_PAL.A), 0], [C(DUMMY_PAL.B), 1], [C(DUMMY_PAL.C), 2], [C(DUMMY_PAL.D), 3],
  [C(DUMMY_PAL.E), 1], [C(DUMMY_PAL.F), 2], [C(DUMMY_PAL.G), 3], [C(DUMMY_PAL.J), 3], [C(DUMMY_PAL.m), 1],
]);
const INK = C(DUMMY_PAL.k);

// 立ち姿の各ピクセルがどの部位か（服の塗り分けに使う）
const PART = { pelvis: 1, waist: 2, chest: 3, neck: 4, head: 5, face: 6, upperN: 7, elbowN: 8, foreN: 9, handN: 10, upperF: 11, elbowF: 12, foreF: 13, handF: 14, thighN: 15, kneeN: 16, shinN: 17, footN: 18, thighF: 19, kneeF: 20, shinF: 21, footF: 22 };
const MAT_OF = {
  1: 'skirt', 2: 'belt', 3: 'tunic', 4: 'skin', 5: 'hair', 6: 'skin',
  7: 'sleeve', 8: 'sleeve', 9: 'bracer', 10: 'glove', 11: 'sleeve', 12: 'sleeve', 13: 'bracer', 14: 'glove',
  15: 'pants', 16: 'pants', 17: 'pants', 18: 'boots', 19: 'pants', 20: 'pants', 21: 'pants', 22: 'boots',
};
let REST = null;
function restMap() {
  if (REST) return REST;
  REST = new Array(W0 * H0).fill(null);
  for (const pt of posedParts({})) {
    for (let i = 0; i < pt.n; i++) {
      if (pt.color[i] === INK) continue;
      const c = pt.xs[i] + 12, r = pt.ys[i] + 38;
      if (c >= 0 && r >= 0 && c < W0 && r < H0) REST[r * W0 + c] = MAT_OF[pt.part] || null;
    }
  }
  // 頭：前（右）側の下半分を顔、上と後ろを髪に
  for (let r = 0; r < 8; r++) for (let c = 0; c < W0; c++) {
    const i = r * W0 + c;
    if (REST[i] !== 'hair' && REST[i] !== 'skin') continue;
    if (r <= 5) REST[i] = r >= 2 && c >= 13 ? 'skin' : 'hair';
  }
  REST[1 * W0 + 15] = 'hair';
  for (const [c, r] of [[14, 3], [16, 3]]) REST[r * W0 + c] = 'eye';
  return REST;
}

const ramp = (...h) => h.map(C);
export const COSTUMES = [
  {
    hair: ramp('#e0864a', '#b4532c', '#86361f', '#5a2216'), skin: ramp('#ffd9b8', '#f0b48a', '#d08a66', '#a8644a'),
    tunic: ramp('#e4584a', '#b8343a', '#86202e', '#5a1424'), skirt: ramp('#b8343a', '#86202e', '#5a1424', '#3e0e1c'),
    sleeve: ramp('#d0484a', '#a02c36', '#741c2a', '#4e1220'), bracer: ramp('#a0683c', '#7a4a2a', '#56321e', '#3a2014'),
    glove: ramp('#8a5a36', '#6a4026', '#4a2a1a', '#2e1a10'), belt: ramp('#e8c060', '#a87a30', '#6a4a20', '#4a3014'),
    pants: ramp('#5a5270', '#433d58', '#302b42', '#211d2e'), boots: ramp('#8a5634', '#643c22', '#462818', '#2e1a10'),
    eye: C('#1c1830'), eyeLow: C('#3a5aa0'), cape: ramp('#c23a3e', '#8a2430', '#5e1626', '#3c0c1a'), name: '#ff8a6a',
  },
  {
    hair: ramp('#ffffff', '#d6dcf0', '#a4abc8', '#747a9a'), skin: ramp('#ffe4cc', '#f2c4a2', '#d49c7a', '#aa7258'),
    tunic: ramp('#5ad0c0', '#2f9a92', '#1e6a6a', '#124646'), skirt: ramp('#2f9a92', '#1e6a6a', '#124646', '#0a2e30'),
    sleeve: ramp('#48bcb0', '#28888a', '#1a5c5e', '#103c40'), bracer: ramp('#6a7a8a', '#4c5a6a', '#34404c', '#222a34'),
    glove: ramp('#5a6070', '#404554', '#2c303c', '#1c1f28'), belt: ramp('#e8e0c8', '#a89c78', '#6a6250', '#443e32'),
    pants: ramp('#4a4e66', '#363a4e', '#262938', '#191b26'), boots: ramp('#5a4a6a', '#3e3250', '#2a2238', '#1a1424'),
    eye: C('#2a1838'), eyeLow: C('#8a4ac0'), cape: ramp('#3aa8a0', '#21706e', '#144a4c', '#0a2e30'), name: '#7fe0d6',
  },
];

// 武器の金属をレアリティの色に
const STEEL = { hi: C('#ffffff'), a: C('#e8edf6'), b: C('#a4afc6'), d: C('#68748f') };
const RARE_TINT = [
  null,
  ramp('#f4fff0', '#c8f0b8', '#7fc86a', '#4a8a40'),
  ramp('#f0f8ff', '#b8dcff', '#5fa0f0', '#3a62b0'),
  ramp('#fff0ff', '#e4c0ff', '#b07ae8', '#6a40a8'),
  ramp('#fffbe8', '#ffe6a0', '#f0b040', '#a86a20'),
];

export const RIG_WEAPON = { sword: 'sword', dagger: 'dagger', axe: 'hammer', spear: 'spear', bow: 'bow', staff: 'staff' };

/** ポーズ → 色付きピクセル { w, h, ox, oy, rgba(Uint8ClampedArray) }。ox, oy は足元から左上へのずれ。 */
export function heroPixels(pose, costume, rarity = 0) {
  const rest = restMap();
  const r = posed(pose);
  const w = r.x1 - r.x0 + 1, h = r.y1 - r.y0 + 1;
  const out = new Uint8ClampedArray(w * h * 4);
  const tint = RARE_TINT[rarity];
  for (let i = 0; i < r.n; i++) {
    let col = r.color[i];
    if (r.ink[i] || col === INK) col = C('#140f1c');
    else {
      const tone = TONE.get(col);
      const s = r.src[i];
      const mat = s >= 0 ? rest[s] : null;
      if (tone != null && mat) {
        const m = costume[mat];
        col = Array.isArray(m) ? m[tone] : m;
      } else if (tint && tone == null) {
        if (col === STEEL.hi) col = tint[0];
        else if (col === STEEL.a) col = tint[1];
        else if (col === STEEL.b) col = tint[2];
        else if (col === STEEL.d) col = tint[3];
      }
    }
    const j = ((r.ys[i] - r.y0) * w + (r.xs[i] - r.x0)) * 4;
    out[j] = col & 255; out[j + 1] = (col >>> 8) & 255; out[j + 2] = (col >>> 16) & 255; out[j + 3] = 255;
  }
  return { w, h, ox: r.x0, oy: r.y0, rgba: out };
}

// ---------------- ポーズ ----------------
// 武器ごとの構えと攻撃。どれも右向き。p は攻撃の進み具合 0..1。
const LANTERN_HAND = { bx: 7, by: -15 };
const STANCES = {
  sword: { ...READY, weapon: 'sword', fx: 12, fy: -21, sa: -0.85, ...LANTERN_HAND },
  dagger: { ...READY, weapon: 'dagger', fx: 11, fy: -21, sa: -0.4, ...LANTERN_HAND },
  hammer: { ...READY, weapon: 'hammer', two: false, sa: -1.2, fx: 10, fy: -22, crouch: 3, ...LANTERN_HAND },
  spear: { ...READY, weapon: 'spear', fx: 10, fy: -21, sa: -0.25, ...LANTERN_HAND },
  bow: { ...READY, weapon: 'bow', sa: -0.4, fx: 12, fy: -20, ...LANTERN_HAND },
  staff: { ...READY, weapon: 'staff', fx: 10, fy: -21, sa: -1.25, ...LANTERN_HAND },
};

const lerpP = (a, b, u) => {
  const o = { ...b };
  for (const k of Object.keys(b)) if (typeof b[k] === 'number' && typeof a[k] === 'number') o[k] = a[k] + (b[k] - a[k]) * u;
  return o;
};
const seq = (keys, p) => {
  for (let i = 1; i < keys.length; i++) {
    const [t0, a] = keys[i - 1], [t1, b] = keys[i];
    if (p <= t1) return lerpP(a, b, Math.min(1, Math.max(0, (p - t0) / (t1 - t0 || 1))));
  }
  return keys[keys.length - 1][1];
};

function attackPose(kind, base, p, alt) {
  const S = base;
  switch (kind) {
    case 'sword': {
      const W = { ...S, crouch: 4, lean: -3, fx: -6, fy: -35, sa: -2.6, bx: 9, by: -25, armsFront: true, ffx: 9, fbx: -8 };
      const CUT = { ...S, crouch: 2, lean: 3, fx: 16, fy: -36, sa: -1.4, bx: -7, by: -24, ffx: 11, fbx: -10 };
      const DOWN = { ...S, crouch: 5, lean: 5, fx: 20, fy: -21, sa: 0.62, bx: -9, by: -24, ffx: 13, fbx: -10 };
      const LOW = { ...S, crouch: 5, lean: 4, fx: 18, fy: -18, sa: 0.9, bx: -6, by: -22, ffx: 12, fbx: -9 };
      const UP = { ...S, crouch: 2, lean: 2, fx: 16, fy: -36, sa: -2.0, bx: -6, by: -24, ffx: 11, fbx: -9 };
      return alt ? seq([[0, LOW], [0.18, UP], [0.55, UP], [1, S]], p) : seq([[0, W], [0.12, CUT], [0.25, DOWN], [0.6, DOWN], [1, S]], p);
    }
    case 'dagger': {
      const STAB = { ...S, crouch: 4, lean: 4, fx: 20, fy: -24, sa: alt ? 0.25 : -0.25, ffx: 11, fbx: -9 };
      return seq([[0, { ...S, fx: 6, fy: -26 }], [0.2, STAB], [0.6, STAB], [1, S]], p);
    }
    case 'hammer': {
      const TOP = { ...S, two: true, crouch: 0, lean: -3, fx: 3, fy: -41, sa: -2.1, ffx: 8, ffy: -8, fbx: -5, toeB: true };
      const SLAM = { ...S, two: true, crouch: 7, lean: 6, fx: 14, fy: -19, sa: 0.62, ffx: 11, fbx: -10 };
      return seq([[0, TOP], [0.22, SLAM], [0.7, SLAM], [1, S]], p);
    }
    case 'spear': {
      const BACK = { ...S, crouch: 5, lean: -3, fx: -3, fy: -19, sa: -0.05, bx: 8, by: -30, armsFront: true, ffx: 10, fbx: -8 };
      const LUNGE = { ...S, crouch: 6, lean: 6, fx: 23, fy: -20, sa: 0, bx: -8, by: -24, ffx: 15, fbx: -11, toeB: true };
      return seq([[0, BACK], [0.15, LUNGE], [0.55, LUNGE], [1, S]], p);
    }
    case 'bow': {
      const AIM = { ...S, crouch: 3, lean: 1, fx: 18, fy: -28, sa: 0, bx: 10, by: -27, ffx: 11, fbx: -9 };
      const LOOSED = { ...AIM, bx: -9, by: -32 };
      const DRAWN = { ...AIM, bx: -3, by: -29, pull: true, nocked: true };
      return seq([[0, LOOSED], [0.4, AIM], [0.8, DRAWN], [1, DRAWN]], p);
    }
    case 'staff': {
      const RAISE = { ...S, crouch: 2, lean: -2, fx: 4, fy: -38, sa: -1.7, bx: 6, by: -24 };
      const POINT = { ...S, crouch: 4, lean: 4, fx: 20, fy: -27, sa: -0.15, ffx: 11, fbx: -8 };
      return seq([[0, RAISE], [0.2, POINT], [0.6, POINT], [1, S]], p);
    }
  }
  return S;
}

/**
 * 主人公の今のポーズ。h: { weapon, atkT, atkDur, atkSeq, moveAmt, walkPh, dodgeT, dodgeDur, down, skillAnim, aim }
 */
export function heroPose(h, t) {
  const kind = RIG_WEAPON[h.weapon ? h.weapon.base : 'sword'];
  const S = STANCES[kind];
  const left = Math.cos(h.aim) < 0;
  // 上下を狙うと少しこちら／奥を向く
  const tilt = Math.max(-0.6, Math.min(0.6, Math.sin(h.aim) * 0.7));
  let yaw = left ? Math.PI - tilt : tilt;
  let pose;
  if (h.down) {
    pose = { ...S, crouch: 12, lean: 10, fx: 14, fy: -4, sa: 0.2, bx: 10, by: -4, ffx: 4, fbx: -8 };
  } else if (h.dodgeT > 0) {
    const k = 1 - h.dodgeT / h.dodgeDur;
    pose = { ...S, crouch: 10 - Math.abs(k - 0.5) * 6, lean: 9, fx: 8, fy: -14, bx: 6, by: -14, ffx: 6, fbx: -5, ffy: -6 };
  } else if (h.skillAnim && h.skillAnim.id === 'whirl' && h.skillAnim.t < 0.4) {
    const k = h.skillAnim.t / 0.4;
    pose = { ...S, crouch: 5, lean: 3, fx: 21, fy: -21, sa: 0.05, bx: -9, by: -23, ffx: 11, fbx: -11 };
    yaw += k * Math.PI * 2;
  } else if (h.atkDur && h.atkT < h.atkDur) {
    const k = h.weapon ? attackKind(h.weapon.base) : 'sword';
    pose = attackPose(k, S, h.atkT / h.atkDur, h.atkSeq % 2);
  } else if (h.skillAnim && h.skillAnim.t < 0.35) {
    const RAISE = { ...S, crouch: 3, lean: -2, fx: 4, fy: -36, bx: -4, by: -34, turn: 1 };
    pose = RAISE;
  } else {
    const mv = h.moveAmt || 0;
    const ph = h.walkPh || 0;
    if (mv > 0.15) {
      const s = Math.sin(ph);
      pose = {
        ...S, crouch: 3 + Math.abs(Math.cos(ph)) * 2 * mv, lean: 2 * mv,
        ffx: 1 + s * 8 * mv, fbx: 1 - s * 8 * mv,
        ffy: -4 - Math.max(0, -Math.cos(ph)) * 4 * mv, fby: -4 - Math.max(0, Math.cos(ph)) * 4 * mv,
        by: S.by - s * 2, fy: S.fy + s * 1.5,
      };
    } else {
      const b = Math.sin(t * 2.2 + (h.id || 0)) * 0.8;
      pose = { ...S, crouch: S.crouch + b };
    }
  }
  pose.yaw = yaw;
  return pose;
}

export const attackKind = (base) => RIG_WEAPON[base];

/** キャッシュ用のキー（rig 自体も丸めてキャッシュする） */
export function poseKey(pose) {
  let s = '';
  for (const k of Object.keys(pose).sort()) {
    const v = pose[k];
    if (v === undefined) continue;
    s += k + (typeof v === 'number' ? Math.round(v * (k === 'yaw' || k === 'sa' ? 12 : 1)) : v) + ',';
  }
  return s;
}
