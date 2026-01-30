const { auth, db: firestore } = require('../firebase');

async function verifyToken(req, res, next) {
    const tokenHeader = req.headers['authorization'];

    if (!tokenHeader) {
        return res.status(403).json({ auth: false, message: 'No token provided.' });
    }

    const token = tokenHeader.split(' ')[1]; // Bearer <token>

    try {
        const decodedToken = await auth.verifyIdToken(token);
        const uid = decodedToken.uid;

        // Get user metadata from Firestore
        const userDoc = await firestore.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User details not found' });
        }

        const userData = userDoc.data();

        // Save to request for use in other routes
        req.userId = uid;
        req.userName = userData.username;
        req.userRole = userData.role;
        next();
    } catch (error) {
        console.error('[AUTH DEBUG] Token verification failed:', error.message);
        return res.status(401).json({ auth: false, message: 'Unauthorized', error: error.message });
    }
}

module.exports = verifyToken;
