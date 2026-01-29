const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'workflow.db'));

const userId = 1;

const adminSql = `
    SELECT t.id, t.title, t.status, t.created_by, t.urgency
    FROM tasks t
    LEFT JOIN users u ON t.created_by = u.id
    LEFT JOIN task_notifications_read nr ON t.id = nr.task_id AND nr.user_id = ?
    WHERE t.status != 'done'
    AND nr.task_id IS NULL
    AND (t.created_by != ? OR t.urgency = 'high')
    AND (
        t.id = (
            SELECT MIN(id) 
            FROM tasks 
            WHERE COALESCE(parent_id, id) = COALESCE(t.parent_id, t.id)
            AND status != 'done'
        )
    )
    ORDER BY t.urgency = 'high' DESC, t.created_at DESC
`;

db.all(adminSql, [userId, userId], (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log(`--- ADMIN NOTIF QUERY RESULTS ---`);
        console.log(`Count: ${rows.length}`);
        rows.forEach(r => console.log(`- ID: ${r.id}, Title: ${r.title}, Urgency: ${r.urgency}, Creator: ${r.created_by}`));
    }
    db.close();
});
