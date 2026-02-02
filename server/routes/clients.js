const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Apply auth to all client routes
router.use(verifyToken);

// Get all clients
router.get('/', async (req, res) => {
    if (db.isFirebase) {
        try {
            const snapshot = await db.collection('hub_clients').orderBy('name').get();
            const clients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return res.json(clients);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    } else {
        db.all('SELECT * FROM hub_clients ORDER BY name', [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    }
});

// Create or update client
router.post('/', async (req, res) => {
    const { id, name, email, phone, contactName, socialMedia, notes } = req.body;

    if (!name || !email) {
        return res.status(400).json({ error: 'Nombre y Email son obligatorios' });
    }

    const clientDataForFirebase = {
        name,
        email,
        phone: phone || '',
        contactName: contactName || '',
        socialMedia: socialMedia || '',
        notes: notes || '',
        updated_at: new Date().toISOString()
    };

    if (db.isFirebase) {
        try {
            if (id) {
                await db.collection('hub_clients').doc(id).update(clientDataForFirebase);
            } else {
                clientDataForFirebase.created_at = new Date().toISOString();
                await db.collection('hub_clients').add(clientDataForFirebase);
            }
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } else {
        if (id) {
            const sql = `UPDATE hub_clients SET name = ?, email = ?, phone = ?, contactName = ?, socialMedia = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
            db.run(sql, [name, email, phone || '', contactName || '', socialMedia || '', notes || '', id], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true });
            });
        } else {
            const newId = uuidv4();
            const sql = `INSERT INTO hub_clients (id, name, email, phone, contactName, socialMedia, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`;
            db.run(sql, [newId, name, email, phone || '', contactName || '', socialMedia || '', notes || ''], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true, id: newId });
            });
        }
    }
});

// Delete client
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    if (db.isFirebase) {
        try {
            await db.collection('hub_clients').doc(id).delete();
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } else {
        db.run('DELETE FROM hub_clients WHERE id = ?', [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    }
});

module.exports = router;
