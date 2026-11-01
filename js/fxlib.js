// pixelfx のエフェクトをゲームの中で再生する。ワールド座標（px）で置き、毎フレーム一枚のフレームに描いて合成する。
import { createFrame, clearFrame, createFx, composite, painterFor, hex, PAL } from '../pixelfx/src/core/index.js';

import * as swordSlash from '../pixelfx/src/fx/melee/sword-slash.js';
import * as doubleSlash from '../pixelfx/src/fx/melee/double-slash.js';
import * as hammerSmash from '../pixelfx/src/fx/melee/hammer-smash.js';
import * as thrust from '../pixelfx/src/fx/melee/thrust.js';
import * as spinSlash from '../pixelfx/src/fx/melee/spin-slash.js';
import * as clawSwipe from '../pixelfx/src/fx/melee/claw-swipe.js';
import * as hitSpark from '../pixelfx/src/fx/impacts/hit-spark.js';
import * as critHit from '../pixelfx/src/fx/impacts/crit-hit.js';
import * as hitFlash from '../pixelfx/src/fx/impacts/hit-flash.js';
import * as groundSlam from '../pixelfx/src/fx/impacts/ground-slam.js';
import * as heavyLanding from '../pixelfx/src/fx/impacts/heavy-landing.js';
import * as shieldBlock from '../pixelfx/src/fx/impacts/shield-block.js';
import * as arrow from '../pixelfx/src/fx/projectiles/arrow.js';
import * as plasmaShot from '../pixelfx/src/fx/projectiles/plasma-shot.js';
import * as fireball from '../pixelfx/src/fx/fire/fireball.js';
import * as smallExplosion from '../pixelfx/src/fx/explosions/small-explosion.js';
import * as torch from '../pixelfx/src/fx/fire/torch.js';
import * as frostNova from '../pixelfx/src/fx/ice/frost-nova.js';
import * as healAoe from '../pixelfx/src/fx/holy/heal-aoe.js';
import * as heal from '../pixelfx/src/fx/holy/heal.js';
import * as divineShield from '../pixelfx/src/fx/holy/divine-shield.js';
import * as resurrection from '../pixelfx/src/fx/holy/resurrection.js';
import * as zapHit from '../pixelfx/src/fx/lightning/zap-hit.js';
import * as blinkOut from '../pixelfx/src/fx/arcane/blink-out.js';
import * as blinkIn from '../pixelfx/src/fx/arcane/blink-in.js';
import * as portal from '../pixelfx/src/fx/arcane/portal.js';
import * as runeCircle from '../pixelfx/src/fx/arcane/rune-circle.js';
import * as poof from '../pixelfx/src/fx/spawn/poof.js';
import * as shatterDeath from '../pixelfx/src/fx/spawn/shatter-death.js';
import * as soulRise from '../pixelfx/src/fx/spawn/soul-rise.js';
import * as summonRise from '../pixelfx/src/fx/spawn/summon-rise.js';
import * as sporeBurst from '../pixelfx/src/fx/nature/spore-burst.js';
import * as chestOpen from '../pixelfx/src/fx/pickups/chest-open.js';
import * as lootBeam from '../pixelfx/src/fx/pickups/loot-beam.js';
import * as heartPickup from '../pixelfx/src/fx/pickups/heart-pickup.js';
import * as collectBurst from '../pixelfx/src/fx/pickups/collect-burst.js';
import * as levelUp from '../pixelfx/src/fx/ui/level-up.js';
import * as damageNumber from '../pixelfx/src/fx/ui/damage-number.js';
import * as critNumber from '../pixelfx/src/fx/ui/crit-number.js';
import * as burning from '../pixelfx/src/fx/status/burning.js';
import * as slowed from '../pixelfx/src/fx/status/slowed.js';
import * as rage from '../pixelfx/src/fx/status/rage.js';

import * as brazier from '../pixelfx/src/fx/fire/brazier.js';
import * as candle from '../pixelfx/src/fx/fire/candle.js';
import * as spiritFlame from '../pixelfx/src/fx/fire/spirit-flame.js';
import * as iceCrystal from '../pixelfx/src/fx/ice/ice-crystal.js';
import * as exclamation from '../pixelfx/src/fx/ui/exclamation.js';
import * as spellCharge from '../pixelfx/src/fx/arcane/spell-charge.js';

