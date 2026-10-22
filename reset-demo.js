// Fresh demo: makes every room vacant again.
// Run from the project folder:  node reset-demo.js
// Clears all schedules and requests. Users, rooms and AVR's maintenance status stay.
const fs = require('fs');
fs.copyFileSync('data.db', 'data.db.before-reset');
const db = require('./db');
db.transaction(() => {
  db.prepare('DELETE FROM requests').run();
  db.prepare('DELETE FROM schedules').run();
})();
console.log('Done: all schedules and requests cleared. Every available room is vacant.');
