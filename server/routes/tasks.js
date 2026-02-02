const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/auth');
const upload = require('../middleware/upload');

// Apply middleware to all task routes
router.use(verifyToken);

// GET /api/tasks - List all tasks (Admin sees all, User sees categories)
router.get('/', async (req, res) => {
    if (db.isFirebase) {
        try {
            // 1. Get all tasks
            const showAll = req.query.all === 'true';
            let snapshot = await db.collection('tasks').orderBy('created_at', 'desc').get();
            let tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // 2. Filter by category permissions if not admin
            if (req.userRole !== 'admin') {
                const permissionsSnapshot = await db.collection('user_category_permissions')
                    .where('user_id', '==', req.userId)
                    .get();
                const allowedCategories = permissionsSnapshot.docs.map(doc => doc.data().category_id);
                tasks = tasks.filter(t => allowedCategories.includes(t.category_id));
            }

            // 3. Fetch Category and Creator names (Manual Join)
            const enrichedTasks = await Promise.all(tasks.map(async t => {
                const [catDoc, userDoc, clientDoc, notesSnap] = await Promise.all([
                    (t.category_id && t.category_id !== "") ? db.collection('categories').doc(t.category_id).get() : null,
                    (t.created_by && t.created_by !== "") ? db.collection('users').doc(t.created_by).get() : null,
                    (t.client_id && t.client_id !== "") ? db.collection('hub_clients').doc(t.client_id).get() : null,
                    db.collection('task_notes').where('task_id', '==', t.id).get()
                ]);

                return {
                    ...t,
                    category_name: catDoc && catDoc.exists ? catDoc.data().name : 'Sin Categoría',
                    category_color: catDoc && catDoc.exists ? catDoc.data().color : '#ccc',
                    creator_name: userDoc && userDoc.exists ? userDoc.data().username : 'Desconocido',
                    client_name: clientDoc && clientDoc.exists ? clientDoc.data().name : null,
                    note_count: notesSnap.size
                };
            }));

            // 4. Apply Recurring Logic (mimic SQL)
            // Show only one pending task per series (parent_id) unless showAll is true
            const finalizedTasks = enrichedTasks.filter(t => {
                if (showAll) return true;
                if (t.recurrence === 'none') return true;
                const seriesId = t.parent_id || t.id;
                const series = enrichedTasks.filter(st => (st.parent_id || st.id) === seriesId && st.status !== 'done');
                if (series.length === 0) return t.status === 'done'; // Show done if all are done (though SQL might not do this, let's keep it simple)

                // Show the one with the minimum ID among pending tasks in series
                // In Firestore we don't have integer IDs usually, but we can compare doc references or created_at
                const earliestPending = series.sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))[0];
                return t.id === earliestPending.id;
            });

            return res.json(finalizedTasks.sort((a, b) => b.created_at.localeCompare(a.created_at)));
        } catch (err) {
            console.error('[TASKS GET ERROR]', err);
            return res.status(500).json({ error: err.message });
        }
    } else {
        // SQLite implementation for GET /api/tasks
        let sql = `
            SELECT 
                t.*, 
                c.name AS category_name, 
                c.color AS category_color, 
                u.username AS creator_name,
                cl.name AS client_name,
                (SELECT COUNT(*) FROM task_notes WHERE task_id = t.id) AS note_count
            FROM tasks t
            LEFT JOIN categories c ON t.category_id = c.id
            LEFT JOIN users u ON t.created_by = u.id
            LEFT JOIN hub_clients cl ON t.client_id = cl.id
        `;
        let params = [];

        // Admin sees all, User sees categories they have permission for
        if (req.userRole !== 'admin') {
            sql += `
                INNER JOIN user_category_permissions ucp ON t.category_id = ucp.category_id
                WHERE ucp.user_id = ?
            `;
            params.push(req.userId);
        }

        sql += ` ORDER BY t.created_at DESC`;

        db.all(sql, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });

            // Apply recurring logic for SQLite results
            const finalizedTasks = rows.filter(t => {
                if (t.recurrence === 'none') return true;
                const seriesId = t.parent_id || t.id;
                const series = rows.filter(st => (st.parent_id || st.id) === seriesId && st.status !== 'done');
                if (series.length === 0) return t.status === 'done';

                const earliestPending = series.sort((a, b) => a.id - b.id)[0]; // For SQLite, we can use integer IDs
                return t.id === earliestPending.id;
            });

            res.json(finalizedTasks);
        });
    }
});

