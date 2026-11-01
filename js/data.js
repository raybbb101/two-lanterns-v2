import { rand, pick, uid } from './util.js';

export const RARITY = [
  { name: 'コモン', color: '#c9c2b2', mult: 1.0 },
  { name: 'アンコモン', color: '#7fd16f', mult: 1.16 },
  { name: 'レア', color: '#5fa8ff', mult: 1.34 },
  { name: 'エピック', color: '#c983ff', mult: 1.58 },
  { name: 'レジェンド', color: '#ffb340', mult: 1.9 },
  { name: '神話', color: '#ff5f7e', mult: 2.4 }, // 合成でしか手に入らない
];
// 合成に必要な本数：レアリティが高いほど少ない
export const FUSE_COST = [5, 4, 3, 2, 2];

export const WEAPONS = {
  sword: { name: '長剣', kind: 'melee', dmg: 15, rate: 0.4, range: 66, arc: 2.1, knock: 190, legend: '暁の聖剣' },
  dagger: { name: '短剣', kind: 'melee', dmg: 9, rate: 0.22, range: 50, arc: 1.7, knock: 90, legend: '影縫い' },
  axe: { name: '戦鎚', kind: 'melee', dmg: 28, rate: 0.75, range: 74, arc: 2.7, knock: 380, legend: '巨人殺し' },
  spear: { name: '槍', kind: 'thrust', dmg: 17, rate: 0.48, range: 98, arc: 0.55, knock: 230, legend: '天穿つ槍' },
  bow: { name: '長弓', kind: 'bow', dmg: 13, rate: 0.46, speed: 640, knock: 110, legend: '流星の弓' },
  staff: { name: '魔杖', kind: 'staff', dmg: 16, rate: 0.55, speed: 430, knock: 130, legend: '星詠みの杖' },
};

export const AFFIX = {
  burn: { pre: '炎の', desc: '命中時、敵を炎上させる' },
  frost: { pre: '氷の', desc: '命中時、敵を鈍足にする' },
  vamp: { pre: '吸血の', desc: '与えたダメージの6%を回復' },
  swift: { pre: '疾風の', desc: '攻撃速度 +18%' },
  crit: { pre: '必殺の', desc: '会心率 +15%' },
  heavy: { pre: '剛力の', desc: 'ノックバック +60%' },
};
// 効果の数：コモンは無し、そこから 1 つずつ増える
const AFFIX_COUNT = [0, 1, 2, 3, 4, 5];

