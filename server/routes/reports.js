const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/auth');

router.use(verifyToken);

router.get('/', async (req, res) => {
    if (db.isFirebase) {
        try {
            const tasksSnap = await db.collection('tasks').get();
            const tasks = tasksSnap.docs.map(doc => doc.data());

            const statusStats = {};
            const urgencyStats = {};

            tasks.forEach(t => {
                statusStats[t.status] = (statusStats[t.status] || 0) + 1;
                urgencyStats[t.urgency] = (urgencyStats[t.urgency] || 0) + 1;
            });

            return res.json({
                status: Object.entries(statusStats).map(([status, count]) => ({ status, count })),
                urgency: Object.entries(urgencyStats).map(([urgency, count]) => ({ urgency, count })),
                total: tasks.length
            });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // SQLite/Fallback...
    const statusQuery = `SELECT status, COUNT(*) as count FROM tasks GROUP BY status`;
    const urgencyQuery = `SELECT urgency, COUNT(*) as count FROM tasks GROUP BY urgency`;
    const totalQuery = `SELECT COUNT(*) as count FROM tasks`;

    const runQuery = (query) => {
        return new Promise((resolve, reject) => {
            db.all(query, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    };

    Promise.all([runQuery(statusQuery), runQuery(urgencyQuery), runQuery(totalQuery)])
        .then(([statusData, urgencyData, totalData]) => {
            res.json({
                status: statusData,
                urgency: urgencyData,
                total: totalData[0].count
            });
        })
        .catch(err => res.status(500).json({ error: err.message }));
});

module.exports = router;
