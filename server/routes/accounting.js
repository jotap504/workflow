const express = require('express');
const router = express.Router();
const { db } = require('../firebase');

// --- PLAN OF ACCOUNTS ---

// Get Plan of Accounts
router.get('/accounts', async (req, res) => {
    try {
        const snapshot = await db.collection('accounting_accounts').orderBy('code').get();
        const accounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create/Update Account
router.post('/accounts', async (req, res) => {
    const { id, code, name, type, parentId } = req.body;
    try {
        const accountData = { code, name, type, parentId };
        if (id) {
            await db.collection('accounting_accounts').doc(id).update(accountData);
        } else {
            await db.collection('accounting_accounts').add(accountData);
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- JOURNAL ENTRIES (ASIENTOS) ---

// Get Entries
router.get('/entries', async (req, res) => {
    try {
        const snapshot = await db.collection('accounting_entries').orderBy('date', 'desc').get();
        const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(entries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create Entry
router.post('/entries', async (req, res) => {
    const { date, description, items } = req.body; // items: [{accountId, debit, credit}]

    // Validation: Double Entry
    const totalDebit = items.reduce((sum, item) => sum + (parseFloat(item.debit) || 0), 0);
    const totalCredit = items.reduce((sum, item) => sum + (parseFloat(item.credit) || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return res.status(400).json({ error: 'El asiento no balancea (Debe != Haber)' });
    }

    try {
        await db.collection('accounting_entries').add({
            date: date || new Date().toISOString(),
            description,
            items,
            created_at: new Date().toISOString()
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
