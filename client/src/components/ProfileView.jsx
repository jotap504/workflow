import { useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Lock, User as UserIcon, Shield, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ProfileView = () => {
    const { user } = useAuth();
    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (passwords.newPassword !== passwords.confirmPassword) {
            return toast.error('Las nuevas contraseñas no coinciden');
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/auth/profile/password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword: passwords.currentPassword,
                    newPassword: passwords.newPassword
                })
            });

            if (response.ok) {
                toast.success('Contraseña actualizada correctamente');
                setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                const data = await response.json();
                toast.error(data.error || 'Error al actualizar contraseña');
            }
        } catch (error) {
            toast.error('Error de red');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel"
            style={{ padding: '2.5rem', maxWidth: '600px', margin: '0 auto' }}
        >
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{
                    width: '80px',
                    height: '80px',
                    background: 'var(--primary-color)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                    color: 'white',
                    boxShadow: '0 8px 16px rgba(99, 102, 241, 0.3)'
                }}>
                    <UserIcon size={40} />
                </div>
                <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '700' }}>Mi Perfil</h2>
                <p style={{ opacity: 0.6, marginTop: '0.5rem' }}>Gestiona tu cuenta y seguridad</p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem', border: '1px solid var(--card-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span style={{ opacity: 0.6, fontSize: '0.9rem' }}>Usuario</span>
                    <span style={{ fontWeight: '600' }}>{user?.username}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ opacity: 0.6, fontSize: '0.9rem' }}>Rol</span>
                    <span style={{
                        textTransform: 'uppercase',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        background: 'rgba(99, 102, 241, 0.15)',
                        color: 'var(--primary-color)',
                        padding: '2px 8px',
                        borderRadius: '6px'
                    }}>
                        {user?.role}
                    </span>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <h4 style={{ marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Key size={18} /> Seguridad - Cambiar Contraseña
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', opacity: 0.7, marginBottom: '6px' }}>Contraseña Actual</label>
                        <input
                            type="password"
                            value={passwords.currentPassword}
                            onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                            required
                            className="glass-panel"
                            style={{ width: '100%', background: 'rgba(255,255,255,0.03)', padding: '12px', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'inherit' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', opacity: 0.7, marginBottom: '6px' }}>Nueva Contraseña</label>
                            <input
                                type="password"
                                value={passwords.newPassword}
                                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                                required
                                className="glass-panel"
                                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', padding: '12px', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'inherit' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', opacity: 0.7, marginBottom: '6px' }}>Confirmar</label>
                            <input
                                type="password"
                                value={passwords.confirmPassword}
                                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                                required
                                className="glass-panel"
                                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', padding: '12px', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'inherit' }}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary"
                        style={{ marginTop: '1rem', padding: '14px', borderRadius: '12px', fontSize: '1rem', fontWeight: '600' }}
                    >
                        {loading ? 'Actualizando...' : 'Cambiar Contraseña'}
                    </button>
                </div>
            </form>
        </motion.div>
    );
};

export default ProfileView;
