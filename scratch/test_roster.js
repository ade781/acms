// test_roster.js
const TEAMS_SCHEDULE = [
  // Day 0 & 1: Alpha Malam, Bravo Libur, Charlie Siang, Delta Pagi
  { p: 'Delta', s: 'Charlie', m: 'Alpha', off: 'Bravo' },
  { p: 'Delta', s: 'Charlie', m: 'Alpha', off: 'Bravo' },
  // Day 2 & 3: Alpha Libur, Bravo Siang, Charlie Pagi, Delta Malam
  { p: 'Charlie', s: 'Bravo', m: 'Delta', off: 'Alpha' },
  { p: 'Charlie', s: 'Bravo', m: 'Delta', off: 'Alpha' },
  // Day 4 & 5: Alpha Siang, Bravo Pagi, Charlie Malam, Delta Libur
  { p: 'Bravo', s: 'Alpha', m: 'Charlie', off: 'Delta' },
  { p: 'Bravo', s: 'Alpha', m: 'Charlie', off: 'Delta' },
  // Day 6 & 7: Alpha Pagi, Bravo Malam, Charlie Libur, Delta Siang
  { p: 'Alpha', s: 'Delta', m: 'Bravo', off: 'Charlie' },
  { p: 'Alpha', s: 'Delta', m: 'Bravo', off: 'Charlie' },
];

function getRosterForDay(dayIndex) {
  const norm = ((dayIndex % 8) + 8) % 8;
  return TEAMS_SCHEDULE[norm];
}

console.log('--- TEST ROTASI 8 HARI ---');
for (let i = 0; i < 8; i++) {
  const r = getRosterForDay(i);
  console.log(`Day ${i}: Pagi(Shift 1)=${r.p.padEnd(8)} | Siang(Shift 2)=${r.s.padEnd(8)} | Malam(Shift 3)=${r.m.padEnd(8)} | Libur=${r.off}`);
}

// Cek dari sudut pandang masing-masing regu:
console.log('\n--- JADWAL PER REGU (8 HARI) ---');
['Alpha', 'Bravo', 'Charlie', 'Delta'].forEach(team => {
  const shifts = [];
  for (let i = 0; i < 8; i++) {
    const r = getRosterForDay(i);
    if (r.p === team) shifts.push('Pagi');
    else if (r.s === team) shifts.push('Siang');
    else if (r.m === team) shifts.push('Malam');
    else shifts.push('Libur');
  }
  console.log(`${team.padEnd(8)}: ${shifts.join(', ')}`);
});
