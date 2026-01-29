const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'workflow.db');
const db = new sqlite3.Database(dbPath);

console.log("Adding attachment_url column...");

db.run("ALTER TABLE tasks ADD COLUMN attachment_url TEXT", (err) => {
    if (err) {
        if (err.message.includes("duplicate column")) {
            console.log("Column attachment_url already exists.");
        } else {
            console.error("Error adding column: " + err.message);
        }
    } else {
        console.log("Column attachment_url added successfully.");
    }
    db.close();
});