// ---------- スキル ----------
// p: 基本の強さ（dmg は攻撃力とレベル、heal/shield は回復力とレベルで伸びる）。up: レベルごとに増える値
const S = (name, cd, color, aim, p, desc, up = {}) => ({ name, cd, color, aim, p, desc, up });
export const SKILLS = {
  fireball: S('火球', 4.5, '#ff7a2e', 'enemy', { dmg: 34 }, (p) => `爆発する火球を放つ。範囲に ${p.dmg} ダメージ＋炎上。`),
  whirl: S('旋風斬', 6, '#efe6cf', 'self', { dmg: 26 }, (p) => `周囲を薙ぎ払い ${p.dmg} ダメージ。敵を吹き飛ばす。`),
  dash: S('疾風ステップ', 5, '#7fe8d6', 'enemy', { dmg: 22 }, (p) => `敵へ駆け抜け、通過した敵に ${p.dmg} ダメージ。無敵。`),
  heal: S('癒しの灯', 12, '#ffd27a', 'self', { heal: 35 }, (p) => `自分と近くの仲間の HP を ${p.heal} 回復する。`),
  nova: S('氷結ノヴァ', 9, '#8fd8ff', 'self', { dmg: 16, dot: 12, dur: 2 }, (p) => `周囲を凍らせ ${p.dmg} ダメージ＋鈍足。氷が ${p.dur} 秒残り、踏んだ敵に毎秒 ${p.dot} ダメージ。`, { dur: 0.5 }),
  chain: S('連鎖雷', 7, '#b7a3ff', 'enemy', { dmg: 22, jumps: 3 }, (p) => `雷が敵から敵へ ${p.jumps} 回跳ね、各 ${p.dmg} ダメージ。`, { jumps: 0.5 }),
  ward: S('守護の結界', 16, '#9fe6a0', 'self', { shield: 35, dur: 8 }, (p) => `自分と近くの仲間に ${p.shield} のシールドを張る（${p.dur} 秒）。`),
  // 剣士
  bash: S('盾打ち', 7, '#d8c090', 'enemy', { dmg: 24, stun: 1.5 }, (p) => `前方の敵を打ち ${p.dmg} ダメージ。${p.stun} 秒気絶させる。`, { stun: 0.2 }),
  warcry: S('鬨の声', 18, '#ffb060', 'self', { atk: 15, def: 10, dur: 8 }, (p) => `自分と近くの仲間の攻撃 +${p.atk}%、被ダメージ -${p.def}%（${p.dur} 秒）。`, { atk: 3, def: 2 }),
  quake: S('地割れ', 8, '#c8905a', 'enemy', { dmg: 38 }, (p) => `地面を裂く一直線の岩の刃。${p.dmg} ダメージ。`),
  roar: S('怒りの咆哮', 16, '#ff5a4a', 'self', { atk: 30, haste: 15, dur: 6 }, (p) => `${p.dur} 秒間、攻撃 +${p.atk}%、攻撃速度 +${p.haste}%。`, { atk: 5, dur: 0.5 }),
  // 弓使い
  pierce: S('貫通矢', 6, '#ffd870', 'enemy', { dmg: 40 }, (p) => `敵を貫く矢。線上のすべての敵に ${p.dmg} ダメージ。`),
  focus: S('集中', 18, '#fff0a0', 'self', { crit: 25, dur: 8 }, (p) => `自分と近くの仲間の会心率 +${p.crit}%（${p.dur} 秒）。`, { crit: 4 }),
  thorns: S('茨の罠', 9, '#8ac850', 'enemy', { dot: 14, dur: 4 }, (p) => `敵の足元に茨。${p.dur} 秒、毎秒 ${p.dot} ダメージ＋鈍足。`, { dur: 0.5 }),
  rain: S('矢の雨', 11, '#ffe0a0', 'enemy', { dot: 32, dur: 2.5 }, (p) => `敵のいる場所に矢が降る。${p.dur} 秒、毎秒 ${p.dot} ダメージ。`),
  snare: S('蔓の束縛', 14, '#a8c860', 'self', { dmg: 12, stun: 2 }, (p) => `周囲の敵を蔓で縛り ${p.dmg} ダメージ。${p.stun} 秒動けなくする。`, { stun: 0.25 }),
  // 魔導士
  pillar: S('火柱', 8, '#ff9a3a', 'enemy', { dmg: 55 }, (p) => `敵の足元から火柱。${p.dmg} ダメージ＋炎上。`),
  meteor: S('隕石', 18, '#ff6a2a', 'enemy', { dmg: 110 }, (p) => `少し遅れて隕石が落ちる。広い範囲に ${p.dmg} ダメージ＋炎上。`),
  lance: S('氷槍', 4, '#a6ecff', 'enemy', { dmg: 34 }, (p) => `氷の槍を放つ。${p.dmg} ダメージ＋鈍足。`),
  strike: S('落雷', 9, '#c8b8ff', 'enemy', { dmg: 70 }, (p) => `一番近い敵に雷を落とす。${p.dmg} ダメージ。`),
  // 癒し手
  bloom: S('癒しの花', 12, '#f0a8c8', 'self', { hot: 12, dur: 5 }, (p) => `足元に花が咲く。${p.dur} 秒、中にいる仲間を毎秒 ${p.hot} 回復。`, { dur: 0.5 }),
  bless: S('祝福', 20, '#ffe68a', 'self', { heal: 20, atk: 12, def: 12, dur: 10 }, (p) => `仲間を ${p.heal} 回復し、攻撃 +${p.atk}%、被ダメージ -${p.def}%（${p.dur} 秒）。`, { atk: 2, def: 2 }),
  miracle: S('奇跡', 45, '#fff6c8', 'self', { heal: 120 }, (p) => `どこにいても仲間を蘇生し、全員を ${p.heal} 回復する。`),
  smite: S('裁きの光', 6, '#ffe8a0', 'enemy', { dmg: 46, heal: 12 }, (p) => `敵に光を落とし ${p.dmg} ダメージ。自分を ${p.heal} 回復。`),
  hpillar: S('聖柱', 13, '#fff0b8', 'enemy', { dmg: 30, heal: 25 }, (p) => `光の柱。範囲の敵に ${p.dmg} ダメージ、範囲の仲間を ${p.heal} 回復。`),
  // 影の刃
  flurry: S('短刀乱舞', 7, '#c7b8ff', 'enemy', { dmg: 12, hits: 5 }, (p) => `近くの敵を ${p.hits} 回切り刻む。各 ${p.dmg} ダメージ。`, { hits: 0.5 }),
  shadowstep: S('影渡り', 8, '#9a80e0', 'enemy', { dmg: 50 }, (p) => `一番近い敵の背後へ瞬間移動し ${p.dmg} ダメージ。`),
  poison: S('毒雲', 11, '#b0d040', 'enemy', { dot: 16, dur: 5 }, (p) => `毒の雲を広げる。${p.dur} 秒、毎秒 ${p.dot} ダメージ。`, { dur: 0.5 }),
  curse: S('呪い', 10, '#a060e0', 'enemy', { amp: 35, dur: 6 }, (p) => `敵に呪いをかけ、受けるダメージ +${p.amp}%（${p.dur} 秒）。`, { amp: 5 }),
  drain: S('吸命', 8, '#8060c0', 'enemy', { dmg: 40, heal: 20 }, (p) => `敵の命を吸い ${p.dmg} ダメージ。自分を ${p.heal} 回復。`),
};
// マップで巻物として拾えるスキル（それ以外はスキルツリー専用）
export const SCROLL_POOL = ['fireball', 'whirl', 'dash', 'heal', 'nova', 'chain', 'ward', 'lance', 'bloom', 'poison', 'strike'];

