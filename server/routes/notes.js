const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/auth');

router.use(verifyToken);

// GET /api/tasks/:taskId/notes
router.get('/:taskId', (req, res) => {
    const taskId = req.params.taskId;
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
router.post('/:taskId', (req, res) => {
    const taskId = req.params.taskId;
    const { content } = req.body;
    const userId = req.userId;

    if (!content) return res.status(400).json({ error: 'Content is required' });

    const sql = `INSERT INTO task_notes (task_id, user_id, content) VALUES (?, ?, ?)`;
    db.run(sql, [taskId, userId, content], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        req.app.get('io').emit('notes_updated', { taskId });
        res.json({ id: this.lastID, message: 'Note added successfully' });
    });
});

module.exports = router;
