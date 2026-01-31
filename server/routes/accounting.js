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

// --- ENTITIES (CLIENTS/SUPPLIERS) ---

// Get Entities
router.get('/entities', async (req, res) => {
    try {
        const snapshot = await db.collection('accounting_entities').orderBy('name').get();
        const entities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(entities);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create/Update Entity
router.post('/entities', async (req, res) => {
    const { id, name, type, cuit, email } = req.body;
    try {
        const entityData = { name, type, cuit, email, updated_at: new Date().toISOString() };
        if (id) {
            await db.collection('accounting_entities').doc(id).update(entityData);
        } else {
            entityData.created_at = new Date().toISOString();
            await db.collection('accounting_entities').add(entityData);
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
    const { date, description, items } = req.body; // items: [{accountId, entityId, debit, credit}]

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

// --- BALANCES & REPORTS ---

router.get('/balances', async (req, res) => {
    try {
        const entriesSnapshot = await db.collection('accounting_entries').get();
        const balances = {};
        const entityBalances = {};

        entriesSnapshot.docs.forEach(doc => {
            const entry = doc.data();
            entry.items.forEach(item => {
                // Account Balance
                if (!balances[item.accountId]) balances[item.accountId] = { debit: 0, credit: 0, total: 0 };
                balances[item.accountId].debit += (parseFloat(item.debit) || 0);
                balances[item.accountId].credit += (parseFloat(item.credit) || 0);

                // Entity Balance (Cuentas Corrientes)
                if (item.entityId) {
                    if (!entityBalances[item.entityId]) entityBalances[item.entityId] = { debit: 0, credit: 0, total: 0 };
                    entityBalances[item.entityId].debit += (parseFloat(item.debit) || 0);
                    entityBalances[item.entityId].credit += (parseFloat(item.credit) || 0);
                }
            });
        });

        // Calculate final totals
        Object.keys(balances).forEach(id => {
            balances[id].total = balances[id].debit - balances[id].credit;
        });
        Object.keys(entityBalances).forEach(id => {
            entityBalances[id].total = entityBalances[id].debit - entityBalances[id].credit;
        });

        res.json({ accounts: balances, entities: entityBalances });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
