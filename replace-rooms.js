// Run once from the project folder:  node replace-rooms.js
// Replaces ALL rooms. Because schedules and requests point at rooms,
// those are cleared too. A backup is saved as data.db.bak first.
const fs = require('fs');
fs.copyFileSync('data.db', 'data.db.bak');

const db = require('./db');

const F1 = 'Alvarado Hall, 1st Floor';
const F2 = 'Alvarado Hall, 2nd Floor';

// [name, building, capacity]  (capacity left empty: not provided)
const rooms = [
  ['Room 1', F1, null], ['Room 2', F1, null], ['Room 3', F1, null],
  ['Room 4', F1, null], ['Room 5', F1, null], ['Room 6', F1, null],
  ['NB1A', F1, null], ['NB2A', F1, null],

  ['Room 204', F2, null], ['Room 205', F2, null],
  ['NB2B', F2, null],
  ['CPE Lab', F2, null], ['BSIT Lab', F2, null],
  ['AVR', F2, null], ['BIT Lab', F2, null]
];

db.transaction(() => {
  db.prepare('DELETE FROM requests').run();
  db.prepare('DELETE FROM schedules').run();
  db.prepare('DELETE FROM rooms').run();
  const add = db.prepare('INSERT INTO rooms (name, building, capacity) VALUES (?,?,?)');
  rooms.forEach((r) => add.run(...r));
})();

console.log(`Done: ${rooms.length} rooms added. Backup: data.db.bak`);
