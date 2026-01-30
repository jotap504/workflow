const express = require('express');
const router = express.Router();
const { auth, db: firestore } = require('../firebase');

// Register User
router.post('/register', async (req, res) => {
    console.log('[DEBUG] POST /api/auth/register hit with body:', req.body);
    const { email, password, username, role } = req.body;

    if (!email || !password || !username) {
        return res.status(400).json({ error: 'Email, username and password are required' });
    }

    try {
        // 1. Create user in Firebase Auth
        const userRecord = await auth.createUser({
            email,
            password,
            displayName: username,
        });

        // 2. Store additional metadata in Firestore
        const userRole = role || 'user';
        await firestore.collection('users').doc(userRecord.uid).set({
            username,
            email,
            role: userRole,
            created_at: new Date().toISOString()
        });

        res.status(201).json({
            message: 'User created successfully',
            userId: userRecord.uid
        });
    } catch (error) {
        console.error('[AUTH ERROR] Registration failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// Login (Verify Token from Frontend)
router.post('/login', async (req, res) => {
    const { idToken } = req.body;

    if (!idToken) {
        return res.status(400).json({ error: 'ID Token is required' });
    }

    try {
        // 1. Verify the token
        const decodedToken = await auth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        // 2. Get user data from Firestore
        const userDoc = await firestore.collection('users').doc(uid).get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User details not found' });
        }

        const userData = userDoc.data();

        // Note: For compatibility with existing frontend, we return a token (though Firebase manages it)
        // and user object. 
        res.status(200).json({
            auth: true,
            token: idToken,
            user: {
                id: uid,
                username: userData.username,
                role: userData.role
            }
        });
    } catch (error) {
        console.error('[AUTH ERROR] Login verification failed:', error);
        res.status(401).json({ auth: false, error: 'Unauthorized' });
    }
});

const verifyToken = require('../middleware/auth');

// Change Password (handled via Firebase Auth normally, but keeping shim)
router.put('/profile/password', verifyToken, async (req, res) => {
    const { newPassword } = req.body;
    const uid = req.userId;

    if (!newPassword) {
        return res.status(400).json({ error: 'New password is required' });
    }

    try {
        await auth.updateUser(uid, {
            password: newPassword
        });
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
