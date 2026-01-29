const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'workflow.db');
const db = new sqlite3.Database(dbPath);

console.log("Creating Polls tables...");

db.serialize(() => {
    // Polls Table
    db.run(`CREATE TABLE IF NOT EXISTS polls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    created_by INTEGER,
    status TEXT DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(created_by) REFERENCES users(id)
  )`);

    // Poll Options Table
    db.run(`CREATE TABLE IF NOT EXISTS poll_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_id INTEGER,
    option_text TEXT NOT NULL,
    FOREIGN KEY(poll_id) REFERENCES polls(id)
  )`);

    // Poll Votes Table
    db.run(`CREATE TABLE IF NOT EXISTS poll_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_id INTEGER,
    option_id INTEGER,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(poll_id, user_id),
    FOREIGN KEY(poll_id) REFERENCES polls(id),
    FOREIGN KEY(option_id) REFERENCES poll_options(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

    console.log("Tables created successfully.");
});

db.close();
