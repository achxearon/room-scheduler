const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();

app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500'],
    credentials: true
}));
app.use(express.json());
app.use(session({
    secret: 'change-this-secret',
    resave: false,
    saveUninitialized: false
}));

const requireLogin = (req, res, next) =>
req.session.user ? next() : res.status(401).json({ error: 'Login required' });

const requireRole = (role) => (req, res, next) =>
req.session.user?.role === role
? next()
: res.status(403).json({ error: 'Forbidden' });

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const u = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!u || !bcrypt.compareSync(password, u.password_hash))
        return res.status(401).json({ error: 'Invalid credentials' });
    req.session.user = { id: u.id, name: u.name, role: u.role };
    res.json(req.session.user);
});

app.post('/api/logout', (req, res) =>
req.session.destroy(() => res.json({ ok: true })));

app.get('/api/me', requireLogin, (req, res) => res.json(req.session.user));

app.get('/api/rooms', requireLogin, (req, res) =>
res.json(db.prepare('SELECT * FROM rooms').all()));

// ---------- helpers ----------
const timeOk = (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
const isMaintenance = (id) =>
  !!db.prepare("SELECT 1 FROM rooms WHERE id=? AND status='maintenance'").get(id);
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function hasConflict(room_id, day, start, end, excludeId = -1) {
  const s = db.prepare(`
    SELECT 1 FROM schedules
    WHERE room_id=? AND day=? AND start_time < ? AND end_time > ? AND id != ?
  `).get(room_id, day, end, start, excludeId);
  const r = db.prepare(`
    SELECT 1 FROM requests
    WHERE room_id=? AND day=? AND status='approved' AND start_time < ? AND end_time > ?
  `).get(room_id, day, end, start);
  return !!(s || r);
}

function validate(b) {
  const { room_id, subject, day, start_time, end_time } = b;
  if (!room_id || !subject || !DAYS.includes(day)) return 'Invalid room, subject, or day';
  if (!timeOk(start_time) || !timeOk(end_time)) return 'Time must be HH:MM';
  if (start_time >= end_time) return 'End time must be after start time';
  return null;
}

// ---------- schedules ----------
// Everyone logged in: view schedules (optional filters ?day=&room_id=)
app.get('/api/schedules', requireLogin, (req, res) => {
  const { day, room_id } = req.query;
  let sql = `
    SELECT s.*, r.name AS room_name, u.name AS professor_name
    FROM schedules s
    JOIN rooms r ON r.id = s.room_id
    JOIN users u ON u.id = s.professor_id
    WHERE 1=1`;
  const params = [];
  if (day) { sql += ' AND s.day = ?'; params.push(day); }
  if (room_id) { sql += ' AND s.room_id = ?'; params.push(room_id); }
  sql += ' ORDER BY s.day, s.start_time';
  res.json(db.prepare(sql).all(...params));
});

// Professors only: create
app.post('/api/schedules', requireLogin, requireRole('professor'), (req, res) => {
  const err = validate(req.body);
  if (err) return res.status(400).json({ error: err });
  const { room_id, subject, day, start_time, end_time } = req.body;
  if (isMaintenance(room_id))
    return res.status(409).json({ error: 'Room is under maintenance' });
  if (hasConflict(room_id, day, start_time, end_time))
    return res.status(409).json({ error: 'Room is already taken at that time' });
  const info = db.prepare(`
    INSERT INTO schedules (room_id, professor_id, subject, day, start_time, end_time)
    VALUES (?,?,?,?,?,?)
  `).run(room_id, req.session.user.id, subject, day, start_time, end_time);
  res.status(201).json({ id: info.lastInsertRowid });
});

// Professors only: edit own schedule
app.put('/api/schedules/:id', requireLogin, requireRole('professor'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM schedules WHERE id=?').get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (existing.professor_id !== req.session.user.id)
    return res.status(403).json({ error: 'Not your schedule' });
  const err = validate(req.body);
  if (err) return res.status(400).json({ error: err });
  const { room_id, subject, day, start_time, end_time } = req.body;
  if (isMaintenance(room_id))
    return res.status(409).json({ error: 'Room is under maintenance' });
  if (hasConflict(room_id, day, start_time, end_time, id))
    return res.status(409).json({ error: 'Room is already taken at that time' });
  db.prepare(`
    UPDATE schedules SET room_id=?, subject=?, day=?, start_time=?, end_time=? WHERE id=?
  `).run(room_id, subject, day, start_time, end_time, id);
  res.json({ ok: true });
});

// Professors only: delete own schedule
app.delete('/api/schedules/:id', requireLogin, requireRole('professor'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM schedules WHERE id=?').get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (existing.professor_id !== req.session.user.id)
    return res.status(403).json({ error: 'Not your schedule' });
  db.prepare('DELETE FROM schedules WHERE id=?').run(id);
  res.json({ ok: true });
});

// Everyone: find unused rooms (?day=Monday&start=09:00&end=10:00)
app.get('/api/rooms/free', requireLogin, (req, res) => {
  const { day, start, end } = req.query;
  if (!DAYS.includes(day) || !timeOk(start) || !timeOk(end) || start >= end)
    return res.status(400).json({ error: 'Provide valid day, start, end' });
  const rooms = db.prepare('SELECT * FROM rooms').all()
    .filter((r) => r.status !== 'maintenance' && !hasConflict(r.id, day, start, end));
  res.json(rooms);
});
// ---------- requests ----------
// Students: request an unused room
app.post('/api/requests', requireLogin, requireRole('student'), (req, res) => {
  const { room_id, day, start_time, end_time, purpose } = req.body;
  if (!room_id || !DAYS.includes(day) || !purpose)
    return res.status(400).json({ error: 'Room, day, and purpose are required' });
  if (!timeOk(start_time) || !timeOk(end_time) || start_time >= end_time)
    return res.status(400).json({ error: 'Invalid time range' });
  if (!db.prepare('SELECT 1 FROM rooms WHERE id=?').get(room_id))
    return res.status(404).json({ error: 'Room not found' });
  if (isMaintenance(room_id))
    return res.status(409).json({ error: 'Room is under maintenance' });
  if (hasConflict(room_id, day, start_time, end_time))
    return res.status(409).json({ error: 'Room is not free at that time' });
  const info = db.prepare(`
    INSERT INTO requests (student_id, room_id, day, start_time, end_time, purpose)
    VALUES (?,?,?,?,?,?)
  `).run(req.session.user.id, room_id, day, start_time, end_time, purpose);
  res.status(201).json({ id: info.lastInsertRowid, status: 'pending' });
});

// Students: own requests. Professors: all requests (optional ?status=pending)
app.get('/api/requests', requireLogin, (req, res) => {
  const u = req.session.user;
  let sql = `
    SELECT q.*, r.name AS room_name, s.name AS student_name
    FROM requests q
    JOIN rooms r ON r.id = q.room_id
    JOIN users s ON s.id = q.student_id
    WHERE 1=1`;
  const params = [];
  if (u.role === 'student') { sql += ' AND q.student_id = ?'; params.push(u.id); }
  if (req.query.status) { sql += ' AND q.status = ?'; params.push(req.query.status); }
  sql += ' ORDER BY q.id DESC';
  res.json(db.prepare(sql).all(...params));
});

// Students: cancel own pending request
app.delete('/api/requests/:id', requireLogin, requireRole('student'), (req, res) => {
  const id = Number(req.params.id);
  const q = db.prepare('SELECT * FROM requests WHERE id=?').get(id);
  if (!q) return res.status(404).json({ error: 'Not found' });
  if (q.student_id !== req.session.user.id)
    return res.status(403).json({ error: 'Not your request' });
  if (q.status !== 'pending')
    return res.status(400).json({ error: 'Only pending requests can be cancelled' });
  db.prepare('DELETE FROM requests WHERE id=?').run(id);
  res.json({ ok: true });
});

// Professors: approve or reject
function decide(status) {
  return (req, res) => {
    const id = Number(req.params.id);
    const q = db.prepare('SELECT * FROM requests WHERE id=?').get(id);
    if (!q) return res.status(404).json({ error: 'Not found' });
    if (q.status !== 'pending')
      return res.status(400).json({ error: 'Already decided' });
    if (status === 'approved' && hasConflict(q.room_id, q.day, q.start_time, q.end_time))
      return res.status(409).json({ error: 'Room is no longer free at that time' });
    db.prepare('UPDATE requests SET status=?, professor_id=? WHERE id=?')
      .run(status, req.session.user.id, id);
    res.json({ ok: true, status });
  };
}
app.put('/api/requests/:id/approve', requireLogin, requireRole('professor'), decide('approved'));
app.put('/api/requests/:id/reject', requireLogin, requireRole('professor'), decide('rejected'));

app.listen(3000, '0.0.0.0', () => console.log('API on http://localhost:3000'));
