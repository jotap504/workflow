const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/auth');

router.use(verifyToken);

// GET /api/tasks/:taskId/notes
router.get('/:taskId', async (req, res) => {
    const taskId = req.params.taskId;

    if (db.isFirebase) {
        try {
            // Refactored to avoid composite index: fetch by task_id and sort in memory
            const snapshot = await db.collection('task_notes')
                .where('task_id', '==', taskId)
                .get();

            let notes = await Promise.all(snapshot.docs.map(async doc => {
                const data = doc.data();
                // Fetch author name from users collection
                const userDoc = data.user_id ? await db.collection('users').doc(data.user_id).get() : null;
                return {
                    id: doc.id,
                    ...data,
                    author_name: userDoc && userDoc.exists ? userDoc.data().username : 'Desconocido'
                };
            }));

            // Sort in memory by created_at asc
            notes.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));

            return res.json(notes);
        } catch (err) {
            console.error('[NOTES GET ERROR]', err);
            return res.status(500).json({ error: err.message });
        }
    }

    const sql = `
        SELECT tn.*, u.username as author_name
        FROM task_notes tn
        JOIN users u ON tn.user_id = u.id
        WHERE tn.task_id = ?
        ORDER BY tn.created_at ASC
    `;

    db.all(sql, [taskId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST /api/tasks/:taskId/notes
router.post('/:taskId', async (req, res) => {
    const taskId = req.params.taskId;
    const { content } = req.body;
    const userId = req.userId;

    if (!content) return res.status(400).json({ error: 'Content is required' });

    if (db.isFirebase) {
        try {
            const docRef = await db.collection('task_notes').add({
                task_id: taskId,
                user_id: userId,
                content,
                created_at: new Date().toISOString()
            });
            req.app.get('io').emit('notes_updated', { taskId });
            return res.json({ id: docRef.id, message: 'Note added successfully' });
        } catch (err) {
            console.error('[NOTE CREATE ERROR]', err);
            return res.status(500).json({ error: err.message });
        }
    }

    const sql = `INSERT INTO task_notes (task_id, user_id, content) VALUES (?, ?, ?)`;
    db.run(sql, [taskId, userId, content], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        req.app.get('io').emit('notes_updated', { taskId });
        res.json({ id: this.lastID, message: 'Note added successfully' });
    });
});

module.exports = router;
