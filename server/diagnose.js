const db = require('./db');

db.all('SELECT id, title, urgency, status, category_id, created_by, parent_id FROM tasks WHERE status != "done" LIMIT 10', [], (err, tasks) => {
    if (err) {
        console.error(err);
    } else {
        console.log('--- TASKS ---');
        tasks.forEach(t => console.log(`ID: ${t.id} | Tit: ${t.title} | Urg: ${t.urgency} | Cat: [${t.category_id}] | Parent: [${t.parent_id}] | By: ${t.created_by}`));
    }

    db.all('SELECT * FROM users', [], (err, users) => {
        console.log('\n--- USERS ---');
        users.forEach(u => console.log(`ID: ${u.id} | User: ${u.username} | Role: ${u.role}`));
        db.close();
    });
});
