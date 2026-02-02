const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/auth');

// POST: Process checkout (Simulated for now, would integrate Mercado Pago)
router.post('/checkout', verifyToken, (req, res) => {
    const { items, total_amount, customer_email, customer_name } = req.body;

    if (!items || items.length === 0) return res.status(400).json({ error: 'El carrito está vacío' });

    db.serialize(() => {
        // 1. Validate Stock for all items first
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
                    checkStock(items.length); // Jump to end
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
            // 2. Create Order
            const orderQuery = `INSERT INTO orders (user_id, customer_email, customer_name, total_amount, status) 
                               VALUES (?, ?, ?, ?, 'paid')`;

            db.run(orderQuery, [req.userId, customer_email, customer_name, total_amount], function (err) {
                if (err) return res.status(500).json({ error: err.message });

                const orderId = this.lastID;

                // 3. Add Order Items, Grant Access, and Deduct Stock
                items.forEach(item => {
                    db.run('INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
                        [orderId, item.id, item.quantity, item.price]);

                    // Deduct stock if physical
                    db.run('UPDATE products SET stock = stock - ? WHERE id = ? AND type = "physical"', [item.quantity, item.id]);

                    // If it's a course or virtual, grant access automatically
                    if (item.type === 'course' || item.type === 'virtual') {
                        db.run('INSERT OR IGNORE INTO product_access (user_id, product_id) VALUES (?, ?)',
                            [req.userId, item.id]);
                    }
                });

                res.status(201).json({ orderId, message: 'Pedido procesado con éxito' });
            });
        };

        checkStock(0);
    });
});

// GET: Check product access (for courses/videos)
router.get('/access/:productId', verifyToken, (req, res) => {
    const query = 'SELECT * FROM product_access WHERE user_id = ? AND product_id = ?';
    db.get(query, [req.userId, req.params.productId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ hasAccess: !!row });
    });
});

// GET: User's owned digital products
router.get('/my-content', verifyToken, (req, res) => {
    const query = `
        SELECT p.* FROM products p
        JOIN product_access pa ON p.id = pa.product_id
        WHERE pa.user_id = ?
    `;
    db.all(query, [req.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// GET: User's order history
router.get('/my-orders', verifyToken, (req, res) => {
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

module.exports = router;
