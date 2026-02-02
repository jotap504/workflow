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
    const { id, name, type, cuit, email, phone, address, hubClientId } = req.body;
    try {
        const entityData = { 
            name, 
            type, 
            cuit: cuit || '', 
            email: email || '', 
            phone: phone || '', 
            address: address || '',
            hubClientId: hubClientId || null,
            updated_at: new Date().toISOString() 
        };
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

// Get Entity Statement (Resumen de Cuenta)
router.get('/entities/:id/statement', async (req, res) => {
    const { id } = req.params;
    try {
        const snapshot = await db.collection('accounting_entries').get();
        const statement = [];
        let balance = 0;

        // Filter and process entries that involve this entity
        snapshot.docs.forEach(doc => {
            const entry = doc.data();
            const relevantItems = entry.items.filter(item => item.entityId === id);
            
            if (relevantItems.length > 0) {
                const totalDebit = relevantItems.reduce((s, i) => s + (parseFloat(i.debit) || 0), 0);
                const totalCredit = relevantItems.reduce((s, i) => s + (parseFloat(i.credit) || 0), 0);
                const net = totalDebit - totalCredit;
                balance += net;

                statement.push({
                    id: doc.id,
                    date: entry.date,
                    description: entry.description,
                    debit: totalDebit,
                    credit: totalCredit,
                    balance: balance
                });
            }
        });

        // Sort by date
        statement.sort((a, b) => new Date(a.date) - new Date(b.date));

        res.json({
            entityId: id,
            currentBalance: balance,
            items: statement
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// --- COST CENTERS ---

// Get Cost Centers
router.get('/cost-centers', async (req, res) => {
    try {
        const snapshot = await db.collection('accounting_cost_centers').orderBy('name').get();
        const centers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(centers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create/Update Cost Center
router.post('/cost-centers', async (req, res) => {
    const { id, name, description } = req.body;
    try {
        const data = { name, description, updated_at: new Date().toISOString() };
        if (id) {
            await db.collection('accounting_cost_centers').doc(id).update(data);
        } else {
            data.created_at = new Date().toISOString();
            await db.collection('accounting_cost_centers').add(data);
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
    const { date, description, items } = req.body; // items: [{accountId, entityId, costCenterId, debit, credit}]

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

// --- PROFIT & LOSS (P&L) REPORT ---

router.get('/reports/pnl', async (req, res) => {
    try {
        const { year } = req.query;
        const entriesSnapshot = await db.collection('accounting_entries').get();
        const accountsSnapshot = await db.collection('accounting_accounts').get();

        const accountsMap = {};
        accountsSnapshot.docs.forEach(doc => accountsMap[doc.id] = doc.data());

        const months = Array(12).fill(0).map(() => ({ income: 0, expense: 0, profit: 0 }));

        entriesSnapshot.docs.forEach(doc => {
            const entry = doc.data();
            const entryDate = new Date(entry.date);

            // Filter by year if provided
            if (year && entryDate.getFullYear() !== parseInt(year)) return;

            const monthIndex = entryDate.getMonth();

            entry.items.forEach(item => {
                const account = accountsMap[item.accountId];
                if (!account) return;

                const amount = (parseFloat(item.debit) || 0) - (parseFloat(item.credit) || 0);

                if (account.type === 'Ingreso') {
                    // Revenue is normally credit-balanced, but in our double entry we track debit-credit
                    // So for Income: Credit > Debit means positive income.
                    months[monthIndex].income -= amount;
                } else if (account.type === 'Egreso') {
                    // Expense is normally debit-balanced.
                    months[monthIndex].expense += amount;
                }
            });
        });

        months.forEach(m => m.profit = m.income - m.expense);

        res.json(months);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
