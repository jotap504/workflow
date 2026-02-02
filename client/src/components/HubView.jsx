import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { LayoutDashboard, ShoppingCart, Users, Settings, Lock, ArrowRight, Book } from 'lucide-react';

const HubView = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const apps = [
        {
            id: 'workflow',
            name: 'Workflow',
            description: 'Gestión de tareas y equipos en tiempo real.',
            icon: <LayoutDashboard size={32} />,
            color: '#6366f1',
            path: '/workflow'
        },
        {
            id: 'shop',
            name: 'Carrito Pro',
            description: 'Venta de productos físicos y contenido digital.',
            icon: <ShoppingCart size={32} />,
            color: '#ec4899',
            path: '/shop'
        },
        {
            id: 'accounting',
            name: 'Contabilidad Pro',
            description: 'Asientos contables y balances bajo norma Argentina.',
            icon: <Book size={32} />,
            color: '#8b5cf6',
            path: '/accounting'
        },
        {
            id: 'clients',
            name: 'Contactos Pro',
            description: 'Base de datos global de clientes y proveedores.',
            icon: <Users size={32} />,
            color: '#10b981',
            path: '/clients'
        },
        {
            id: 'admin',
            name: 'Panel Admin',
            description: 'Control central de usuarios y licencias.',
            icon: <Settings size={32} />,
            color: '#64748b',
            path: '/admin-suite',
            adminOnly: true
        }
    ];

    const isAuthorized = (app) => {
        if (app.locked) return false;
        if (app.id === 'admin') return user?.role === 'admin';

        // Admins have access to everything by default
        if (user?.role === 'admin') return true;

        // For standard users, check their specific authorization
        return user?.authorized_apps?.includes(app.id);
    };

    return (
        <div className="hub-container" style={{
            minHeight: '100vh',
            padding: '2rem',
            background: 'var(--bg-color)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
        }}>
            <header style={{
                width: '100%',
                maxWidth: '1000px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: window.innerWidth < 640 ? '2rem' : '4rem',
                flexDirection: window.innerWidth < 640 ? 'column' : 'row',
                textAlign: window.innerWidth < 640 ? 'center' : 'left',
                gap: '1.5rem'
            }}>
                <div>
                    <h1 style={{ fontSize: window.innerWidth < 640 ? '1.5rem' : '2.5rem', fontWeight: '800', margin: 0, background: 'linear-gradient(90deg, #6366f1, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Bprocess</h1>
                    <p style={{ opacity: 0.8, fontSize: '1rem', fontWeight: '500' }}>Vivir abundantemente haciendo lo que amás</p>
                    <p style={{ opacity: 0.5, fontSize: '0.85rem' }}>Bienvenido de nuevo, {user?.username}</p>
                </div>
                <button onClick={logout} className="glass-panel" style={{ padding: '8px 20px', color: '#ef4444', border: '1px solid #ef444433', cursor: 'pointer', borderRadius: '12px', fontWeight: '600' }}>
                    Cerrar Sesión
                </button>
            </header>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
                gap: window.innerWidth < 640 ? '1rem' : '2rem',
                width: '100%',
                maxWidth: '1000px'
            }}>
                {apps.map((app) => {
                    const auth = isAuthorized(app);
                    return (
                        <motion.div
                            key={app.id}
                            whileHover={auth ? { y: -10, scale: 1.02 } : {}}
                            onClick={() => auth && navigate(app.path)}
                            className="glass-panel"
                            style={{
                                padding: '2rem',
                                cursor: auth ? 'pointer' : 'default',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem',
                                opacity: auth ? 1 : 0.6,
                                border: auth ? `1px solid ${app.color}33` : '1px solid var(--card-border)',
                                overflow: 'hidden'
                            }}
                        >
                            {!auth && (
                                <div style={{
                                    position: 'absolute',
                                    top: '15px',
                                    right: '15px',
                                    color: '#94a3b8'
                                }}>
                                    <Lock size={18} />
                                </div>
                            )}

                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '16px',
                                background: `${app.color}15`,
                                color: app.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {app.icon}
                            </div>

                            <div>
                                <h3 style={{ margin: '0 0 0.5rem 0', color: auth ? 'inherit' : '#94a3b8' }}>{app.name}</h3>
                                <p style={{ fontSize: '0.9rem', opacity: 0.7, margin: 0 }}>{app.description}</p>
                            </div>

                            {auth && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: app.color, marginTop: 'auto', fontWeight: '600', fontSize: '0.9rem' }}>
                                    Abrir herramienta <ArrowRight size={16} />
                                </div>
                            )}

                            {!auth && app.id !== 'admin' && (
                                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 'auto' }}>
                                    {app.locked ? 'Próximamente' : 'No disponible en tu plan'}
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Mentoría & Recursos Section */}
            <div style={{ width: '100%', maxWidth: '1000px', marginTop: '4rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', textAlign: window.innerWidth < 640 ? 'center' : 'left' }}>Mentoría & Recursos Gratuitos</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    <a href="https://felizdeemprender.com/#7pasos" target="_blank" rel="noopener noreferrer" className="glass-panel" style={{ padding: '1.5rem', textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid #10b98133' }}>
                        <div style={{ background: '#10b98122', padding: '12px', borderRadius: '12px', color: '#10b981' }}>
                            <ArrowRight size={24} />
                        </div>
                        <div>
                            <h4 style={{ margin: 0 }}>Masterclass Gratuita</h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.7 }}>7 pasos para emprender, ser feliz y ganar dinero.</p>
                        </div>
                    </a>
                    <a href="https://felizdeemprender.com/#e-book" target="_blank" rel="noopener noreferrer" className="glass-panel" style={{ padding: '1.5rem', textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid #6366f133' }}>
                        <div style={{ background: '#6366f122', padding: '12px', borderRadius: '12px', color: '#6366f1' }}>
                            <Book size={24} />
                        </div>
                        <div>
                            <h4 style={{ margin: 0 }}>Descargar E-book</h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.7 }}>Viví abundantemente haciendo lo que amás.</p>
                        </div>
                    </a>
                </div>
            </div>

            <footer style={{
                marginTop: 'auto',
                padding: '4rem 0',
                width: '100%',
                maxWidth: '1000px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1.5rem'
            }}>
                <div style={{ display: 'flex', gap: '1.5rem', opacity: 0.6 }}>
                    <a href="https://www.instagram.com/felizdeemprender/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>Instagram</a>
                    <a href="https://www.linkedin.com/company/felizdeemprender/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>LinkedIn</a>
                    <a href="https://www.youtube.com/channel/UCKmkd4DeEsYsj3PCHIky1yw" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>YouTube</a>
                    <a href="https://www.tiktok.com/@felizdeemprender" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>TikTok</a>
                </div>
                <div style={{ opacity: 0.4, fontSize: '0.8rem', textAlign: 'center' }}>
                    &copy; 2026 Bprocess. Potenciado por <a href="https://felizdeemprender.com" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>Feliz de Emprender</a>.
                </div>
            </footer>
        </div>
    );
};

export default HubView;
