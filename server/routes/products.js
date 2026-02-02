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
router.get('/', async (req, res) => {
    if (db.isFirebase) {
        try {
            const snapshot = await db.collection('products').where('active', '==', 1).get();
            const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return res.json(products.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')));
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }
    const query = 'SELECT * FROM products WHERE active = 1 ORDER BY created_at DESC';
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Public: Get single product
router.get('/:id', async (req, res) => {
    if (db.isFirebase) {
        try {
            const doc = await db.collection('products').doc(req.params.id).get();
            if (!doc.exists) return res.status(404).json({ error: 'Producto no encontrado' });
            return res.json({ id: doc.id, ...doc.data() });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }
    const query = 'SELECT * FROM products WHERE id = ?';
    db.get(query, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Producto no encontrado' });
        res.json(row);
    });
});

// Admin: Create product
router.post('/', verifyToken, isAdmin, async (req, res) => {
    const { name, description, price, type, image_url, category, stock, discount_price, meta_features } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Nombre y precio son obligatorios' });

    if (db.isFirebase) {
        try {
            const productData = {
                name, description, price,
                type: type || 'physical',
                image_url, category,
                stock: stock || 10,
                active: 1,
                discount_price: discount_price || null,
                meta_features: meta_features || null,
                created_at: new Date().toISOString()
            };
            const docRef = await db.collection('products').add(productData);
            return res.status(201).json({ id: docRef.id, message: 'Producto creado exitosamente' });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    const query = `INSERT INTO products (name, description, price, type, image_url, category, stock, discount_price, meta_features) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(query, [name, description, price, type || 'physical', image_url, category, stock || 10, discount_price, meta_features], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, message: 'Producto creado exitosamente' });
    });
});

// Admin: Update product
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
    const { name, description, price, type, image_url, category, active, stock, discount_price, meta_features } = req.body;

    if (db.isFirebase) {
        try {
            const productRef = db.collection('products').doc(req.params.id);
            const updates = {};
            if (name !== undefined) updates.name = name;
            if (description !== undefined) updates.description = description;
            if (price !== undefined) updates.price = price;
            if (type !== undefined) updates.type = type;
            if (image_url !== undefined) updates.image_url = image_url;
            if (category !== undefined) updates.category = category;
            if (active !== undefined) updates.active = active;
            if (stock !== undefined) updates.stock = stock;
            if (discount_price !== undefined) updates.discount_price = discount_price;
            if (meta_features !== undefined) updates.meta_features = meta_features;

            await productRef.update(updates);
            return res.json({ message: 'Producto actualizado' });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

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

// Admin: Delete product
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
    if (db.isFirebase) {
        try {
            await db.collection('products').doc(req.params.id).delete();
            return res.json({ message: 'Producto eliminado' });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }
    db.run('DELETE FROM products WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Producto eliminado' });
    });
});

module.exports = router;
