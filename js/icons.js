// UI 用のアイコン：武器は骨格キャラから切り抜いた絵、スキルは pixelfx のエフェクトの 1 コマ。
import { weaponSprite, scrollSprite, bake } from './pix.js';
import { FX, FIRE_RAMP } from './fxlib.js';
import { heroPixels, heroPose, COSTUMES } from './hero.js';
import { SKILLS } from './data.js';
import { rgba } from './util.js';

const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

// 中身のある範囲を切り抜き、S×S に整数倍で収める
function fit(src, S, bg) {
  const x = src.getContext('2d'), d = x.getImageData(0, 0, src.width, src.height).data;
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < src.height; y++) for (let i = 0; i < src.width; i++) if (d[(y * src.width + i) * 4 + 3] > 20) { x0 = Math.min(x0, i); y0 = Math.min(y0, y); x1 = Math.max(x1, i); y1 = Math.max(y1, y); }
  const out = mk(S, S), c = out.getContext('2d');
  if (bg) { const g = c.createRadialGradient(S / 2, S * 0.4, 1, S / 2, S / 2, S * 0.55); g.addColorStop(0, rgba(bg, 0.45)); g.addColorStop(1, 'rgba(10,8,14,0)'); c.fillStyle = g; c.fillRect(0, 0, S, S); }
  if (x1 < 0) return out;
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const k = Math.max(1, Math.floor((S * 0.86) / Math.max(w, h)));
  c.imageSmoothingEnabled = false;
  c.drawImage(src, x0, y0, w, h, Math.round((S - w * k) / 2), Math.round((S - h * k) / 2), w * k, h * k);
  return out;
}

const cache = new Map();
export function itemIcon(it, S = 56) {
  const key = (it.cat === 'weapon' ? it.base + it.rarity : 'scroll' + it.skill) + S;
  if (cache.has(key)) return cache.get(key);
  let c;
  if (it.cat === 'weapon') c = fit(weaponSprite(it.base, it.rarity), S * 2);
  else {
    const sc = scrollSprite(), tmp = mk(sc.width + 6, sc.height + 6), t = tmp.getContext('2d');
    t.drawImage(sc, 3, 3);
    t.fillStyle = SKILLS[it.skill].color; t.fillRect(5, 2, 4, 4);
    c = fit(tmp, S * 2);
  }
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}

const SK = {
  fireball: [FX.fireball, {}, 0.4, 136, 56, 112, 28],
  whirl: [FX.spinSlash, {}, 0.12, 208, 104, 104, 84],
  dash: [FX.blinkOut, { palette: ['#062a26', '#0e5a52', '#1a8a7a', '#3ac0a8', '#7fe8d6', '#c8fff4', '#ffffff'] }, 0.18, 136, 96, 68, 80],
  heal: [FX.heal, {}, 0.7, 80, 104, 40, 92],
  nova: [FX.frostNova, {}, 0.55, 288, 192, 144, 150],
  chain: [FX.zapHit, {}, 0.08, 144, 112, 72, 80],
  ward: [FX.divineShield, { palette: ['#0e2a12', '#1e5a28', '#3a8a46', '#6ac078', '#9fe6a0', '#d8ffd8', '#ffffff'] }, 0.6, 88, 84, 44, 68],
};
export function skillIconURL(id, S = 48) {
  const key = 'sk' + id + S;
  if (cache.has(key)) return cache.get(key);
  const [mod, o, t, w, h, ox, oy] = SK[id];
  const url = fit(bake(mod, o, t, w, h, ox, oy), S * 2, SKILLS[id].color).toDataURL();
  cache.set(key, url);
  return url;
}

/** キャラクター画面・タイトル用の大きな主人公 */
export function drawPortrait(c, me, t, k = 5, cx, footY) {
  const h = { ...me, aim: me.portraitAim ?? 0.25, moveAmt: 0, atkT: 9, atkDur: 0.3, dodgeT: 0, down: false, skillAnim: null };
  const pose = heroPose(h, t);
  const ci = me.id === 1 ? 1 : 0;
  const o = heroPixels(pose, COSTUMES[ci], me.weapon ? me.weapon.rarity : 0);
  const tmp = mk(o.w, o.h);
  tmp.getContext('2d').putImageData(new ImageData(o.rgba, o.w, o.h), 0, 0);
  c.imageSmoothingEnabled = false;
  c.drawImage(tmp, Math.round(cx + o.ox * k), Math.round(footY + o.oy * k), o.w * k, o.h * k);
}
export { FIRE_RAMP };
