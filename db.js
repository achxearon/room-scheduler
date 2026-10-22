const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const db = new Database('data.db');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('professor','student'))
);
CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    building TEXT,
    capacity INTEGER
);
CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES rooms(id),
                                      professor_id INTEGER NOT NULL REFERENCES users(id),
                                      subject TEXT NOT NULL,
                                      day TEXT NOT NULL,
                                      start_time TEXT NOT NULL,
                                      end_time TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES users(id),
                                     room_id INTEGER NOT NULL REFERENCES rooms(id),
                                     day TEXT NOT NULL,
                                     start_time TEXT NOT NULL,
                                     end_time TEXT NOT NULL,
                                     purpose TEXT,
                                     status TEXT NOT NULL DEFAULT 'pending'
                                     CHECK (status IN ('pending','approved','rejected')),
                                     professor_id INTEGER REFERENCES users(id)
);
`);

if (!db.prepare('SELECT COUNT(*) c FROM users').get().c) {
    const add = db.prepare(
        'INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)'
    );
    add.run('Prof Demo', 'prof@demo.com', bcrypt.hashSync('prof123', 10), 'professor');
    add.run('Student Demo', 'student@demo.com', bcrypt.hashSync('stud123', 10), 'student');
}

// Default rooms (only added when the rooms table is empty)
if (!db.prepare('SELECT COUNT(*) c FROM rooms').get().c) {
    const F1 = 'Alvarado Hall, 1st Floor';
    const F2 = 'Alvarado Hall, 2nd Floor';
    const room = db.prepare('INSERT INTO rooms (name,building,capacity) VALUES (?,?,?)');
    [
        ['Room 1', F1], ['Room 2', F1], ['Room 3', F1], ['Room 4', F1], ['Room 5', F1], ['Room 6', F1],
        ['NB1A', F1], ['NB2A', F1],
        ['Room 204', F2], ['Room 205', F2], ['NB2B', F2],
        ['CPE Lab', F2], ['BSIT Lab', F2], ['AVR', F2], ['BIT Lab', F2]
    ].forEach(([name, building]) => room.run(name, building, null));
}

// Rooms can be marked 'maintenance'. Add the column to older databases.
if (!db.prepare('PRAGMA table_info(rooms)').all().some((c) => c.name === 'status')) {
    db.exec("ALTER TABLE rooms ADD COLUMN status TEXT NOT NULL DEFAULT 'available'");
}
// AVR stays out of service (applied on every start)
db.prepare("UPDATE rooms SET status = 'maintenance' WHERE name = 'AVR'").run();

module.exports = db;
