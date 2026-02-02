const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { storage } = require('../firebase');
const db = require('../db');
const verifyToken = require('../middleware/auth');

// Configure Multer
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

router.post('/', verifyToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún archivo' });
        }

        const fileName = `${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;

        if (db.isFirebase) {
            // Firebase Storage Upload
            const bucket = storage.bucket(); // Uses default bucket
            const file = bucket.file(`uploads/${fileName}`);

            await file.save(req.file.buffer, {
                metadata: {
                    contentType: req.file.mimetype
                }
            });

            // Make public (requires bucket permissions, fallback to download URL)
            try {
                await file.makePublic();
            } catch (e) {
                console.warn('[UPLOAD] Could not make file public, link might require auth:', e.message);
            }

            const publicUrl = `https://storage.googleapis.com/${bucket.name}/uploads/${fileName}`;
            return res.json({ url: publicUrl });
        } else {
            // Local fallback (if not in Firebase mode)
            const uploadDir = path.join(__dirname, '../uploads');
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

            const filePath = path.join(uploadDir, fileName);
            fs.writeFileSync(filePath, req.file.buffer);

            const publicUrl = `/uploads/${fileName}`;
            return res.json({ url: publicUrl });
        }
    } catch (error) {
        console.error('[UPLOAD ERROR]', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
