const admin = require('firebase-admin');

// On Vercel, we will use environment variables for the service account
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
} else {
    // Local development or if FIREBASE_SERVICE_ACCOUNT is not set
    // This will fail in production if not set, but helps during setup
    if (!admin.apps.length) {
        admin.initializeApp();
    }
}

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

module.exports = { admin, db, auth, storage };