export function skillPower(id, lvl, s = {}) {
  const b = SKILLS[id], L = lvl - 1, r = {};
  const m = (1 + 0.25 * L) * (s.atk ?? 1), hm = (1 + 0.2 * L) * (s.heal ?? 1);
  r.cd = +(b.cd * (1 - 0.06 * L) * (1 - (s.cdr || 0))).toFixed(1);
  for (const [k, v] of Object.entries(b.p)) {
    if (k === 'dmg' || k === 'dot') r[k] = Math.round(v * m);
    else if (k === 'heal' || k === 'shield' || k === 'hot') r[k] = Math.round(v * hm);
    else r[k] = +(v + (b.up[k] || 0) * L).toFixed(2);
  }
  if (r.jumps) r.jumps = Math.floor(r.jumps);
  if (r.hits) r.hits = Math.floor(r.hits);
  return r;
}

function rollRarity(floor, bonus = 0) {
  const luck = floor * 0.035 + bonus;
  const r = Math.random();
  if (r < 0.012 + luck * 0.18) return 4;
  if (r < 0.05 + luck * 0.45) return 3;
  if (r < 0.17 + luck * 0.8) return 2;
  if (r < 0.5 + luck) return 1;
  return 0;
}

function moreAffixes(have, n) {
  const a = [...have], pool = Object.keys(AFFIX);
  while (a.length < n) { const x = pick(pool); if (!a.includes(x)) a.push(x); }
  return a;
}

export function makeWeapon(base, rarity, floor = 1, affixes = []) {
  const b = WEAPONS[base];
  const rr = RARITY[rarity];
  const scale = 1 + 0.11 * (floor - 1);
  const it = {
    id: uid(), cat: 'weapon', base, rarity, affixes,
    dmg: Math.max(1, Math.round(b.dmg * rr.mult * scale * rand(0.92, 1.08))),
    rate: +(b.rate * (affixes.includes('swift') ? 0.82 : 1)).toFixed(3),
    crit: +(0.06 + rarity * 0.012 + (affixes.includes('crit') ? 0.15 : 0)).toFixed(3),
  };
  it.name = weaponName(base, rarity, affixes);
  return it;
}
const weaponName = (base, rarity, affixes) => {
  const b = WEAPONS[base];
  if (rarity === 5) return `神話・${b.legend}`;
  if (rarity === 4) return b.legend;
  return (affixes.length ? AFFIX[affixes[0]].pre : '') + b.name;
};

export function rollWeapon(floor, bonus = 0) {
  const rarity = rollRarity(floor, bonus);
  return makeWeapon(pick(Object.keys(WEAPONS)), rarity, floor, moreAffixes([], AFFIX_COUNT[rarity]));
}

/** 同じ武器種・同じレアリティの武器を合成して 1 段上の武器にする。一番強かった武器を引き継ぐ */
export function fuseWeapons(list) {
  const best = list.reduce((a, b) => (b.dmg > a.dmg ? b : a));
  const rarity = best.rarity + 1;
  const affixes = moreAffixes(best.affixes, AFFIX_COUNT[rarity]);
  const b = WEAPONS[best.base];
  return {
    id: uid(), cat: 'weapon', base: best.base, rarity, affixes,
    dmg: Math.round((best.dmg * RARITY[rarity].mult) / RARITY[best.rarity].mult),
    rate: +(b.rate * (affixes.includes('swift') ? 0.82 : 1)).toFixed(3),
    crit: +(0.06 + rarity * 0.012 + (affixes.includes('crit') ? 0.15 : 0)).toFixed(3),
    name: weaponName(best.base, rarity, affixes),
  };
}

export function makeScroll(skill) {
  return { id: uid(), cat: 'skill', skill, rarity: 2, name: `巻物「${SKILLS[skill].name}」` };
}

