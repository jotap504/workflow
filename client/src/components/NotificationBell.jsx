import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
// Standard socket initialization with explicit URL for dev
const getSocket = () => {
    const isDev = window.location.port === '5173';
    const serverUrl = isDev ? `http://${window.location.hostname}:3000` : '';
    console.log('[DEBUG] Initializing socket with URL:', serverUrl || 'Current Origin');
    return io(serverUrl, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true
    });
};

const socket = getSocket();

// Explicitly log connection events
socket.on('connect', () => console.log('[SOCKET] Connected to server, ID:', socket.id));
socket.on('connect_error', (err) => console.log('[SOCKET] Connection error:', err.message));
socket.on('disconnect', (reason) => console.log('[SOCKET] Disconnected:', reason));

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);

    const checkNotifications = async () => {
        console.log('[DEBUG] checkNotifications called');
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/notifications', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                console.log(`[DEBUG] Notifications response: ${data.length} items`);
                setNotifications(data);
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error(`[DEBUG] Notification API Error: status=${response.status}`, errorData);
            }
        } catch (error) {
            console.error('[DEBUG] Notification fetch exception:', error);
        }
    };

    const markAsRead = async (taskId) => {
        try {
            const token = localStorage.getItem('token');
            await fetch('/api/notifications/read', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ taskId })
            });
            checkNotifications();
        } catch (error) {
            console.error(error);
        }
    };

    const handleOpenDropdown = async () => {
        console.log('[DEBUG] Bell icon clicked - Testing connection');
        checkNotifications(); // Refresh on open
        try {
            const token = localStorage.getItem('token');
            const debugRes = await fetch('/api/notifications/debug-info', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (debugRes.ok) {
                const info = await debugRes.json();
                console.log('[DEBUG] Connection Test Success:', info);
            }
        } catch (e) {
            console.error('[DEBUG] Connection Test Failed:', e);
        }

        const nextShow = !showDropdown;
        setShowDropdown(nextShow);
        if (!nextShow) {
            if (notifications.length > 0) {
                handleReadAll();
            }
        }
    };

    const handleReadAll = async () => {
        try {
            const token = localStorage.getItem('token');
            await fetch('/api/notifications/read-all', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            checkNotifications(); // Refresh after clearing
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        console.log('[DEBUG] NotificationBell mounted - Setup socket listeners');

        // Simple ping test
        fetch('/api/ping')
            .then(r => r.json())
            .then(data => console.log('[DEBUG] API Ping Result:', data))
            .catch(err => console.error('[DEBUG] API Ping Failed:', err));

        checkNotifications();

        const heartbeatInterval = setInterval(() => {
            console.log(`[DEBUG] Socket status: connected=${socket.connected}, id=${socket.id}`);
        }, 10000);

        socket.on('connect', () => {
            console.log('[DEBUG] Socket connected:', socket.id);
        });

        socket.on('connect_error', (error) => {
            console.error('[DEBUG] Socket connection error:', error);
        });

        socket.on('new_task', (data) => {
            console.log('[DEBUG] Socket new_task event received:', data);
            toast.success(`Nueva tarea: ${data.title}`, {
                description: `Creada por ${data.creator}`,
                duration: 5000
            });
            checkNotifications();
        });

        socket.on('tasks_updated', () => {
            console.log('[DEBUG] Socket tasks_updated received');
            checkNotifications();
        });

        return () => {
            console.log('[DEBUG] NotificationBell unmounting - Cleanup listeners');
            clearInterval(heartbeatInterval);
            socket.off('connect');
            socket.off('connect_error');
            socket.off('new_task');
            socket.off('tasks_updated');
        };
    }, []);

    return (
        <div style={{ position: 'relative', zIndex: 99999 }}>
            <button
                onClick={handleOpenDropdown}
                style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '1.2rem',
                    position: 'relative',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                🔔
                {notifications.length > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '-2px',
                        right: '-2px',
                        background: '#ef4444',
                        color: 'white',
                        fontSize: '0.65rem',
                        fontWeight: 'bold',
                        borderRadius: '50%',
                        minWidth: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid var(--card-bg)'
                    }}>
                        {notifications.length}
                    </span>
                )}
            </button>

            {showDropdown && (
                <div className="glass-panel" style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 10px)',
                    width: '320px',
                    padding: '1.2rem',
                    zIndex: 99999,
                    maxHeight: '400px',
                    overflowY: 'auto',
                    boxShadow: '0 20px 40px -5px rgba(0, 0, 0, 0.4)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '16px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>Notificaciones</h4>
                    </div>

                    {notifications.length === 0 ? (
                        <p style={{ fontSize: '0.85rem', opacity: 0.6, textAlign: 'center', padding: '1rem 0' }}>No tienes alertas pendientes</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {notifications.map(n => {
                                const isUrgent = n.notif_type === 'urgent';
                                return (
                                    <div key={n.id}
                                        onClick={() => markAsRead(n.id)}
                                        style={{
                                            padding: '0.8rem',
                                            background: isUrgent ? 'rgba(239, 68, 68, 0.08)' : 'rgba(99, 102, 241, 0.08)',
                                            borderRadius: '12px',
                                            fontSize: '0.85rem',
                                            border: isUrgent ? '1px solid rgba(239, 68, 68, 0.1)' : '1px solid rgba(99, 102, 241, 0.1)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            position: 'relative'
                                        }}
                                    >
                                        <div style={{
                                            fontWeight: '600',
                                            marginBottom: '2px',
                                            color: isUrgent ? '#f87171' : 'var(--primary-color)',
                                            display: 'flex',
                                            justifyContent: 'space-between'
                                        }}>
                                            <span>{isUrgent ? '⚠️ ALTA PRIORIDAD' : '🆕 NUEVA TAREA'}</span>
                                            <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>{n.creator_name}</span>
                                        </div>
                                        <div style={{ opacity: 0.9 }}>{n.title}</div>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '4px' }}>
                                            {n.due_date ? `Vence: ${new Date(n.due_date).toLocaleDateString()}` : 'Sin fecha'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
