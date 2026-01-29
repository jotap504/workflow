const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/auth');

router.use(verifyToken);

router.get('/', (req, res) => {
    const userId = req.userId;
    // We can show stats for ALL tasks? Or just user's? 
    // Usually reports are project-wide. Let's do ALL tasks for now.

    // Using Promise.all for parallel queries
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
