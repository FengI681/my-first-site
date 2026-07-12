const path = require('path');
const fs = require('fs');
const express = require('express');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'guestbook.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const NAME_MAX = 30;
const MESSAGE_MAX = 200;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/messages', (req, res) => {
  const rows = db
    .prepare('SELECT id, name, message, created_at FROM messages ORDER BY id DESC LIMIT 200')
    .all();
  res.json(rows);
});

app.post('/api/messages', (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';

  if (!name || !message) {
    return res.status(400).json({ error: '請輸入名字和留言內容' });
  }
  if (name.length > NAME_MAX || message.length > MESSAGE_MAX) {
    return res.status(400).json({ error: `名字最多 ${NAME_MAX} 字，留言最多 ${MESSAGE_MAX} 字` });
  }

  const result = db
    .prepare('INSERT INTO messages (name, message) VALUES (?, ?)')
    .run(name, message);
  const row = db
    .prepare('SELECT id, name, message, created_at FROM messages WHERE id = ?')
    .get(result.lastInsertRowid);

  res.status(201).json(row);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

