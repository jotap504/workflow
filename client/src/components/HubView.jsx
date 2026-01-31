import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { LayoutDashboard, ShoppingCart, Users, Settings, Lock, ArrowRight } from 'lucide-react';

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
            path: '/'
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
            id: 'crm',
            name: 'CRM Premium',
            description: 'Gestión inteligente de contactos y prospectos.',
            icon: <Users size={32} />,
            color: '#10b981',
            path: '/crm',
            locked: true
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
                marginBottom: '4rem'
            }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '700', margin: 0 }}>Business Suite</h1>
                    <p style={{ opacity: 0.6 }}>Bienvenido de nuevo, {user?.username}</p>
                </div>
                <button onClick={logout} className="glass-panel" style={{ padding: '8px 16px', color: '#ef4444', border: 'none', cursor: 'pointer' }}>
                    Cerrar Sesión
                </button>
            </header>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '2rem',
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

            <footer style={{ marginTop: 'auto', padding: '4rem 0', opacity: 0.4, fontSize: '0.8rem' }}>
                &copy; 2026 Tu Suite Empresarial. Todos los derechos reservados.
            </footer>
        </div>
    );
};

export default HubView;
