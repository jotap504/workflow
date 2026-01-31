const express = require('express');
const router = express.Router();
const { db } = require('../firebase');

// Get all clients
router.get('/', async (req, res) => {
    try {
        const snapshot = await db.collection('hub_clients').orderBy('name').get();
        const clients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(clients);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create or update client
router.post('/', async (req, res) => {
    const { id, name, email, phone, contactName, socialMedia, notes } = req.body;

    if (!name || !email) {
        return res.status(400).json({ error: 'Nombre y Email son obligatorios' });
    }

    try {
        const clientData = {
            name,
            email,
            phone: phone || '',
            contactName: contactName || '',
            socialMedia: socialMedia || '',
            notes: notes || '',
            updated_at: new Date().toISOString()
        };

        if (id) {
            await db.collection('hub_clients').doc(id).update(clientData);
        } else {
            clientData.created_at = new Date().toISOString();
            await db.collection('hub_clients').add(clientData);
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete client
router.delete('/:id', async (req, res) => {
    try {
        await db.collection('hub_clients').doc(req.params.id).delete();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
