import { RARITY, WEAPONS, SKILLS, AFFIX, ENEMIES, GEAR_SLOTS, STAT_INFO, SETS, FUSE_COST, fuseWeapons, skillPower, xpForLevel } from './data.js';
import { JOBS, RESET_COST, skillLevels, setCounts, nodeState, allNodes } from './jobs.js';
import { RIDDLES } from './riddles.js';
import { mulberry } from './util.js';
import { itemIcon, skillIconURL, drawPortrait } from './icons.js';
import { toggleMute, sfx } from './audio.js';
import { T } from './map.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const KIND = { melee: '近接', thrust: '突き', bow: '弓', staff: '魔法' };
const INV_MAX = 60;
const SK_KEYS = ['Q', 'E', 'R', 'C'];
const SLOT_IDS = ['slotQ', 'slotE', 'slotR', 'slotC'];

export class UI {
  constructor(g) {
    this.g = g;
    this.t = 0; this.hudT = 0; this.mmT = 0;
    this.charOpen = false;
    this.sel = null;
    $('hud').classList.remove('hidden');
    $('title').classList.add('hidden');
    this.mm = $('minimap'); this.mmc = this.mm.getContext('2d');
    this.tab = 'status';

    const rb = $('roomBox');
    if (g.mode === 'host') { rb.classList.remove('hidden'); $('roomCode').textContent = g.code; this.setStatus('waiting'); }
    else if (g.mode === 'guest') rb.classList.remove('hidden');
    else rb.classList.add('hidden');

    this.handlers = [];
    const on = (el, ev, fn) => { el.addEventListener(ev, fn); this.handlers.push([el, ev, fn]); };
    on($('copyCode'), 'click', () => {
      navigator.clipboard && navigator.clipboard.writeText(g.code).then(() => this.toast('ルームコードをコピーしました', '#c9c2b2'));
    });
    on($('charClose'), 'click', () => this.toggleChar(false));
    on($('helpClose'), 'click', () => this.toggleHelp(false));
    on($('btnChar'), 'click', () => this.toggleChar());
    on($('btnHelp'), 'click', () => this.toggleHelp());
    on($('btnMute'), 'click', () => this.toggleMute());
    on($('fatalBtn'), 'click', () => g.onExit && g.onExit());
    on($('charTabs'), 'click', (e) => {
      const b = e.target.closest('button[data-tab]');
      if (b) { this.tab = b.dataset.tab; this.sel = null; sfx('ui'); this.renderChar(); }
    });
    on($('charBody'), 'click', (e) => this.onCharClick(e));
    on($('charBody'), 'dblclick', (e) => { const c = e.target.closest('[data-id]'); if (c) this.useItem(c.dataset.id); });
    on($('riddleClose'), 'click', () => this.closeRiddle());
  }

  get modalOpen() { return this.charOpen || !!this.riddleP; }

  destroy() {
    for (const [el, ev, fn] of this.handlers) el.removeEventListener(ev, fn);
    $('hud').classList.add('hidden');
    ['charScreen', 'riddle', 'help', 'waitOverlay', 'fatal'].forEach((id) => $(id).classList.add('hidden'));
    $('toasts').innerHTML = '';
  }

  // ---------- 毎フレーム ----------
  frame(dt) {
    this.t += dt;
    this.hudT -= dt;
    if (this.hudT <= 0 && this.g.map) { this.hudT = 0.08; this.updateHUD(); }
    this.mmT -= dt;
    if (this.mmT <= 0 && this.g.map) { this.mmT = 0.2; this.drawMinimap(); }
    if (this.charOpen) this.drawPortrait();
  }

