import { rand, pick, uid } from './util.js';

export const RARITY = [
  { name: 'コモン', color: '#c9c2b2', mult: 1.0 },
  { name: 'アンコモン', color: '#7fd16f', mult: 1.16 },
  { name: 'レア', color: '#5fa8ff', mult: 1.34 },
  { name: 'エピック', color: '#c983ff', mult: 1.58 },
  { name: 'レジェンド', color: '#ffb340', mult: 1.9 },
];

// kind: melee=扇形の斬撃 / thrust=直線の突き / bow=矢 / staff=魔法弾
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

export const SKILLS = {
  fireball: { name: '火球', cd: 4.5, color: '#ff7a2e', desc: (p) => `爆発する火球を放つ。範囲に ${p.dmg} ダメージ＋炎上。` },
  whirl: { name: '旋風斬', cd: 6, color: '#efe6cf', desc: (p) => `周囲を薙ぎ払い ${p.dmg} ダメージ。敵を吹き飛ばす。` },
  dash: { name: '疾風ステップ', cd: 5, color: '#7fe8d6', desc: (p) => `狙った方向へ駆け抜け、通過した敵に ${p.dmg} ダメージ。無敵。` },
  heal: { name: '癒しの灯', cd: 12, color: '#ffd27a', desc: (p) => `自分と近くの仲間の HP を ${p.heal} 回復する。` },
  nova: { name: '氷結ノヴァ', cd: 9, color: '#8fd8ff', desc: (p) => `周囲を凍らせ ${p.dmg} ダメージ。敵を 3 秒間鈍足に。` },
  chain: { name: '連鎖雷', cd: 7, color: '#b7a3ff', desc: (p) => `雷が敵から敵へ ${p.jumps} 回跳ね、各 ${p.dmg} ダメージ。` },
  ward: { name: '守護の結界', cd: 16, color: '#9fe6a0', desc: (p) => `自分と近くの仲間に ${p.shield} のシールドを張る（8 秒）。` },
};

export function skillPower(id, lvl, plvl = 1) {
  const m = (1 + 0.25 * (lvl - 1)) * (1 + 0.08 * (plvl - 1));
  const cdm = 1 - 0.06 * (lvl - 1);
  const base = SKILLS[id];
  const r = { cd: +(base.cd * cdm).toFixed(1) };
  switch (id) {
    case 'fireball': r.dmg = Math.round(34 * m); break;
    case 'whirl': r.dmg = Math.round(26 * m); break;
    case 'dash': r.dmg = Math.round(22 * m); break;
    case 'heal': r.heal = Math.round(35 + 12 * (lvl - 1) + 4 * (plvl - 1)); break;
    case 'nova': r.dmg = Math.round(16 * m); break;
    case 'chain': r.dmg = Math.round(22 * m); r.jumps = 3 + Math.floor((lvl - 1) / 2); break;
    case 'ward': r.shield = Math.round(35 + 12 * (lvl - 1) + 5 * (plvl - 1)); break;
  }
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
  it.name = rarity === 4 ? b.legend : (affixes.length ? AFFIX[affixes[0]].pre : '') + b.name;
  return it;
}

export function rollWeapon(floor, bonus = 0) {
  const rarity = rollRarity(floor, bonus);
  const base = pick(Object.keys(WEAPONS));
  const n = [0, Math.random() < 0.6 ? 1 : 0, 1, 2, 2][rarity];
  const pool = Object.keys(AFFIX);
  const affixes = [];
  while (affixes.length < n) {
    const a = pick(pool);
    if (!affixes.includes(a)) affixes.push(a);
  }
  return makeWeapon(base, rarity, floor, affixes);
}

export function makeScroll(skill) {
  return { id: uid(), cat: 'skill', skill, rarity: 2, name: `巻物「${SKILLS[skill].name}」` };
}

export function rollLoot(floor, bonus = 0) {
  if (Math.random() < 0.36) return makeScroll(pick(Object.keys(SKILLS)));
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

export const PALETTES = [
  { cloak: '#9b2b2f', tunic: '#b8463c', trim: '#e2b45a', pants: '#3b3344', boots: '#4a2f22', hair: '#7a3a1e', hairHi: '#c06a35', skin: '#f0c7a0', eye: '#2d3b5a', metal: '#c9ccd4', style: 'short', name: '#ff8a6a' },
  { cloak: '#1f5f66', tunic: '#2f8a86', trim: '#d9d2b0', pants: '#353a48', boots: '#33283a', hair: '#c9cfe0', hairHi: '#ffffff', skin: '#efcfb0', eye: '#4a2e5a', metal: '#b9c4cc', style: 'pony', name: '#7fe0d6' },
];
