const express = require('express');
const router = express.Router();
const db = require('../db');
const { admin } = require('../firebase');
const verifyToken = require('../middleware/auth');

// POST: Process checkout (Simulated for now, would integrate Mercado Pago)
// POST: Process checkout
router.post('/checkout', verifyToken, async (req, res) => {
    const { items, total_amount, customer_email, customer_name } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ error: 'El carrito está vacío' });

    if (db.isFirebase) {
        try {
            const result = await db.runTransaction(async (transaction) => {
                const productRefs = items.map(item => db.collection('products').doc(item.id));
                const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

                // 1. Validate Stock
                for (let i = 0; i < productDocs.length; i++) {
                    const doc = productDocs[i];
                    const item = items[i];
                    if (!doc.exists) throw new Error(`Producto ${item.name} no encontrado`);
                    const pData = doc.data();
                    if (pData.type === 'physical' && pData.stock < item.quantity) {
                        throw new Error(`Stock insuficiente para ${item.name}`);
                    }
                }

                // 2. Create Order
                const orderRef = db.collection('orders').doc();
                const orderData = {
                    user_id: req.userId,
                    customer_email,
                    customer_name,
                    total_amount,
                    status: 'paid',
                    items: items, // Simplified for Firestore: store items inside order doc
                    created_at: new Date().toISOString()
                };
                transaction.set(orderRef, orderData);

                // 3. Deduct Stock and Grant Access
                for (let i = 0; i < productDocs.length; i++) {
                    const doc = productDocs[i];
                    const item = items[i];
                    const pData = doc.data();

                    if (pData.type === 'physical') {
                        transaction.update(productRefs[i], { stock: pData.stock - item.quantity });
                    }

                    if (pData.type === 'course' || pData.type === 'virtual') {
                        const accessRef = db.collection('product_access').doc(`${req.userId}_${item.id}`);
                        transaction.set(accessRef, {
                            user_id: req.userId,
                            product_id: item.id,
                            access_granted_at: new Date().toISOString()
                        });
                    }
                }
                return { orderId: orderRef.id };
            });
            return res.status(201).json({ orderId: result.orderId, message: 'Pedido procesado con éxito' });
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }

    db.serialize(() => {
        // SQLite implementation (keep existing)
        let stockError = null;
        const checkStock = (index) => {
            if (index >= items.length) {
                if (stockError) return res.status(400).json({ error: stockError });
                proceedWithOrder();
                return;
            }
            const item = items[index];
            db.get('SELECT stock, type FROM products WHERE id = ?', [item.id], (err, row) => {
                if (err) {
                    stockError = err.message;
                    checkStock(items.length);
                } else if (!row) {
                    stockError = `Producto ${item.id} no encontrado`;
                    checkStock(items.length);
                } else if (row.type === 'physical' && row.stock < item.quantity) {
                    stockError = `Stock insuficiente para ${item.name}`;
                    checkStock(items.length);
                } else {
                    checkStock(index + 1);
                }
            });
        };

        const proceedWithOrder = () => {
            db.run(`INSERT INTO orders (user_id, customer_email, customer_name, total_amount, status) VALUES (?, ?, ?, ?, 'paid')`,
                [req.userId, customer_email, customer_name, total_amount], function (err) {
                    if (err) return res.status(500).json({ error: err.message });
                    const orderId = this.lastID;
                    items.forEach(item => {
                        db.run('INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)', [orderId, item.id, item.quantity, item.price]);
                        db.run('UPDATE products SET stock = stock - ? WHERE id = ? AND type = "physical"', [item.quantity, item.id]);
                        if (item.type === 'course' || item.type === 'virtual') {
                            db.run('INSERT OR IGNORE INTO product_access (user_id, product_id) VALUES (?, ?)', [req.userId, item.id]);
                        }
                    });
                    res.status(201).json({ orderId, message: 'Pedido procesado con éxito' });
                });
        };
        checkStock(0);
    });
});

