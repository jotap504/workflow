const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/auth');

router.use(verifyToken);

// GET /api/notifications - Get smart notifications
router.get('/', async (req, res) => {
    if (db.isFirebase) {
        try {
            // 1. Get all pending tasks
            const tasksSnap = await db.collection('tasks').where('status', '!=', 'done').get();
            let tasks = tasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // 2. Get read notifications for this user
            const readSnap = await db.collection('task_notifications_read').where('user_id', '==', req.userId).get();
            const readTaskIds = readSnap.docs.map(doc => doc.data().task_id);

            // 3. Filter out read tasks
            tasks = tasks.filter(t => !readTaskIds.includes(t.id));

            // 4. Filter by creator (unless high urgency)
            tasks = tasks.filter(t => t.created_by !== req.userId || t.urgency === 'high');

            // 5. Filter by permissions if not admin/manager
            const isPrivileged = req.userRole === 'admin' || req.userRole === 'manager';
            if (!isPrivileged) {
                const permissionsSnapshot = await db.collection('user_category_permissions')
                    .where('user_id', '==', req.userId)
                    .get();
                const allowedCategories = permissionsSnapshot.docs.map(doc => doc.data().category_id);
                tasks = tasks.filter(t => !t.category_id || allowedCategories.includes(t.category_id));
            }

            // 6. Apply Recurring Logic (Show only the NEXT occurrence per series)
            tasks = tasks.filter(t => {
                if (t.recurrence === 'none' || !t.recurrence) return true;
                const seriesId = t.parent_id || t.id;
                const series = tasks.filter(st => (st.parent_id || st.id) === seriesId);
                const earliestPending = series.sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))[0];
                return t.id === earliestPending.id;
            });

            // 7. Enriched with creator name and notif_type
            const todayStr = new Date().toISOString().split('T')[0];
            const enriched = await Promise.all(tasks.map(async t => {
                const userDoc = t.created_by ? await db.collection('users').doc(t.created_by).get() : null;
                const isDueToday = t.due_date && t.due_date.startsWith(todayStr);
                const isOverdue = t.due_date && t.due_date < new Date().toISOString() && !isDueToday;

                return {
                    ...t,
                    creator_name: userDoc && userDoc.exists ? userDoc.data().username : 'Desconocido',
                    notif_type: (t.urgency === 'high' || isDueToday || isOverdue) ? 'urgent' : 'new'
                };
            }));

            // Sort: Urgent/Due Today first, then by date
            enriched.sort((a, b) => {
                const aUrgent = a.notif_type === 'urgent';
                const bUrgent = b.notif_type === 'urgent';
                if (aUrgent && !bUrgent) return -1;
                if (!aUrgent && bUrgent) return 1;
                return (a.due_date || '').localeCompare(b.due_date || '');
            });

            return res.json(enriched);
        } catch (err) {
            console.error('[NOTIFICATIONS GET ERROR]', err);
            return res.status(500).json({ error: err.message });
        }
    } else {
        // SQL fallback... (already in the file but I need to close the brace above)
        try {
            const isPrivileged = req.userRole === 'admin' || req.userRole === 'manager';
            const sql = isPrivileged ? `
             SELECT t.*, u.username as creator_name,
                    CASE WHEN t.urgency = 'high' THEN 'urgent' ELSE 'new' END as notif_type
             FROM tasks t
             LEFT JOIN users u ON t.created_by = u.id
             LEFT JOIN task_notifications_read nr ON t.id = nr.task_id AND nr.user_id = ?
             WHERE t.status != 'done'
             AND nr.task_id IS NULL
             AND (t.created_by != ? OR t.urgency = 'high')
             ORDER BY (CASE WHEN t.urgency = 'high' THEN 1 ELSE 0 END) DESC, t.created_at DESC
         ` : `
             SELECT t.*, u.username as creator_name,
                    CASE WHEN t.urgency = 'high' THEN 'urgent' ELSE 'new' END as notif_type
             FROM tasks t
             LEFT JOIN users u ON t.created_by = u.id
             LEFT JOIN task_notifications_read nr ON t.id = nr.task_id AND nr.user_id = ?
             LEFT JOIN user_category_permissions ucp ON t.category_id = ucp.category_id AND ucp.user_id = ?
             WHERE t.status != 'done'
             AND nr.task_id IS NULL
             AND (t.created_by != ? OR t.urgency = 'high')
             AND (t.category_id IS NULL OR ucp.category_id IS NOT NULL)
             ORDER BY (CASE WHEN t.urgency = 'high' THEN 1 ELSE 0 END) DESC, t.created_at DESC
         `;
            const params = isPrivileged ? [req.userId, req.userId] : [req.userId, req.userId, req.userId];
            db.all(sql, params, (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json(rows || []);
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }
});

// GET /api/notifications/debug-info - Emergency diagnostic endpoint
router.get('/debug-info', async (req, res) => {
    try {
        const info = {
            userId: req.userId,
            userName: req.userName,
            userRole: req.userRole,
            timestamp: new Date().toISOString()
        };

        if (db.isFirebase) {
            const snap = await db.collection('tasks').where('status', '!=', 'done').get();
            info.totalPendingTasks = snap.size;
        } else {
            const row = await new Promise((resolve, reject) => {
                db.get('SELECT COUNT(*) as count FROM tasks WHERE status != "done"', [], (err, row) => {
                    if (err) reject(err); else resolve(row);
                });
            });
            info.totalPendingTasks = row ? row.count : 0;
        }
        res.json(info);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// POST /api/notifications/read - Mark a notification as read
router.post('/read', async (req, res) => {
    try {
        const { taskId } = req.body;
        if (!taskId) return res.status(400).json({ error: 'taskId required' });

        if (db.isFirebase) {
            // Use Predictable Document ID (no query = no composite index needed)
            const readRef = db.collection('task_notifications_read').doc(`${req.userId}_${taskId}`);
            const readDoc = await readRef.get();

            if (!readDoc.exists) {
                await readRef.set({
                    user_id: req.userId,
                    task_id: taskId,
                    read_at: new Date().toISOString()
                });
            }
            return res.json({ message: 'Marked as read' });
        }

        const sql = 'INSERT OR IGNORE INTO task_notifications_read (user_id, task_id) VALUES (?, ?)';
        db.run(sql, [req.userId, taskId], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Marked as read' });
        });
    } catch (error) {
        console.error('[NOTIF READ ERROR]', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/notifications/read-all - Mark all current as read
router.post('/read-all', async (req, res) => {
    try {
        if (db.isFirebase) {
            // Get all visible pending tasks that aren't read yet
            // (Reusing logic from GET route but bulk adding)
            const tasksSnap = await db.collection('tasks').where('status', '!=', 'done').get();
            let tasks = tasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Filter by creator (standard logic: can't read-all own notifications unless urgent, 
            // but usually read-all is for the list user sees)
            tasks = tasks.filter(t => t.created_by !== req.userId);

            const batch = db.batch();
            for (const t of tasks) {
                const readRef = db.collection('task_notifications_read').doc(`${req.userId}_${t.id}`);
                batch.set(readRef, {
                    user_id: req.userId,
                    task_id: t.id,
                    read_at: new Date().toISOString()
                });
            }
            await batch.commit();
            return res.json({ message: 'All marked as read' });
        }

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
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
