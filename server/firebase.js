const admin = require('firebase-admin');

// On Vercel, we will use environment variables for the service account

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        console.log('[FIREBASE] Detected FIREBASE_SERVICE_ACCOUNT env var');
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

        // Ensure private key handles newlines correctly if pasted as a single string
        if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        if (!admin.apps.length) {
            console.log(`[FIREBASE] Initializing for project: ${serviceAccount.project_id}`);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: serviceAccount.project_id,
                storageBucket: `${serviceAccount.project_id}.appspot.com`
            });
            console.log('[FIREBASE] Initialization successful');
        }
    } catch (error) {
        console.error('[FIREBASE] CRITICAL: Failed to parse or initialize with service account:', error.message);
        // Fallback to default if possible, though unlikely to work on Vercel
        if (!admin.apps.length) admin.initializeApp();
    }
} else {
    // Local development or if FIREBASE_SERVICE_ACCOUNT is not set
    console.warn('[FIREBASE] FIREBASE_SERVICE_ACCOUNT not found, using default initialization');
    if (!admin.apps.length) {
        admin.initializeApp();
    }
}


const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

module.exports = { admin, db, auth, storage };
