const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/auth');

router.use(verifyToken);

// GET /api/polls - List all polls with usage stats
router.get('/', (req, res) => {
    const userId = req.userId;

    // We need to fetch polls, their options, and vote counts.
    // This can be complex in one query. Let's do it in steps or a smart join. 
    // Or fetch all polls, then for each poll fetch options and votes.
    // For simplicity/speed in SQLite: Fetch Polls -> Fetch Options+Counts -> Merge.

    const pollsSql = `
        SELECT p.*, u.username as creator_name,
        (SELECT COUNT(*) FROM poll_votes pv WHERE pv.poll_id = p.id AND pv.user_id = ?) as user_has_voted
        FROM polls p
        LEFT JOIN users u ON p.created_by = u.id
        ORDER BY p.created_at DESC
    `;

    db.all(pollsSql, [userId], (err, polls) => {
        if (err) return res.status(500).json({ error: err.message });
        if (polls.length === 0) return res.json([]);

        // Get Options and Vote Counts for these polls
        const placeholders = polls.map(() => '?').join(',');
        const pollIds = polls.map(p => p.id);

        const optionsSql = `
            SELECT po.id, po.poll_id, po.option_text,
                   (SELECT COUNT(*) FROM poll_votes pv WHERE pv.option_id = po.id) as vote_count
            FROM poll_options po
            WHERE po.poll_id IN (${placeholders})
        `;

        db.all(optionsSql, pollIds, (err, options) => {
            if (err) return res.status(500).json({ error: err.message });

            // Attach options to polls
            const pollsWithData = polls.map(p => ({
                ...p,
                options: options.filter(o => o.poll_id === p.id),
                total_votes: options.filter(o => o.poll_id === p.id).reduce((sum, o) => sum + o.vote_count, 0)
            }));

            res.json(pollsWithData);
        });
    });
});

// POST /api/polls - Create Poll
router.post('/', (req, res) => {
    const { question, options } = req.body;

    if (!question || !options || !Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ error: 'Question and at least 2 options are required.' });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        db.run('INSERT INTO polls (question, created_by) VALUES (?, ?)', [question, req.userId], function (err) {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
            }

            const pollId = this.lastID;
            const stmt = db.prepare('INSERT INTO poll_options (poll_id, option_text) VALUES (?, ?)');

            options.forEach(opt => {
                stmt.run(pollId, opt);
            });

            stmt.finalize(err => {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                }
                db.run('COMMIT');
                res.json({ message: 'Poll created', id: pollId });
            });
        });
    });
});

// POST /api/polls/:id/vote - Vote
router.post('/:id/vote', (req, res) => {
    const pollId = req.params.id;
    const { option_id } = req.body;
    const userId = req.userId;

    if (!option_id) return res.status(400).json({ error: 'Option ID required' });

    // Check if poll is open
    db.get('SELECT status FROM polls WHERE id = ?', [pollId], (err, poll) => {
        if (err || !poll) return res.status(404).json({ error: 'Poll not found' });
        if (poll.status !== 'open') return res.status(400).json({ error: 'Poll is closed' });

        const sql = 'INSERT INTO poll_votes (poll_id, option_id, user_id) VALUES (?, ?, ?)';
        db.run(sql, [pollId, option_id, userId], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'You have already voted on this poll.' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Vote recorded' });
        });
    });
});

// PUT /api/polls/:id/close - Close Poll
router.put('/:id/close', (req, res) => {
    const pollId = req.params.id;
    db.run('UPDATE polls SET status = "closed" WHERE id = ? AND created_by = ?', [pollId, req.userId], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(403).json({ error: 'Not authorized or Poll not found' });
        res.json({ message: 'Poll closed' });
    });
});

module.exports = router;
