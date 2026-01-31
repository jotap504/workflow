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
router.get('/users', async (req, res) => {
    if (db.isFirebase) {
        try {
            const snapshot = await db.collection('users').orderBy('username', 'asc').get();
            const users = snapshot.docs.map(doc => ({
                id: doc.id,
                username: doc.data().username,
                role: doc.data().role,
                created_at: doc.data().created_at
            }));
            return res.json(users);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    const sql = 'SELECT id, username, role, created_at FROM users ORDER BY username ASC';
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// GET /api/admin/users/:id/apps - Get user's authorized apps
router.get('/users/:id/apps', async (req, res) => {
    const userId = req.params.id;
    if (db.isFirebase) {
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
            return res.json(userDoc.data().authorized_apps || []);
        } catch (err) { return res.status(500).json({ error: err.message }); }
    }
    res.json(['workflow']); // Fallback for SQLite
});

// PUT /api/admin/users/:id/apps - Update user's authorized apps
router.put('/users/:id/apps', async (req, res) => {
    const userId = req.params.id;
    const { apps } = req.body;

    if (!Array.isArray(apps)) return res.status(400).json({ error: 'Apps must be an array' });

    if (db.isFirebase) {
        try {
            await db.collection('users').doc(userId).update({ authorized_apps: apps });
            return res.json({ message: 'Apps updated successfully' });
        } catch (err) { return res.status(500).json({ error: err.message }); }
    }
    res.json({ message: 'Not implemented for SQLite' });
});

// PUT /api/admin/users/:id - Update user role
router.put('/users/:id', async (req, res) => {
    const { role } = req.body;
    const userId = req.params.id;

    if (!['admin', 'user', 'manager'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }

    if (db.isFirebase) {
        try {
            await db.collection('users').doc(userId).update({ role });
            return res.json({ message: 'User updated successfully' });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    const sql = 'UPDATE users SET role = ? WHERE id = ?';
    db.run(sql, [role, userId], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User updated successfully' });
    });
});

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', async (req, res) => {
    const userId = req.params.id;

    if (userId === req.userId.toString()) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    if (db.isFirebase) {
        const { auth: adminAuth } = require('../firebase');
        try {
            // 1. Delete from Firebase Auth
            await adminAuth.deleteUser(userId).catch(e => console.log('Auth user already deleted or not found'));

            // 2. Delete from Firestore users collection
            await db.collection('users').doc(userId).delete();

            // 3. Delete permissions
            const perms = await db.collection('user_category_permissions').where('user_id', '==', userId).get();
            const batch = db.batch();
            perms.forEach(doc => batch.delete(doc.ref));
            await batch.commit();

            return res.json({ message: 'User deleted successfully' });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    const sql = 'DELETE FROM users WHERE id = ?';
    db.run(sql, [userId], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User deleted successfully' });
    });
});

// PUT /api/admin/users/:id/reset-password - Reset user password
router.put('/users/:id/reset-password', async (req, res) => {
    const { password } = req.body;
    const userId = req.params.id;

    if (!password) {
        return res.status(400).json({ error: 'Password is required' });
    }

    if (db.isFirebase) {
        const { auth: adminAuth } = require('../firebase');
        try {
            await adminAuth.updateUser(userId, { password });
            return res.json({ message: 'Password reset successfully' });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
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
router.get('/users/:id/categories', async (req, res) => {
    const userId = req.params.id;

    if (db.isFirebase) {
        try {
            const snapshot = await db.collection('user_category_permissions').where('user_id', '==', userId).get();
            return res.json(snapshot.docs.map(doc => doc.data().category_id));
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    const sql = 'SELECT category_id FROM user_category_permissions WHERE user_id = ?';
    db.all(sql, [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => r.category_id));
    });
});

// POST /api/admin/users/:id/categories - Update user's permitted categories
router.post('/users/:id/categories', async (req, res) => {
    const userId = req.params.id;
    const { categoryIds } = req.body;

    if (!Array.isArray(categoryIds)) {
        return res.status(400).json({ error: 'categoryIds must be an array' });
    }

    if (db.isFirebase) {
        try {
            // Delete existing
            const existing = await db.collection('user_category_permissions').where('user_id', '==', userId).get();
            const batch = db.batch();
            existing.forEach(doc => batch.delete(doc.ref));

            // Add new
            categoryIds.forEach(catId => {
                const ref = db.collection('user_category_permissions').doc(`${userId}_${catId}`);
                batch.set(ref, { user_id: userId, category_id: catId });
            });

            await batch.commit();
            return res.json({ message: 'Permissions updated successfully' });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
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