  updateHUD() {
    const g = this.g, me = g.me;
    $('floorNum').textContent = `第 ${g.floor} 層`;
    $('floorName').textContent = g.map.theme.name + (g.map.boss ? ' — 番人の間' : '');
    const n = g.enemies.length;
    $('remain').innerHTML = g.portal ? '<span class="open">転移陣が開いている — 二人で乗ろう</span>' : `残る魔物 <b>${n}</b>`;
    this.partyFrame($('pMe'), me, true);
    const pa = $('pAlly');
    if (g.ally) { pa.classList.remove('hidden'); this.partyFrame(pa, g.ally, false); } else pa.classList.add('hidden');
    const need = xpForLevel(g.lvl);
    $('xpFill').style.width = `${(g.xp / need) * 100}%`;
    $('xpText').textContent = `Lv ${g.lvl}  ·  ${g.xp} / ${need}`;
    // アクションバー
    this.slot($('slotW'), me.weapon ? itemIcon(me.weapon) : null, 0, me.weapon ? RARITY[me.weapon.rarity].color : null);
    const lv = skillLevels(me);
    me.slots.forEach((id, i) => {
      const el = $(SLOT_IDS[i]);
      if (id && lv[id]) {
        const pw = skillPower(id, lv[id], me.stats);
        this.slot(el, skillIconURL(id), Math.max(0, (me.cds[id] || 0) / pw.cd), SKILLS[id].color, me.cds[id] > 0 ? Math.ceil(me.cds[id]) : '');
      } else this.slot(el, null, 0);
    });
    this.slot($('slotD'), null, Math.max(0, me.dodgeCd / me.dodgeMax), null, '', true);
    // 拾う・開けるの案内
    const pr = $('prompt');
    const it = g.interact;
    if (it && !me.down) {
      pr.classList.remove('hidden');
      if (it.type === 'chest') pr.innerHTML = '<kbd>F</kbd> 宝箱を開ける';
      else if (it.type === 'riddle') pr.innerHTML = '<kbd>F</kbd> 石碑を読む';
      else {
        const item = it.L.item;
        const col = RARITY[item.rarity || 0].color;
        const sub = item.cat === 'weapon' ? `${WEAPONS[item.base].name} · 攻撃 ${item.dmg}` : item.cat === 'gear' ? `防具 · ${GEAR_SLOTS[item.slot].name}${item.set ? ` · ${SETS[item.set].name}セット` : ''}` : 'スキルの巻物';
        pr.innerHTML = `<kbd>F</kbd> 拾う <b style="color:${col}">${esc(item.name)}</b> <small>${sub}</small>`;
      }
    } else {
      // 台座のヒント
      const pz = me.down ? null : g.map.puzzles.find((p) => p.kind === 'plates' && !p.done && Math.hypot(p.x - me.x, p.y - me.y) < 200);
      if (pz) { pr.classList.remove('hidden'); pr.innerHTML = g.ally ? `二人で 2 つの台座に同時に乗ろう <small>${pz.hold > 0 ? '…そのまま！' : ''}</small>` : `台座が光る順番に踏もう <small>${pz.step || 0} / 3</small>`; }
      else pr.classList.add('hidden');
    }
    // ボス
    const boss = g.enemies.find((e) => ENEMIES[e.type].boss);
    const bb = $('bossBar');
    if (boss) {
      bb.classList.remove('hidden');
      $('bossFill').style.width = `${Math.max(0, boss.hp / boss.maxHp) * 100}%`;
      $('bossName').textContent = ENEMIES[boss.type].name + (boss.enraged ? '（激昂）' : '');
    } else bb.classList.add('hidden');
    $('downOverlay').classList.toggle('hidden', !me.down);
    $('downText').textContent = g.ally ? (g.ally.down ? '二人とも倒れた… フロアをやり直す' : '倒れた — 相方が近くに来ると復活できる') : 'フロアをやり直す…';
  }

  partyFrame(el, p, mine) {
    el.querySelector('.pname').textContent = p.name;
    el.querySelector('.pname').style.color = p.pal.name;
    el.querySelector('.plv').textContent = `Lv ${this.g.lvl}`;
    const hp = Math.max(0, p.hp), mx = p.maxHp || 100;
    el.querySelector('.hpFill').style.width = `${(hp / mx) * 100}%`;
    el.querySelector('.shFill').style.width = `${Math.min(1, (p.shield || 0) / mx) * 100}%`;
    el.querySelector('.hpText').textContent = p.down ? 'ダウン' : `${Math.ceil(hp)} / ${mx}`;
    el.classList.toggle('down', !!p.down);
    el.classList.toggle('low', !p.down && hp / mx < 0.3);
  }

  slot(el, img, cd, col, label = '', dodge = false) {
    const im = el.querySelector('img');
    if (img) { if (im.dataset.src !== img) { im.src = img; im.dataset.src = img; } im.classList.remove('hidden'); } else if (!dodge) im.classList.add('hidden');
    el.style.setProperty('--cd', cd);
    el.style.setProperty('--col', col || 'transparent');
    el.querySelector('.cdnum').textContent = label;
    el.classList.toggle('empty', !img && !dodge);
  }