// POST /api/tasks - Create new task
router.post('/', upload.single('attachment'), async (req, res) => {
    const { title, description, urgency, category_id, due_date, recurrence, client_id } = req.body;
    const attachment_url = req.file ? req.file.filename : null;

    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    if (db.isFirebase) {
        try {
            // Check permissions - Refactored to fetch all and filter in memory (no composite index needed)
            if (req.userRole !== 'admin' && category_id) {
                const permsSnap = await db.collection('user_category_permissions')
                    .where('user_id', '==', req.userId)
                    .get();
                const allowed = permsSnap.docs.some(doc => doc.data().category_id === category_id);
                if (!allowed) return res.status(403).json({ error: 'No tienes permiso para esta categoría' });
            }

            const isParent = recurrence && recurrence !== 'none' ? 1 : 0;
            const taskData = {
                title, description, urgency: urgency || 'medium',
                category_id, due_date, attachment_url,
                created_by: req.userId, recurrence: recurrence || 'none',
                is_recurring_parent: isParent,
                status: 'pending',
                client_id: (client_id && client_id !== "") ? client_id : null,
                category_id: (category_id && category_id !== "") ? category_id : null,
                created_at: new Date().toISOString()
            };

            const docRef = await db.collection('tasks').add(taskData);
            const parentId = docRef.id;

            // Handle recurring (pre-generate)
            if (recurrence && recurrence !== 'none') {
                const startDate = due_date ? new Date(due_date) : new Date();
                const limitDate = new Date();
                limitDate.setFullYear(limitDate.getFullYear() + 2);

                let currentDate = new Date(startDate);
                let safetyCounter = 0; // Prevent infinite loops
                while (safetyCounter < 750) { // Approx 2 years daily
                    safetyCounter++;
                    if (recurrence === 'daily') currentDate.setDate(currentDate.getDate() + 1);
                    else if (recurrence === 'weekly') currentDate.setDate(currentDate.getDate() + 7);
                    else if (recurrence === 'monthly') currentDate.setMonth(currentDate.getMonth() + 1);

                    if (currentDate > limitDate) break;

                    await db.collection('tasks').add({
                        ...taskData,
                        due_date: currentDate.toISOString(),
                        parent_id: parentId,
                        is_recurring_parent: 0,
                        created_at: new Date().toISOString()
                    });
                }
            }

            const io = req.app.get('io');
            if (io) {
                io.emit('tasks_updated');
                io.emit('new_task', { title, creator: req.userName || 'Usuario' });
            }
            return res.json({ id: parentId, message: 'Task created successfully', attachment_url });
        } catch (err) {
            console.error('[TASK CREATE ERROR]', err);
            return res.status(500).json({ error: err.message });
        }
    }
    else {
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
            const sql = `INSERT INTO tasks (title, description, urgency, category_id, due_date, attachment_url, created_by, recurrence, is_recurring_parent, client_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            const isParent = recurrence && recurrence !== 'none' ? 1 : 0;

            db.run(sql, [title, description, urgency || 'medium', category_id, due_date, attachment_url, req.userId, recurrence || 'none', isParent, client_id || null], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                const parentId = this.lastID;

                // Pre-generate tasks for 2 years if recurrence is set
                if (recurrence && recurrence !== 'none') {
                    const startDate = due_date ? new Date(due_date) : new Date();
                    const limitDate = new Date();
                    limitDate.setFullYear(limitDate.getFullYear() + 2);

                    let currentDate = new Date(startDate);
                    const batchSql = `INSERT INTO tasks (title, description, urgency, category_id, created_by, due_date, recurrence, parent_id, status, client_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`;

                    const generateNext = () => {
                        if (recurrence === 'daily') currentDate.setDate(currentDate.getDate() + 1);
                        else if (recurrence === 'weekly') currentDate.setDate(currentDate.getDate() + 7);
                        else if (recurrence === 'monthly') currentDate.setMonth(currentDate.getMonth() + 1);

                        if (currentDate <= limitDate) {
                            db.run(batchSql, [title, description, urgency || 'medium', category_id, req.userId, currentDate.toISOString(), recurrence, parentId, client_id || null], (err) => {
                                if (!err) generateNext();
                            });
                        }
                    };
                    generateNext();
                }

                const io = req.app.get('io');
                if (io) {
                    io.emit('tasks_updated');
                    io.emit('new_task', { title, creator: req.userName || 'Usuario' });
                }
                res.json({ id: parentId, message: 'Task created successfully', attachment_url });
            });
        }
    }
});

// PUT /api/tasks/:id - Update task status or details
router.put('/:id', async (req, res) => {
    const { title, description, urgency, status, category_id, due_date, client_id } = req.body;
    const taskId = req.params.id;

    if (db.isFirebase) {
        try {
            const taskRef = db.collection('tasks').doc(taskId);
            const taskDoc = await taskRef.get();
            if (!taskDoc.exists) return res.status(404).json({ error: 'Task not found' });
            const task = taskDoc.data();

            // Handle recurring logic when marking done
            if (status === 'done' && task.recurrence && task.recurrence !== 'none') {
                let nextDue = task.due_date ? new Date(task.due_date) : new Date();
                if (task.recurrence === 'daily') nextDue.setDate(nextDue.getDate() + 1);
                else if (task.recurrence === 'weekly') nextDue.setDate(nextDue.getDate() + 7);
                else if (task.recurrence === 'monthly') nextDue.setMonth(nextDue.getMonth() + 1);

                await db.collection('tasks').add({
                    ...task,
                    due_date: nextDue.toISOString(),
                    status: 'pending',
                    parent_id: task.parent_id || taskId,
                    is_recurring_parent: 0,
                    created_at: new Date().toISOString()
                });
            }

            const updates = {};
            if (title !== undefined) updates.title = title;
            if (description !== undefined) updates.description = description;
            if (urgency !== undefined) updates.urgency = urgency;
            if (status !== undefined) updates.status = status;
            if (category_id !== undefined) updates.category_id = category_id;
            if (due_date !== undefined) updates.due_date = due_date;
            if (client_id !== undefined) updates.client_id = client_id;

            await taskRef.update(updates);
            req.app.get('io').emit('tasks_updated');
            return res.json({ message: 'Task updated successfully' });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    } else {
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
                due_date = COALESCE(?, due_date),
                client_id = COALESCE(?, client_id)
            WHERE id = ?
        `;

        db.run(sql, [title, description, urgency, status, category_id, due_date, client_id, taskId], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Task not found' });

            req.app.get('io').emit('tasks_updated');
            res.json({ message: 'Task updated successfully' });
        });
    }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', async (req, res) => {
    const taskId = req.params.id;

    if (db.isFirebase) {
        try {
            await db.collection('tasks').doc(taskId).delete();
            req.app.get('io').emit('tasks_updated');
            return res.json({ message: 'Task deleted successfully' });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    } else {
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
    }
});

module.exports = router;
