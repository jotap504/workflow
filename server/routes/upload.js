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

        // --- PROVEEDOR PRIORITARIO: ImgBB ---
        const IMGBB_KEY = (process.env.IMGBB_API_KEY || '').trim();
        console.log('[DEBUG UPLOAD] ImgBB Key Detectada:', IMGBB_KEY ? 'SÍ' : 'NO');

        if (IMGBB_KEY) {
            console.log('[DEBUG UPLOAD] Intentando subir a ImgBB...');
            try {
                const formData = new URLSearchParams();
                formData.append('image', req.file.buffer.toString('base64'));

                const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                console.log('[DEBUG UPLOAD] Respuesta ImgBB Status:', response.status);

                if (data.success) {
                    console.log('[DEBUG UPLOAD] ÉXITO ImgBB:', data.data.url);
                    return res.json({ url: data.data.url });
                } else {
                    console.error('[DEBUG UPLOAD] ERROR ImgBB API:', JSON.stringify(data));
                    return res.status(response.status || 400).json({
                        error: `Error de ImgBB: ${data.error?.message || 'Error desconocido'}`
                    });
                }
            } catch (err) {
                console.error('[DEBUG UPLOAD] EXCEPCIÓN ImgBB:', err.message);
                return res.status(500).json({ error: `Excepción al conectar con ImgBB: ${err.message}` });
            }
        }

        // --- PROVEEDOR SECUNDARIO: Firebase (Solo si no hay ImgBB_KEY) ---
        console.warn('[DEBUG UPLOAD] No se detectó IMGBB_API_KEY. Intentando Firebase como plan B...');

        if (db.isFirebase) {
            try {
                const bucket = storage.bucket();
                if (!bucket.name) {
                    throw new Error('Firebase Storage bucket no inicializado');
                }

                const file = bucket.file(`uploads/${fileName}`);
                await file.save(req.file.buffer, {
                    metadata: { contentType: req.file.mimetype }
                });

                const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(`uploads/${fileName}`)}?alt=media`;

                try {
                    await file.makePublic();
                } catch (e) {
                    console.warn('[UPLOAD] makePublic falló, usando URL media:', e.message);
                }

                return res.json({ url: publicUrl });
            } catch (err) {
                console.error('[FIREBASE UPLOAD DETAIL]', err);
                return res.status(500).json({
                    error: `Error en Firebase Storage (Bucket: ${storage.bucket().name}): ${err.message}`
                });
            }
        } else {
            // Local fallback
            const uploadDir = path.join(__dirname, '../uploads');
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
            const filePath = path.join(uploadDir, fileName);
            fs.writeFileSync(filePath, req.file.buffer);
            return res.json({ url: `/uploads/${fileName}` });
        }
    } catch (error) {
        console.error('[UPLOAD ERROR GLOBAL]', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