  drawMinimap() {
    const g = this.g, m = g.map, c = this.mmc;
    const W = this.mm.width, H = this.mm.height;
    const s = Math.min(W / m.W, H / m.H);
    const ox = (W - m.W * s) / 2, oy = (H - m.H * s) / 2;
    c.clearRect(0, 0, W, H);
    c.fillStyle = 'rgba(10,8,12,.75)';
    c.fillRect(0, 0, W, H);
    for (let y = 0; y < m.H; y++) for (let x = 0; x < m.W; x++) {
      const i = y * m.W + x;
      if (!m.seen[i]) continue;
      if (m.g[i]) { c.fillStyle = '#6a6056'; c.fillRect(ox + x * s, oy + y * s, s + 0.4, s + 0.4); }
    }
    const P = (x, y, col, r) => { c.fillStyle = col; c.beginPath(); c.arc(ox + (x / T) * s, oy + (y / T) * s, r, 0, 7); c.fill(); };
    for (const ch of m.chests) if (!ch.open && m.seen[((ch.y / T) | 0) * m.W + ((ch.x / T) | 0)]) P(ch.x, ch.y, '#ffcf5a', 2.4);
    const pp = g.portalPos();
    if (m.seen[((pp.y / T) | 0) * m.W + ((pp.x / T) | 0)] || g.portal) P(pp.x, pp.y, g.portal ? '#5ad0ff' : '#8a8a9a', 3.4);
    for (const e of g.enemies) if (Math.hypot(e.x - g.me.x, e.y - g.me.y) < 420) P(e.x, e.y, '#ff5a4a', 1.8);
    if (g.ally) P(g.ally.x, g.ally.y, g.ally.pal.name, 3.2);
    P(g.me.x, g.me.y, '#ffffff', 3.4);
    P(g.me.x, g.me.y, g.me.pal.name, 2.2);
  }

  // ---------- 通知 ----------
  toast(msg, col = '#e8e0cc', item) {
    const box = $('toasts');
    const d = document.createElement('div');
    d.className = 'toast';
    d.style.setProperty('--col', col);
    d.innerHTML = (item && item.cat ? `<img src="${itemIcon(item, 40)}">` : '') + `<span>${esc(msg)}</span>`;
    box.prepend(d);
    while (box.children.length > 5) box.lastChild.remove();
    setTimeout(() => d.classList.add('out'), 3200);
    setTimeout(() => d.remove(), 3800);
  }

  floorBanner(n, name, wipe) {
    const f = $('fade');
    f.querySelector('.fn').textContent = `第 ${n} 層`;
    f.querySelector('.fname').textContent = wipe ? '全滅… もう一度挑もう' : name;
    f.classList.remove('show');
    void f.offsetWidth;
    f.classList.add('show');
  }

  hurtFlash() {
    const h = $('hurtFx');
    h.classList.remove('on');
    void h.offsetWidth;
    h.classList.add('on');
  }

  setStatus(s, name) {
    const st = $('roomStatus');
    if (s === 'waiting') { st.textContent = '相方を待っています… このコードを伝えよう'; st.className = 'wait'; }
    else if (s === 'connected') { st.textContent = `${name} と冒険中`; st.className = 'ok'; }
    else if (s === 'guest') { $('roomCode').textContent = this.g.code; st.textContent = `${name} のルームに参加中`; st.className = 'ok'; $('copyCode').classList.add('hidden'); }
  }

  waiting(on) { $('waitOverlay').classList.toggle('hidden', !on); }
  fatal(msg) { $('fatalMsg').textContent = msg; $('fatal').classList.remove('hidden'); }
  markNew() { $('btnChar').classList.add('new'); }

  toggleMute() { const m = toggleMute(); $('btnMute').classList.toggle('off', m); this.toast(m ? '音を消しました' : '音を出しました'); }
  toggleHelp(force) { const h = $('help'); const on = force != null ? force : h.classList.contains('hidden'); h.classList.toggle('hidden', !on); }

  // ---------- なぞなぞ ----------
  openRiddle(p) {
    this.riddleP = p;
    const R = RIDDLES[p.ri % RIDDLES.length];
    const rnd = mulberry(p.ri), order = R.c.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    $('riddleQ').textContent = R.q;
    $('riddleNote').textContent = this.g.ally ? '二人とも正解すると報酬がもらえます。一人でも間違えると石碑は砕けます。' : '答えは一度だけ。間違えると石碑は砕けます。';
    const box = $('riddleChoices');
    box.innerHTML = order.map((i) => `<button data-i="${i}">${esc(R.c[i])}</button>`).join('');
    box.onclick = (e) => {
      const b = e.target.closest('button[data-i]');
      if (!b) return;
      const ok = +b.dataset.i === R.a, g = this.g;
      p.mine = true;
      this.closeRiddle();
      if (g.isHost) g.puzzleAnswer(g.me.id, p.id, ok);
      else g.net.send({ t: 'pza', id: p.id, ok });
    };
    $('riddle').classList.remove('hidden');
    sfx('ui');
  }
  closeRiddle() { this.riddleP = null; $('riddle').classList.add('hidden'); }

