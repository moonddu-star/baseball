(function (root) {
  'use strict';
  // GDD probabilities in basis points (10000 = 100%); never normalize or retune.
  const symbols = [
    { id: 'out', label: 'OUT', short: 'OUT', factor: 0 },
    { id: 'single', label: 'SINGLE', short: '1B', factor: 105 },
    { id: 'double', label: 'DOUBLE', short: '2B', factor: 120 },
    { id: 'triple', label: 'TRIPLE', short: '3B', factor: 150 },
    { id: 'home-run', label: 'HOME RUN', short: 'HR', factor: 500 }
  ];
  const initial = {
    1: { easy: [1200,7180,1252,309,59], medium: [2000,4850,2100,875,175], hard: [3200,3171,2002,1162,465] },
    2: { easy: [1200,7761,802,199,38], medium: [2000,5300,1800,750,150], hard: [3200,3444,1851,1075,430] },
    3: { easy: [1200,8340,355,88,17], medium: [2000,5750,1500,625,125], hard: [3200,3716,1701,988,395] },
    4: { easy: [1200,8646,113,34,7], medium: [2000,5971,1350,567,112], hard: [3200,3843,1634,946,377] }
  };
  const secondary = {
    easy: [1200,6600,1700,420,80],
    medium: [2000,4400,2400,1000,200],
    hard: [3200,2900,2150,1250,500]
  };
  function freeze(value) {
    Object.values(value).forEach(v => { if (v && typeof v === 'object') freeze(v); });
    return Object.freeze(value);
  }
  const balance = freeze({
    // User-selected RTP Ver 1 (98%); all GDD tables are retained for review.
    activeVersion: 1,
    rtp: { 1: .98, 2: .96, 3: .94, 4: .93 },
    difficulties: ['easy', 'medium', 'hard'], symbols, initial, secondary,
    cells: 25, threshold: 10000
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = balance;
  else root.TigerBalance = balance;
})(globalThis);
