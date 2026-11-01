import { RARITY, WEAPONS, SKILLS, AFFIX, ENEMIES, skillPower, xpForLevel } from './data.js';
import { itemIcon, skillIconURL, drawPortrait } from './icons.js';
import { toggleMute, sfx } from './audio.js';
import { T } from './map.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const KIND = { melee: '近接', thrust: '突き', bow: '弓', staff: '魔法' };
const INV_MAX = 24;

export class UI {
  constructor(g) {
    this.g = g;
    this.t = 0; this.hudT = 0; this.mmT = 0;
    this.charOpen = false;
    this.sel = null;
    $('hud').classList.remove('hidden');
    $('title').classList.add('hidden');
    this.mm = $('minimap'); this.mmc = this.mm.getContext('2d');
    this.pc = $('portrait').getContext('2d');

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
    on($('invGrid'), 'click', (e) => {
      const cell = e.target.closest('[data-id]');
      if (!cell) return;
      this.sel = cell.dataset.id;
      sfx('ui');
      this.renderChar();
    });
    on($('invGrid'), 'dblclick', (e) => {
      const cell = e.target.closest('[data-id]');
      if (cell) this.useItem(cell.dataset.id);
    });
    on($('detail'), 'click', (e) => {
      const b = e.target.closest('button[data-act]');
      if (!b) return;
      if (b.dataset.act === 'use') this.useItem(this.sel);
      if (b.dataset.act === 'drop') this.dropSel();
    });
    on($('skillList'), 'click', (e) => {
      const b = e.target.closest('button[data-slot]');
      if (!b) return;
      this.assign(b.dataset.skill, +b.dataset.slot);
    });
  }