  // ---------- キャラクター画面 ----------
  toggleChar(force) {
    const on = force != null ? force : !this.charOpen;
    this.charOpen = on;
    $('charScreen').classList.toggle('hidden', !on);
    if (on) { $('btnChar').classList.remove('new'); this.renderChar(); sfx('ui'); }
  }
  closeAll() { this.toggleChar(false); this.toggleHelp(false); this.closeRiddle(); }

  isSolo() { const g = this.g; return !g.ally && !(g.net && g.net.connected); }

  weaponStats(it) {
    const W = WEAPONS[it.base], st = this.g.me.stats;
    const rate = it.rate * (1 - st.haste), dmg = Math.round(it.dmg * st.atk);
    return { dmg, rate, dps: dmg / rate, crit: Math.round((it.crit + st.crit) * 100), kind: KIND[W.kind] };
  }

  weaponCard(it, cmp) {
    const s = this.weaponStats(it), c = cmp ? this.weaponStats(cmp) : null;
    const diff = (a, b, inv) => {
      if (!c) return '';
      const d = a - b;
      if (Math.abs(d) < 0.05) return '';
      const good = inv ? d < 0 : d > 0;
      return ` <i class="${good ? 'up' : 'dn'}">${good ? '▲' : '▼'}${Math.abs(d) < 1 ? Math.abs(d).toFixed(2) : Math.round(Math.abs(d))}</i>`;
    };
    const col = RARITY[it.rarity].color;
    return `<div class="wcard" style="--col:${col}"><img src="${itemIcon(it, 64)}"><div><div class="wname" style="color:${col}">${esc(it.name)}</div><div class="wsub">${RARITY[it.rarity].name} · ${WEAPONS[it.base].name}（${s.kind}）</div></div></div>
      <dl class="stats"><dt>攻撃力</dt><dd>${s.dmg}${diff(s.dmg, c && c.dmg)}</dd><dt>攻撃間隔</dt><dd>${s.rate.toFixed(2)} 秒${diff(s.rate, c && c.rate, true)}</dd><dt>毎秒ダメージ</dt><dd>${s.dps.toFixed(1)}${diff(s.dps, c && c.dps)}</dd><dt>会心率</dt><dd>${s.crit}%${diff(s.crit, c && c.crit)}</dd></dl>
      ${(it.affixes || []).map((a) => `<div class="affix">◆ ${AFFIX[a].desc}</div>`).join('') || '<div class="setline">追加効果なし</div>'}`;
  }

  gearCard(it, cmp) {
    const col = RARITY[it.rarity].color;
    const lines = Object.entries(it.stats).map(([k, v]) => {
      const old = cmp ? cmp.stats[k] || 0 : null, d = old == null ? 0 : v - old;
      return `<dt>${STAT_INFO[k][0]}</dt><dd>${STAT_INFO[k][1](v)}${d ? ` <i class="${d > 0 ? 'up' : 'dn'}">${d > 0 ? '▲' : '▼'}</i>` : ''}</dd>`;
    }).join('');
    const set = it.set ? `<div class="setline" style="color:${SETS[it.set].color}">◆ ${SETS[it.set].name}セット</div>` : '';
    return `<div class="wcard" style="--col:${col}"><img src="${itemIcon(it, 64)}"><div><div class="wname" style="color:${col}">${esc(it.name)}</div><div class="wsub">${RARITY[it.rarity].name} · ${GEAR_SLOTS[it.slot].name}</div></div></div><dl class="stats">${lines}</dl>${set}`;
  }

  grid(items) {
    return `<div class="invgrid">${items.map((it) => `<div class="cell ${it.id === this.sel ? 'sel' : ''}" data-id="${it.id}" style="--col:${RARITY[it.rarity || 0].color}" title="${esc(it.name)}"><img src="${itemIcon(it, 48)}"></div>`).join('') || '<p class="muted small">まだありません</p>'}</div>`;
  }

