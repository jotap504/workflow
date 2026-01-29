const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'server', 'database.sqlite'));

const userId = 1; // Assuming 1 is the user we are testing with
const userRole = 'admin'; // Testing as admin

const adminSql = `
    SELECT t.*, u.username as creator_name,
           CASE WHEN t.urgency = 'high' THEN 'urgent' ELSE 'new' END as notif_type
    FROM tasks t
    LEFT JOIN users u ON t.created_by = u.id
    LEFT JOIN task_notifications_read nr ON t.id = nr.task_id AND nr.user_id = ?
    WHERE t.status !== 'done'
    AND nr.task_id IS NULL
    AND (t.created_by !== ? OR t.urgency = 'high')
    ORDER BY t.urgency = 'high' DESC, t.created_at DESC
`;

db.all(adminSql, [userId, userId], (err, rows) => {
    if (err) {
        console.error('SQL Error:', err);
    } else {
        console.log('--- ADMIN NOTIFICATIONS (User 1) ---');
        console.log(`Found: ${rows.length}`);
        rows.slice(0, 5).forEach(r => console.log(`- ${r.title} (Urgency: ${r.urgency}, CreatedBy: ${r.created_by})`));
    }

    // Check non-admin sql
    const sql = `
        SELECT t.*, u.username as creator_name,
               CASE WHEN t.urgency = 'high' THEN 'urgent' ELSE 'new' END as notif_type
        FROM tasks t
        LEFT JOIN users u ON t.created_by = u.id
        LEFT JOIN task_notifications_read nr ON t.id = nr.task_id AND nr.user_id = ?
        INNER JOIN user_category_permissions ucp ON t.category_id = ucp.category_id AND ucp.user_id = ?
        WHERE t.status !== 'done'
        AND nr.task_id IS NULL
        AND (t.created_by !== ? OR t.urgency = 'high')
        ORDER BY t.urgency = 'high' DESC, t.created_at DESC
    `;

    db.all(sql, [userId, userId, userId], (err, rows) => {
        if (err) {
            console.error('SQL Error (Non-Admin):', err);
        } else {
            console.log('\n--- NON-ADMIN NOTIFICATIONS (With Permissions Join) ---');
            console.log(`Found: ${rows.length}`);
        }

        db.all('SELECT * FROM user_category_permissions', [], (err, rows) => {
            console.log('\n--- CATEGORY PERMISSIONS ---');
            console.log(JSON.stringify(rows, null, 2));
            db.close();
        });
    });
});
