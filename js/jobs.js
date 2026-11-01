// ジョブとスキルツリー。ツリーは「共通の根」＋分岐。分岐は 1 つしか選べず、変えるにはリセットが要る。
import { GEAR_SLOTS, SETS, makeWeapon } from './data.js';

const P = (id, name, max, per, desc) => ({ id, name, max, per, desc, kind: 'passive' });
const A = (id, skill, max = 5) => ({ id, skill, max, kind: 'active' });

export const JOBS = {
  knight: {
    name: '剣士', color: '#ff8a6a', weapon: 'sword', skill: 'whirl', base: { hpp: 0.2, def: 0.05 }, desc: '前に立って戦う。打たれ強い。',
    root: P('k_root', '剣術', 5, { atk: 0.04 }, '攻撃力アップ'),
    branches: [
      { name: '守護騎士', desc: '仲間を守る盾役', nodes: [P('k_a1', '鉄の肌', 5, { def: 0.03 }, '被ダメージ減少'), A('k_a2', 'bash'), A('k_a3', 'warcry'), P('k_a4', '不屈', 5, { hpp: 0.06 }, '最大HPアップ')] },
      { name: '狂戦士', desc: '守りを捨てて斬る', nodes: [P('k_b1', '血の渇き', 5, { vamp: 0.012 }, 'ダメージの一部を回復'), A('k_b2', 'quake'), A('k_b3', 'roar'), P('k_b4', '処刑', 5, { critDmg: 0.12 }, '会心ダメージアップ')] },
    ],
  },
  ranger: {
    name: '弓使い', color: '#7fe0d6', weapon: 'bow', skill: 'pierce', base: { speed: 0.06, crit: 0.05 }, desc: '離れて撃つ。足が速い。',
    root: P('r_root', '弓術', 5, { atk: 0.04 }, '攻撃力アップ'),
    branches: [
      { name: '狙撃手', desc: '一撃の重さを極める', nodes: [P('r_a1', '鷹の目', 5, { crit: 0.03 }, '会心率アップ'), A('r_a2', 'focus'), A('r_a3', 'rain'), P('r_a4', '致命の矢', 5, { critDmg: 0.12 }, '会心ダメージアップ')] },
      { name: '罠師', desc: '敵の足を止めて削る', nodes: [P('r_b1', '軽業', 5, { speed: 0.02 }, '移動速度アップ'), A('r_b2', 'thorns'), A('r_b3', 'snare'), P('r_b4', '狩人の知恵', 5, { cdr: 0.03 }, 'スキル再使用短縮')] },
    ],
  },
  mage: {
    name: '魔導士', color: '#c9a0ff', weapon: 'staff', skill: 'fireball', base: { atk: 0.1, cdr: 0.05 }, desc: '強力な魔法を操る。体は脆い。',
    root: P('m_root', '魔力', 5, { atk: 0.04 }, '攻撃力アップ'),
    branches: [
      { name: '業火', desc: '燃やし尽くす', nodes: [P('m_a1', '火の心', 5, { atk: 0.03 }, '攻撃力アップ'), A('m_a2', 'pillar'), A('m_a3', 'meteor'), P('m_a4', '灼熱', 3, { critDmg: 0.15 }, '会心ダメージアップ')] },
      { name: '氷雷', desc: '止めて、撃ち抜く', nodes: [P('m_b1', '魔力循環', 5, { cdr: 0.03 }, 'スキル再使用短縮'), A('m_b2', 'lance'), A('m_b3', 'strike'), P('m_b4', '静電気', 5, { crit: 0.025 }, '会心率アップ')] },
    ],
  },
  healer: {
    name: '癒し手', color: '#ffe08a', weapon: 'staff', skill: 'heal', base: { heal: 0.2, hpp: 0.1 }, desc: '仲間を支える。ソロでも粘り強い。',
    root: P('h_root', '祈り', 5, { heal: 0.05 }, '回復量アップ'),
    branches: [
      { name: '聖域', desc: '回復に専念する', nodes: [P('h_a1', '慈愛', 5, { heal: 0.08 }, '回復量アップ'), A('h_a2', 'bloom'), A('h_a3', 'bless'), A('h_a4', 'miracle', 3)] },
      { name: '戦う聖職者', desc: '戦いながら回復する', nodes: [P('h_b1', '聖なる刃', 5, { vamp: 0.015 }, 'ダメージの一部を回復'), A('h_b2', 'smite'), A('h_b3', 'hpillar'), P('h_b4', '聖戦', 5, { atk: 0.05 }, '攻撃力アップ')] },
    ],
  },
  rogue: {
    name: '影の刃', color: '#b090f0', weapon: 'dagger', skill: 'dash', base: { haste: 0.08, crit: 0.08 }, desc: '素早く切り刻む。回避が得意。',
    root: P('g_root', '身のこなし', 5, { dodge: 0.05 }, '回避の再使用短縮'),
    branches: [
      { name: '暗殺者', desc: '一瞬で仕留める', nodes: [P('g_a1', '急所狙い', 5, { crit: 0.03 }, '会心率アップ'), A('g_a2', 'flurry'), A('g_a3', 'shadowstep'), P('g_a4', '必殺', 5, { critDmg: 0.12 }, '会心ダメージアップ')] },
      { name: '毒師', desc: 'じわじわ弱らせる', nodes: [P('g_b1', '速い手', 5, { haste: 0.03 }, '攻撃速度アップ'), A('g_b2', 'poison'), A('g_b3', 'curse'), A('g_b4', 'drain')] },
    ],
  },
};
export const JOB_KEYS = Object.keys(JOBS);
export const RESET_COST = 2;

