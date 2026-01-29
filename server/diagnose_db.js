const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'workflow.db'));

db.serialize(() => {
    db.all('SELECT id, username, role FROM users', [], (err, u) => {
        if (err) console.error('Users Error:', err);
        else console.log('Users:', JSON.stringify(u, null, 2));
    });

    db.all('SELECT id, title, urgency, category_id, created_by, status FROM tasks WHERE status != "done"', [], (err, t) => {
        if (err) console.error('Tasks Error:', err);
        else console.log('Pending Tasks:', JSON.stringify(t, null, 2));
    });

    db.all('SELECT * FROM user_category_permissions', [], (err, p) => {
        if (err) console.error('Permissions Error:', err);
        else console.log('Permissions:', JSON.stringify(p, null, 2));
    });

    db.all('SELECT * FROM task_notifications_read', [], (err, r) => {
        if (err) console.error('Read Error:', err);
        else console.log('Read Notifs:', JSON.stringify(r, null, 2));
    });
});
db.close();
