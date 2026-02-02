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
        const formData = new URLSearchParams();

        // High priority: ImgBB if API key provided
        console.log('[DEBUG UPLOAD] Starting upload process for:', fileName);
        console.log('[DEBUG UPLOAD] IMGBB_API_KEY status:', process.env.IMGBB_API_KEY ? 'FOUND (starts with ' + process.env.IMGBB_API_KEY.substring(0, 4) + '...)' : 'MISSING');

        if (process.env.IMGBB_API_KEY) {
            try {
                console.log('[DEBUG UPLOAD] Attempting ImgBB upload...');
                formData.append('image', req.file.buffer.toString('base64'));
                const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY.trim()}`, {
                    method: 'POST',
                    body: formData
                });

                const imgbbData = await imgbbResponse.json();
                console.log('[DEBUG UPLOAD] ImgBB status code:', imgbbResponse.status);

                if (imgbbData.success) {
                    console.log('[DEBUG UPLOAD] ImgBB SUCCESS:', imgbbData.data.url);
                    return res.json({ url: imgbbData.data.url });
                } else {
                    console.error('[DEBUG UPLOAD] ImgBB API error response:', JSON.stringify(imgbbData));
                }
            } catch (err) {
                console.error('[DEBUG UPLOAD] ImgBB exception:', err.message);
                if (err.stack) console.error(err.stack);
            }
        } else {
            console.warn('[DEBUG UPLOAD] Skipping ImgBB because IMGBB_API_KEY is not defined in process.env');
        }

        if (db.isFirebase) {
            // Firebase Storage Upload
            try {
                const bucket = storage.bucket();
                if (!bucket.name) {
                    throw new Error('Firebase Storage bucket not properly initialized (missing bucket name)');
                }

                const file = bucket.file(`uploads/${fileName}`);

                await file.save(req.file.buffer, {
                    metadata: {
                        contentType: req.file.mimetype
                    }
                });

                // Attempt to get a signed URL as a fallback or more robust public link
                // For "public" feel on Vercel/Firebase, we use the standard download URL format
                const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(`uploads/${fileName}`)}?alt=media`;

                // Optional: attempt makePublic but don't crash if it fails
                try {
                    await file.makePublic();
                } catch (e) {
                    console.warn('[UPLOAD] makePublic failed, but continuing with media URL:', e.message);
                }

                return res.json({ url: publicUrl });
            } catch (err) {
                console.error('[FIREBASE UPLOAD DETAIL]', err);
                throw new Error(`Error en Firebase Storage: ${err.message}`);
            }
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