export const startKit = (job) => ({ weapon: makeWeapon(JOBS[job].weapon, 0, 1), skills: { [JOBS[job].skill]: 1 }, slots: [JOBS[job].skill, null, null, null] });

/** ノードを取得できるか。理由も返す */
export function nodeState(me, node, branchIdx) {
  const J = JOBS[me.job], lv = me.tree[node.id] || 0;
  if (lv >= node.max) return { ok: false, why: '最大レベル' };
  if ((me.sp || 0) < 1) return { ok: false, why: 'スキルポイント不足' };
  if (branchIdx == null) return { ok: true };
  if (!(me.tree[J.root.id] > 0)) return { ok: false, why: `先に「${J.root.name}」を習得` };
  if (me.branch != null && me.branch !== branchIdx) return { ok: false, why: '別の分岐を選択中（リセットで変更可）' };
  const nodes = J.branches[branchIdx].nodes, i = nodes.indexOf(node);
  if (i > 0 && !(me.tree[nodes[i - 1].id] > 0)) return { ok: false, why: '前のスキルが必要' };
  return { ok: true };
}

export function allNodes(job) {
  const J = JOBS[job];
  return [J.root, ...J.branches.flatMap((b) => b.nodes)];
}

/** 使えるスキルとそのレベル（巻物＋ツリー） */
export function skillLevels(me) {
  const out = { ...me.skills };
  for (const n of allNodes(me.job)) if (n.kind === 'active' && me.tree[n.id]) out[n.skill] = Math.min(5, (out[n.skill] || 0) + me.tree[n.id]);
  return out;
}

const addStats = (s, o, k = 1) => {
  for (const [key, v] of Object.entries(o)) {
    if (key === 'aff') s.aff.push(...v);
    else s[key] = (s[key] || 0) + v * k;
  }
};

export function setCounts(me) {
  const c = {};
  for (const g of Object.values(me.gear)) if (g && g.set) c[g.set] = (c[g.set] || 0) + 1;
  return c;
}

/** ステータスの計算：レベル＋ジョブ＋防具＋セット＋ツリー＋一時強化 */
export function computeStats(me, lvl) {
  const s = { hp: 0, hpp: 0, atk: 0, def: 0, crit: 0, critDmg: 0, speed: 0, haste: 0, cdr: 0, heal: 0, vamp: 0, regen: 0, dodge: 0, aff: [] };
  addStats(s, JOBS[me.job].base);
  for (const g of Object.values(me.gear)) if (g) addStats(s, g.stats);
  for (const [k, n] of Object.entries(setCounts(me))) {
    if (n >= 2) addStats(s, SETS[k].two);
    if (n >= 4) addStats(s, SETS[k].four);
  }
  for (const n of allNodes(me.job)) if (n.kind === 'passive' && me.tree[n.id]) addStats(s, n.per, me.tree[n.id]);
  for (const b of me.buffs) addStats(s, b.s);
  return {
    maxHp: Math.round((100 + 12 * (lvl - 1) + s.hp) * (1 + s.hpp)),
    atk: (1 + 0.08 * (lvl - 1)) * (1 + s.atk),
    def: Math.min(0.7, s.def), crit: s.crit, critDmg: s.critDmg,
    speed: 1 + s.speed, haste: Math.min(0.6, s.haste), cdr: Math.min(0.5, s.cdr),
    heal: 1 + s.heal, vamp: s.vamp, regen: s.regen, dodge: Math.min(0.7, s.dodge), aff: s.aff,
  };
}
export { GEAR_SLOTS };
