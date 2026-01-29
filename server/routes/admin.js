const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const verifyToken = require('../middleware/auth');

// Middleware to ensure user is admin
const isAdmin = (req, res, next) => {
    if (req.userRole !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admins only.' });
    }
    next();
};

router.use(verifyToken);
router.use(isAdmin);

// GET /api/admin/users - List all users
router.get('/users', (req, res) => {
    const sql = 'SELECT id, username, role, created_at FROM users ORDER BY username ASC';
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// PUT /api/admin/users/:id - Update user role
router.put('/users/:id', (req, res) => {
    const { role } = req.body;
    const userId = req.params.id;

    if (!['admin', 'user', 'manager'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }

    const sql = 'UPDATE users SET role = ? WHERE id = ?';
    db.run(sql, [role, userId], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User updated successfully' });
    });
});

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', (req, res) => {
    const userId = req.params.id;

    // Prevent deleting self? Optional but good.
    if (parseInt(userId) === req.userId) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const sql = 'DELETE FROM users WHERE id = ?';
    db.run(sql, [userId], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User deleted successfully' });
    });
});

// PUT /api/admin/users/:id/reset-password - Reset user password
router.put('/users/:id/reset-password', (req, res) => {
    const { password } = req.body;
    const userId = req.params.id;

    if (!password) {
        return res.status(400).json({ error: 'Password is required' });
    }

    const hashedPassword = bcrypt.hashSync(password, 8);
    const sql = 'UPDATE users SET password = ? WHERE id = ?';

    db.run(sql, [hashedPassword, userId], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'Password reset successfully' });
    });
});

// GET /api/admin/users/:id/categories - Get user's permitted categories
router.get('/users/:id/categories', (req, res) => {
    const userId = req.params.id;
    const sql = 'SELECT category_id FROM user_category_permissions WHERE user_id = ?';
    db.all(sql, [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => r.category_id));
    });
});

// POST /api/admin/users/:id/categories - Update user's permitted categories
router.post('/users/:id/categories', (req, res) => {
    const userId = req.params.id;
    const { categoryIds } = req.body; // Expecting an array [1, 2, 3]

    if (!Array.isArray(categoryIds)) {
        return res.status(400).json({ error: 'categoryIds must be an array' });
    }

    db.serialize(() => {
        db.run('DELETE FROM user_category_permissions WHERE user_id = ?', [userId], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            if (categoryIds.length === 0) {
                return res.json({ message: 'Permissions cleared' });
            }

            const stmt = db.prepare('INSERT INTO user_category_permissions (user_id, category_id) VALUES (?, ?)');
            categoryIds.forEach(catId => {
                stmt.run(userId, catId);
            });
            stmt.finalize((err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Permissions updated successfully' });
            });
        });
    });
});

module.exports = router;
