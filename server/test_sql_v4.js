const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'workflow.db'));

const userId = 1;

// The exact SQL from Step 686
const sql = `
    SELECT t.id, t.title
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
    ORDER BY (CASE WHEN t.urgency = 'high' THEN 1 ELSE 0 END) DESC, t.created_at DESC
`;

db.all(sql, [userId, userId], (err, rows) => {
    if (err) {
        console.error('SQL ERROR:', err.message);
    } else {
        console.log('SQL SUCCESS. Found:', rows.length);
    }
    db.close();
});
