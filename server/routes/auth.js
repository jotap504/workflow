const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Register User (Admin only technically, but open for now for dev)
router.post('/register', (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    const hashedPassword = bcrypt.hashSync(password, 8);
    const userRole = role || 'user';

    const sql = `INSERT INTO users (username, password, role) VALUES (?, ?, ?)`;

    db.run(sql, [username, hashedPassword, userRole], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'Username already exists' });
            }
            return res.status(500).json({ error: err.message });
        }

        res.status(201).json({
            message: 'User created successfully',
            userId: this.lastID
        });
    });
});

// Login
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    const sql = `SELECT * FROM users WHERE username = ?`;

    db.get(sql, [username], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const passwordIsValid = bcrypt.compareSync(password, user.password);

        if (!passwordIsValid) {
            return res.status(401).json({ auth: false, token: null, error: 'Invalid Password' });
        }

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, {
            expiresIn: 86400 // 24 hours
        });

        res.status(200).json({ auth: true, token: token, user: { id: user.id, username: user.username, role: user.role } });
    });
});

const verifyToken = require('../middleware/auth');

// Change Password (Self)
router.put('/profile/password', verifyToken, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.userId;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new password are required' });
    }

    const sql = `SELECT password FROM users WHERE id = ?`;
    db.get(sql, [userId], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const passwordIsValid = bcrypt.compareSync(currentPassword, user.password);
        if (!passwordIsValid) {
            return res.status(401).json({ error: 'Incorrect current password' });
        }

        const hashedNewPassword = bcrypt.hashSync(newPassword, 8);
        const updateSql = `UPDATE users SET password = ? WHERE id = ?`;
        db.run(updateSql, [hashedNewPassword, userId], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Password updated successfully' });
        });
    });
});

module.exports = router;
