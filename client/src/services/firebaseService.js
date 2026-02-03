import { db } from '../firebaseConfig';
import {
    collection,
    getDocs,
    getDoc,
    doc,
    setDoc,
    updateDoc,
    query,
    where,
    onSnapshot
} from 'firebase/firestore';

const TERMINALS_COLLECTION = 'terminals';

/**
 * Fetch all terminals for a specific user
 * @param {string} userId 
 */
export const getTerminals = async (userId) => {
    try {
        const q = query(collection(db, TERMINALS_COLLECTION), where('ownerId', '==', userId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching terminals:", error);
        throw error;
    }
};

/**
 * Get a specific terminal configuration
 * @param {string} terminalId 
 */
export const getTerminalConfig = async (terminalId) => {
    try {
        const docRef = doc(db, TERMINALS_COLLECTION, terminalId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error fetching terminal config:", error);
        throw error;
    }
};

/**
 * Update terminal configuration in Firestore
 * @param {string} terminalId 
 * @param {object} config 
 */
export const updateTerminalConfig = async (terminalId, config) => {
    try {
        const docRef = doc(db, TERMINALS_COLLECTION, terminalId);
        await updateDoc(docRef, {
            ...config,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error updating terminal config:", error);
        throw error;
    }
};

/**
 * Register a new terminal
 * @param {string} userId 
 * @param {object} terminalData 
 */
export const registerTerminal = async (userId, terminalData) => {
    try {
        const terminalId = terminalData.id || `MP-${Math.floor(1000 + Math.random() * 9000)}`;
        const docRef = doc(db, TERMINALS_COLLECTION, terminalId);
        const newTerminal = {
            ...terminalData,
            id: terminalId,
            ownerId: userId,
            status: 'online',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            volume: 70,
            brightness: 85,
            autoUpdate: true,
            sandboxMode: false
        };
        await setDoc(docRef, newTerminal);
        return newTerminal;
    } catch (error) {
        console.error("Error registering terminal:", error);
        throw error;
    }
};

/**
 * Real-time listener for terminal updates
 * @param {string} userId 
 * @param {function} callback 
 */
export const subscribeToTerminals = (userId, callback) => {
    const q = query(collection(db, TERMINALS_COLLECTION), where('ownerId', '==', userId));
    return onSnapshot(q, (snapshot) => {
        const terminals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(terminals);
    });
};
