import { createContext, useState, useEffect, useContext } from 'react';
import { auth as firebaseAuth } from '../firebaseConfig';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    getIdToken
} from 'firebase/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
            if (firebaseUser) {
                // User is signed in, verify with our backend to get role/metadata
                try {
                    const token = await getIdToken(firebaseUser);
                    const response = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ idToken: token }),
                    });

                    const data = await response.json();
                    if (data.auth) {
                        localStorage.setItem('token', token);
                        localStorage.setItem('user', JSON.stringify(data.user));
                        setUser(data.user);
                    }
                } catch (error) {
                    console.error('Firebase Auth Sync Error:', error);
                }
            } else {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (email, password) => {
        try {
            const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
            const token = await getIdToken(userCredential.user);

            // The backend sync is handled in onAuthStateChanged, but we can call it here too for immediate feedback
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken: token }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login verification failed');
            }

            return { success: true };
        } catch (error) {
            console.error('Login Error:', error);
            return { success: false, error: error.message };
        }
    };

    const register = async (email, password, username, role = 'user') => {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, username, role }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Registration failed');

            // After registration, log them in
            return await login(email, password);
        } catch (error) {
            console.error('Registration Error:', error);
            return { success: false, error: error.message };
        }
    };

    const logout = async () => {
        await signOut(firebaseAuth);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