export const FX = {
  brazier, candle, spiritFlame, iceCrystal, exclamation, spellCharge,
  swordSlash, doubleSlash, hammerSmash, thrust, spinSlash, clawSwipe, hitSpark, critHit, hitFlash, groundSlam, heavyLanding, shieldBlock,
  arrow, plasmaShot, fireball, smallExplosion, torch, frostNova, healAoe, heal, divineShield, resurrection, zapHit, blinkOut, blinkIn,
  portal, runeCircle, poof, shatterDeath, soulRise, summonRise, sporeBurst, chestOpen, lootBeam, heartPickup, collectBurst, levelUp,
  damageNumber, critNumber, burning, slowed, rage,
};
export { PAL, hex };

// レアリティごとの斬撃の色（暗→明）
export const RARE_RAMP = [
  ['#2a2a36', '#4a4a5e', '#7a7a92', '#a8a8bc', '#d4d4e2', '#f0f0f8', '#ffffff'],
  ['#14301a', '#1e5a2a', '#2e8a3a', '#5ac85a', '#a8f0a0', '#e0ffd8', '#ffffff'],
  ['#212f6b', '#2c58aa', '#3a8bd8', '#62c8f4', '#b8c9e8', '#e8f1ff', '#ffffff'],
  ['#2a1450', '#4a2286', '#7a3ac0', '#a868f0', '#d0a8ff', '#f0e0ff', '#ffffff'],
  ['#4a1712', '#9a4a0e', '#d48e18', '#f5b92c', '#ffde5e', '#fff4bc', '#ffffff'],
];
export const FIRE_RAMP = ['#4a1712', '#8a1f17', '#c9281f', '#f2561d', '#ff8a2a', '#ffc23d', '#ffe26b', '#fff3a6', '#ffffff'];
export const ICE_RAMP = ['#151a3d', '#212f6b', '#2c58aa', '#3a8bd8', '#62c8f4', '#a6ecff', '#dcfbff', '#ffffff'];

let seedN = 1;

export class FxLayer {
  constructor() {
    this.list = [];
    this.frame = null;
    this.cv = document.createElement('canvas');
    this.cx = this.cv.getContext('2d');
  }
  resize(w, h) {
    this.frame = createFrame(w, h);
    this.img = new ImageData(w, h);
    this.cv.width = w; this.cv.height = h;
  }
  clear() { this.list = []; }

  /** エフェクトを置く。o.follow: () => {x, y} で毎フレーム追従。o.life: 秒で強制終了（ループ用）。 */
  add(mod, o = {}) {
    for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k];
    const fx = createFx(mod, { seed: seedN++ % 997, ...o });
    fx.follow = o.follow || null;
    fx.life = o.life ?? Infinity;
    fx.layer = o.layer || 'front';
    this.list.push(fx);
    return fx;
  }
  /** 自前の描画（painter を受け取る）: { update(dt), draw(p), done() } */
  custom(obj) {
    obj.custom = true;
    obj.layer = obj.layer || 'front';
    this.list.push(obj);
    return obj;
  }

  update(dt) {
    for (const f of this.list) {
      f.update(dt);
      if (f.custom) continue;
      if (f.follow) {
        const p = f.follow();
        if (!p) f.stop();
        else { f.options.x = p.x; f.options.y = p.y; if (p.angle != null) f.options.angle = p.angle; if (p.flip != null) f.options.flip = p.flip; }
      }
      f.life -= dt;
      if (f.life <= 0) f.stop();
    }
    this.list = this.list.filter((f) => !f.done());
  }

  /** layer: 'ground'（床の上・キャラの下）か 'front'。ox, oy はカメラの左上（px）。 */
  render(ctx, ox, oy, layer) {
    const f = this.frame;
    f.ox = ox; f.oy = oy;
    clearFrame(f);
    let any = false;
    for (const fx of this.list) {
      if (fx.layer !== layer) continue;
      any = true;
      if (fx.custom) { const p = painterFor(f); p.place(0, 0); fx.draw(p); }
      else fx.draw(f);
    }
    if (!any) return;
    composite(f, this.img.data, null);
    this.cx.putImageData(this.img, 0, 0);
    ctx.drawImage(this.cv, 0, 0);
  }
}
