const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Use absolute path to the service account file
const serviceAccountPath = path.resolve(__dirname, '../workflow-c902f-firebase-adminsdk-fbsvc-c5cc606c59.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Set environment variable for credentials
process.env.GOOGLE_APPLICATION_CREDENTIALS = serviceAccountPath;

console.log(`Usando Project ID: ${serviceAccount.project_id}`);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
    });
}


const auth = admin.auth();
const db = admin.firestore();

async function createAdmin() {
    const email = 'admin@admin.com';
    const password = 'admin123';
    const username = 'admin';
    const role = 'admin';

    try {
        console.log(`Intentando crear usuario en Firebase Auth: ${email}...`);

        let userRecord;
        try {
            // Check if user already exists
            userRecord = await auth.getUserByEmail(email);
            console.log(`El usuario ya existe con UID: ${userRecord.uid}. Actualizando metadata.`);
        } catch (e) {
            // Create user
            userRecord = await auth.createUser({
                email,
                password,
                displayName: username,
            });
            console.log(`Usuario creado en Auth con UID: ${userRecord.uid}`);
        }

        // 2. Create/Update in Firestore
        await db.collection('users').doc(userRecord.uid).set({
            username,
            email,
            role,
            created_at: new Date().toISOString()
        }, { merge: true });

        console.log(`Metadatos de Admin configurados en Firestore (colección 'users').`);
        console.log('--- EXITO ---');
        process.exit(0);
    } catch (error) {
        console.error('Error durante la creación:', error.message);
        process.exit(1);
    }
}

createAdmin();
