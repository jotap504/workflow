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

        // --- MÉTODO PRINCIPAL: ImgBB ---
        // Forzamos la limpieza de la clave por si hay espacios invisibles
        const IMGBB_KEY = (process.env.IMGBB_API_KEY || '').trim();

        console.log('[DEBUG UPLOAD] --- INICIO DE PROCESO ---');
        console.log('[DEBUG UPLOAD] Archivo:', fileName);
        console.log('[DEBUG UPLOAD] Clave ImgBB Detectada:', IMGBB_KEY ? `SÍ (${IMGBB_KEY.substring(0, 4)}...)` : 'NO');

        if (IMGBB_KEY) {
            try {
                const formData = new URLSearchParams();
                formData.append('image', req.file.buffer.toString('base64'));

                const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    console.log('[DEBUG UPLOAD] ÉXITO en ImgBB:', data.data.url);
                    return res.json({ url: data.data.url });
                } else {
                    console.error('[DEBUG UPLOAD] La API de ImgBB rechazó la imagen:', JSON.stringify(data));
                    return res.status(400).json({
                        error: `ImgBB no aceptó la imagen: ${data.error?.message || 'Error de API'}`
                    });
                }
            } catch (err) {
                console.error('[DEBUG UPLOAD] Error de conexión con ImgBB:', err.message);
                return res.status(500).json({ error: `Error de red con ImgBB: ${err.message}` });
            }
        }

        // Si llegamos aquí es porque no hay IMGBB_KEY
        console.error('[DEBUG UPLOAD] ERROR CRÍTICO: No se encontró IMGBB_API_KEY en el servidor');

        // Si estamos en Vercel, no vale la pena intentar Firebase si ya falló
        if (process.env.VERCEL) {
            return res.status(500).json({
                error: 'Falta configurar IMGBB_API_KEY en Vercel. Por favor, revisa tus variables de entorno y haz un Redeploy.'
            });
        }

        // Solo intentamos Firebase si estamos localmente o si explícitamente se desea el fallback
        if (db.isFirebase) {
            try {
                const bucket = storage.bucket();
                const file = bucket.file(`uploads/${fileName}`);
                await file.save(req.file.buffer, { metadata: { contentType: req.file.mimetype } });
                const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(`uploads/${fileName}`)}?alt=media`;
                return res.json({ url: publicUrl });
            } catch (err) {
                return res.status(500).json({ error: `Firebase Falluback Error: ${err.message}` });
            }
        }

        // Local fallback (Dev)
        return res.status(500).json({ error: 'No hay proveedor de imágenes configurado (ImgBB o Firebase)' });

    } catch (error) {
        console.error('[UPLOAD ERROR GLOBAL]', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