  destroy() {
    for (const [el, ev, fn] of this.handlers) el.removeEventListener(ev, fn);
    $('hud').classList.add('hidden');
    ['charScreen', 'help', 'waitOverlay', 'fatal'].forEach((id) => $(id).classList.add('hidden'));
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
    for (const i of [0, 1]) {
      const id = me.slots[i];
      const el = $(i ? 'slotE' : 'slotQ');
      if (id) {
        const pw = skillPower(id, me.skills[id], g.lvl);
        this.slot(el, skillIconURL(id), Math.max(0, (me.cds[id] || 0) / pw.cd), SKILLS[id].color, me.cds[id] > 0 ? Math.ceil(me.cds[id]) : '');
      } else this.slot(el, null, 0);
    }
    this.slot($('slotD'), null, Math.max(0, me.dodgeCd / 0.8), null, '', true);
    // 拾う・開けるの案内
    const pr = $('prompt');
    const it = g.interact;
    if (it && !me.down) {
      pr.classList.remove('hidden');
      if (it.type === 'chest') pr.innerHTML = '<kbd>F</kbd> 宝箱を開ける';
      else {
        const item = it.L.item;
        const col = RARITY[item.rarity || 0].color;
        const sub = item.cat === 'weapon' ? `${WEAPONS[item.base].name} · 攻撃 ${item.dmg}` : 'スキルの巻物';
        pr.innerHTML = `<kbd>F</kbd> 拾う <b style="color:${col}">${esc(item.name)}</b> <small>${sub}</small>`;
      }
    } else pr.classList.add('hidden');
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
  closeAll() { this.toggleChar(false); this.toggleHelp(false); }

  // ---------- キャラクター画面 ----------
  toggleChar(force) {
    const on = force != null ? force : !this.charOpen;
    this.charOpen = on;
    $('charScreen').classList.toggle('hidden', !on);
    if (on) { $('btnChar').classList.remove('new'); this.sel = this.sel || (this.g.me.inventory[0] && this.g.me.inventory[0].id); this.renderChar(); sfx('ui'); }
  }

  useItem(id) {
    const me = this.g.me;
    const i = me.inventory.findIndex((x) => x.id === id);
    if (i < 0) return;
    const it = me.inventory[i];
    if (it.cat === 'weapon') {
      me.inventory.splice(i, 1);
      if (me.weapon) me.inventory.splice(i, 0, me.weapon);
      me.weapon = it;
      me.atkCd = 0.2;
      this.sel = me.inventory[i] ? me.inventory[i].id : null;
      sfx('pick');
      this.toast(`「${it.name}」を装備した`, RARITY[it.rarity].color, it);
    } else if (it.cat === 'skill') {
      const cur = me.skills[it.skill] || 0;
      if (cur >= 5) { this.toast('このスキルはすでに最大レベルです', '#ff8a6a'); return; }
      me.inventory.splice(i, 1);
      me.skills[it.skill] = cur + 1;
      if (!cur) { const free = me.slots.indexOf(null); if (free >= 0) me.slots[free] = it.skill; }
      this.sel = me.inventory[i] ? me.inventory[i].id : null;
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
    this.sel = me.inventory[i] ? me.inventory[i].id : me.inventory[i - 1] ? me.inventory[i - 1].id : null;
    this.toast(`「${it.name}」を足元に置いた（相方も拾えます）`, '#c9c2b2');
    this.renderChar();
  }

  assign(skill, slot) {
    const me = this.g.me;
    const other = 1 - slot;
    if (me.slots[other] === skill) me.slots[other] = me.slots[slot];
    me.slots[slot] = skill;
    sfx('ui');
    this.renderChar();
  }

  weaponStats(it) {
    const W = WEAPONS[it.base];
    const m = 1 + 0.08 * (this.g.lvl - 1);
    return { dmg: Math.round(it.dmg * m), rate: it.rate, dps: (it.dmg * m) / it.rate, crit: Math.round(it.crit * 100), kind: KIND[W.kind] };
  }

  weaponCard(it, cmp) {
    const s = this.weaponStats(it);
    const c = cmp ? this.weaponStats(cmp) : null;
    const diff = (a, b, inv) => {
      if (!c) return '';
      const d = a - b;
      if (Math.abs(d) < 0.05) return '';
      const good = inv ? d < 0 : d > 0;
      return ` <i class="${good ? 'up' : 'dn'}">${good ? '▲' : '▼'}${Math.abs(d) < 1 ? Math.abs(d).toFixed(2) : Math.round(Math.abs(d))}</i>`;
    };
    const col = RARITY[it.rarity].color;
    return `
      <div class="wcard" style="--col:${col}">
        <img src="${itemIcon(it, 64)}">
        <div>
          <div class="wname" style="color:${col}">${esc(it.name)}</div>
          <div class="wsub">${RARITY[it.rarity].name} · ${WEAPONS[it.base].name}（${s.kind}）</div>
        </div>
      </div>
      <dl class="stats">
        <dt>攻撃力</dt><dd>${s.dmg}${diff(s.dmg, c && c.dmg)}</dd>
        <dt>攻撃間隔</dt><dd>${s.rate.toFixed(2)} 秒${diff(s.rate, c && c.rate, true)}</dd>
        <dt>毎秒ダメージ</dt><dd>${s.dps.toFixed(1)}${diff(s.dps, c && c.dps)}</dd>
        <dt>会心率</dt><dd>${s.crit}%${diff(s.crit, c && c.crit)}</dd>
      </dl>
      ${it.affixes.map((a) => `<div class="affix">◆ ${AFFIX[a].desc}</div>`).join('')}`;
  }

  renderChar() {
    const g = this.g, me = g.me;
    $('cName').textContent = me.name;
    $('cName').style.color = me.pal.name;
    $('cLv').textContent = `Lv ${g.lvl}`;
    const ws = me.weapon ? this.weaponStats(me.weapon) : null;
    $('cStats').innerHTML = `
      <dt>HP</dt><dd>${Math.ceil(me.hp)} / ${me.maxHp}</dd>
      <dt>攻撃力倍率</dt><dd>×${(1 + 0.08 * (g.lvl - 1)).toFixed(2)}</dd>
      <dt>毎秒ダメージ</dt><dd>${ws ? ws.dps.toFixed(1) : '-'}</dd>
      <dt>会心率</dt><dd>${ws ? ws.crit : 0}%</dd>
      <dt>到達階層</dt><dd>第 ${g.floor} 層</dd>`;
    $('equipped').innerHTML = me.weapon ? this.weaponCard(me.weapon) : '<p class="muted">武器なし</p>';
    // 持ち物
    const cells = [];
    for (let i = 0; i < INV_MAX; i++) {
      const it = me.inventory[i];
      if (!it) { cells.push('<div class="cell empty"></div>'); continue; }
      const col = RARITY[it.rarity || 0].color;
      const better = it.cat === 'weapon' && me.weapon && this.weaponStats(it).dps > this.weaponStats(me.weapon).dps + 0.05;
      cells.push(`<div class="cell ${it.id === this.sel ? 'sel' : ''}" data-id="${it.id}" style="--col:${col}" title="${esc(it.name)}"><img src="${itemIcon(it, 48)}">${better ? '<span class="better">▲</span>' : ''}${it.cat === 'skill' ? '<span class="tag">巻物</span>' : ''}</div>`);
    }
    $('invGrid').innerHTML = cells.join('');
    $('invCount').textContent = `${me.inventory.length} / ${INV_MAX}`;
    // 詳細
    const sel = me.inventory.find((x) => x.id === this.sel);
    const det = $('detail');
    if (!sel) det.innerHTML = '<p class="muted">持ち物を選ぶと詳しく見られます。<br>ダブルクリックで装備・習得。</p>';
    else if (sel.cat === 'weapon') {
      det.innerHTML = this.weaponCard(sel, me.weapon) + `<div class="acts"><button data-act="use" class="primary">装備する</button><button data-act="drop">足元に置く</button></div>`;
    } else {
      const S = SKILLS[sel.skill];
      const cur = me.skills[sel.skill] || 0;
      const pw = skillPower(sel.skill, Math.min(5, cur + 1), g.lvl);
      det.innerHTML = `
        <div class="wcard" style="--col:${S.color}"><img src="${skillIconURL(sel.skill, 64)}"><div><div class="wname" style="color:${S.color}">${esc(sel.name)}</div><div class="wsub">${cur ? `習得済み Lv ${cur} → Lv ${Math.min(5, cur + 1)}` : '未習得のスキル'}</div></div></div>
        <p class="sdesc">${S.desc(pw)}</p><p class="muted">再使用まで ${pw.cd} 秒</p>
        <div class="acts"><button data-act="use" class="primary" ${cur >= 5 ? 'disabled' : ''}>${cur ? 'レベルを上げる' : '習得する'}</button><button data-act="drop">足元に置く</button></div>`;
    }
    // スキル
    const ids = Object.keys(me.skills);
    $('skillList').innerHTML = ids.length ? ids.map((id) => {
      const S = SKILLS[id], lv = me.skills[id], pw = skillPower(id, lv, g.lvl);
      return `<div class="skill" style="--col:${S.color}">
        <img src="${skillIconURL(id, 48)}">
        <div class="sbody"><div class="sname">${S.name} <span>Lv ${lv}</span></div><div class="sdesc">${S.desc(pw)}</div><div class="muted">再使用 ${pw.cd} 秒</div></div>
        <div class="sbtns">${[0, 1].map((s) => `<button data-skill="${id}" data-slot="${s}" class="${me.slots[s] === id ? 'on' : ''}">${s ? 'E' : 'Q'}</button>`).join('')}</div>
      </div>`;
    }).join('') : '<p class="muted">巻物を拾って習得しよう。</p>';
  }

  drawPortrait() {
    const c = this.pc, cv = c.canvas;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    const g = c.createRadialGradient(cv.width * 0.45, cv.height * 0.6, 4, cv.width * 0.45, cv.height * 0.6, cv.width * 0.6);
    g.addColorStop(0, 'rgba(255,170,90,.28)'); g.addColorStop(1, 'rgba(255,170,90,0)');
    c.fillStyle = g; c.fillRect(0, 0, cv.width, cv.height);
    drawPortrait(c, this.g.me, this.t, 4, cv.width * 0.42, cv.height * 0.88);
  }
}
