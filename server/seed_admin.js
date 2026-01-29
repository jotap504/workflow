const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'workflow.db');
const db = new sqlite3.Database(dbPath);

const password = 'admin123';
const hashedPassword = bcrypt.hashSync(password, 8);

db.serialize(() => {
    db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, ['admin', hashedPassword, 'admin'], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                console.log('User admin already exists.');
            } else {
                console.error('Error creating user:', err.message);
            }
        } else {
            console.log('User admin created successfully.');
        }
        db.close();
    });
});
