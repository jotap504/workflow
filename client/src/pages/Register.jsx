import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
    const [formData, setFormData] = useState({ username: '', email: '', password: '', role: 'user' });
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            setMessage('User created successfully! Redirecting to login...');
            setTimeout(() => navigate('/login'), 2000);

        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '80vh'
        }}>
            <div className="glass-panel" style={{ padding: '3rem', width: '100%', maxWidth: '400px' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: '800', background: 'linear-gradient(90deg, #6366f1, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Bprocess</h1>
                    <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>Vivir abundantemente haciendo lo que amás</p>
                </div>
                <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.2rem', fontWeight: '500' }}>Registrarse</h2>

                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: '#ef4444',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        marginBottom: '1rem',
                        textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                {message && (
                    <div style={{
                        background: 'rgba(16, 185, 129, 0.2)',
                        color: '#10b981',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        marginBottom: '1rem',
                        textAlign: 'center'
                    }}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Usuario</label>
                        <input
                            type="text"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            className="glass-panel"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid var(--card-border)',
                                outline: 'none',
                                color: 'inherit'
                            }}
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="glass-panel"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid var(--card-border)',
                                outline: 'none',
                                color: 'inherit'
                            }}
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Contraseña</label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="glass-panel"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid var(--card-border)',
                                outline: 'none',
                                color: 'inherit'
                            }}
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Rol</label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="glass-panel"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid var(--card-border)',
                                outline: 'none',
                                color: 'inherit'
                            }}
                        >
                            <option value="user">Usuario</option>
                            <option value="manager">Gerente</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                        Crear Cuenta
                    </button>
                </form>

                <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9em' }}>
                    ¿Ya tienes cuenta? <Link to="/login" style={{ color: 'var(--primary-color)' }}>Inicia sesión</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
