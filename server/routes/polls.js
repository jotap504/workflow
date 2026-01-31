const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/auth');

router.use(verifyToken);

// GET /api/polls - List all polls with usage stats
router.get('/', async (req, res) => {
    const userId = req.userId;

    if (db.isFirebase) {
        try {
            const pollsSnap = await db.collection('polls').orderBy('created_at', 'desc').get();
            const polls = pollsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const pollsWithData = await Promise.all(polls.map(async p => {
                const [optionsSnap, votesSnap] = await Promise.all([
                    db.collection('poll_options').where('poll_id', '==', p.id).get(),
                    db.collection('poll_votes').where('poll_id', '==', p.id).get()
                ]);

                const votes = votesSnap.docs.map(doc => doc.data());
                const userVote = votes.find(v => v.user_id === userId);

                const options = optionsSnap.docs.map(doc => {
                    const optData = doc.data();
                    return {
                        id: doc.id,
                        ...optData,
                        vote_count: votes.filter(v => v.option_id === doc.id).length
                    };
                });

                return {
                    ...p,
                    user_has_voted: !!userVote,
                    options,
                    total_votes: votesSnap.size
                };
            }));

            return res.json(pollsWithData);
        } catch (err) {
            console.error('[POLLS GET ERROR]', err);
            return res.status(500).json({ error: err.message });
        }
    }

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
router.post('/', async (req, res) => {
    const { question, options } = req.body;

    if (!question || !options || !Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ error: 'Question and at least 2 options are required.' });
    }

    if (db.isFirebase) {
        try {
            const pollRef = await db.collection('polls').add({
                question,
                created_by: req.userId,
                status: 'open',
                created_at: new Date().toISOString()
            });

            const batch = db.batch();
            options.forEach(opt => {
                const optRef = db.collection('poll_options').doc();
                batch.set(optRef, {
                    poll_id: pollRef.id,
                    option_text: opt
                });
            });
            await batch.commit();

            return res.json({ message: 'Poll created', id: pollRef.id });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
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
router.post('/:id/vote', async (req, res) => {
    const pollId = req.params.id;
    const { option_id } = req.body;
    const userId = req.userId;

    if (!option_id) return res.status(400).json({ error: 'Option ID required' });

    if (db.isFirebase) {
        try {
            const pollRef = db.collection('polls').doc(pollId);
            const pollDoc = await pollRef.get();
            if (!pollDoc.exists) return res.status(404).json({ error: 'Poll not found' });
            if (pollDoc.data().status !== 'open') return res.status(400).json({ error: 'Poll is closed' });

            // Use Predictable Document ID to check for existing vote (no query = no composite index)
            const voteRef = db.collection('poll_votes').doc(`${userId}_${pollId}`);
            const voteDoc = await voteRef.get();

            if (voteDoc.exists) return res.status(400).json({ error: 'You have already voted on this poll.' });

            await voteRef.set({
                poll_id: pollId,
                option_id: option_id,
                user_id: userId,
                voted_at: new Date().toISOString()
            });

            return res.json({ message: 'Vote recorded' });
        } catch (err) {
            console.error('[POLL VOTE ERROR]', err);
            return res.status(500).json({ error: err.message });
        }
    }

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
router.put('/:id/close', async (req, res) => {
    const pollId = req.params.id;

    if (db.isFirebase) {
        try {
            const pollRef = db.collection('polls').doc(pollId);
            const pollDoc = await pollRef.get();
            if (!pollDoc.exists) return res.status(404).json({ error: 'Poll not found' });
            if (pollDoc.data().created_by !== req.userId) return res.status(403).json({ error: 'Not authorized' });

            await pollRef.update({ status: 'closed' });
            return res.json({ message: 'Poll closed' });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    db.run('UPDATE polls SET status = "closed" WHERE id = ? AND created_by = ?', [pollId, req.userId], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(403).json({ error: 'Not authorized or Poll not found' });
        res.json({ message: 'Poll closed' });
    });
});

module.exports = router;
