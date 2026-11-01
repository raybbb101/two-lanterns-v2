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
const S = (name, cd, color, aim, p, desc, up = {}, cast = null, icon = null) => ({ name, cd, color, aim, p, desc, up, cast, icon });
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

  // ---- 最終ジョブのスキル（エフェクトの組み合わせと色替え）。cast は順番に実行する手順 ----
  // 剣士
  aegis: S('聖盾', 18, '#ffe08a', 'self', { shield: 60, def: 15, dur: 8 }, (p) => `近くの全員に ${p.shield} のシールドと被ダメージ -${p.def}%（${p.dur} 秒）。`, { def: 2 },
    [{ fx: 'sunburst', p: 'gold', dy: -18 }, { fx: 'featherBurst', dy: -20 }, { snd: 'ward' }, { shield: 260 }, { buff: { def: 'def' }, r: 260 }]),
  fortress: S('不動の構え', 15, '#a8b8d0', 'self', { dmg: 30, def: 35, dur: 5 }, (p) => `大地を踏みしめ周囲に ${p.dmg} ダメージ。${p.dur} 秒間、被ダメージ -${p.def}%。`, { def: 3 },
    [{ fx: 'groundSlam' }, { snd: 'slam' }, { shake: 7 }, { aoe: 'self', r: 110, opt: { knock: 300 } }, { buff: { def: 'def' }, self: true }]),
  earthwall: S('岩牙の陣', 16, '#c8a070', 'self', { dmg: 44, stun: 1.8 }, (p) => `足元から岩の牙が広がり ${p.dmg} ダメージ。${p.stun} 秒気絶。`, { stun: 0.2 },
    [{ fx: 'earthSpike' }, { fx: 'dirtExplosion' }, { snd: 'slam' }, { aoe: 'self', r: 130, delay: 0.25, opt: { knock: 120 } }]),
  bloodstorm: S('血の嵐', 12, '#ff4a5a', 'self', { dmg: 42, heal: 25 }, (p) => `赤い旋風で周囲に ${p.dmg} ダメージ。自分を ${p.heal} 回復。`, {},
    [{ fx: 'spinSlash', p: 'red' }, { snd: 'heavy' }, { aoe: 'self', r: 110, opt: { knock: 260 } }, { healSelf: 1 }]),
  cleave: S('大断ち', 7, '#ffd0a0', 'enemy', { dmg: 62 }, (p) => `前方を豪快に断ち切り ${p.dmg} ダメージ。`, {},
    [{ fx: 'heavyCleave', f: 1 }, { snd: 'heavy' }, { shake: 6, delay: 0.3 }, { cone: 1.2, r: 110, delay: 0.25, opt: { knock: 340 } }]),
  cataclysm: S('天崩', 24, '#c89070', 'enemy', { dmg: 150 }, (p) => `巨岩を呼び落とす。広い範囲に ${p.dmg} ダメージ。`, {},
    [{ fx: 'meteor', at: 'target', p: 'stone' }, { aoe: 'target', r: 140, delay: 0.62, opt: { knock: 360 } }, { fx: 'groundSlam', at: 'target', delay: 0.62 }, { shake: 14, delay: 0.62 }, { snd: 'slam', delay: 0.62 }]),
  // 弓使い
  snipe: S('必中の一矢', 14, '#ffe68a', 'enemy', { dmg: 130 }, (p) => `一番近い敵を確実に射抜く。${p.dmg} ダメージ。`, {},
    [{ fx: 'smite', at: 'target', p: 'gold' }, { snd: 'bow' }, { aoe: 'target', r: 26, delay: 0.54, opt: { knock: 200 } }], 'arrow'),
  volley: S('扇の連射', 7, '#f0e0b0', 'enemy', { dmg: 22, n: 5 }, (p) => `扇状に ${p.n} 本の矢を放つ。各 ${p.dmg} ダメージ。`, { n: 0.5 },
    [{ snd: 'bow' }, { proj: { kind: 'arrow', sp: 680, life: 0.8, r: 8, fan: 0.2 } }], 'arrow'),
  stormarrow: S('雷の矢', 12, '#9ad0ff', 'enemy', { dmg: 58 }, (p) => `雷をまとった矢が敵を貫く。線上の敵に ${p.dmg} ダメージ。`, {},
    [{ snd: 'zap' }, { fx: 'zapHit', at: 'target' }, { proj: { kind: 'arrow', sp: 950, life: 0.6, r: 10, pierce: true, rar: 2 } }], 'zapHit'),
  grove: S('生命の森', 18, '#8ad070', 'self', { dot: 14, hot: 8, dur: 5 }, (p) => `${p.dur} 秒、森が広がる。敵に毎秒 ${p.dot} ダメージ＋鈍足、仲間を毎秒 ${p.hot} 回復。`, { dur: 0.5 },
    [{ fx: 'healingBloom' }, { fx: 'rootSnare' }, { zone: 'self', r: 130, slow: 1, vis: 'thorn' }]),
  minefield: S('爆裂罠', 10, '#ffb050', 'enemy', { dmg: 70 }, (p) => `爆弾を投げ込む。少し遅れて範囲に ${p.dmg} ダメージ。`, {},
    [{ fx: 'grenade', at: 'target' }, { aoe: 'target', r: 100, delay: 1.7, opt: { knock: 300 } }, { shake: 8, delay: 1.7 }, { snd: 'boom', delay: 1.7 }]),
  toxicarrow: S('毒の矢', 9, '#b8e040', 'enemy', { dmg: 30, dot: 14, dur: 4 }, (p) => `毒矢が貫き ${p.dmg} ダメージ。着弾点に毒だまりが ${p.dur} 秒残り、毎秒 ${p.dot}。`, {},
    [{ snd: 'bow' }, { proj: { kind: 'arrow', sp: 800, life: 0.7, r: 9, pierce: true, rar: 1 } }, { fx: 'toxicPuddle', at: 'target', life: 'dur' }, { zone: 'target', r: 75, slow: 1 }], 'acidSplash'),
  // 魔導士
  inferno: S('業火の輪', 14, '#ff6a2a', 'self', { dmg: 50, dot: 18, dur: 3 }, (p) => `炎の輪が広がり ${p.dmg} ダメージ＋炎上。${p.dur} 秒燃え続け毎秒 ${p.dot}。`, {},
    [{ fx: 'fireRing' }, { snd: 'boom' }, { aoe: 'self', r: 135, delay: 0.2, opt: { burn: true, knock: 200 } }, { zone: 'self', r: 110 }]),
  bluefire: S('蒼炎弾', 6, '#5ab0ff', 'enemy', { dmg: 62 }, (p) => `高温の蒼い火球。爆発で ${p.dmg} ダメージ＋炎上。`, {},
    [{ snd: 'fire' }, { proj: { kind: 'bluefire', sp: 520, life: 1.4, r: 11 } }], 'fireball'),
  firetornado: S('炎の竜巻', 18, '#ff8a3a', 'enemy', { dot: 42, dur: 4 }, (p) => `敵の場所に炎の竜巻。${p.dur} 秒、毎秒 ${p.dot} ダメージ＋炎上。`, { dur: 0.5 },
    [{ fx: 'fireTornado', at: 'target', life: 'dur' }, { snd: 'fire' }, { zone: 'target', r: 80 }]),
  blizzard: S('吹雪', 14, '#a6ecff', 'enemy', { dot: 24, dur: 4 }, (p) => `吹雪を起こす。${p.dur} 秒、毎秒 ${p.dot} ダメージ＋鈍足。`, { dur: 0.5 },
    [{ fx: 'blizzardVortex', at: 'target', life: 'dur' }, { snd: 'freeze' }, { zone: 'target', r: 95, slow: 1.5, vis: 'ice' }]),
  icefall: S('氷柱の列', 11, '#dcfbff', 'enemy', { dmg: 60, stun: 1 }, (p) => `氷の柱が突き出し ${p.dmg} ダメージ。${p.stun} 秒凍らせる。`, { stun: 0.2 },
    [{ fx: 'iceSpikes', at: 'target', ox: -90 }, { snd: 'freeze' }, { aoe: 'target', r: 90, delay: 0.35, opt: { slow: 3, knock: 80 } }]),
  thunderclap: S('雷鳴', 13, '#c8b8ff', 'self', { dmg: 64, stun: 1.2 }, (p) => `雷鳴を轟かせ周囲に ${p.dmg} ダメージ。${p.stun} 秒気絶。`, { stun: 0.2 },
    [{ fx: 'thunderclap' }, { snd: 'zap' }, { shake: 9 }, { aoe: 'self', r: 125, opt: { knock: 240 } }]),
  // 癒し手
  wisp: S('癒しの精霊', 14, '#7fe8c0', 'self', { hot: 10, dur: 7 }, (p) => `精霊を呼ぶ。${p.dur} 秒、近くの仲間を毎秒 ${p.hot} 回復。`, { dur: 0.5 },
    [{ fx: 'spiritFlame', dy: -24, p: 'green', life: 'dur' }, { snd: 'heal' }, { zone: 'self', r: 150 }]),
  sanctuary: S('聖域', 30, '#ffeeb0', 'self', { hot: 22, def: 25, dur: 6 }, (p) => `聖なる陣を敷く。${p.dur} 秒、毎秒 ${p.hot} 回復。近くの全員の被ダメージ -${p.def}%。`, { def: 3 },
    [{ fx: 'runeCircle', p: 'gold', life: 'dur', ground: 1 }, { fx: 'holyPillar', p: 'gold' }, { snd: 'level' }, { zone: 'self', r: 140, vis: 'bloom' }, { buff: { def: 'def' }, r: 200 }]),
  judgement: S('天罰', 20, '#fff0a0', 'enemy', { dmg: 120, heal: 30 }, (p) => `天からの光で ${p.dmg} ダメージ。近くの仲間を ${p.heal} 回復。`, {},
    [{ fx: 'sunburst', at: 'target', p: 'gold', dy: -20 }, { fx: 'smite', at: 'target' }, { aoe: 'target', r: 85, delay: 0.54, opt: { knock: 240 } }, { heal: 220, delay: 0.54 }]),
  holyfist: S('聖拳', 6, '#ffd870', 'enemy', { dmg: 48, heal: 14 }, (p) => `光をまとった拳で ${p.dmg} ダメージ。自分を ${p.heal} 回復。`, {},
    [{ fx: 'uppercut', p: 'gold', f: 1 }, { snd: 'heavy' }, { cone: 1.1, r: 90, delay: 0.1, opt: { knock: 280 } }, { healSelf: 1 }]),
  radiance: S('光輪', 12, '#ffefb0', 'self', { dmg: 44, heal: 22 }, (p) => `光の輪が広がり ${p.dmg} ダメージ。近くの仲間を ${p.heal} 回復。`, {},
    [{ fx: 'spinSlash', p: 'gold' }, { fx: 'heal' }, { snd: 'heal' }, { aoe: 'self', r: 115, opt: { knock: 200 } }, { heal: 200 }]),
  // 影の刃
  execute: S('断罪', 10, '#c080ff', 'enemy', { dmg: 70 }, (p) => `死神の一閃で ${p.dmg} ダメージ。HP が半分以下の敵には 2 倍。`, {},
    [{ fx: 'scytheReap', p: 'violet', f: 1 }, { snd: 'heavy' }, { cone: 1.4, r: 105, delay: 0.3, opt: { knock: 160, execute: true } }]),
  bladedance: S('刃の舞', 9, '#d0b8ff', 'self', { dmg: 36, haste: 20, dur: 4 }, (p) => `舞うように切り裂き ${p.dmg} ダメージ。${p.dur} 秒、攻撃速度 +${p.haste}%。`, {},
    [{ fx: 'spinSlash', p: 'violet' }, { snd: 'swing' }, { aoe: 'self', r: 95, opt: { knock: 120 } }, { buff: { haste: 'haste' }, self: true }]),
  phantom: S('幻影斬', 16, '#8a70e0', 'enemy', { dmg: 26, hits: 6 }, (p) => `影の分身が敵を ${p.hits} 回切り裂く。各 ${p.dmg} ダメージ。`, { hits: 0.5 },
    [{ fx: 'darkExplosion', at: 'target', p: 'violet' }, { snd: 'zap' }, { multi: 0.12, r: 120, opt: { knock: 40 } }]),
  plague: S('疫病', 12, '#a8d040', 'enemy', { dmg: 28, dot: 16, dur: 4 }, (p) => `胞子をまき散らし ${p.dmg} ダメージ＋炎症（継続ダメージ）。${p.dur} 秒、毎秒 ${p.dot}。`, {},
    [{ fx: 'sporeBurst', at: 'target' }, { aoe: 'target', r: 100, opt: { burn: true, knock: 40 } }, { zone: 'target', r: 90 }]),
  venomnova: S('毒爆', 18, '#c8f040', 'self', { dmg: 58, dot: 24, dur: 4 }, (p) => `毒が破裂し ${p.dmg} ダメージ。毒だまりが ${p.dur} 秒残り毎秒 ${p.dot}。`, {},
    [{ fx: 'acidSplash' }, { fx: 'toxicPuddle', life: 'dur' }, { snd: 'boom' }, { aoe: 'self', r: 120, opt: { knock: 220 } }, { zone: 'self', r: 105, slow: 1 }]),
};

