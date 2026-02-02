const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/auth');

const isAdmin = (req, res, next) => {
    if (req.userRole === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Acceso denegado: Se requiere rol de administrador' });
    }
};

// Public: Get all active products
router.get('/', (req, res) => {
    const query = 'SELECT * FROM products WHERE active = 1 ORDER BY created_at DESC';
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Public: Get single product
router.get('/:id', (req, res) => {
    const query = 'SELECT * FROM products WHERE id = ?';
    db.get(query, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Producto no encontrado' });
        res.json(row);
    });
});

// Admin: Create product
router.post('/', verifyToken, isAdmin, (req, res) => {
    const { name, description, price, type, image_url, category, stock, discount_price, meta_features } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Nombre y precio son obligatorios' });

    const query = `INSERT INTO products (name, description, price, type, image_url, category, stock, discount_price, meta_features) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(query, [name, description, price, type || 'physical', image_url, category, stock || 10, discount_price, meta_features], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, message: 'Producto creado exitosamente' });
    });
});

// Admin: Update product
router.put('/:id', verifyToken, isAdmin, (req, res) => {
    const { name, description, price, type, image_url, category, active, stock, discount_price, meta_features } = req.body;
    const query = `UPDATE products SET 
                  name = COALESCE(?, name),
                  description = COALESCE(?, description),
                  price = COALESCE(?, price),
                  type = COALESCE(?, type),
                  image_url = COALESCE(?, image_url),
                  category = COALESCE(?, category),
                  active = COALESCE(?, active),
                  stock = COALESCE(?, stock),
                  discount_price = COALESCE(?, discount_price),
                  meta_features = COALESCE(?, meta_features)
                  WHERE id = ?`;

    db.run(query, [name, description, price, type, image_url, category, active, stock, discount_price, meta_features, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Producto actualizado' });
    });
});

// Admin: Delete product (soft delete recommended, but this is a hard delete)
router.delete('/:id', verifyToken, isAdmin, (req, res) => {
    db.run('DELETE FROM products WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Producto eliminado' });
    });
});

module.exports = router;
