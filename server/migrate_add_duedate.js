const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'workflow.db');
const db = new sqlite3.Database(dbPath);

console.log("Adding due_date column...");

db.run("ALTER TABLE tasks ADD COLUMN due_date DATETIME", (err) => {
    if (err) {
        if (err.message.includes("duplicate column")) {
            console.log("Column due_date already exists.");
        } else {
            console.error("Error adding column: " + err.message);
        }
    } else {
        console.log("Column due_date added successfully.");
    }
    db.close();
});
