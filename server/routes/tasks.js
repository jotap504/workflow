const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/auth');
const upload = require('../middleware/upload');

// Apply middleware to all task routes
router.use(verifyToken);

// GET /api/tasks - List all tasks (Admin sees all, User sees categories)
router.get('/', (req, res) => {
    let innerSql = `
        SELECT t.*, c.name as category_name, c.color as category_color, u.username as creator_name,
        (SELECT COUNT(*) FROM task_notes WHERE task_id = t.id) as note_count
        FROM tasks t
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN users u ON t.created_by = u.id
    `;

    let baseSql = "";
    let params = [];

    if (req.userRole !== 'admin') {
        baseSql = `
            SELECT * FROM (
                ${innerSql}
                INNER JOIN user_category_permissions ucp ON t.category_id = ucp.category_id 
                WHERE ucp.user_id = ?
            ) filtered
        `;
        params.push(req.userId);
    } else {
        baseSql = `SELECT * FROM (${innerSql}) filtered`;
    }

    // Logic to filter recurring: 
    // Group tasks by their series (parent_id or original id if parent)
    // and show only the earliest non-done task per series.
    let sql = `
        SELECT * FROM (${baseSql}) t
        WHERE t.recurrence = 'none'
        OR t.id = (
            SELECT MIN(id) 
            FROM tasks 
            WHERE (COALESCE(parent_id, id) = COALESCE(t.parent_id, t.id))
            AND status != 'done'
        )
        ORDER BY t.created_at DESC
    `;

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST /api/tasks - Create new task
router.post('/', upload.single('attachment'), (req, res) => {
    const { title, description, urgency, category_id, due_date, recurrence } = req.body;
    const attachment_url = req.file ? req.file.filename : null;

    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    // Phase 17: Security Check - Verify category permissions for non-admins
    if (req.userRole !== 'admin' && category_id) {
        const checkSql = 'SELECT 1 FROM user_category_permissions WHERE user_id = ? AND category_id = ?';
        db.get(checkSql, [req.userId, category_id], (err, permission) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!permission) {
                return res.status(403).json({ error: 'No tienes permiso para crear tareas en esta categoría' });
            }
            proceedToCreate();
        });
    } else {
        proceedToCreate();
    }

    function proceedToCreate() {
        const sql = `INSERT INTO tasks (title, description, urgency, category_id, due_date, attachment_url, created_by, recurrence, is_recurring_parent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const isParent = recurrence && recurrence !== 'none' ? 1 : 0;

        db.run(sql, [title, description, urgency || 'medium', category_id, due_date, attachment_url, req.userId, recurrence || 'none', isParent], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            const parentId = this.lastID;

            // Pre-generate tasks for 2 years if recurrence is set
            if (recurrence && recurrence !== 'none') {
                const startDate = due_date ? new Date(due_date) : new Date();
                const limitDate = new Date();
                limitDate.setFullYear(limitDate.getFullYear() + 2);

                let currentDate = new Date(startDate);
                const batchSql = `INSERT INTO tasks (title, description, urgency, category_id, created_by, due_date, recurrence, parent_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`;

                const generateNext = () => {
                    if (recurrence === 'daily') currentDate.setDate(currentDate.getDate() + 1);
                    else if (recurrence === 'weekly') currentDate.setDate(currentDate.getDate() + 7);
                    else if (recurrence === 'monthly') currentDate.setMonth(currentDate.getMonth() + 1);

                    if (currentDate <= limitDate) {
                        db.run(batchSql, [title, description, urgency || 'medium', category_id, req.userId, currentDate.toISOString(), recurrence, parentId], (err) => {
                            if (!err) generateNext();
                        });
                    }
                };
                generateNext();
            }

            req.app.get('io').emit('tasks_updated');
            console.log(`[DEBUG] Emitting new_task: title="${title}", creator="${req.userName || 'Usuario'}"`);
            req.app.get('io').emit('new_task', {
                title: title,
                creator: req.userName || 'Usuario'
            });
            res.json({ id: parentId, message: 'Task created successfully', attachment_url });
        });
    }
});

// PUT /api/tasks/:id - Update task status or details
router.put('/:id', (req, res) => {
    const { title, description, urgency, status, category_id, due_date } = req.body;
    const taskId = req.params.id;

    // Check if we are marking a recurring task as done
    if (status === 'done') {
        db.get('SELECT * FROM tasks WHERE id = ?', [taskId], (err, task) => {
            if (task && task.recurrence && task.recurrence !== 'none') {
                // Calculate next due date
                let nextDue = task.due_date ? new Date(task.due_date) : new Date();
                if (task.recurrence === 'daily') nextDue.setDate(nextDue.getDate() + 1);
                else if (task.recurrence === 'weekly') nextDue.setDate(nextDue.getDate() + 7);
                else if (task.recurrence === 'monthly') nextDue.setMonth(nextDue.getMonth() + 1);

                // Create next occurrence
                const insertSql = `INSERT INTO tasks (title, description, urgency, category_id, created_by, due_date, recurrence, status, parent_id) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`;
                db.run(insertSql, [task.title, task.description, task.urgency, task.category_id, task.created_by, nextDue.toISOString(), task.recurrence, task.parent_id || task.id]);
            }
        });
    }

    const sql = `
    UPDATE tasks 
    SET title = COALESCE(?, title), 
        description = COALESCE(?, description), 
        urgency = COALESCE(?, urgency), 
        status = COALESCE(?, status), 
        category_id = COALESCE(?, category_id),
        due_date = COALESCE(?, due_date)
    WHERE id = ?
  `;

    db.run(sql, [title, description, urgency, status, category_id, due_date, taskId], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Task not found' });

        req.app.get('io').emit('tasks_updated');
        res.json({ message: 'Task updated successfully' });
    });
});

// DELETE /api/tasks/:id - Delete task (Admin only?) -- For now open to authenticated users or check role
router.delete('/:id', (req, res) => {
    // Check role if needed
    if (req.userRole !== 'admin' && req.userRole !== 'manager') {
        // Allow user to delete their own tasks? Logic for another time.
        // returning 403 for strictly enforced roles, but will allow for now for dev speed
    }

    const sql = 'DELETE FROM tasks WHERE id = ?';
    db.run(sql, [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Task not found' });

        req.app.get('io').emit('tasks_updated');
        res.json({ message: 'Task deleted successfully' });
    });
});

module.exports = router;
