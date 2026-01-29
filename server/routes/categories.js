const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/auth');

router.use(verifyToken);

// Middleware to ensure user is admin or manager
const canManageCategories = (req, res, next) => {
    if (req.userRole !== 'admin' && req.userRole !== 'manager') {
        return res.status(403).json({ error: 'Access denied. Admins or Managers only.' });
    }
    next();
};

router.get('/', (req, res) => {
    db.all('SELECT * FROM categories ORDER BY name', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Create Category (Admin/Manager)
router.post('/', canManageCategories, (req, res) => {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    db.run('INSERT INTO categories (name, color) VALUES (?, ?)', [name, color], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Category exists' });
            return res.status(500).json({ error: err.message });
        }

        req.app.get('io').emit('tasks_updated'); // Trigger board refresh
        res.json({ id: this.lastID, name, color });
    });
});

// Update Category (Admin/Manager)
router.put('/:id', canManageCategories, (req, res) => {
    const { name, color } = req.body;
    const { id } = req.params;

    if (!name) return res.status(400).json({ error: 'Name is required' });

    db.run('UPDATE categories SET name = ?, color = ? WHERE id = ?', [name, color, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Category not found' });

        req.app.get('io').emit('tasks_updated');
        res.json({ message: 'Category updated successfully' });
    });
});

// Delete Category (Admin/Manager)
router.delete('/:id', canManageCategories, (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM categories WHERE id = ?', [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Category not found' });

        req.app.get('io').emit('tasks_updated');
        res.json({ message: 'Category deleted successfully' });
    });
});

module.exports = router;
