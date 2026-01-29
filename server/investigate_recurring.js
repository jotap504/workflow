const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'workflow.db'));

db.all('SELECT id, title, parent_id, recurrence, status FROM tasks WHERE recurrence != "none" ORDER BY parent_id, id', [], (err, rows) => {
    if (err) console.error(err);
    else console.log(JSON.stringify(rows, null, 2));
    db.close();
});
