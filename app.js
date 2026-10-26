// Экраны игры: старт → решение → событие → итоги пятилетки → … → итог игры.
(function () {
  'use strict';
  const E = window.Engine, I = window.I18N, A = window.Art;
  const KEY = 'pyatiletka-game-v2';
  const ZH_NUM = ['', '一', '二', '三', '四'];
  const app = document.getElementById('app');
  const TOOLS = ['dot', 'road', 'tax', 'sez'];

  // ---------- состояние ----------
  function defaultLang() { try { return /^zh/i.test(navigator.language || '') ? 'zh' : 'ru'; } catch (e) { return 'ru'; } }
  function fresh(lang) { return { lang: lang || defaultLang(), team: '', screen: 'start', game: null, dec: null, sel: null, last: null, lastRound: 0, rounds: E.ROUNDS, coach: 0, say: null }; }
  function load() { try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); return s && s.screen ? s : null; } catch (e) { return null; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  let S = load() || fresh();
  let modal = null, fx = null;

  // ---------- тексты ----------
  function t(k, v) {
    let s = I.STR[S.lang][k];
    if (s === undefined) s = I.CAST[S.lang][k];
    if (s === undefined) s = I.STR.ru[k];
    if (s === undefined) s = k;
    if (v) Object.keys(v).forEach(n => { s = s.split('{' + n + '}').join(v[n]); });
    return s;
  }
  const term = k => (S.lang === 'zh' ? I.TERMS[k].zh : I.TERMS[k].ru);
  const termAlt = k => (S.lang === 'zh' ? I.TERMS[k].ru : I.TERMS[k].zh);
  const rname = (k, short) => (S.lang === 'zh' ? I.TERMS[k].zh : (short ? I.TERMS[k].short : I.TERMS[k].ru));
  const num = n => (S.lang === 'zh' ? ZH_NUM[n] : n);
  const roundName = n => t('round', { n: num(n) });
  const roundCode = n => I.ROUND_CODE[n][0] + ' · ' + I.ROUND_CODE[n][1];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const signed = v => (v > 0 ? '+' + v : v < 0 ? '−' + (-v) : '0');
  const cls = v => (v > 0 ? 'p' : v < 0 ? 'n' : 'z');
  const teamName = () => esc(S.team.trim() || t('teamDefault'));
  const coinIcons = n => '<i class="ci"></i>'.repeat(n);

  // ---------- карта ----------
  // Шестигранники «острым верхом», нечётные ряды сдвинуты вправо. X — соседняя страна, ~ — море.
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
  const FEAT = { A: [2, 4], B: [3, 7], C: [0, 5], D: [6, 3], E: [5, 1] };
  const SEZHEX = { B: [2, 7], E: [4, 1] };
  const LAND = { A: '#CFE3B4', B: '#C4DFAE', C: '#DCE4CC', D: '#DCD3BE', E: '#E8DEB4' };
  const cell = (r, c) => (GRID[r] && GRID[r][c]) || ' ';
  const center = (r, c) => [HS * SQ3 * (c + 0.5 * (r & 1)) + HS * SQ3 / 2, HS * 1.5 * r + HS];
  function corner(x, y, i, s) { const a = (60 * i - 30) * Math.PI / 180; return [x + s * Math.cos(a), y + s * Math.sin(a)]; }
  function hexPts(x, y, s) { const p = []; for (let i = 0; i < 6; i++) p.push(corner(x, y, i, s).map(n => n.toFixed(1)).join(',')); return p.join(' '); }
  function nb(r, c, i) {
    const o = r & 1;
    const d = [[0, 1], [1, o ? 1 : 0], [1, o ? 0 : -1], [0, -1], [-1, o ? 0 : -1], [-1, o ? 1 : 0]][i];
    return [r + d[0], c + d[1]];
  }
  const isReg = ch => 'ABCDE'.includes(ch);
  const key = (r, c) => r + ',' + c;

  // Дорога от столицы до центра региона — кратчайший путь по суше.
  const ROUTE = {};
  E.KEYS.forEach(k => {
    if (k === 'A') { ROUTE.A = [SEAT.A]; return; }
    const start = SEAT.A, goal = key(...SEAT[k]);
    const prev = { [key(...start)]: null }, q = [start];
    while (q.length) {
      const [r, c] = q.shift();
      if (key(r, c) === goal) break;
      for (let i = 0; i < 6; i++) {
        const [nr, nc] = nb(r, c, i);
        if (!isReg(cell(nr, nc)) || key(nr, nc) in prev) continue;
        prev[key(nr, nc)] = [r, c]; q.push([nr, nc]);
      }
    }
    const path = []; let cur = SEAT[k];
    while (cur) { path.unshift(cur); cur = prev[key(...cur)]; }
    ROUTE[k] = path;
  });
  const routeD = k => ROUTE[k].map((p, i) => (i ? 'L' : 'M') + center(...p).map(n => n.toFixed(1)).join(',')).join(' ');

  // Клетки региона под застройку: ближние к центру — первыми.
  function freeCells(k, roadSet) {
    const list = [];
    GRID.forEach((row, r) => { for (let c = 0; c < row.length; c++) if (row[c] === k) list.push([r, c]); });
    const skip = p => [SEAT[k], FEAT[k], SEZHEX[k]].some(q => q && q[0] === p[0] && q[1] === p[1]) || roadSet.has(key(...p));
    const [sx, sy] = center(...SEAT[k]);
    return list.filter(p => !skip(p)).sort((p, q) => { const a = center(...p), b = center(...q); return Math.hypot(a[0] - sx, a[1] - sy) - Math.hypot(b[0] - sx, b[1] - sy); });
  }
  const housesFor = lv => Math.ceil(lv / 2);

  // o: { lv, roads, sez, planRoads, planSez, sel, delta, interactive, prevLv, float, leavers, closed }
  let mapSeq = 0;
  function mapSVG(o) {
    const id = 'm' + (++mapSeq);
    const roadSet = new Set();
    o.roads.concat(o.planRoads).forEach(k => ROUTE[k].forEach(p => roadSet.add(key(...p))));
    let hexes = '', edges = '', selEdges = '', deco = '', roads = '', marks = '', badges = '', sea = '';
    GRID.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        const ch = row[c], [x, y] = center(r, c);
        const fill = ch === '~' ? '#BFD8EC' : ch === 'X' ? `url(#h-${id})` : LAND[ch];
        hexes += `<polygon class="hex${isReg(ch) ? ' reg' : ''}" points="${hexPts(x, y, HS + 0.5)}" fill="${fill}"${isReg(ch) ? ` data-k="${ch}"` : ''}/>`;
        if (isReg(ch) && (r * 7 + c * 3) % 3) hexes += `<polygon points="${hexPts(x, y, HS - 1)}" fill="#FFFFFF" opacity="${(r * 7 + c * 3) % 3 === 1 ? 0.07 : 0.14}" pointer-events="none"/>`;
        if (ch === '~' && (r + c) % 2 === 0) sea += A.wave(x, y + 3, r + c);
        if (ch === 'X' && r % 2 === 0) deco += A.mountain(x, y + 2);
        if (!isReg(ch)) continue;
        for (let i = 0; i < 6; i++) {
          const n = cell(...nb(r, c, i));
          if (n === ch) continue;
          const [x1, y1] = corner(x, y, i, HS), [x2, y2] = corner(x, y, (i + 1) % 6, HS);
          const seg = `M${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)}`;
          edges += `<path d="${seg}" stroke="#14213D" stroke-width="${isReg(n) ? 1.4 : 2.4}" stroke-linecap="round"/>`;
          if (ch === o.sel) selEdges += `<path d="${seg}" stroke="#A13A2C" stroke-width="3.6" stroke-linecap="round"/>`;
        }
      }
    });
    sea += A.ship(...center(3, 9).map((v, i) => v + (i ? 2 : -6)), 9) + A.ship(...center(6, 8).map((v, i) => v + (i ? 0 : 4)), 12);

    E.KEYS.forEach(k => {
      const v = o.lv[k], cells = freeCells(k, roadSet);
      const n = Math.min(cells.length, housesFor(v));
      const before = o.prevLv ? Math.min(cells.length, housesFor(o.prevLv[k])) : n;
      const tier = A.tierFor(v);
      cells.forEach((p, i) => {
        const [x, y] = center(...p);
        if (i < n) deco += A.building(x, y + 2, tier, i >= before ? 'pop' : '');
        else if ((p[0] + p[1]) % 2 === 0 || k === 'C') deco += A.tree(x + ((p[1] % 2) ? 3 : -3), y + 4, k === 'C');
      });
      if (FEAT[k]) marks += A.landmark(k, ...center(...FEAT[k]).map((v2, i) => v2 + (i ? 4 : 0)), k === 'D' && o.closed ? 'closed' : '');
      if (SEZHEX[k]) {
        const [x, y] = center(...SEZHEX[k]);
        if (o.sez.includes(k)) marks += A.sezZone(x, y, false); else if (o.planSez.includes(k)) marks += A.sezZone(x, y, true);
      }
    });

    E.KEYS.forEach((k, i) => {
      const has = o.roads.includes(k), plan = o.planRoads.includes(k);
      if (!has && !plan) return;
      if (k === 'A') {
        const [ax, ay] = center(...SEAT.A);
        roads += `<circle cx="${ax}" cy="${ay}" r="16" fill="none" stroke="${plan ? '#F2A33A' : '#5A5048'}" stroke-width="${plan ? 3 : 4}" ${plan ? 'stroke-dasharray="4 3"' : ''}/>`;
        return;
      }
      const d = routeD(k);
      if (plan) {
        const mid = center(...ROUTE[k][Math.floor(ROUTE[k].length / 2)]);
        roads += `<path d="${d}" stroke="#F2A33A" stroke-width="4" stroke-dasharray="5 4" stroke-linecap="round" stroke-linejoin="round"><animate attributeName="stroke-dashoffset" values="0;-18" dur="1s" repeatCount="indefinite"/></path>` + A.cone(mid[0] + 5, mid[1] - 4);
      } else {
        roads += `<path d="${d}" stroke="#5A5048" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" stroke="#F7F5F0" stroke-width="1" stroke-dasharray="3 3.5"/>` + A.truck(d, 7 + i, i * 0.8);
      }
    });

    E.KEYS.forEach(k => {
      const [x, y] = center(...SEAT[k]);
      const sel = k === o.sel;
      badges += `<g data-k="${k}" class="reg badge${sel ? ' sel' : ''}"><circle cx="${x}" cy="${y}" r="12.5" fill="${sel ? '#A13A2C' : '#FFFDF8'}" stroke="#14213D" stroke-width="2"/>` +
        `<text x="${x}" y="${y + 4.8}" text-anchor="middle" font-size="14" font-weight="700" fill="${sel ? '#FFFDF8' : '#14213D'}" font-family="IBM Plex Sans, Segoe UI, Arial, sans-serif" class="lvnum" data-k="${k}">${o.prevLv ? o.prevLv[k] : o.lv[k]}</text></g>`;
      if (o.delta && o.delta[k] !== undefined) {
        const dv = o.delta[k], col = dv > 0 ? '#2F7A45' : dv < 0 ? '#A13A2C' : '#8A837A';
        badges += `<g pointer-events="none"><rect x="${x + 7}" y="${y - 25}" width="26" height="15" rx="7.5" fill="${col}" stroke="#FFFDF8" stroke-width="1.2"/>` +
          `<text x="${x + 20}" y="${y - 14}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff" font-family="IBM Plex Sans, Segoe UI, Arial, sans-serif">${signed(dv)}</text></g>`;
      }
      if (o.float && o.float[k]) {
        const dv = o.float[k];
        badges += `<text class="float" x="${x}" y="${y - 16}" text-anchor="middle" font-size="16" font-weight="800" fill="${dv > 0 ? '#2F7A45' : '#A13A2C'}" stroke="#FFFDF8" stroke-width="3" paint-order="stroke" font-family="IBM Plex Sans, Segoe UI, Arial, sans-serif">${signed(dv)}</text>`;
      }
      if (o.leavers && o.leavers.includes(k)) {
        const [tx, ty] = center(...SEAT.A);
        badges += A.leaver(x, y + 8, tx - 10, ty + 10, 0.4) + A.leaver(x + 6, y + 10, tx - 4, ty + 12, 1.1);
      }
    });
    const lbl = 'font-size="8.5" fill="#5F5A52" letter-spacing="1.5" font-family="IBM Plex Sans, Segoe UI, Arial, sans-serif" text-anchor="middle"';
    return `<svg viewBox="0 0 ${MW.toFixed(1)} ${MH}" role="img" aria-label="${t('map')}"${o.interactive ? ' id="map"' : ''}>` +
      `<defs><pattern id="h-${id}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#E6E1D7"/><line x1="0" y1="0" x2="0" y2="6" stroke="#D5CEC0" stroke-width="2"/></pattern></defs>` +
      hexes + sea + `<g fill="none">${edges}</g><g fill="none">${roads}</g>` + deco + marks + `<g fill="none">${selEdges}</g>` + badges +
      `<text ${lbl} transform="translate(${MW - 10},${MH / 2}) rotate(90)">${t('sea').toUpperCase()}</text>` +
      `<text ${lbl} transform="translate(10,${MH / 2}) rotate(-90)">${t('neighbor').toUpperCase()}</text></svg>`;
  }
  const factoryClosed = G => G.history.some(h => h.round === 2 && h.res.events.some(e => e.k === 'D' && e.applied));

  // ---------- общие куски ----------
  function langToggle() {
    return `<div class="lang" role="group" aria-label="Язык · 语言"><button type="button" data-lang="ru" aria-pressed="${S.lang === 'ru'}">RU</button><button type="button" data-lang="zh" aria-pressed="${S.lang === 'zh'}">中文</button></div>`;
  }
  function topBar(title, sub) {
    return `<header class="top"><div class="ttl"><b>${title}</b><span>${sub}</span></div>${langToggle()}<button type="button" class="icon-btn" data-act="rules" aria-label="${t('rules')}">?</button></header>`;
  }
  const bottom = inner => `<div class="bottom"><div class="in">${inner}</div></div>`;
  function bubble(who, mood, text, extra) {
    return `<div class="talk${who === 'M' ? ' mei' : ''}">${A.portrait(who, mood, who === 'M' ? 52 : 64)}<div class="say"><b>${t('name' + who)}</b><p>${text}</p>${extra || ''}</div></div>`;
  }
  function meters(sum, gap, idx) {
    const w = (v, max) => Math.max(4, Math.min(100, v / max * 100)).toFixed(0);
    return `<div class="meters"><div class="m eco"><span>${t('wealth')}</span><div class="bar"><i style="width:${w(sum, 80)}%"></i></div><b>${sum}</b></div>` +
      `<div class="m gap"><span>${t('gapM')}</span><div class="bar"><i style="width:${w(gap, 20)}%"></i></div><b>${gap}</b></div>` +
      (idx !== undefined ? `<div class="m idx"><span>${t('idxM')}</span><b>${idx}</b></div>` : '') + `</div>`;
  }

  // ---------- экраны ----------
  function scrStart() {
    const g = E.newGame();
    const h1 = S.lang === 'zh' ? '五年规划<span>Пятилетка</span>' : 'Пятилетка<span>五年规划</span>';
    return `<section class="hero"><div class="langrow">${langToggle()}</div>` +
      `<div class="kick">${t('subtitle')}</div><h1>${h1}</h1></section>` +
      `<div class="startbody">` +
      `<div class="mapcard">${mapSVG({ lv: g.lv, roads: [], sez: [], planRoads: [], planSez: [], sel: null })}</div>` +
      bubble('M', 1, t('intro')) +
      `<div class="cast">${E.KEYS.map(k => `<div>${A.portrait(k, 0, 46)}<span>${rname(k, true)}</span></div>`).join('')}</div>` +
      `<div class="field"><label for="team">${t('team')}</label><input id="team" maxlength="24" autocomplete="off" placeholder="${t('teamDefault')}" value="${esc(S.team)}"></div>` +
      `<p class="foot">${t('author')}</p></div>` +
      bottom(`<button type="button" class="primary" data-act="start">${t('start')}</button>`);
  }

  function regionMood(G, D, k) {
    const d = D[k];
    if (d.dot || d.tax || d.road || d.sez) return 1;
    if (!E.region(k).donor && !G.roads.includes(k)) return -1;
    return 0;
  }

  function toolButton(G, D, k, tool, left) {
    const r = E.region(k), d = D[k];
    let count = 0, state = '', locked = false;
    if (tool === 'dot') count = d.dot;
    if (tool === 'tax') { count = d.tax; locked = !E.canTax(G, k); }
    if (tool === 'road') { if (G.roads.includes(k)) state = 'done'; else if (d.road) state = 'on'; }
    if (tool === 'sez') { locked = !r.sez; if (G.sez.includes(k)) state = 'done'; else if (d.sez) state = 'on'; }
    const cost = E.COST[tool];
    const poor = !locked && !state && left < cost;
    const badge = count ? `<em class="cnt">×${count}</em>` : state === 'on' ? `<em class="cnt">✓</em>` : state === 'done' ? `<em class="cnt done">✓</em>` : '';
    const undo = (count || state === 'on') ? `<button type="button" class="undo" data-act="undo" data-tool="${tool}" data-k="${k}" aria-label="${t('cancel')}">−</button>` : '';
    return `<div class="tcell"><button type="button" class="tbtn${locked ? ' locked' : ''}${state ? ' ' + state : ''}${count ? ' has' : ''}${poor ? ' poor' : ''}" data-act="buy" data-tool="${tool}" data-k="${k}">` +
      `<span class="ic">${locked ? A.TOOL_ICON.lock : A.TOOL_ICON[tool]}</span>` +
      `<span class="tn">${t(tool + 'Name')}<small>${t(tool + 'Alt')}</small></span>` +
      `<span class="te">${t(tool + 'Short')}</span><span class="tc">${coinIcons(cost)}</span>${badge}</button>${undo}</div>`;
  }

  function scrPlan() {
    const G = S.game;
    if (!S.dec) S.dec = E.blankDecision();
    const D = S.dec;
    const left = G.budget - E.spent(G, D);
    const fc = E.playRound(G, D, false);
    const delta = {};
    E.KEYS.forEach(k => { delta[k] = fc.lv[k] - G.lv[k]; });
    const planRoads = E.KEYS.filter(k => D[k].road && !G.roads.includes(k));
    const planSez = E.KEYS.filter(k => D[k].sez && E.canSez(G, k));

    let coins = '';
    for (let i = 0; i < G.budget; i++) coins += `<i class="coin${i >= left ? ' used' : ''}"></i>`;
    const status = `<div class="status"><div class="budget"><span class="lbl">${t('budget')}</span><span class="coins" aria-hidden="true">${coins}</span><span class="left" aria-label="${t('coinsLeft', { n: left, m: G.budget })}">${left}/${G.budget}</span></div>` +
      meters(fc.sc.sum, fc.sc.gap) + `</div>`;

    // Подсказка советницы: в начале каждой пятилетки, пока её не закрыли.
    let coach = '';
    if (S.coach < G.round) {
      const txt = G.round === 1 ? `${t('tut1')} ${t('tut2')} ${t('tut3')}` : t(G.round === 2 ? 'tip2' : 'tip3');
      coach = bubble('M', 1, txt, `<button type="button" class="mini" data-act="coach">${t('gotIt')}</button>`);
    }

    const chips = E.KEYS.map(k => `<button type="button" class="chip" data-act="sel" data-k="${k}" aria-pressed="${S.sel === k}">${A.portrait(k, regionMood(G, D, k), 34)}<span><b>${rname(k, true)}</b>${G.lv[k]} → ${fc.lv[k]}</span></button>`).join('');

    let card;
    if (!S.sel) card = `<div class="pickhint">${t('pick')}</div>`;
    else {
      const k = S.sel, r = E.region(k);
      const said = S.say && S.say.k === k ? S.say : null;
      const mood = said ? said.mood : regionMood(G, D, k);
      const text = said ? t(said.key) : t('ask' + k);
      const head = `<div class="rhead"><h2>${rname(k)}<small>${S.lang === 'zh' ? I.TERMS[k].ru : I.TERMS[k].zh}</small></h2>` +
        `<span class="lv"><b>${G.lv[k]}</b><i>→</i><b class="${cls(delta[k])}">${fc.lv[k]}</b></span></div>` +
        `<div class="tags"><span class="tag ${r.donor ? 'donor' : 'recipient'}">${term(r.donor ? 'donor' : 'recipient')} · ${termAlt(r.donor ? 'donor' : 'recipient')}</span><span class="tag">${term('tag' + k)} · ${termAlt('tag' + k)}</span></div>`;
      card = `<section class="panel" aria-live="polite">${head}${bubble(k, mood, text)}` +
        `<div class="tools">${TOOLS.map(tool => toolButton(G, D, k, tool, left)).join('')}</div>` +
        `<p class="legendline"><span class="dir">${term('direct')}</span> ${t('dotName')}, ${t('roadName')} · <span class="ind">${term('indirect')}</span> ${t('taxName')}, ${t('sezName')}</p></section>`;
    }

    return topBar(roundName(G.round), roundCode(G.round) + ' · ' + teamName()) + status +
      `<main>${coach}<div class="playgrid"><div><div class="mapcard">${mapSVG({ lv: G.lv, roads: G.roads, sez: G.sez, planRoads, planSez, sel: S.sel, delta, interactive: true, float: fx, closed: factoryClosed(G) })}</div>` +
      `<div class="chips" id="chips">${chips}</div></div>${card}</div></main>` +
      bottom(`<button type="button" class="primary" data-act="confirm">${t('confirmPlan')}<small>${t('coinsLeft', { n: left, m: G.budget })}</small></button>`);
  }

  function scrEvent() {
    const n = S.lastRound, evs = S.last.events;
    const main = evs[0];
    let line, mood;
    if (n === 2) { line = main.applied ? t('ev2SayHit') : t('ev2SaySaved'); mood = main.applied ? -1 : 1; }
    else if (n === 3) { line = main.applied ? t('ev3SaySaved') : t('ev3SayHit'); mood = main.applied ? 1 : -1; }
    else { line = t('ev1Say'); mood = -1; }
    const effects = evs.map(e => {
      const v = e.applied ? e.d : 0;
      return `<span class="eff ${v > 0 ? 'p' : v < 0 ? 'n' : 'z'}">${rname(e.k, true)} <b>${signed(e.d)}</b></span>`;
    }).join('');
    const other = S.lang === 'zh' ? I.STR.ru['ev' + n] : I.STR.zh['ev' + n];
    return topBar(roundName(n), roundCode(n) + ' · ' + teamName()) +
      `<div class="eventwrap"><div class="eventcard"><div class="kick">${t('eventTitle')}</div><h2>${t('ev' + n)}<small>${other}</small></h2>` +
      A.eventScene(n, main.applied) + `<div class="effs">${effects}</div></div>` +
      bubble(main.k, mood, line) + `<div class="why">${t('ev' + n + 'Why')}</div></div>` +
      bottom(`<button type="button" class="primary" data-act="toCalc">${t('toCalc')}</button>`);
  }

  function scrCalc() {
    const n = S.lastRound, R = S.last;
    const prev = {}, change = {};
    E.KEYS.forEach(k => { prev[k] = R.log[k].start; change[k] = R.log[k].end - R.log[k].start; });
    const leavers = E.KEYS.filter(k => R.log[k].myr < 0);
    const govs = E.KEYS.map(k => `<div class="gov">${A.portrait(k, change[k] > 0 ? 1 : change[k] < 0 ? -1 : 0, 46)}<span>${rname(k, true)}</span><b><s>${prev[k]}</s> → <em class="${cls(change[k])}">${R.log[k].end}</em></b>${leavers.includes(k) ? `<small>${t('leaving')}</small>` : ''}</div>`).join('');
    const rows = E.KEYS.map(k => {
      const L = R.log[k];
      const c = v => `<span class="${cls(v)}">${signed(v)}</span>`;
      return `<tr><td>${rname(k, true)}</td><td>${L.start}</td><td>${c(L.buy)}</td><td>${c(L.obj)}</td><td>${c(L.ev)}</td><td>${c(L.myr)}</td><td class="end">${L.end}</td></tr>`;
    }).join('');
    const last = n >= S.rounds;
    const bonus = last ? '' : `<div class="bonus"><span class="coinrow">${coinIcons(Math.max(R.bonus, 0))}</span><div><b>${t('bonusT', { x: R.bonus })}</b>${t('growth', { a: R.sc.sum, b: R.before, g: R.growth, x: R.bonus })}<br><b>${t('nextBudget', { n: R.next })}</b></div></div>`;
    return topBar(roundName(n), roundCode(n) + ' · ' + teamName()) +
      `<div class="calcwrap"><h2>${t('calcTitle', { n: num(n) })}</h2>` +
      `<div class="mapcard">${mapSVG({ lv: R.lv, roads: R.roads, sez: R.sez, planRoads: [], planSez: [], sel: null, prevLv: prev, float: change, leavers, closed: n >= 2 && S.game.history.some(h => h.round === 2 && h.res.events.some(e => e.applied)) })}</div>` +
      `<div class="h4">${t('whatChanged')}</div><div class="govs">${govs}</div>` +
      meters(R.sc.sum, R.sc.gap, R.sc.idx) + bonus +
      `<details class="det"><summary>${t('details')}</summary><p class="sub">${t('formula')}</p>` +
      `<table class="calc"><thead><tr><th>${t('colRegion')}</th><th>${t('colStart')}</th><th>${t('colBuy')}</th><th>${t('colObj')}</th><th>${t('colEv')}</th><th>${t('colMyr')}</th><th>${t('colEnd')}</th></tr></thead><tbody>${rows}</tbody></table></details></div>` +
      bottom(last ? `<button type="button" class="primary" data-act="final">${t('toFinal')}</button>`
        : `<button type="button" class="primary" data-act="next">${t('nextRound', { n: num(n + 1) })}</button>`);
  }

  function scrFinal() {
    const G = S.game, sc = E.score(G.lv), m = E.classify(G.history);
    const start = E.newGame().lv;
    const govs = E.KEYS.map(k => { const g = G.lv[k] - start[k]; return `<div class="gov">${A.portrait(k, g >= 4 ? 1 : g <= 0 ? -1 : 0, 46)}<span>${rname(k, true)}</span><b><em>${G.lv[k]}</em></b></div>`; }).join('');
    const canExtra = S.rounds < E.MAX_ROUNDS;
    return topBar(t('finalTitle'), teamName()) +
      `<div class="finalwrap"><div class="trophy"><div class="kick">${t('resultsOf')} · ${teamName()}</div>` +
      `<div class="equation"><div><b>${sc.sum}</b><span>${term('eco')}</span></div><span class="op">−</span><div><b>${sc.gap}</b><span>${term('gap')}</span></div><span class="op">=</span><div class="res"><b>${sc.idx}</b><span>${term('idx')}</span></div></div>` +
      `<p class="sub light">${t('tellTeacher')}</p></div>` +
      `<div class="mapcard">${mapSVG({ lv: G.lv, roads: G.roads, sez: G.sez, planRoads: [], planSez: [], sel: null, closed: factoryClosed(G) })}</div>` +
      `<div class="h4">${t('forBoard')}</div><div class="govs">${govs}</div>` +
      bubble('M', 1, `${t('modelTitle')} <b>${t('model_' + m.model)}</b> — ${t('model_' + m.model + 'Do')}`, `<div class="sp">${t('spentBy', { a: m.dot, b: m.road, c: m.tax, d: m.sez })}</div>`) +
      `<div class="bench"><div>${t('benchNone')}</div><div>${t('benchGrow')}</div><div>${t('benchEq')}</div><div>${t('benchMax')}</div></div>` +
      `<div class="discuss">${t('discuss')}</div>` +
      (canExtra ? `<button type="button" class="secondary" data-act="extra">${t('extra')}</button>` : '') + `</div>` +
      bottom(`<button type="button" class="primary" data-act="reset">${t('newGame')}</button>`);
  }

  // ---------- окна ----------
  function sheetRules() {
    const tool = k => `<div class="rtool"><span class="ic">${A.TOOL_ICON[k]}</span><div><b>${t(k + 'Name')}</b> · ${t(k + 'Alt')} <span class="tc">${coinIcons(E.COST[k])}</span><br>${t(k + 'Do')}</div></div>`;
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
    return `<h2>${t('confirmTitle')}</h2>` + bubble('M', left > 0 ? 0 : 1, left > 0 ? t('confirmLeft', { n: left }) : t('confirmAll')) +
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
    mapSeq = 0;
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
    fx = null;
    const ch = document.getElementById('chips');
    if (ch) ch.scrollLeft = chipsX;
    if (S.screen === 'calc') countUp();
    save();
  }
  // Числа на карте итогов плавно доходят до нового уровня.
  function countUp() {
    const R = S.last;
    document.querySelectorAll('#app .lvnum').forEach(el => {
      const k = el.dataset.k, from = R.log[k].start, to = R.log[k].end;
      if (from === to) return;
      const t0 = performance.now(), dur = 1200;
      const step = now => { const p = Math.min(1, (now - t0) / dur); el.textContent = Math.round(from + (to - from) * p); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
      setTimeout(() => { el.textContent = to; }, dur + 200);
    });
  }
  function go(screen) { S.screen = screen; modal = null; S.say = null; render(); window.scrollTo(0, 0); }
  function say(k, keyName, mood) { S.say = { k, key: keyName, mood }; }

  // ---------- действия ----------
  function buy(k, tool) {
    const G = S.game, D = S.dec, r = E.region(k), d = D[k];
    const left = G.budget - E.spent(G, D);
    const before = E.playRound(G, D, false).lv[k];
    if (tool === 'tax' && !E.canTax(G, k)) return say(k, 'lock_tax', -1);
    if (tool === 'sez' && !r.sez) return say(k, 'lock_sez', 0);
    if (tool === 'road' && G.roads.includes(k)) return say(k, 'has_road', 1);
    if (tool === 'sez' && G.sez.includes(k)) return say(k, 'has_sez', 1);
    if ((tool === 'road' && d.road) || (tool === 'sez' && d.sez)) return;
    if (left < E.COST[tool]) return say(k, 'no_coins', 0);
    if (tool === 'dot') d.dot++;
    if (tool === 'tax') d.tax++;
    if (tool === 'road') d.road = true;
    if (tool === 'sez') d.sez = true;
    if (tool === 'sez' && k === 'E' && !G.roads.includes('E') && !d.road) say(k, 'sez_noroad', 0);
    else say(k, 'react_' + tool, 1);
    const after = E.playRound(G, D, false).lv[k];
    if (after !== before) fx = { [k]: after - before };
  }
  function undo(k, tool) {
    const d = S.dec[k];
    if (tool === 'dot' && d.dot > 0) d.dot--;
    if (tool === 'tax' && d.tax > 0) d.tax--;
    if (tool === 'road') d.road = false;
    if (tool === 'sez') d.sez = false;
    say(k, 'undo', 0);
  }

  function act(a, el) {
    const k = el.dataset.k, tool = el.dataset.tool;
    switch (a) {
      case 'rules': modal = 'rules'; break;
      case 'close': modal = null; break;
      case 'coach': S.coach = S.game.round; break;
      case 'start': S.game = E.newGame(); S.dec = E.blankDecision(); S.sel = null; S.rounds = E.ROUNDS; S.coach = 0; return go('plan');
      case 'sel': S.sel = k; S.say = null; break;
      case 'buy': if (S.sel !== k) S.sel = k; buy(k, tool); break;
      case 'undo': undo(k, tool); break;
      case 'confirm': modal = 'confirm'; break;
      case 'commit': {
        const c = E.commit(S.game, S.dec);
        S.lastRound = S.game.round; S.last = c.result; S.game = c.state; S.dec = null;
        return go('event');
      }
      case 'toCalc': return go('calc');
      case 'next': S.dec = E.blankDecision(); S.sel = null; return go('plan');
      case 'final': return go('final');
      case 'extra': S.rounds = E.MAX_ROUNDS; S.dec = E.blankDecision(); S.sel = null; return go('plan');
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
    if (el.dataset.act) { act(el.dataset.act, el); return; }
    if (el.dataset.k && S.screen === 'plan' && el.closest('#map')) {
      act('sel', el);
      const p = document.querySelector('.panel');
      if (p && p.getBoundingClientRect().top > window.innerHeight * 0.6) p.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
  app.addEventListener('input', ev => { if (ev.target.id === 'team') { S.team = ev.target.value; save(); } });
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && modal) { modal = null; render(); } });

  if (S.screen !== 'start' && !S.game) S = fresh(S.lang);
  render();
})();