// マップで拾う巻物には、ジョブごとの向き不向きがある
export const AFFINITY = {
  knight: { good: ['whirl', 'ward'], bad: ['fireball', 'chain', 'lance', 'strike'] },
  ranger: { good: ['dash', 'poison', 'chain'], bad: ['heal', 'ward', 'whirl'] },
  mage: { good: ['fireball', 'nova', 'chain', 'lance', 'strike'], bad: ['whirl', 'dash'] },
  healer: { good: ['heal', 'ward', 'bloom'], bad: ['fireball', 'strike', 'whirl', 'poison'] },
  rogue: { good: ['dash', 'poison', 'whirl'], bad: ['heal', 'ward', 'bloom', 'nova'] },
};
export const AFF_GOOD = 1.25, AFF_BAD = 0.5;
export function affinityOf(id, job) {
  const a = AFFINITY[job];
  return !a ? 0 : a.good.includes(id) ? 1 : a.bad.includes(id) ? -1 : 0;
}
export const affinityLabel = (id, job) => ({ 1: '得意 +25%', '-1': '不得意 -50%' })[affinityOf(id, job)] || '';
// マップで巻物として拾えるスキル（それ以外はスキルツリー専用）
export const SCROLL_POOL = ['fireball', 'whirl', 'dash', 'heal', 'nova', 'chain', 'ward', 'lance', 'bloom', 'poison', 'strike'];

export function skillPower(id, lvl, s = {}) {
  const b = SKILLS[id], L = lvl - 1, r = {};
  const af = affinityOf(id, s.job), k = af > 0 ? AFF_GOOD : af < 0 ? AFF_BAD : 1;
  const m = (1 + 0.25 * L) * (s.atk ?? 1) * k, hm = (1 + 0.2 * L) * (s.heal ?? 1) * k;
  r.cd = +(b.cd * (1 - 0.06 * L) * (1 - (s.cdr || 0))).toFixed(1);
  for (const [k, v] of Object.entries(b.p)) {
    if (k === 'dmg' || k === 'dot') r[k] = Math.round(v * m);
    else if (k === 'heal' || k === 'shield' || k === 'hot') r[k] = Math.round(v * hm);
    else r[k] = +(v + (b.up[k] || 0) * L).toFixed(2);
  }
  if (r.jumps) r.jumps = Math.floor(r.jumps);
  if (r.hits) r.hits = Math.floor(r.hits);
  if (r.n) r.n = Math.floor(r.n);
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