// GET: Check product access
router.get('/access/:productId', verifyToken, async (req, res) => {
    if (db.isFirebase) {
        try {
            const doc = await db.collection('product_access').doc(`${req.userId}_${req.params.productId}`).get();
            return res.json({ hasAccess: doc.exists });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }
    const query = 'SELECT * FROM product_access WHERE user_id = ? AND product_id = ?';
    db.get(query, [req.userId, req.params.productId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ hasAccess: !!row });
    });
});

// GET: User's owned digital products
router.get('/my-content', verifyToken, async (req, res) => {
    if (db.isFirebase) {
        try {
            const snapshot = await db.collection('product_access').where('user_id', '==', req.userId).get();
            const productIds = snapshot.docs.map(doc => doc.data().product_id);
            if (productIds.length === 0) return res.json([]);

            const productsSnap = await db.collection('products').where(admin.firestore.FieldPath.documentId(), 'in', productIds).get();
            return res.json(productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }
    const query = `SELECT p.* FROM products p JOIN product_access pa ON p.id = pa.product_id WHERE pa.user_id = ?`;
    db.all(query, [req.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// GET: User's order history
router.get('/my-orders', verifyToken, async (req, res) => {
    if (db.isFirebase) {
        try {
            const snapshot = await db.collection('orders').where('user_id', '==', req.userId).orderBy('created_at', 'desc').get();
            return res.json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), item_count: doc.data().items?.length || 0 })));
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }
    const query = `
        SELECT o.*, (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count 
        FROM orders o 
        WHERE o.user_id = ? 
        ORDER BY o.created_at DESC
    `;
    db.all(query, [req.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// --- Shop Settings ---

// GET: Storefront settings (Public)
router.get('/settings', (req, res) => {
    if (db.isFirebase) {
        db.collection('shop_settings').doc('default').get()
            .then(doc => {
                if (!doc.exists) return res.json({});
                res.json(doc.data());
            })
            .catch(err => res.status(500).json({ error: err.message }));
        return;
    }
    db.get('SELECT * FROM shop_settings ORDER BY id DESC LIMIT 1', [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row && row.sections_config) {
            try {
                row.sections_config = JSON.parse(row.sections_config);
            } catch (e) { }
        }
        res.json(row || {});
    });
});

// PUT: Update shop settings (Admin only)
router.put('/settings', verifyToken, (req, res) => {
    if (req.userRole !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const {
        shop_name, logo_url, banner_url, footer_text,
        contact_email, contact_phone, address,
        social_instagram, social_facebook, social_whatsapp,
        sections_config, about_content, stories_content, purchase_process_content
    } = req.body;

    const sectionsStr = typeof sections_config === 'string' ? sections_config : JSON.stringify(sections_config);

    if (db.isFirebase) {
        db.collection('shop_settings').doc('default').set({
            shop_name, logo_url, banner_url, footer_text,
            contact_email, contact_phone, address,
            social_instagram, social_facebook, social_whatsapp,
            sections_config: sections_config, // Store as map in Firebase
            about_content, stories_content, purchase_process_content,
            updated_at: new Date().toISOString()
        }, { merge: true })
            .then(() => res.json({ message: 'Configuración actualizada' }))
            .catch(err => res.status(500).json({ error: err.message }));
        return;
    }

    db.run(`UPDATE shop_settings SET 
        shop_name = ?, logo_url = ?, banner_url = ?, footer_text = ?, 
        contact_email = ?, contact_phone = ?, address = ?, 
        social_instagram = ?, social_facebook = ?, social_whatsapp = ?, 
        sections_config = ?, about_content = ?, stories_content = ?, purchase_process_content = ? 
        WHERE id = (SELECT id FROM shop_settings ORDER BY id DESC LIMIT 1)`,
        [shop_name, logo_url, banner_url, footer_text,
            contact_email, contact_phone, address,
            social_instagram, social_facebook, social_whatsapp,
            sectionsStr, about_content, stories_content, purchase_process_content],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Configuración actualizada con éxito' });
        }
    );
});

module.exports = router;
