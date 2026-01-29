import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const result = await login(username, password);
        if (result.success) {
            navigate('/');
        } else {
            setError(result.error);
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
                <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Iniciar Sesión</h2>

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

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Usuario</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="glass-panel"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid var(--card-border)',
                                outline: 'none',
                                color: 'inherit'
                            }}
                            placeholder="admin"
                        />
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="glass-panel"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid var(--card-border)',
                                outline: 'none',
                                color: 'inherit'
                            }}
                            placeholder="••••••"
                        />
                    </div>

                    <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                        Entrar
                    </button>
                </form>

                <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9em' }}>
                    <a href="/register" style={{ color: 'var(--primary-color)' }}>Crear cuenta nueva</a>
                </p>
            </div>
        </div>
    );
};

export default Login;

