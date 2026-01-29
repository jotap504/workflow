const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'workflow.db'));

const userId = 2; // Luciana (User) - She has permissions for categories 1, 2, 3
const userRole = 'user';

// The new SQL logic from notifications.js
const sql = `
    SELECT t.id, t.title, t.category_id, ucp.category_id as permission_id
    FROM tasks t
    LEFT JOIN users u ON t.created_by = u.id
    LEFT JOIN task_notifications_read nr ON t.id = nr.task_id AND nr.user_id = ?
    LEFT JOIN user_category_permissions ucp ON t.category_id = ucp.category_id AND ucp.user_id = ?
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

db.all(sql, [userId, userId, userId], (err, rows) => {
    if (err) {
        console.error('SQL Error:', err);
    } else {
        console.log(`--- TEST NOTIFICATIONS for User ${userId} ---`);
        console.log(`Found: ${rows.length} rows`);
        rows.forEach(r => {
            console.log(`- Task: ${r.title} (Category: ${r.category_id}, Permission Match: ${r.permission_id ? 'Yes' : 'No'})`);
        });
    }
    db.close();
});
