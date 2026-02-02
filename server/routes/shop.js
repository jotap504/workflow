const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/auth');

// POST: Process checkout (Simulated for now, would integrate Mercado Pago)
router.post('/checkout', verifyToken, (req, res) => {
    const { items, total_amount, customer_email, customer_name } = req.body;

    if (!items || items.length === 0) return res.status(400).json({ error: 'El carrito está vacío' });

    db.serialize(() => {
        // 1. Create Order
        const orderQuery = `INSERT INTO orders (user_id, customer_email, customer_name, total_amount, status) 
                           VALUES (?, ?, ?, ?, 'paid')`; // Auto-pay for simulation

        db.run(orderQuery, [req.userId, customer_email, customer_name, total_amount], function (err) {
            if (err) return res.status(500).json({ error: err.message });

            const orderId = this.lastID;

            // 2. Add Order Items and Grant Access to Digital Content
            items.forEach(item => {
                db.run('INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
                    [orderId, item.id, item.quantity, item.price]);

                // If it's a course or virtual, grant access automatically
                if (item.type === 'course' || item.type === 'virtual') {
                    db.run('INSERT OR IGNORE INTO product_access (user_id, product_id) VALUES (?, ?)',
                        [req.userId, item.id]);
                }
            });

            res.status(201).json({ orderId, message: 'Pedido procesado con éxito' });
        });
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

module.exports = router;