// ---------- 防具 ----------
export const GEAR_SLOTS = {
  head: { name: '兜', stat: 'hp', v: 12 },
  body: { name: '鎧', stat: 'def', v: 0.03 },
  hands: { name: '手甲', stat: 'atk', v: 0.04 },
  feet: { name: '靴', stat: 'speed', v: 0.025 },
  charm: { name: '護符', stat: 'cdr', v: 0.02 },
};
export const STAT_INFO = {
  hp: ['最大HP', (v) => `+${Math.round(v)}`],
  hpp: ['最大HP', (v) => `+${Math.round(v * 100)}%`],
  def: ['被ダメージ', (v) => `-${Math.round(v * 100)}%`],
  atk: ['攻撃力', (v) => `+${Math.round(v * 100)}%`],
  speed: ['移動速度', (v) => `+${Math.round(v * 100)}%`],
  cdr: ['スキル再使用', (v) => `-${Math.round(v * 100)}%`],
  crit: ['会心率', (v) => `+${Math.round(v * 100)}%`],
  critDmg: ['会心ダメージ', (v) => `+${Math.round(v * 100)}%`],
  haste: ['攻撃速度', (v) => `+${Math.round(v * 100)}%`],
  heal: ['回復量', (v) => `+${Math.round(v * 100)}%`],
  vamp: ['ダメージ吸収', (v) => `${Math.round(v * 100)}%`],
  regen: ['HP自動回復', (v) => `毎秒 ${v}`],
  dodge: ['回避の再使用', (v) => `-${Math.round(v * 100)}%`],
};
const EXTRA = [['crit', 0.015], ['atk', 0.025], ['hp', 8], ['def', 0.015], ['speed', 0.015], ['cdr', 0.012]];
export const SETS = {
  lantern: { name: '灯守', color: '#ffd27a', two: { hpp: 0.15 }, four: { heal: 0.3, regen: 2 } },
  ember: { name: '烈火', color: '#ff7a3a', two: { atk: 0.12 }, four: { atk: 0.1, aff: ['burn'] } },
  gale: { name: '疾風', color: '#7fe8d6', two: { speed: 0.1 }, four: { haste: 0.15, dodge: 0.35 } },
  bulwark: { name: '鉄壁', color: '#a8b8d0', two: { def: 0.1 }, four: { def: 0.12, hpp: 0.15 } },
  hunter: { name: '影狩り', color: '#b090f0', two: { crit: 0.08 }, four: { critDmg: 0.5, vamp: 0.04 } },
};
const SET_KEYS = Object.keys(SETS);
export const setOfFloor = (floor) => SET_KEYS[Math.floor(floor / 3) % SET_KEYS.length];

export function makeGear(slot, rarity, floor = 1, set = null) {
  const g = GEAR_SLOTS[slot], scale = (1 + 0.5 * rarity) * (1 + 0.08 * (floor - 1));
  const stats = { [g.stat]: +(g.v * scale).toFixed(3) };
  for (let i = 0; i < rarity; i++) {
    const [k, v] = pick(EXTRA);
    stats[k] = +((stats[k] || 0) + v * (1 + 0.04 * floor)).toFixed(3);
  }
  const it = { id: uid(), cat: 'gear', slot, rarity, set, stats };
  it.name = (set ? SETS[set].name + 'の' : '') + g.name;
  return it;
}
export function rollGear(floor, bonus = 0, set) {
  const rarity = rollRarity(floor, bonus);
  const s = set || (rarity >= 1 && Math.random() < 0.7 ? pick(SET_KEYS) : null);
  return makeGear(pick(Object.keys(GEAR_SLOTS)), rarity, floor, s);
}

export function rollLoot(floor, bonus = 0) {
  const r = Math.random();
  if (r < 0.28) return makeScroll(pick(SCROLL_POOL));
  if (r < 0.58) return rollGear(floor, bonus);
  return rollWeapon(floor, bonus);
}

export const ENEMY_TYPES = ['slime', 'bat', 'skel', 'mage', 'golem', 'slimeL'];
export const ENEMIES = {
  slime: { name: '胞子キノコ', hp: 32, spd: 72, dmg: 10, r: 14, xp: 6 },
  slimeL: { name: '大胞子キノコ', hp: 80, spd: 58, dmg: 15, r: 21, xp: 16 },
  bat: { name: '石翼のインプ', hp: 20, spd: 150, dmg: 8, r: 11, xp: 5, fly: true },
  skel: { name: '錆鎧', hp: 60, spd: 88, dmg: 17, r: 13, xp: 12 },
  mage: { name: '蝋燭の祈祷師', hp: 44, spd: 74, dmg: 13, r: 13, xp: 15 },
  golem: { name: '苔の巨像', hp: 1100, spd: 58, dmg: 30, r: 36, xp: 220, boss: true },
};

export const xpForLevel = (lvl) => Math.round(40 * lvl ** 1.45);
