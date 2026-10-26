// node tests/engine.test.js — сверка с листом преподавателя.
'use strict';
const E = require('../engine.js');
let fails = 0;
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok ? '' : ' — got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want)));
}
function play(plans) {
  let st = E.newGame(); const res = [];
  plans.forEach(p => {
    const dec = E.blankDecision();
    Object.keys(p).forEach(k => Object.assign(dec[k], p[k]));
    const c = E.commit(st, dec); st = c.state; res.push(c.result);
  });
  return { st, res };
}

// Пример партии «баланс» из листа преподавателя.
const ex = play([
  { D: { road: true }, E: { road: true, dot: 3 }, B: { tax: 1 }, C: { tax: 2 } },
  { B: { sez: true }, D: { tax: 3 }, E: { tax: 3 }, A: { tax: 2 }, C: { tax: 1 } }
]);
eq('пример: уровни после 1-й', ex.res[0].lv, { A: 9, B: 9, C: 9, D: 5, E: 6 });
eq('пример: Экономика/Разрыв 1-й', [ex.res[0].sc.sum, ex.res[0].sc.gap], [38, 4]);
eq('пример: бюджет 2-й', ex.res[0].next, 12);
eq('пример: потрачено 1-й и 2-й', ex.st.history.map(h => h.spent), [10, 12]);
eq('пример: уровни после 2-й', ex.res[1].lv, { A: 14, B: 14, C: 12, D: 12, E: 13 });
eq('пример: итог', [ex.res[1].sc.sum, ex.res[1].sc.gap, ex.res[1].sc.idx], [65, 2, 63]);
eq('пример: заводы не закрылись (дорога)', ex.res[1].events[0].applied, false);

// Ничего не делать: Индекс 14, разрыв с 6 до 10.
const none = play([{}, {}]);
eq('ничего не делать: Индекс', none.res[1].sc.idx, 14);
eq('ничего не делать: Разрыв', none.res[1].sc.gap, 10);

// Только дотации реципиентам: Экономика ≈ 43, Разрыв ≈ 3, Индекс ≈ 40.
const eqz = play([{ D: { dot: 4 }, E: { dot: 6 } }, { D: { dot: 5 }, E: { dot: 5 } }]);
console.log('     только выравнивание:', eqz.res[1].sc);

// Только льготы донорам: Индекс 42–44.
const grow = play([{ A: { tax: 4 }, B: { tax: 3 }, C: { tax: 3 } }, { A: { tax: 6 }, B: { tax: 5 }, C: { tax: 5 } }]);
console.log('     только рост:', grow.res[1].sc, 'бюджет 2-й', grow.res[0].next);

// ОЭЗ в Приграничье без дороги — около 34.
const sezE = play([{ E: { sez: true }, A: { tax: 3 }, B: { tax: 2 }, C: { tax: 2 } }, { A: { tax: 4 }, B: { tax: 4 }, C: { tax: 4 } }]);
console.log('     ОЭЗ без дороги:', sezE.res[1].sc);

// Третья пятилетка: событие «Торговый коридор».
const third = play([{ E: { road: true } }, {}, {}]);
eq('3-я: Приграничье с дорогой +3', third.res[2].log.E.ev, 3);
eq('3-я: Портовый край +1', third.res[2].log.B.ev, 1);

// Подсказка модели.
eq('модель: дотации → Россия', E.classify(eqz.st.history).model, 'russia');
eq('модель: пример баланса → Китай', E.classify(ex.st.history).model, 'china');

// Случайный поиск максимума — ориентир «около 70».
let best = 0;
const rnd = n => Math.floor(Math.random() * n);
for (let t = 0; t < 200000; t++) {
  let st = E.newGame();
  for (let r = 1; r <= 2; r++) {
    const dec = E.blankDecision();
    let left = st.budget;
    E.KEYS.forEach(k => { if (rnd(3) === 0 && E.canRoad(st, k) && left >= 2) { dec[k].road = true; left -= 2; } });
    ['B', 'E'].forEach(k => { if (rnd(3) === 0 && E.canSez(st, k) && left >= 3) { dec[k].sez = true; left -= 3; } });
    while (left > 0) {
      const k = E.KEYS[rnd(5)];
      if (rnd(2) && E.canTax(st, k)) dec[k].tax++; else dec[k].dot++;
      left--;
    }
    st = E.commit(st, dec).state;
  }
  best = Math.max(best, E.score(st.lv).idx);
}
console.log('     лучший Индекс случайного поиска:', best);

console.log(fails ? fails + ' FAIL' : 'all ok');
process.exit(fails ? 1 : 0);