  renderChar() {
    const g = this.g;
    document.querySelectorAll('#charTabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === this.tab));
    const note = $('charNote');
    note.textContent = this.isSolo() ? '一人プレイ中：この画面を開いている間はゲームが止まります。' : '⚠ 二人プレイ中：この画面を開いていてもゲームは止まりません。敵に注意！';
    note.classList.toggle('warn', !this.isSolo());
    $('charBody').innerHTML = { status: () => this.tabStatus(), weapon: () => this.tabWeapon(), gear: () => this.tabGear(), skill: () => this.tabSkill(), tree: () => this.tabTree() }[this.tab]();
    this.pc = null;
    const pc = $('portrait');
    if (pc) this.pc = pc.getContext('2d');
  }

  tabStatus() {
    const g = this.g, me = g.me, st = me.stats, ws = me.weapon ? this.weaponStats(me.weapon) : null;
    const pct = (v) => `${Math.round(v * 100)}%`;
    const rows = [['HP', `${Math.ceil(me.hp)} / ${me.maxHp}`], ['攻撃力', `×${st.atk.toFixed(2)}`], ['毎秒ダメージ', ws ? ws.dps.toFixed(1) : '-'], ['会心率', ws ? `${ws.crit}%` : pct(st.crit)], ['会心ダメージ', `×${(1.8 + st.critDmg).toFixed(2)}`], ['被ダメージ軽減', pct(st.def)], ['移動速度', pct(st.speed)], ['攻撃速度', `+${pct(st.haste)}`], ['スキル再使用短縮', pct(st.cdr)], ['回復量', pct(st.heal)], ['ダメージ吸収', pct(st.vamp)], ['HP自動回復', `毎秒 ${st.regen}`], ['回避の再使用', `${me.dodgeMax.toFixed(2)} 秒`], ['スキルポイント', me.sp], ['到達階層', `第 ${g.floor} 層`]];
    const eq = Object.keys(GEAR_SLOTS).map((k) => { const it = me.gear[k]; return `<div class="setline">${GEAR_SLOTS[k].name}：${it ? `<span style="color:${RARITY[it.rarity].color}">${esc(it.name)}</span>` : 'なし'}</div>`; }).join('');
    return `<div class="tabcols c3"><div><canvas id="portrait" width="300" height="320"></canvas><div class="cname"><span style="color:${JOBS[me.job].color}">${esc(me.name)}</span><span id="cLv">Lv ${g.lvl}</span></div><div class="wsub">${JOBS[me.job].name}${me.branch != null ? ` · ${JOBS[me.job].branches[me.branch].name}` : ''}</div></div>
      <div><h3>ステータス</h3><dl class="stats">${rows.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl></div>
      <div><h3>武器</h3>${me.weapon ? `<div class="setline"><span style="color:${RARITY[me.weapon.rarity].color}">${esc(me.weapon.name)}</span></div>` : ''}<h3>防具</h3>${eq}<h3>セット効果</h3>${this.setsHtml(true)}</div></div>`;
  }

  setsHtml(onlyActive) {
    const c = setCounts(this.g.me);
    const fmt = (o) => Object.entries(o).map(([k, v]) => (k === 'aff' ? '攻撃が敵を炎上させる' : `${STAT_INFO[k][0]} ${STAT_INFO[k][1](v)}`)).join('、');
    const keys = onlyActive ? Object.keys(c) : Object.keys(SETS);
    if (!keys.length) return '<p class="muted small">セットの防具を揃えると効果が出ます。</p>';
    return keys.map((k) => { const n = c[k] || 0, S = SETS[k]; return `<div class="setname" style="color:${S.color}">${S.name}セット（${n}）</div><div class="setline ${n >= 2 ? 'on' : ''}">2 個：${fmt(S.two)}</div><div class="setline ${n >= 4 ? 'on' : ''}">4 個：${fmt(S.four)}</div>`; }).join('');
  }

  tabWeapon() {
    const me = this.g.me, items = me.inventory.filter((i) => i.cat === 'weapon');
    const sel = items.find((x) => x.id === this.sel);
    const groups = {};
    for (const it of items) { const k = it.base + '|' + it.rarity; (groups[k] = groups[k] || []).push(it); }
    const fuse = Object.entries(groups).filter(([k]) => +k.split('|')[1] < 5).sort((a, b) => a[1][0].rarity - b[1][0].rarity).map(([k, l]) => {
      const it = l[0], need = FUSE_COST[it.rarity], next = RARITY[it.rarity + 1];
      return `<div class="fuse"><img src="${itemIcon(it, 48)}"><div><span style="color:${RARITY[it.rarity].color}">${RARITY[it.rarity].name}</span> ${WEAPONS[it.base].name} <b>${l.length}</b> / ${need}<small>→ <span style="color:${next.color}">${next.name}</span> に合成</small></div><button data-act="fuse" data-k="${k}" ${l.length >= need ? '' : 'disabled'}>合成</button></div>`;
    }).join('') || '<p class="muted small">同じ武器種・同じレアリティの武器を集めると合成できます。装備中の武器は素材になりません。</p>';
    return `<div class="tabcols c2"><div><h3>装備中</h3><div class="panelbox">${me.weapon ? this.weaponCard(me.weapon) : '武器なし'}</div><h3>持っている武器 <span>${items.length}</span></h3>${this.grid(items)}
      ${sel ? `<h3>選択中</h3><div class="panelbox">${this.weaponCard(sel, me.weapon)}<div class="acts"><button data-act="use" class="primary">装備する</button><button data-act="drop">足元に置く</button></div></div>` : ''}</div>
      <div><h3>武器の合成</h3><p class="muted small">コモン 5 本 → アンコモン 4 本 → レア 3 本 → エピック 2 本 → レジェンド 2 本 → <span style="color:${RARITY[5].color}">神話</span>。一番強い素材を引き継ぎ、効果が増えます。</p>${fuse}</div></div>`;
  }

  tabGear() {
    const me = this.g.me, items = me.inventory.filter((i) => i.cat === 'gear');
    const sel = items.find((x) => x.id === this.sel);
    const eqSel = Object.values(me.gear).find((x) => x && x.id === this.sel);
    const slots = Object.keys(GEAR_SLOTS).map((k) => { const it = me.gear[k]; return `<div class="gslot ${it && it.id === this.sel ? 'sel' : ''}" ${it ? `data-gear="${k}"` : ''} style="${it ? `border-color:${RARITY[it.rarity].color}` : ''}">${it ? `<img src="${itemIcon(it, 48)}">` : ''}<span>${GEAR_SLOTS[k].name}</span></div>`; }).join('');
    let detail = '';
    if (sel) detail = `<h3>選択中</h3><div class="panelbox">${this.gearCard(sel, me.gear[sel.slot])}<div class="acts"><button data-act="use" class="primary">装備する</button><button data-act="drop">足元に置く</button></div></div>`;
    else if (eqSel) detail = `<h3>装備中</h3><div class="panelbox">${this.gearCard(eqSel)}<div class="acts"><button data-act="unequip" data-slot="${eqSel.slot}">外す</button></div></div>`;
    return `<div class="tabcols c2"><div><h3>装備（5 か所）</h3><div class="slotrow">${slots}</div><h3>持っている防具 <span>${items.length}</span></h3>${this.grid(items)}${detail}</div><div><h3>セット効果</h3>${this.setsHtml(false)}</div></div>`;
  }

  tabSkill() {
    const g = this.g, me = g.me, lv = skillLevels(me), scrolls = me.inventory.filter((i) => i.cat === 'skill');
    const sel = scrolls.find((x) => x.id === this.sel);
    const slots = me.slots.map((id, i) => `<div class="sks"><kbd>${SK_KEYS[i]}</kbd>${id && lv[id] ? `<img src="${skillIconURL(id, 48)}">${SKILLS[id].name}` : '<div style="height:44px"></div><span class="muted">空き</span>'}</div>`).join('');
    const list = Object.keys(lv).map((id) => { const S = SKILLS[id], pw = skillPower(id, lv[id], me.stats); return `<div class="skill" style="--col:${S.color}"><img src="${skillIconURL(id, 48)}"><div class="sbody"><div class="sname">${S.name} <span>Lv ${lv[id]}</span></div><div class="sdesc">${S.desc(pw)}</div><div class="muted">再使用 ${pw.cd} 秒${S.aim === 'enemy' ? ' · 近くの敵を自動で狙う' : ''}</div></div><div class="sbtns four">${SK_KEYS.map((k, s) => `<button data-act="assign" data-skill="${id}" data-slot="${s}" class="${me.slots[s] === id ? 'on' : ''}">${k}</button>`).join('')}</div></div>`; }).join('');
    let detail = '';
    if (sel) { const cur = me.skills[sel.skill] || 0, pw = skillPower(sel.skill, Math.min(5, cur + 1), me.stats); detail = `<div class="panelbox" style="margin-top:12px"><div class="sname">${esc(sel.name)}</div><p class="sdesc">${SKILLS[sel.skill].desc(pw)}</p><div class="acts"><button data-act="use" class="primary" ${cur >= 5 ? 'disabled' : ''}>${cur ? 'レベルを上げる' : '習得する'}</button><button data-act="drop">足元に置く</button></div></div>`; }
    return `<div class="tabcols c2"><div><h3>セット中</h3><div class="skillslots">${slots}</div><h3>使えるスキル</h3>${list || '<p class="muted small">なし</p>'}</div><div><h3>持っている巻物 <span>${scrolls.length}</span></h3>${this.grid(scrolls)}${detail}<p class="muted small" style="margin-top:12px">巻物はマップで拾えます。ツリー専用のスキルは「スキルツリー」で覚えます。</p></div></div>`;
  }

  nodeHtml(n, bi) {
    const me = this.g.me, lv = me.tree[n.id] || 0, st = nodeState(me, n, bi);
    let name, desc, icon;
    if (n.kind === 'active') {
      const S = SKILLS[n.skill];
      name = S.name; desc = S.desc(skillPower(n.skill, Math.max(1, Math.min(5, lv + 1)), me.stats));
      icon = `<img src="${skillIconURL(n.skill, 48)}">`;
    } else {
      const fmt = Object.entries(n.per).map(([k, v]) => `${STAT_INFO[k][0]} ${STAT_INFO[k][1](v)}`).join('、');
      name = n.name; desc = `${n.desc}（1 レベルごとに ${fmt}）`;
      icon = '<div class="pass">常時</div>';
    }
    return `<div class="node">${icon}<div><b>${name}<span>Lv ${lv} / ${n.max}</span></b><small>${desc}</small>${st.ok || lv >= n.max ? '' : `<small class="muted">${st.why}</small>`}</div><button data-act="learn" data-node="${n.id}" ${st.ok ? '' : 'disabled'}>+</button></div>`;
  }

  tabTree() {
    const me = this.g.me, J = JOBS[me.job];
    const spent = Object.values(me.tree).reduce((a, b) => a + b, 0);
    const canReset = spent > 0 && me.sp + spent >= RESET_COST;
    return `<div class="treewrap"><div class="treetop"><div class="sp">スキルポイント ${me.sp}</div><div class="grow muted small">${J.name}のスキルツリー。分岐は 1 つだけ選べます。別の分岐にするにはリセット（${RESET_COST} ポイント消費、残りは返還）。ポイントは強敵・宝箱・ボス・謎解きで手に入ります。</div><button data-act="reset" ${canReset ? '' : 'disabled'}>リセット</button></div>
      ${this.nodeHtml(J.root, null)}
      <div class="branches">${J.branches.map((b, i) => `<div class="branch ${me.branch === i ? 'chosen' : me.branch != null ? 'locked' : ''}"><h4>${b.name}</h4><p>${b.desc}</p>${b.nodes.map((n) => this.nodeHtml(n, i)).join('')}</div>`).join('')}</div></div>`;
  }

  onCharClick(e) {
    const g = this.g, me = g.me;
    const cell = e.target.closest('[data-id]');
    if (cell) { this.sel = cell.dataset.id; sfx('ui'); this.renderChar(); return; }
    const gs = e.target.closest('[data-gear]');
    if (gs) { this.sel = me.gear[gs.dataset.gear].id; sfx('ui'); this.renderChar(); return; }
    const b = e.target.closest('button[data-act]');
    if (!b || b.disabled) return;
    const act = b.dataset.act;
    if (act === 'use') this.useItem(this.sel);
    else if (act === 'drop') this.dropSel();
    else if (act === 'assign') this.assign(b.dataset.skill, +b.dataset.slot);
    else if (act === 'unequip') {
      const it = me.gear[b.dataset.slot];
      me.gear[b.dataset.slot] = null; me.inventory.push(it); this.sel = null;
      g.refreshStats(); sfx('ui'); this.renderChar();
    } else if (act === 'fuse') this.fuse(b.dataset.k);
    else if (act === 'learn') this.learn(b.dataset.node);
    else if (act === 'reset') this.resetTree();
  }

  fuse(k) {
    const me = this.g.me, [base, r] = k.split('|'), rar = +r;
    const list = me.inventory.filter((i) => i.cat === 'weapon' && i.base === base && i.rarity === rar).sort((a, b) => b.dmg - a.dmg).slice(0, FUSE_COST[rar]);
    if (list.length < FUSE_COST[rar]) return;
    me.inventory = me.inventory.filter((i) => !list.includes(i));
    const it = fuseWeapons(list);
    me.inventory.push(it);
    this.sel = it.id;
    sfx('rare');
    this.toast(`合成成功！ ${RARITY[it.rarity].name}「${it.name}」`, RARITY[it.rarity].color, it);
    this.renderChar();
  }

  learn(id) {
    const g = this.g, me = g.me, J = JOBS[me.job];
    const n = allNodes(me.job).find((x) => x.id === id);
    const bi = J.branches.findIndex((b) => b.nodes.includes(n));
    if (!nodeState(me, n, bi < 0 ? null : bi).ok) return;
    me.sp--;
    me.tree[id] = (me.tree[id] || 0) + 1;
    if (bi >= 0) me.branch = bi;
    if (n.kind === 'active' && !me.slots.includes(n.skill)) { const free = me.slots.indexOf(null); if (free >= 0) me.slots[free] = n.skill; }
    g.refreshStats();
    sfx('level');
    this.renderChar();
  }

  resetTree() {
    const g = this.g, me = g.me;
    const spent = Object.values(me.tree).reduce((a, b) => a + b, 0);
    if (spent <= 0 || me.sp + spent < RESET_COST) return;
    me.sp = me.sp + spent - RESET_COST;
    me.tree = {}; me.branch = null;
    const lv = skillLevels(me);
    me.slots = me.slots.map((id) => (id && lv[id] ? id : null));
    g.refreshStats();
    sfx('ui');
    this.toast(`ツリーをリセットした（${RESET_COST} ポイント消費）`, '#c9c2b2');
    this.renderChar();
  }

  useItem(id) {
    const g = this.g, me = g.me;
    const i = me.inventory.findIndex((x) => x.id === id);
    if (i < 0) return;
    const it = me.inventory[i];
    if (it.cat === 'weapon') {
      me.inventory.splice(i, 1);
      if (me.weapon) me.inventory.push(me.weapon);
      me.weapon = it; me.atkCd = 0.2; this.sel = null;
      sfx('pick');
      this.toast(`「${it.name}」を装備した`, RARITY[it.rarity].color, it);
    } else if (it.cat === 'gear') {
      me.inventory.splice(i, 1);
      if (me.gear[it.slot]) me.inventory.push(me.gear[it.slot]);
      me.gear[it.slot] = it; this.sel = null;
      g.refreshStats();
      sfx('pick');
      this.toast(`「${it.name}」を装備した`, RARITY[it.rarity].color, it);
    } else if (it.cat === 'skill') {
      const cur = me.skills[it.skill] || 0;
      if (cur >= 5) { this.toast('このスキルはすでに最大レベルです', '#ff8a6a'); return; }
      me.inventory.splice(i, 1);
      me.skills[it.skill] = cur + 1;
      if (!me.slots.includes(it.skill)) { const free = me.slots.indexOf(null); if (free >= 0) me.slots[free] = it.skill; }
      this.sel = null;
      sfx('level');
      this.toast(cur ? `「${SKILLS[it.skill].name}」が Lv ${cur + 1} になった` : `「${SKILLS[it.skill].name}」を習得した！`, SKILLS[it.skill].color);
    }
    this.renderChar();
  }

  dropSel() {
    const me = this.g.me;
    const i = me.inventory.findIndex((x) => x.id === this.sel);
    if (i < 0) return;
    const [it] = me.inventory.splice(i, 1);
    this.g.dropItem(it);
    this.sel = null;
    this.toast(`「${it.name}」を足元に置いた（相方も拾えます）`, '#c9c2b2');
    this.renderChar();
  }

  assign(skill, slot) {
    const me = this.g.me;
    const other = me.slots.indexOf(skill);
    if (other >= 0) me.slots[other] = me.slots[slot];
    me.slots[slot] = skill;
    sfx('ui');
    this.renderChar();
  }

  drawPortrait() {
    const c = this.pc;
    if (!c) return;
    const cv = c.canvas;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    const g = c.createRadialGradient(cv.width * 0.45, cv.height * 0.6, 4, cv.width * 0.45, cv.height * 0.6, cv.width * 0.6);
    g.addColorStop(0, 'rgba(255,170,90,.28)'); g.addColorStop(1, 'rgba(255,170,90,0)');
    c.fillStyle = g; c.fillRect(0, 0, cv.width, cv.height);
    drawPortrait(c, this.g.me, this.t, 4, cv.width * 0.42, cv.height * 0.88);
  }
}
