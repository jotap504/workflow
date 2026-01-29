const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/auth');

router.use(verifyToken);

// GET /api/notifications - Get smart notifications
router.get('/', (req, res) => {
    try {
        console.log(`[DEBUG] Notification Request: UserID=${req.userId}, Role=${req.userRole}`);

        // Standardized Non-Admin SQL
        const sql = `
            SELECT t.*, u.username as creator_name,
                   CASE WHEN t.urgency = 'high' THEN 'urgent' ELSE 'new' END as notif_type
            FROM tasks t
            LEFT JOIN users u ON t.created_by = u.id
            LEFT JOIN task_notifications_read nr ON t.id = nr.task_id AND nr.user_id = ?
            LEFT JOIN user_category_permissions ucp ON t.category_id = ucp.category_id AND ucp.user_id = ?
            WHERE t.status != 'done'
            AND nr.task_id IS NULL
            AND (t.created_by != ? OR t.urgency = 'high')
            AND (
                t.category_id IS NULL 
                OR t.category_id = '' 
                OR ucp.category_id IS NOT NULL
            )
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

        // Standardized Admin SQL
        const adminSql = `
            SELECT t.*, u.username as creator_name,
                   CASE WHEN t.urgency = 'high' THEN 'urgent' ELSE 'new' END as notif_type
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

        const isPrivileged = req.userRole === 'admin' || req.userRole === 'manager';
        const finalSql = isPrivileged ? adminSql : sql;
        const params = isPrivileged ? [req.userId, req.userId] : [req.userId, req.userId, req.userId];

        db.all(finalSql, params, (err, rows) => {
            if (err) {
                console.error('[DATABASE ERROR] Notification SQL:', err.message);
                return res.status(500).json({ error: err.message });
            }
            console.log(`[DEBUG] Notifications query success: ${rows ? rows.length : 0} rows found`);
            res.json(rows || []);
        });
    } catch (error) {
        console.error('[CRITICAL] Error in GET /api/notifications:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// GET /api/notifications/debug-info - Emergency diagnostic endpoint
router.get('/debug-info', (req, res) => {
    try {
        console.log('[DEBUG] debug-info endpoint hit');
        const info = {
            userId: req.userId,
            userName: req.userName,
            userRole: req.userRole,
            timestamp: new Date().toISOString()
        };

        db.get('SELECT COUNT(*) as count FROM tasks WHERE status != "done"', [], (err, row) => {
            if (err) {
                console.error('[DATABASE ERROR] debug-info tasks count:', err.message);
                info.error = err.message;
            } else {
                info.totalPendingTasks = row ? row.count : 0;
            }
            res.json(info);
        });
    } catch (error) {
        console.error('[CRITICAL] Error in /debug-info:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// POST /api/notifications/read - Mark a notification as read
router.post('/read', (req, res) => {
    try {
        const { taskId } = req.body;
        if (!taskId) return res.status(400).json({ error: 'taskId required' });

        console.log(`[DEBUG] Marking Task Read: UserID=${req.userId}, TaskID=${taskId}`);
        const sql = 'INSERT OR IGNORE INTO task_notifications_read (user_id, task_id) VALUES (?, ?)';
        db.run(sql, [req.userId, taskId], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Marked as read' });
        });
    } catch (error) {
        console.error('[CRITICAL] Error in /read:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/notifications/read-all - Mark all current as read
router.post('/read-all', (req, res) => {
    try {
        console.log(`[DEBUG] Mark All Read Request: UserID=${req.userId}`);
        const sql = req.userRole === 'admin' ? `
            INSERT OR IGNORE INTO task_notifications_read (user_id, task_id)
            SELECT ?, id FROM tasks WHERE status != 'done' AND created_by != ?
        ` : `
            INSERT OR IGNORE INTO task_notifications_read (user_id, task_id)
            SELECT ?, t.id FROM tasks t
            INNER JOIN user_category_permissions ucp ON t.category_id = ucp.category_id AND ucp.user_id = ?
            WHERE t.status != 'done' AND t.created_by != ?
        `;

        const params = req.userRole === 'admin' ? [req.userId, req.userId] : [req.userId, req.userId, req.userId];

        db.run(sql, params, function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'All marked as read' });
        });
    } catch (error) {
        console.error('[CRITICAL] Error in /read-all:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
