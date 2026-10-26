// Рисунки игры: портреты губернаторов, значки инструментов, объекты карты, сцены событий.
// Всё — SVG-строки, без внешних картинок.
(function (root) {
  'use strict';

  // ---------- портреты ----------
  // mood: 1 — рад, 0 — спокоен, -1 — расстроен.
  const PEOPLE = {
    A: { bg: '#DCE4F0', skin: '#F1C9A5', hair: '#4A3226', cloth: '#14213D', acc: 'glasses', hairStyle: 'bob', scarf: '#A13A2C' },
    B: { bg: '#CFE0EE', skin: '#E8B98F', hair: '#1E1A18', cloth: '#1F3F66', acc: 'captain', hairStyle: 'short' },
    C: { bg: '#E7E0CF', skin: '#EBC09A', hair: '#7A4B2A', cloth: '#C8652B', acc: 'hardhat', hairStyle: 'beard' },
    D: { bg: '#E3DDD6', skin: '#E9BE9C', hair: '#A8A29A', cloth: '#6B5844', acc: 'flatcap', hairStyle: 'mustache' },
    E: { bg: '#E6E9CF', skin: '#E3B48C', hair: '#22191A', cloth: '#4F7D3A', acc: 'none', hairStyle: 'ponytail' },
    M: { bg: '#F2E4D3', skin: '#F0C7A0', hair: '#1B1414', cloth: '#A13A2C', acc: 'earrings', hairStyle: 'bun' }
  };

  function portrait(id, mood, size) {
    const p = PEOPLE[id], s = size || 64;
    const brows = mood > 0 ? 'M36,36 Q41,33 45,35 M55,35 Q59,33 64,36'
      : mood < 0 ? 'M36,34 Q41,37 45,37 M55,37 Q59,37 64,34' : 'M36,35 L45,35 M55,35 L64,35';
    const mouth = mood > 0 ? 'M41,56 Q50,65 59,56' : mood < 0 ? 'M42,61 Q50,55 58,61' : 'M43,59 Q50,61 57,59';
    let back = '', front = '';
    switch (p.hairStyle) {
      case 'bob': back = `<path d="M27,48 C25,24 38,18 50,18 C63,18 76,24 73,48 L73,62 L64,62 L64,40 L36,40 L36,62 L27,62 Z" fill="${p.hair}"/>`;
        front = `<path d="M31,38 C33,24 44,21 52,22 C62,23 69,29 69,38 C60,32 46,30 31,38 Z" fill="${p.hair}"/>`; break;
      case 'short': front = `<path d="M30,40 C29,25 40,19 50,19 C61,19 71,25 70,40 C64,32 38,31 30,40 Z" fill="${p.hair}"/>`; break;
      case 'beard': front = `<path d="M31,50 C32,64 40,71 50,71 C60,71 68,64 69,50 C66,57 60,60 50,60 C40,60 34,57 31,50 Z" fill="${p.hair}"/>`; break;
      case 'mustache': front = `<path d="M30,38 C30,26 40,21 50,21 C60,21 70,26 70,38 C64,33 36,33 30,38 Z" fill="${p.hair}"/><path d="M41,55 Q50,50 59,55 Q50,53 41,55 Z" fill="${p.hair}" stroke="${p.hair}" stroke-width="2"/>`; break;
      case 'ponytail': back = `<path d="M66,30 C80,34 82,52 74,64 C76,50 72,40 64,36 Z" fill="${p.hair}"/>`;
        front = `<path d="M30,40 C29,24 40,18 50,18 C62,18 71,25 70,40 C62,30 40,29 30,40 Z" fill="${p.hair}"/>`; break;
      case 'bun': back = `<circle cx="50" cy="15" r="9" fill="${p.hair}"/>`;
        front = `<path d="M30,42 C28,24 40,19 50,19 C61,19 72,24 70,42 C64,30 36,30 30,42 Z" fill="${p.hair}"/>`; break;
    }
    let acc = '';
    switch (p.acc) {
      case 'glasses': acc = `<g fill="none" stroke="#14213D" stroke-width="1.8"><circle cx="41" cy="44" r="6"/><circle cx="59" cy="44" r="6"/><path d="M47,44 H53"/></g>`; break;
      case 'captain': acc = `<path d="M27,30 C28,17 72,17 73,30 Z" fill="#FFFDF8" stroke="#14213D" stroke-width="1.5"/><path d="M25,30 H75 L71,35 H29 Z" fill="#14213D"/><circle cx="50" cy="24" r="3.2" fill="#A13A2C"/>`; break;
      case 'hardhat': acc = `<path d="M27,33 C27,15 73,15 73,33 Z" fill="#F2A33A" stroke="#B8701E" stroke-width="1.5"/><rect x="22" y="31" width="56" height="5" rx="2.5" fill="#F2A33A" stroke="#B8701E" stroke-width="1.2"/><path d="M50,16 V31" stroke="#B8701E" stroke-width="2"/>`; break;
      case 'flatcap': acc = `<path d="M28,33 C28,20 70,18 72,30 L78,34 C66,36 40,36 28,33 Z" fill="#7D776F"/>`; break;
      case 'earrings': acc = `<circle cx="29.5" cy="54" r="2.2" fill="#C9D3E3"/><circle cx="70.5" cy="54" r="2.2" fill="#C9D3E3"/>`; break;
    }
    const scarf = p.scarf ? `<path d="M40,72 L50,84 L60,72 Z" fill="${p.scarf}"/>` : '';
    const collar = `<path d="M40,72 L50,82 L60,72" fill="none" stroke="#FFFDF8" stroke-width="2.5"/>`;
    return `<svg viewBox="0 0 100 100" width="${s}" height="${s}" aria-hidden="true" class="portrait">` +
      `<circle cx="50" cy="50" r="50" fill="${p.bg}"/>` +
      `<clipPath id="pc-${id}-${s}"><circle cx="50" cy="50" r="50"/></clipPath><g clip-path="url(#pc-${id}-${s})">` +
      back + `<path d="M14,104 C16,82 32,72 50,72 C68,72 84,82 86,104 Z" fill="${p.cloth}"/>` + collar + scarf +
      `<rect x="44" y="62" width="12" height="11" fill="${p.skin}"/>` +
      `<circle cx="29" cy="48" r="4.5" fill="${p.skin}"/><circle cx="71" cy="48" r="4.5" fill="${p.skin}"/>` +
      `<ellipse cx="50" cy="45" rx="20" ry="23" fill="${p.skin}"/>` + front +
      `<ellipse cx="41.5" cy="44" rx="2.3" ry="2.8" fill="#1B2433"/><ellipse cx="58.5" cy="44" rx="2.3" ry="2.8" fill="#1B2433"/>` +
      `<path d="${brows}" fill="none" stroke="#3A2A20" stroke-width="2" stroke-linecap="round"/>` +
      `<circle cx="36" cy="53" r="3.5" fill="#E88A7A" opacity="${mood > 0 ? 0.45 : 0.18}"/><circle cx="64" cy="53" r="3.5" fill="#E88A7A" opacity="${mood > 0 ? 0.45 : 0.18}"/>` +
      `<path d="${mouth}" fill="none" stroke="#7A2E22" stroke-width="2.4" stroke-linecap="round"/>` + acc + `</g></svg>`;
  }

  // ---------- значки инструментов ----------
  const TOOL_ICON = {
    dot: `<svg viewBox="0 0 48 48" aria-hidden="true"><ellipse cx="24" cy="37" rx="14" ry="5" fill="#9A6F28"/><rect x="10" y="29" width="28" height="8" fill="#C8963E"/><ellipse cx="24" cy="29" rx="14" ry="5" fill="#E2B865"/><rect x="10" y="21" width="28" height="8" fill="#C8963E"/><ellipse cx="24" cy="21" rx="14" ry="5" fill="#E2B865"/><rect x="10" y="13" width="28" height="8" fill="#C8963E"/><ellipse cx="24" cy="13" rx="14" ry="5" fill="#F0CD84"/><path d="M19,13 H29" stroke="#9A6F28" stroke-width="2" stroke-linecap="round"/></svg>`,
    road: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M17,44 L22,6 H26 L31,44 Z" fill="#5A5048"/><path d="M24,40 V34 M24,28 V22 M24,17 V12" stroke="#F7F5F0" stroke-width="2.2" stroke-linecap="round"/><path d="M4,44 L16,6" stroke="#8DBF6A" stroke-width="6"/><path d="M44,44 L32,6" stroke="#8DBF6A" stroke-width="6"/><path d="M38,40 l3,-7 l3,7 Z" fill="#F2A33A"/></svg>`,
    tax: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8,10 H30 L42,22 L28,36 L8,16 Z" fill="#A13A2C" transform="rotate(8 24 24)"/><circle cx="14" cy="15" r="3" fill="#FFFDF8"/><text x="27" y="30" font-size="15" font-weight="700" fill="#FFFDF8" font-family="Arial" text-anchor="middle" transform="rotate(8 24 24)">%</text><path d="M38,30 V44 M33,39 L38,44 L43,39" stroke="#2F7A45" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    sez: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10,44 V8 M10,8 H40 M14,8 L10,14 M32,8 V16" stroke="#14213D" stroke-width="2.6" fill="none" stroke-linecap="round"/><rect x="28" y="16" width="8" height="5" fill="#A13A2C"/><rect x="16" y="34" width="12" height="10" fill="#2B5C8A"/><rect x="28" y="34" width="12" height="10" fill="#A13A2C"/><rect x="22" y="25" width="12" height="9" fill="#C8963E"/><path d="M40,4 l1.6,3.4 3.6,.4 -2.7,2.5 .8,3.6 -3.3,-1.9 -3.3,1.9 .8,-3.6 -2.7,-2.5 3.6,-.4 Z" fill="#A13A2C"/></svg>`,
    lock: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" fill="#8A837A"/><path d="M8,10 V7 a4,4 0 0 1 8,0 V10" fill="none" stroke="#8A837A" stroke-width="2.4"/></svg>`
  };

  // ---------- объекты карты ----------
  const N = '#14213D';
  const f1 = v => v.toFixed(1);

  function tree(x, y, pine) {
    return pine
      ? `<path d="M${f1(x)},${f1(y - 8)} L${f1(x + 5)},${f1(y)} H${f1(x + 1.4)} V${f1(y + 3)} H${f1(x - 1.4)} V${f1(y)} H${f1(x - 5)} Z" fill="#3E6B45"/><path d="M${f1(x)},${f1(y - 11)} L${f1(x + 3.6)},${f1(y - 4)} H${f1(x - 3.6)} Z" fill="#4D7F52"/>`
      : `<rect x="${f1(x - 1)}" y="${f1(y - 1)}" width="2" height="4.5" fill="#6B5844"/><circle cx="${f1(x)}" cy="${f1(y - 4)}" r="4.6" fill="#5E9F4F"/><circle cx="${f1(x - 1.5)}" cy="${f1(y - 5.5)}" r="2" fill="#7DB868" opacity=".8"/>`;
  }
  function mountain(x, y) {
    return `<path d="M${f1(x - 9)},${f1(y + 5)} L${f1(x - 2)},${f1(y - 7)} L${f1(x + 2)},${f1(y - 1)} L${f1(x + 4)},${f1(y - 4)} L${f1(x + 10)},${f1(y + 5)} Z" fill="#A79F92"/><path d="M${f1(x - 2)},${f1(y - 7)} L${f1(x - 4.5)},${f1(y - 2.5)} L${f1(x - 2)},${f1(y - 3.5)} L${f1(x)},${f1(y - 3.6)} Z" fill="#F7F5F0"/>`;
  }
  // Здание по уровню региона: хижина → дом → многоэтажка → башня.
  function building(x, y, tier, cls) {
    const c = cls ? ` class="${cls}"` : '';
    if (tier === 0) return `<g${c}><path d="M${f1(x - 4)},${f1(y + 4)} V${f1(y)} L${f1(x)},${f1(y - 3.5)} L${f1(x + 4)},${f1(y)} V${f1(y + 4)} Z" fill="#E9DCC3" stroke="${N}" stroke-width=".7"/><rect x="${f1(x - 1)}" y="${f1(y + 1)}" width="2" height="3" fill="#6B5844"/></g>`;
    if (tier === 1) return `<g${c}><path d="M${f1(x - 5.5)},${f1(y + 5)} V${f1(y - 1)} L${f1(x)},${f1(y - 6)} L${f1(x + 5.5)},${f1(y - 1)} V${f1(y + 5)} Z" fill="#FFFDF8" stroke="${N}" stroke-width=".8"/><path d="M${f1(x - 6.5)},${f1(y - 0.5)} L${f1(x)},${f1(y - 6.5)} L${f1(x + 6.5)},${f1(y - 0.5)}" fill="none" stroke="#A13A2C" stroke-width="1.8" stroke-linejoin="round"/><rect x="${f1(x - 3.5)}" y="${f1(y)}" width="2.6" height="2.4" fill="#9FC3E0"/><rect x="${f1(x + 0.9)}" y="${f1(y)}" width="2.6" height="2.4" fill="#9FC3E0"/></g>`;
    if (tier === 2) return `<g${c}><rect x="${f1(x - 6)}" y="${f1(y - 8)}" width="12" height="13" fill="#E4E0D8" stroke="${N}" stroke-width=".8"/>` +
      [0, 1, 2].map(r => [0, 1, 2].map(q => `<rect x="${f1(x - 4.6 + q * 3.4)}" y="${f1(y - 6.5 + r * 3.6)}" width="2" height="2.2" fill="#6F9CC6"/>`).join('')).join('') + `</g>`;
    return `<g${c}><rect x="${f1(x - 7)}" y="${f1(y - 5)}" width="6" height="10" fill="#C9D3E3" stroke="${N}" stroke-width=".7"/><rect x="${f1(x - 2)}" y="${f1(y - 14)}" width="8" height="19" fill="#9FB0C9" stroke="${N}" stroke-width=".8"/><path d="M${f1(x + 2)},${f1(y - 14)} V${f1(y - 18)}" stroke="${N}" stroke-width=".8"/>` +
      [0, 1, 2, 3].map(r => `<rect x="${f1(x - 0.6)}" y="${f1(y - 12 + r * 4)}" width="5.2" height="1.6" fill="#E8F1F8"/>`).join('') + `</g>`;
  }
  const tierFor = lv => (lv < 5 ? 0 : lv < 10 ? 1 : lv < 15 ? 2 : 3);

  // Достопримечательности регионов (стоят всегда).
  function landmark(k, x, y, state) {
    if (k === 'A') return `<g><rect x="${f1(x - 6)}" y="${f1(y - 4)}" width="12" height="9" fill="#F7F5F0" stroke="${N}" stroke-width=".9"/><rect x="${f1(x - 2.5)}" y="${f1(y - 14)}" width="5" height="10" fill="#F7F5F0" stroke="${N}" stroke-width=".9"/><path d="M${f1(x - 3.5)},${f1(y - 14)} L${f1(x)},${f1(y - 21)} L${f1(x + 3.5)},${f1(y - 14)} Z" fill="#A13A2C"/><circle cx="${f1(x)}" cy="${f1(y - 9)}" r="1.4" fill="${N}"/><path d="M${f1(x)},${f1(y - 21)} V${f1(y - 25)}" stroke="${N}" stroke-width=".8"/><path d="M${f1(x)},${f1(y - 25)} h4 l-1.2,1.2 1.2,1.2 h-4" fill="#A13A2C"/></g>`;
    if (k === 'B') return `<g><path d="M${f1(x - 6)},${f1(y + 5)} V${f1(y - 12)} M${f1(x - 6)},${f1(y - 12)} H${f1(x + 9)} M${f1(x - 6)},${f1(y - 7)} L${f1(x - 1)},${f1(y - 12)}" stroke="#A13A2C" stroke-width="1.8" fill="none"/><path d="M${f1(x + 6)},${f1(y - 12)} V${f1(y - 4)}" stroke="${N}" stroke-width=".8"/><rect x="${f1(x + 3.5)}" y="${f1(y - 4)}" width="5" height="3" fill="#2B5C8A"><animateTransform attributeName="transform" type="translate" values="0,0;0,4;0,0" dur="4s" repeatCount="indefinite"/></rect><rect x="${f1(x - 2)}" y="${f1(y + 1)}" width="5" height="4" fill="#C8963E"/><rect x="${f1(x + 3)}" y="${f1(y + 1)}" width="5" height="4" fill="#2B5C8A"/></g>`;
    if (k === 'C') return `<g><path d="M${f1(x - 7)},${f1(y + 5)} H${f1(x + 7)}" stroke="${N}" stroke-width="1.2"/><path d="M${f1(x - 1)},${f1(y + 5)} L${f1(x)},${f1(y - 4)} L${f1(x + 1)},${f1(y + 5)}" fill="none" stroke="${N}" stroke-width="1.2"/>` +
      `<g><animateTransform attributeName="transform" type="rotate" values="-14 ${f1(x)} ${f1(y - 4)};14 ${f1(x)} ${f1(y - 4)};-14 ${f1(x)} ${f1(y - 4)}" dur="2.4s" repeatCount="indefinite"/><path d="M${f1(x - 8)},${f1(y - 4)} H${f1(x + 7)}" stroke="#14213D" stroke-width="2.2" stroke-linecap="round"/><path d="M${f1(x + 7)},${f1(y - 7)} q3,3 0,6" fill="#14213D"/><path d="M${f1(x - 7)},${f1(y - 4)} V${f1(y + 2)}" stroke="${N}" stroke-width=".9"/></g>` +
      `<path d="M${f1(x + 5)},${f1(y + 5)} q1.4,-3 2.8,0 q0,2 -1.4,2 q-1.4,0 -1.4,-2 Z" fill="#14213D"/></g>`;
    if (k === 'D') {
      const closed = state === 'closed';
      const smoke = closed ? '' : [0, 1].map(i => `<circle cx="${f1(x + 2.5 + i * 4)}" cy="${f1(y - 12)}" r="2.2" fill="#B9B3AA" opacity=".8"><animate attributeName="cy" values="${f1(y - 12)};${f1(y - 22)}" dur="${2.6 + i * 0.7}s" repeatCount="indefinite"/><animate attributeName="r" values="1.8;4.5" dur="${2.6 + i * 0.7}s" repeatCount="indefinite"/><animate attributeName="opacity" values=".8;0" dur="${2.6 + i * 0.7}s" repeatCount="indefinite"/></circle>`).join('');
      return `<g>${smoke}<path d="M${f1(x - 8)},${f1(y + 5)} V${f1(y - 2)} L${f1(x - 4)},${f1(y - 5)} V${f1(y - 2)} L${f1(x)},${f1(y - 5)} V${f1(y - 2)} L${f1(x + 1.5)},${f1(y - 2.6)} V${f1(y - 11)} H${f1(x + 4)} V${f1(y - 3)} H${f1(x + 5.5)} V${f1(y - 11)} H${f1(x + 8)} V${f1(y + 5)} Z" fill="${closed ? '#9C968E' : '#8C5A3C'}" stroke="${N}" stroke-width=".8"/>` +
        (closed ? `<rect x="${f1(x - 6)}" y="${f1(y)}" width="12" height="3.6" fill="#A13A2C" transform="rotate(-10 ${f1(x)} ${f1(y + 2)})"/>` : `<rect x="${f1(x - 6)}" y="${f1(y)}" width="2.5" height="2.5" fill="#F2C9B8"/><rect x="${f1(x - 2)}" y="${f1(y)}" width="2.5" height="2.5" fill="#F2C9B8"/>`) + `</g>`;
    }
    if (k === 'E') return `<g><path d="M${f1(x - 7)},${f1(y + 5)} V${f1(y - 13)}" stroke="${N}" stroke-width="1.1"/><path d="M${f1(x - 7)},${f1(y - 13)} q4,-2 8,0 t8,0 v6 q-4,-2 -8,0 t-8,0 Z" fill="#A13A2C"><animate attributeName="d" values="M${f1(x - 7)},${f1(y - 13)} q4,-2 8,0 t8,0 v6 q-4,-2 -8,0 t-8,0 Z;M${f1(x - 7)},${f1(y - 13)} q4,2 8,0 t8,0 v6 q-4,2 -8,0 t-8,0 Z;M${f1(x - 7)},${f1(y - 13)} q4,-2 8,0 t8,0 v6 q-4,-2 -8,0 t-8,0 Z" dur="2s" repeatCount="indefinite"/></path>` +
      `<rect x="${f1(x - 3)}" y="${f1(y - 2)}" width="5" height="7" fill="#F7F5F0" stroke="${N}" stroke-width=".8"/><path d="M${f1(x + 2)},${f1(y + 1)} H${f1(x + 11)}" stroke="#A13A2C" stroke-width="1.8" stroke-dasharray="2 1.6"/></g>`;
    return '';
  }

  function sezZone(x, y, planned) {
    if (planned) return `<g><circle cx="${f1(x)}" cy="${f1(y)}" r="13" fill="#FFFDF8" fill-opacity=".35" stroke="#A13A2C" stroke-width="1.6" stroke-dasharray="3 2.4"><animate attributeName="stroke-dashoffset" values="0;11" dur="1.2s" repeatCount="indefinite"/></circle><text x="${f1(x)}" y="${f1(y + 3.5)}" font-size="9" font-weight="700" fill="#A13A2C" text-anchor="middle" font-family="Arial">?</text></g>`;
    return `<g class="sez"><circle cx="${f1(x)}" cy="${f1(y)}" r="13" fill="#A13A2C" fill-opacity=".12" stroke="#A13A2C" stroke-width="1.4"/>` +
      `<rect x="${f1(x - 8)}" y="${f1(y + 1)}" width="5.5" height="4" fill="#2B5C8A"/><rect x="${f1(x - 2.5)}" y="${f1(y + 1)}" width="5.5" height="4" fill="#A13A2C"/><rect x="${f1(x - 5)}" y="${f1(y - 3)}" width="5.5" height="4" fill="#C8963E"/>` +
      `<path d="M${f1(x + 5)},${f1(y + 5)} V${f1(y - 9)} H${f1(x - 3)} M${f1(x + 5)},${f1(y - 5)} L${f1(x + 1)},${f1(y - 9)}" stroke="${N}" stroke-width="1.3" fill="none"/>` +
      `<path d="M${f1(x - 1)},${f1(y - 9)} V${f1(y - 5)}" stroke="${N}" stroke-width=".7"><animate attributeName="d" values="M${f1(x - 1)},${f1(y - 9)} V${f1(y - 5)};M${f1(x - 1)},${f1(y - 9)} V${f1(y - 2)};M${f1(x - 1)},${f1(y - 9)} V${f1(y - 5)}" dur="3s" repeatCount="indefinite"/></path></g>`;
  }

  function ship(x, y, dur) {
    return `<g><animateTransform attributeName="transform" type="translate" values="0,0;-14,1;0,0" dur="${dur}s" repeatCount="indefinite"/>` +
      `<path d="M${f1(x - 9)},${f1(y)} H${f1(x + 9)} L${f1(x + 6)},${f1(y + 4)} H${f1(x - 7)} Z" fill="#A13A2C"/><rect x="${f1(x - 6)}" y="${f1(y - 4)}" width="4" height="4" fill="#2B5C8A"/><rect x="${f1(x - 2)}" y="${f1(y - 4)}" width="4" height="4" fill="#C8963E"/><rect x="${f1(x + 2)}" y="${f1(y - 7)}" width="4" height="7" fill="#F7F5F0" stroke="${N}" stroke-width=".6"/></g>`;
  }
  function wave(x, y, i) {
    return `<path d="M${f1(x - 6)},${f1(y)} q3,-2.4 6,0 t6,0" fill="none" stroke="#FFFFFF" stroke-opacity=".75" stroke-width="1.2" stroke-linecap="round"><animateTransform attributeName="transform" type="translate" values="0,0;2.5,0;0,0" dur="${3 + (i % 3)}s" repeatCount="indefinite"/></path>`;
  }
  function truck(pathD, dur, delay) {
    return `<g><rect x="-4" y="-2.6" width="5.4" height="4.2" rx=".6" fill="#2B5C8A"/><rect x="1.4" y="-1.8" width="2.8" height="3.4" rx=".6" fill="#A13A2C"/><animateMotion path="${pathD}" dur="${dur}s" begin="${delay}s" repeatCount="indefinite" rotate="auto" keyPoints="0;1;0" keyTimes="0;.5;1" calcMode="linear"/></g>`;
  }
  function cone(x, y) {
    return `<path d="M${f1(x - 2.6)},${f1(y + 2.5)} L${f1(x)},${f1(y - 4)} L${f1(x + 2.6)},${f1(y + 2.5)} Z" fill="#F2A33A" stroke="#B8701E" stroke-width=".5"/><path d="M${f1(x - 1.4)},${f1(y - 0.6)} H${f1(x + 1.4)}" stroke="#FFFDF8" stroke-width="1"/>`;
  }
  // Человечек, который уезжает из региона без дороги.
  function leaver(x, y, tx, ty, delay) {
    return `<g opacity="0"><circle cx="0" cy="-5" r="1.8" fill="${N}"/><path d="M0,-3 V2 M0,2 l-2,3.4 M0,2 l2,3.4 M-2.4,-1 H2.4" stroke="${N}" stroke-width="1.3" stroke-linecap="round"/><rect x="2" y="-2" width="3" height="3.4" fill="#A13A2C"/>` +
      `<animateMotion path="M${f1(x)},${f1(y)} L${f1(tx)},${f1(ty)}" dur="2.4s" begin="${delay}s" fill="freeze"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.1;.8;1" dur="2.4s" begin="${delay}s" fill="freeze"/></g>`;
  }

  // ---------- сцены событий ----------
  function eventScene(n, applied) {
    const sky = `<rect width="320" height="150" fill="#DCE8F1"/><rect y="112" width="320" height="38" fill="#BFD79B"/>`;
    if (n === 1) return `<svg viewBox="0 0 320 150" class="scene" aria-hidden="true">${sky}` +
      `<g transform="translate(70,104) scale(3)">${landmark('C', 0, 0)}</g>` +
      `<rect x="168" y="22" width="132" height="84" rx="8" fill="#FFFDF8" stroke="#DDD6C8"/><text x="180" y="40" font-size="12" font-family="Arial" fill="#5F5A52">$ / баррель · 油价</text>` +
      `<polyline points="180,52 205,58 225,54 248,74 270,86 290,96" fill="none" stroke="#A13A2C" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="200" stroke-dashoffset="200"><animate attributeName="stroke-dashoffset" from="200" to="0" dur="1.4s" fill="freeze"/></polyline>` +
      `<path d="M284,88 l10,10 l-13,1 Z" fill="#A13A2C"/>` +
      `<g transform="translate(130,98)"><ellipse cx="0" cy="12" rx="9" ry="3" fill="#6B5844"/><rect x="-9" y="-8" width="18" height="20" fill="#2B5C8A"/><ellipse cx="0" cy="-8" rx="9" ry="3" fill="#4C7BA6"/><path d="M-9,0 H9" stroke="#14213D" stroke-width="1.2"/></g></svg>`;
    if (n === 2) return `<svg viewBox="0 0 320 150" class="scene" aria-hidden="true">${sky}` +
      `<g transform="translate(150,96) scale(3.4)">${landmark('D', 0, 0, applied ? 'closed' : '')}</g>` +
      (applied ? `<text x="160" y="140" font-size="13" font-weight="700" fill="#A13A2C" font-family="Arial" text-anchor="middle">ЗАКРЫТО · 倒闭</text>`
        : `<path d="M0,128 H320" stroke="#5A5048" stroke-width="10"/><path d="M0,128 H320" stroke="#F7F5F0" stroke-width="1.2" stroke-dasharray="8 8"/>${truck('M20,128 L300,128', 6, 0)}`) + `</svg>`;
    return `<svg viewBox="0 0 320 150" class="scene" aria-hidden="true">${sky}` +
      `<g transform="translate(160,100) scale(3.2)">${landmark('E', 0, 0)}</g>` +
      (applied ? `<path d="M0,128 H320" stroke="#5A5048" stroke-width="10"/><path d="M0,128 H320" stroke="#F7F5F0" stroke-width="1.2" stroke-dasharray="8 8"/>${truck('M10,128 L310,128', 5, 0)}${truck('M10,128 L310,128', 5, 1.6)}` : `<text x="160" y="140" font-size="12" fill="#5F5A52" font-family="Arial" text-anchor="middle">нет дороги · 没有路</text>`) + `</svg>`;
  }

  root.Art = { portrait, TOOL_ICON, tree, mountain, building, tierFor, landmark, sezZone, ship, wave, truck, cone, leaver, eventScene };
})(this);
