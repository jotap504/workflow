const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'workflow.db');
const db = new sqlite3.Database(dbPath);

console.log("Creating votes table...");

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS votes (
    task_id INTEGER,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (task_id, user_id),
    FOREIGN KEY(task_id) REFERENCES tasks(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`, (err) => {
        if (err) {
            console.error("Error creating table: " + err.message);
        } else {
            console.log("Table votes created successfully.");
        }
    });
    db.close();
});
