// Экраны игры: старт → решение → событие → расчёт → … → итог.
(function () {
  'use strict';
  const E = window.Engine, I = window.I18N;
  const KEY = 'pyatiletka-game-v1';
  const ZH_NUM = ['', '一', '二', '三', '四'];
  const app = document.getElementById('app');

  // ---------- состояние ----------
  function defaultLang() { try { return /^zh/i.test(navigator.language || '') ? 'zh' : 'ru'; } catch (e) { return 'ru'; } }
  function fresh(lang) { return { lang: lang || defaultLang(), team: '', screen: 'start', game: null, dec: null, sel: 'A', last: null, lastRound: 0, rounds: E.ROUNDS }; }
  function load() { try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); return s && s.screen ? s : null; } catch (e) { return null; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  let S = load() || fresh();
  let modal = null;

  // ---------- тексты ----------
  function t(k, v) {
    let s = I.STR[S.lang][k];
    if (s === undefined) s = I.STR.ru[k];
    if (s === undefined) s = k;
    if (v) Object.keys(v).forEach(n => { s = s.split('{' + n + '}').join(v[n]); });
    return s;
  }
  const term = k => (S.lang === 'zh' ? I.TERMS[k].zh : I.TERMS[k].ru);
  const termAlt = k => (S.lang === 'zh' ? I.TERMS[k].ru : I.TERMS[k].zh);
  const rname = (k, short) => (S.lang === 'zh' ? I.TERMS[k].zh : (short ? I.TERMS[k].short : I.TERMS[k].ru));
  const roundName = n => t('round', { n: S.lang === 'zh' ? ZH_NUM[n] : n });
  const roundCode = n => I.ROUND_CODE[n][0] + ' · ' + I.ROUND_CODE[n][1];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const signed = v => (v > 0 ? '+' + v : v < 0 ? '−' + (-v) : '0');
  const cls = v => (v > 0 ? 'p' : v < 0 ? 'n' : 'z');
  const teamName = () => esc(S.team.trim() || t('teamDefault'));

  // ---------- карта ----------
  // Шестигранники «острым верхом», нечётные ряды сдвинуты вправо.
  // X — соседняя страна, ~ — море, A–E — регионы.
  const GRID = [
    'XCCCCCC~~~',
    'XCCCCCCB~~',
    'XEEAABBB~~',
    'XEEAAABB~~',
    'XEEDAAB~~~',
    'XEDDDDD~~~',
    'XXDDDD~~~~'
  ];
  const HS = 20, SQ3 = Math.sqrt(3);
  const MW = HS * SQ3 * 10.5, MH = HS * 11;
  const SEAT = { A: [3, 4], B: [2, 6], C: [1, 3], D: [5, 4], E: [3, 1] };
  const FEAT = { B: [3, 7], C: [0, 5], D: [6, 3], E: [5, 1] };
  const SEZHEX = { B: [2, 7], E: [4, 1] };
  const RAMP = [[2, '#EFE6D2'], [5, '#DDE5C0'], [8, '#BFD79B'], [11, '#93C072'], [14, '#64A255'], [18, '#3E8045'], [Infinity, '#24572D']];
  const fillFor = v => RAMP.find(s => v <= s[0])[1];
  const cell = (r, c) => (GRID[r] && GRID[r][c]) || ' ';
  const center = (r, c) => [HS * SQ3 * (c + 0.5 * (r & 1)) + HS * SQ3 / 2, HS * 1.5 * r + HS];
  function corner(x, y, i, s) { const a = (60 * i - 30) * Math.PI / 180; return [x + s * Math.cos(a), y + s * Math.sin(a)]; }
  function hexPts(x, y, s) { const p = []; for (let i = 0; i < 6; i++) p.push(corner(x, y, i, s).map(n => n.toFixed(1)).join(',')); return p.join(' '); }
  // Сосед за ребром i (ребро между углами i и i+1): В, ЮВ, ЮЗ, З, СЗ, СВ.
  function nb(r, c, i) {
    const o = r & 1;
    const d = [[0, 1], [1, o ? 1 : 0], [1, o ? 0 : -1], [0, -1], [-1, o ? 0 : -1], [-1, o ? 1 : 0]][i];
    return [r + d[0], c + d[1]];
  }
  const isReg = ch => 'ABCDE'.includes(ch);
  const same = (a, b) => a[0] === b[0] && a[1] === b[1];

  // Клетки каждого региона, ближние к центру — первыми (на них появляются дома).
  const HOUSE_CELLS = {};
  E.KEYS.forEach(k => {
    const list = [];
    GRID.forEach((row, r) => { for (let c = 0; c < row.length; c++) if (row[c] === k) list.push([r, c]); });
    const [sx, sy] = center(...SEAT[k]);
    HOUSE_CELLS[k] = list
      .filter(p => !same(p, SEAT[k]) && !(FEAT[k] && same(p, FEAT[k])) && !(SEZHEX[k] && same(p, SEZHEX[k])))
      .sort((p, q) => { const a = center(...p), b = center(...q); return Math.hypot(a[0] - sx, a[1] - sy) - Math.hypot(b[0] - sx, b[1] - sy); });
  });

  function icon(kind, x, y) {
    const f = 'fill="#14213D" fill-opacity=".78"', st = 'fill="none" stroke="#14213D" stroke-opacity=".78" stroke-width="1.7" stroke-linecap="round"';
    if (kind === 'B') return `<path ${st} d="M${x},${y - 5} V${y + 6} M${x - 5.5},${y + 1} Q${x - 5.5},${y + 6.5} ${x},${y + 6.5} Q${x + 5.5},${y + 6.5} ${x + 5.5},${y + 1} M${x - 3},${y - 2} H${x + 3}"/><circle cx="${x}" cy="${y - 6.5}" r="1.8" ${st}/>`;
    if (kind === 'C') return `<path ${f} d="M${x},${y - 7} C${x + 2.5},${y - 3} ${x + 5},${y} ${x + 5},${y + 2.5} A5,5 0 0 1 ${x - 5},${y + 2.5} C${x - 5},${y} ${x - 2.5},${y - 3} ${x},${y - 7} Z"/>`;
    if (kind === 'D') return `<path ${f} d="M${x - 7},${y + 5} V${y - 1} L${x - 3},${y - 4} V${y - 1} L${x + 1},${y - 4} V${y - 1} L${x + 3},${y - 2.5} V${y - 8} H${x + 6} V${y + 5} Z"/>`;
    if (kind === 'E') return `<path ${st} d="M${x - 4},${y + 7} V${y - 7}"/><path ${f} d="M${x - 4},${y - 7} L${x + 6},${y - 3.5} L${x - 4},${y} Z"/>`;
    return '';
  }
  function house(x, y, tower) {
    const p = tower
      ? `M${x - 4},${y + 5} V${y - 7} H${x + 1} V${y - 4} H${x + 4} V${y + 5} Z`
      : `M${x - 5},${y + 4} V${y - 1} L${x},${y - 5.5} L${x + 5},${y - 1} V${y + 4} Z`;
    return `<path d="${p}" fill="#FFFDF8" stroke="#14213D" stroke-width=".9" stroke-linejoin="round"/>`;
  }
  function star(x, y, planned) {
    const pts = [];
    for (let i = 0; i < 10; i++) { const a = (-90 + 36 * i) * Math.PI / 180, r = i % 2 ? 3.8 : 8.5; pts.push((x + r * Math.cos(a)).toFixed(1) + ',' + (y + r * Math.sin(a)).toFixed(1)); }
    return planned
      ? `<polygon points="${pts.join(' ')}" fill="#FFFDF8" fill-opacity=".7" stroke="#A13A2C" stroke-width="1.6" stroke-dasharray="2.5 2"/>`
      : `<polygon points="${pts.join(' ')}" fill="#A13A2C" stroke="#FFFDF8" stroke-width="1.3"/>`;
  }

  // o: { lv, roads, sez, planRoads, planSez, sel, delta, interactive }
  function mapSVG(o) {
    let hexes = '', edges = '', selEdges = '', deco = '', roads = '', badges = '';
    GRID.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        const ch = row[c], [x, y] = center(r, c);
        const fill = ch === '~' ? '#CFE0EE' : ch === 'X' ? 'url(#hatch)' : fillFor(o.lv[ch]);
        hexes += `<polygon class="hex${isReg(ch) ? ' reg' : ''}" points="${hexPts(x, y, HS + 0.4)}" fill="${fill}"${isReg(ch) ? ` data-k="${ch}"` : ''}/>`;
        if (!isReg(ch)) continue;
        for (let i = 0; i < 6; i++) {
          const n = cell(...nb(r, c, i));
          if (n === ch) continue;
          const [x1, y1] = corner(x, y, i, HS), [x2, y2] = corner(x, y, (i + 1) % 6, HS);
          const coast = !isReg(n);
          const seg = `M${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)}`;
          edges += `<path d="${seg}" stroke="#14213D" stroke-width="${coast ? 2.4 : 1.6}" stroke-linecap="round"/>`;
          if (ch === o.sel) selEdges += `<path d="${seg}" stroke="#A13A2C" stroke-width="3.6" stroke-linecap="round"/>`;
        }
      }
    });
    E.KEYS.forEach(k => {
      const v = o.lv[k], cells = HOUSE_CELLS[k];
      const n = Math.min(cells.length, Math.floor(v / 2));
      const towers = Math.max(0, Math.floor((v - 10) / 2));
      for (let i = 0; i < n; i++) { const [x, y] = center(...cells[i]); deco += house(x, y + 1, i < towers); }
      if (FEAT[k]) { const [x, y] = center(...FEAT[k]); deco += icon(k, x, y); }
      if (SEZHEX[k]) {
        const [x, y] = center(...SEZHEX[k]);
        if (o.sez.includes(k)) deco += star(x, y, false); else if (o.planSez.includes(k)) deco += star(x, y, true);
      }
    });
    const [ax, ay] = center(...SEAT.A);
    E.KEYS.forEach(k => {
      const has = o.roads.includes(k), plan = o.planRoads.includes(k);
      if (!has && !plan) return;
      if (k === 'A') {
        roads += `<circle cx="${ax}" cy="${ay}" r="15.5" fill="none" stroke="#6B5844" stroke-width="3" ${plan ? 'stroke-dasharray="4 3" stroke-opacity=".6"' : ''}/>`;
        return;
      }
      const [x, y] = center(...SEAT[k]);
      const d = `M${ax},${ay} L${x.toFixed(1)},${y.toFixed(1)}`;
      roads += plan
        ? `<path d="${d}" stroke="#6B5844" stroke-opacity=".6" stroke-width="3.4" stroke-dasharray="5 4" stroke-linecap="round"/>`
        : `<path d="${d}" stroke="#6B5844" stroke-width="4.4" stroke-linecap="round"/><path d="${d}" stroke="#F7F5F0" stroke-width="1.1" stroke-dasharray="3 4"/>`;
    });
    E.KEYS.forEach(k => {
      const [x, y] = center(...SEAT[k]);
      const sel = k === o.sel;
      badges += `<g data-k="${k}" class="hex reg" style="stroke:none"><circle cx="${x}" cy="${y}" r="12.5" fill="${sel ? '#A13A2C' : '#FFFDF8'}" stroke="#14213D" stroke-width="2"/>` +
        `<text x="${x}" y="${y + 4.8}" text-anchor="middle" font-size="14" font-weight="700" fill="${sel ? '#FFFDF8' : '#14213D'}" font-family="IBM Plex Sans, Segoe UI, Arial, sans-serif">${o.lv[k]}</text></g>`;
      if (o.delta && o.delta[k] !== undefined) {
        const dv = o.delta[k], col = dv > 0 ? '#2F7A45' : dv < 0 ? '#A13A2C' : '#8A837A';
        badges += `<g pointer-events="none"><rect x="${x + 7}" y="${y - 24}" width="24" height="14" rx="7" fill="${col}"/>` +
          `<text x="${x + 19}" y="${y - 13.5}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#fff" font-family="IBM Plex Sans, Segoe UI, Arial, sans-serif">${signed(dv)}</text></g>`;
      }
    });
    const lbl = 'font-size="8.5" fill="#5F5A52" letter-spacing="1.5" font-family="IBM Plex Sans, Segoe UI, Arial, sans-serif" text-anchor="middle"';
    return `<svg viewBox="0 0 ${MW.toFixed(1)} ${MH}" role="img" aria-label="${t('map')}"${o.interactive ? ' id="map"' : ''}>` +
      `<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#E6E1D7"/><line x1="0" y1="0" x2="0" y2="6" stroke="#CFC7B8" stroke-width="2"/></pattern></defs>` +
      hexes + `<g fill="none">${edges}${selEdges}</g>` + deco + `<g fill="none">${roads}</g>` + badges +
      `<text ${lbl} transform="translate(${MW - 12},${MH / 2}) rotate(90)">${t('sea').toUpperCase()}</text>` +
      `<text ${lbl} transform="translate(11,${MH / 2}) rotate(-90)">${t('neighbor').toUpperCase()}</text></svg>`;
  }

  function legend() {
    const ramp = RAMP.map(s => `<i style="background:${s[1]}"></i>`).join('');
    return `<div class="legend"><span>${t('level')}: 0 <span class="ramp">${ramp}</span> 20+</span>` +
      `<span><svg width="22" height="10" aria-hidden="true"><path d="M1,5 H21" stroke="#6B5844" stroke-width="4"/><path d="M1,5 H21" stroke="#F7F5F0" stroke-width="1" stroke-dasharray="3 3"/></svg> ${term('road')}</span>` +
      `<span><svg width="14" height="14" aria-hidden="true" viewBox="-8 -8 16 16">${star(0, 0, false)}</svg> ${term('sez')}</span></div>`;
  }

  // ---------- общие куски ----------
  function langToggle() {
    return `<div class="lang" role="group" aria-label="Язык · 语言"><button type="button" data-lang="ru" aria-pressed="${S.lang === 'ru'}">RU</button><button type="button" data-lang="zh" aria-pressed="${S.lang === 'zh'}">中文</button></div>`;
  }
  function topBar(title, sub) {
    return `<header class="top"><div class="ttl"><b>${title}</b><span>${sub}</span></div>${langToggle()}<button type="button" class="icon-btn" data-act="rules" aria-label="${t('rules')}">?</button></header>`;
  }
  const bottom = inner => `<div class="bottom"><div class="in">${inner}</div></div>`;

  // ---------- экраны ----------
  function scrStart() {
    const g = E.newGame();
    const h1 = S.lang === 'zh' ? '五年规划<span>Пятилетка</span>' : 'Пятилетка<span>五年规划</span>';
    const role = (a, b, c) => `<div class="role"><b>${t(a)}</b><small>${t(b)}</small><span>${t(c)}</span></div>`;
    return `<section class="hero"><div class="langrow">${langToggle()}</div>` +
      `<div class="kick">${t('subtitle')}</div><h1>${h1}</h1><p>${t('intro')}</p></section>` +
      `<div class="startbody">` +
      `<div class="mapcard">${mapSVG({ lv: g.lv, roads: [], sez: [], planRoads: [], planSez: [], sel: null })}</div>` +
      `<p class="goal">${t('goal')}</p>` +
      `<div class="field"><label for="team">${t('team')}</label><input id="team" maxlength="24" autocomplete="off" placeholder="${t('teamDefault')}" value="${esc(S.team)}"></div>` +
      `<div class="h4">${t('rolesTitle')}</div><div class="roles">` +
      role('roleTreasurer', 'roleTreasurerZh', 'roleTreasurerDo') + role('roleCarto', 'roleCartoZh', 'roleCartoDo') + role('roleSpeaker', 'roleSpeakerZh', 'roleSpeakerDo') +
      `</div><button type="button" class="secondary" data-act="rules">${t('rules')}</button>` +
      `<p class="foot">${t('author')}</p></div>` +
      bottom(`<button type="button" class="primary" data-act="start">${t('start')}</button>`);
  }

  function toolRow(o) {
    return `<div class="tool${o.locked ? ' locked' : ''}"><div class="nm">${term(o.key)}<small>${termAlt(o.key)}</small><span class="cost">${o.cost} ${t('coin')}</span></div>` +
      `<div class="ds">${t(o.key + 'Do')}</div><div class="ctl">${o.ctl}</div>${o.why ? `<div class="reason">${o.why}</div>` : ''}</div>`;
  }
  function stepper(act, k, v, canMinus, canPlus, label) {
    return `<div class="stepper"><button type="button" data-act="${act}-" data-k="${k}" ${canMinus ? '' : 'disabled'} aria-label="${label} −">−</button>` +
      `<output aria-live="polite">${v}</output><button type="button" data-act="${act}+" data-k="${k}" ${canPlus ? '' : 'disabled'} aria-label="${label} +">+</button></div>`;
  }

  function scrPlan() {
    const G = S.game;
    if (!S.dec) S.dec = E.blankDecision();
    const D = S.dec;
    const used = E.spent(G, D), left = G.budget - used;
    const fc = E.playRound(G, D, false);
    const delta = {};
    E.KEYS.forEach(k => { delta[k] = fc.lv[k] - G.lv[k]; });
    const planRoads = E.KEYS.filter(k => D[k].road && !G.roads.includes(k));
    const planSez = E.KEYS.filter(k => D[k].sez && E.canSez(G, k));

    let coins = '';
    for (let i = 0; i < G.budget; i++) coins += `<i class="coin${i >= left ? ' used' : ''}"></i>`;
    const status = `<div class="status"><div class="budget"><span class="lbl">${t('budget')}</span><span class="coins" aria-hidden="true">${coins}</span><span class="left" aria-label="${t('coinsLeft', { n: left, m: G.budget })}">${left}/${G.budget}</span></div>` +
      `<div class="fc-lbl">${t('forecast')}</div><div class="tiles">` +
      `<div class="tile"><span>${term('eco')}</span><b>${fc.sc.sum}</b></div><div class="tile"><span>${term('gap')}</span><b>${fc.sc.gap}</b></div><div class="tile idx"><span>${term('idx')}</span><b>${fc.sc.idx}</b></div></div></div>`;

    const chips = E.KEYS.map(k => `<button type="button" class="chip${E.region(k).donor ? '' : ' recip'}" data-act="sel" data-k="${k}" aria-pressed="${S.sel === k}"><b>${rname(k, true)}</b><span>${G.lv[k]} → ${fc.lv[k]}</span></button>`).join('');

    const k = S.sel, r = E.region(k), d = D[k], L = fc.log[k];
    const roadBuilt = G.roads.includes(k), roadAny = roadBuilt || d.road;
    const tools1 = toolRow({ key: 'dot', cost: E.COST.dot, ctl: stepper('dot', k, d.dot, d.dot > 0, left >= E.COST.dot, term('dot')) }) +
      toolRow({
        key: 'road', cost: E.COST.road,
        ctl: roadBuilt ? `<button type="button" class="toggle done" disabled>✓ ${t('built')}</button>`
          : d.road ? `<button type="button" class="toggle on" data-act="road" data-k="${k}">${t('building')}</button>`
          : `<button type="button" class="toggle" data-act="road" data-k="${k}" ${left >= E.COST.road ? '' : 'disabled'}>${t('build')}</button>`,
        why: !roadBuilt && !d.road && left < E.COST.road ? t('noCoins') : ''
      });
    const taxOk = E.canTax(G, k);
    let sezCtl, sezWhy = '';
    if (!r.sez) { sezCtl = `<button type="button" class="toggle" disabled>${t('open')}</button>`; sezWhy = t('lockSez'); }
    else if (G.sez.includes(k)) sezCtl = `<button type="button" class="toggle done" disabled>✓ ${t('opened')}</button>`;
    else if (d.sez) sezCtl = `<button type="button" class="toggle on" data-act="sez" data-k="${k}">${t('opening')}</button>`;
    else { sezCtl = `<button type="button" class="toggle" data-act="sez" data-k="${k}" ${left >= E.COST.sez ? '' : 'disabled'}>${t('open')}</button>`; if (left < E.COST.sez) sezWhy = t('noCoins'); }
    if (r.sez && k === 'E' && !roadAny && !G.sez.includes(k)) sezWhy = sezWhy ? sezWhy + ' · ' + t('warnSezE') : t('warnSezE');
    if (k === 'E' && G.sez.includes(k) && !roadAny) sezWhy = t('warnSezE');
    const tools2 = toolRow({
      key: 'tax', cost: E.COST.tax, locked: !taxOk,
      ctl: taxOk ? stepper('tax', k, d.tax, d.tax > 0, left >= E.COST.tax, term('tax')) : `<span aria-hidden="true" style="font-size:22px;opacity:.5">🔒</span>`,
      why: taxOk ? '' : t('lockTax')
    }) + toolRow({ key: 'sez', cost: E.COST.sez, locked: !r.sez, ctl: sezCtl, why: sezWhy });

    const panel = `<section class="panel" aria-live="polite"><h2>${rname(k)}<small>${S.lang === 'zh' ? I.TERMS[k].ru : I.TERMS[k].zh}</small></h2>` +
      `<div class="tags"><span class="tag ${r.donor ? 'donor' : 'recipient'}" title="${t(r.donor ? 'donorExplain' : 'recipientExplain')}">${term(r.donor ? 'donor' : 'recipient')} · ${termAlt(r.donor ? 'donor' : 'recipient')}</span><span class="tag">${term('tag' + k)} · ${termAlt('tag' + k)}</span></div>` +
      `<div class="lvline">${t('level')}: <b>${t('nowToEnd', { a: G.lv[k], b: L.end })}</b></div>` +
      `<div class="parts"><span>${t('buy')} ${signed(L.buy)}</span><span>${t('obj')} ${signed(L.obj)}</span><span>${t('myr')} ${signed(L.myr)}</span></div>` +
      `<div class="advisor"><span class="av" aria-hidden="true">i</span><div><b>${t('advisor')}</b>${t('tip' + k)}</div></div>` +
      `<div class="group"><h3>${term('direct')} · ${termAlt('direct')}<small>${t('directDo')}</small></h3>${tools1}</div>` +
      `<div class="group ind"><h3>${term('indirect')} · ${termAlt('indirect')}<small>${t('indirectDo')}</small></h3>${tools2}</div></section>`;

    return topBar(roundName(G.round), roundCode(G.round) + ' · ' + teamName()) + status +
      `<main><div class="playgrid"><div><div class="mapcard">${mapSVG({ lv: G.lv, roads: G.roads, sez: G.sez, planRoads, planSez, sel: k, delta, interactive: true })}</div>` +
      `${legend()}<div class="chips" id="chips">${chips}</div></div>${panel}</div></main>` +
      bottom(`<button type="button" class="primary" data-act="confirm">${t('confirmPlan')}<small>${t('coinsLeft', { n: left, m: G.budget })}</small></button>`);
  }

  function scrEvent() {
    const n = S.lastRound, evs = S.last.events;
    const msg = e => {
      if (n === 2) return e.applied ? t('ev2Hit') : t('ev2Saved');
      if (n === 3 && e.k === 'E') return e.applied ? t('ev3Saved') : t('ev3Hit');
      return termAlt(e.k);
    };
    const effects = evs.map(e => {
      const v = e.applied ? e.d : 0;
      return `<div class="effect"><div class="d ${v > 0 ? 'pos' : v < 0 ? 'neg' : 'zero'}">${signed(e.d)}</div><div><b>${rname(e.k)}</b><span>${msg(e)}</span></div></div>`;
    }).join('');
    const other = S.lang === 'zh' ? I.STR.ru['ev' + n] : I.STR.zh['ev' + n];
    return topBar(roundName(n), roundCode(n) + ' · ' + teamName()) +
      `<div class="eventwrap"><div class="eventcard"><div class="kick">${t('eventTitle')}</div><h2>${t('ev' + n)}<small>${other}</small></h2>` +
      `<p>${t('ev' + n + 'Text')}</p><div class="effects">${effects}</div></div><div class="why">${t('ev' + n + 'Why')}</div></div>` +
      bottom(`<button type="button" class="primary" data-act="toCalc">${t('toCalc')}</button>`);
  }

  function scrCalc() {
    const n = S.lastRound, R = S.last;
    const rows = E.KEYS.map((k, i) => {
      const L = R.log[k];
      const c = v => `<span class="${cls(v)}">${signed(v)}</span>`;
      return `<tr style="animation-delay:${i * 90}ms"><td>${rname(k, true)}</td><td>${L.start}</td><td>${c(L.buy)}</td><td>${c(L.obj)}</td><td>${c(L.ev)}</td><td>${c(L.myr)}</td><td class="end">${L.end}</td></tr>`;
    }).join('');
    const last = n >= S.rounds;
    const bonus = last ? '' : `<div class="bonus">${t('growth', { a: R.sc.sum, b: R.before, g: R.growth, x: R.bonus })}<b>${t('nextBudget', { n: R.next })}</b></div>`;
    const nextN = S.lang === 'zh' ? ZH_NUM[n + 1] : n + 1;
    return topBar(roundName(n), roundCode(n) + ' · ' + teamName()) +
      `<div class="calcwrap"><h2>${t('calcTitle', { n: S.lang === 'zh' ? ZH_NUM[n] : n })}</h2><p class="sub">${t('formula')}</p>` +
      `<table class="calc"><thead><tr><th>${t('colRegion')}</th><th>${t('colStart')}</th><th>${t('colBuy')}</th><th>${t('colObj')}</th><th>${t('colEv')}</th><th>${t('colMyr')}</th><th>${t('colEnd')}</th></tr></thead><tbody>${rows}</tbody></table>` +
      `<div class="sum3"><div><span>${term('eco')} · ${t('ecoSum')}</span><b>${R.sc.sum}</b></div><div><span>${term('gap')} · ${t('gapDiff')}</span><b>${R.sc.gap}</b></div><div class="i"><span>${term('idx')}</span><b>${R.sc.idx}</b></div></div>` +
      bonus + `<div class="mapcard" style="margin-top:12px">${mapSVG({ lv: R.lv, roads: R.roads, sez: R.sez, planRoads: [], planSez: [], sel: null })}</div></div>` +
      bottom(last ? `<button type="button" class="primary" data-act="final">${t('toFinal')}</button>`
        : `<button type="button" class="primary" data-act="next">${t('nextRound', { n: nextN })}</button>`);
  }

  function scrFinal() {
    const G = S.game, sc = E.score(G.lv), m = E.classify(G.history);
    const levels = E.KEYS.map(k => `<div><b>${G.lv[k]}</b><span>${rname(k, true)}</span></div>`).join('');
    const canExtra = S.rounds < E.MAX_ROUNDS;
    return topBar(t('finalTitle'), teamName()) +
      `<div class="finalwrap"><h2>${teamName()}</h2><p class="sub">${t('tellTeacher')}</p>` +
      `<div class="equation"><div><b>${sc.sum}</b><span>${term('eco')}</span></div><span class="op">−</span><div><b>${sc.gap}</b><span>${term('gap')}</span></div><span class="op">=</span><div class="res"><b>${sc.idx}</b><span>${term('idx')}</span></div></div>` +
      `<div class="h4">${t('levelsForBoard')}</div><div class="levels">${levels}</div>` +
      `<div class="mapcard" style="margin-top:12px">${mapSVG({ lv: G.lv, roads: G.roads, sez: G.sez, planRoads: [], planSez: [], sel: null })}</div>` +
      `<div class="h4">${t('modelTitle')}</div><div class="model"><b>${t('model_' + m.model)}</b><p>${t('model_' + m.model + 'Do')}</p>` +
      `<div class="sp">${t('spentBy', { a: m.dot, b: m.road, c: m.tax, d: m.sez })}</div></div>` +
      `<div class="h4">${t('bench')}</div><div class="bench"><div>${t('benchNone')}</div><div>${t('benchGrow')}</div><div>${t('benchEq')}</div><div>${t('benchMax')}</div></div>` +
      `<div class="discuss">${t('discuss')}</div>` +
      (canExtra ? `<button type="button" class="secondary" data-act="extra">${t('extra')}</button>` : '') + `</div>` +
      bottom(`<button type="button" class="primary" data-act="reset">${t('newGame')}</button>`);
  }

  // ---------- окна ----------
  function sheetRules() {
    const tool = k => `<div class="rtool"><b>${term(k)}</b> · ${termAlt(k)} <span class="cost" style="background:#14213D;color:#F7F5F0;border-radius:6px;padding:0 6px;font-size:12px">${E.COST[k]} ${t('coin')}</span><br>${t(k + 'Do')}</div>`;
    return `<h2>${t('rulesTitle')}</h2><p><b>${t('rulesSteps')}</b></p>` +
      `<div class="h4" style="margin-top:8px">${term('direct')} · ${termAlt('direct')}</div>${tool('dot')}${tool('road')}` +
      `<div class="h4">${term('indirect')} · ${termAlt('indirect')}</div>${tool('tax')}${tool('sez')}` +
      `<p style="font-size:13.5px;color:#5F5A52">${t('lockTax')}. ${t('lockSez')}. ${t('warnSezE')}.</p>` +
      `<p><b>${term('myrdal')} · ${termAlt('myrdal')}.</b> ${t('rulesMyrdal')}</p><p>${t('rulesBudget')}</p><p>${t('rulesWin')}</p><p>${t('rulesNoms')}</p>` +
      `<div class="row"><button type="button" class="yes" data-act="close">${t('close')}</button></div>` +
      (S.screen !== 'start' ? `<button type="button" class="secondary" data-act="reset">${t('newGame')}</button>` : '');
  }
  function sheetConfirm() {
    const left = S.game.budget - E.spent(S.game, S.dec);
    return `<h2>${t('confirmTitle')}</h2><p>${left > 0 ? t('confirmLeft', { n: left }) : t('confirmAll')}</p>` +
      `<div class="row"><button type="button" class="no" data-act="close">${t('back')}</button><button type="button" class="yes" data-act="commit">${t('ok')}</button></div>`;
  }
  function sheetReset() {
    return `<h2>${t('newGame')}</h2><p>${t('resetAsk')}</p><div class="row"><button type="button" class="no" data-act="close">${t('cancel')}</button><button type="button" class="yes" data-act="resetYes">${t('yes')}</button></div>`;
  }

  // ---------- отрисовка ----------
  function render() {
    const chipsEl = document.getElementById('chips');
    const chipsX = chipsEl ? chipsEl.scrollLeft : 0;
    document.documentElement.lang = t('htmlLang');
    let html;
    if (S.screen === 'plan') html = scrPlan();
    else if (S.screen === 'event') html = scrEvent();
    else if (S.screen === 'calc') html = scrCalc();
    else if (S.screen === 'final') html = scrFinal();
    else html = scrStart();
    if (modal) {
      const body = modal === 'rules' ? sheetRules() : modal === 'confirm' ? sheetConfirm() : sheetReset();
      html += `<div class="modal" data-act="backdrop"><div class="sheet" role="dialog" aria-modal="true">${body}</div></div>`;
    }
    app.innerHTML = html;
    const ch = document.getElementById('chips');
    if (ch) {
      ch.scrollLeft = chipsX;
      const on = ch.querySelector('[aria-pressed="true"]');
      if (on && (on.offsetLeft < ch.scrollLeft || on.offsetLeft + on.offsetWidth > ch.scrollLeft + ch.clientWidth)) ch.scrollLeft = on.offsetLeft - 8;
    }
    save();
  }
  function go(screen) { S.screen = screen; modal = null; render(); window.scrollTo(0, 0); }

  // ---------- действия ----------
  function act(a, k) {
    const G = S.game, D = S.dec;
    const left = G && D ? G.budget - E.spent(G, D) : 0;
    switch (a) {
      case 'rules': modal = 'rules'; break;
      case 'close': modal = null; break;
      case 'start': S.game = E.newGame(); S.dec = E.blankDecision(); S.sel = 'A'; S.rounds = E.ROUNDS; return go('plan');
      case 'sel': S.sel = k; break;
      case 'dot+': if (left >= E.COST.dot) D[k].dot++; break;
      case 'dot-': if (D[k].dot > 0) D[k].dot--; break;
      case 'tax+': if (left >= E.COST.tax && E.canTax(G, k)) D[k].tax++; break;
      case 'tax-': if (D[k].tax > 0) D[k].tax--; break;
      case 'road': if (D[k].road) D[k].road = false; else if (left >= E.COST.road && E.canRoad(G, k)) D[k].road = true; break;
      case 'sez': if (D[k].sez) D[k].sez = false; else if (left >= E.COST.sez && E.canSez(G, k)) D[k].sez = true; break;
      case 'confirm': modal = 'confirm'; break;
      case 'commit': {
        const c = E.commit(G, D);
        S.lastRound = G.round; S.last = c.result; S.game = c.state; S.dec = null;
        return go('event');
      }
      case 'toCalc': return go('calc');
      case 'next': S.dec = E.blankDecision(); return go('plan');
      case 'final': return go('final');
      case 'extra': S.rounds = E.MAX_ROUNDS; S.dec = E.blankDecision(); return go('plan');
      case 'reset': modal = 'reset'; break;
      case 'resetYes': { const lang = S.lang, team = S.team; S = fresh(lang); S.team = team; return go('start'); }
      default: return;
    }
    render();
  }

  app.addEventListener('click', ev => {
    const el = ev.target.closest('[data-act],[data-lang],[data-k]');
    if (!el || !app.contains(el)) return;
    if (el.dataset.lang) { S.lang = el.dataset.lang; render(); return; }
    if (el.dataset.act === 'backdrop') { if (ev.target === el) { modal = null; render(); } return; }
    if (el.dataset.act) { act(el.dataset.act, el.dataset.k); return; }
    if (el.dataset.k && S.screen === 'plan' && el.closest('#map')) act('sel', el.dataset.k);
  });
  app.addEventListener('input', ev => { if (ev.target.id === 'team') { S.team = ev.target.value; save(); } });
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && modal) { modal = null; render(); } });

  // Сохранённая партия без состояния игры — начать заново.
  if (S.screen !== 'start' && !S.game) S = fresh(S.lang);
  render();
})();
