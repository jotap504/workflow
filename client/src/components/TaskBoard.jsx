import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Paperclip, Calendar as CalendarIcon, Flag, Plus, MessageSquare, X, Send, ChevronDown, ChevronRight, Play, Check, RotateCcw, History, Users, Mail, Phone } from 'lucide-react';
import { io } from 'socket.io-client';

// Standard socket initialization with explicit URL for dev
const getSocket = () => {
    const isDev = window.location.port === '5173';
    const isVercel = window.location.hostname.includes('vercel.app');
    const serverUrl = isDev ? `http://${window.location.hostname}:3000` : '';

    return io(serverUrl, {
        path: '/socket.io',
        transports: ['polling', 'websocket'],
        autoConnect: !isVercel, // Disable auto-connect on Vercel to avoid console spam
        reconnection: !isVercel,
        timeout: 10000
    });
};

const socket = getSocket();

// Log connection events only in dev or if successful
socket.on('connect', () => console.log('[SOCKET TaskBoard] Connected, ID:', socket.id));
socket.on('connect_error', (err) => {
    if (window.location.port === '5173') {
        console.log('[SOCKET TaskBoard] Connection error:', err.message);
    }
});

const TaskBoard = ({ searchQuery = '' }) => {
    const [tasks, setTasks] = useState([]);
    const [categories, setCategories] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [selectedClientId, setSelectedClientId] = useState(null);
    const [showOnlyMine, setShowOnlyMine] = useState(false);
    const location = useLocation();
    const { user } = useAuth();
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        urgency: 'medium',
        category_id: '',
        recurrence: 'none',
        client_id: ''
    });
    const [file, setFile] = useState(null);

    // Chat/Detail Modal State
    const [selectedTask, setSelectedTask] = useState(null);
    const [notes, setNotes] = useState([]);
    const [newNote, setNewNote] = useState('');
    const [loadingNotes, setLoadingNotes] = useState(false);
    const [showTaskForm, setShowTaskForm] = useState(window.innerWidth > 768);
    const [collapsedColumns, setCollapsedColumns] = useState({
        pending: false,
        'in-progress': false,
        done: true // Collapse 'done' by default to save space
    });

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };
            const [tasksRes, catsRes, clientsRes] = await Promise.all([
                fetch('/api/tasks', { headers }),
                fetch('/api/categories', { headers }),
                fetch('/api/clients', { headers })
            ]);
            if (tasksRes.ok) setTasks(await tasksRes.json());
            if (catsRes.ok) {
                const cats = await catsRes.json();
                setCategories(cats);
                if (!newTask.category_id && cats.length > 0) {
                    const general = cats.find(c => c.name === 'General') || cats[0];
                    setNewTask(prev => ({ ...prev, category_id: general.id }));
                }
            }
            if (clientsRes.ok) setClients(await clientsRes.json());
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    // Handle Client Pre-selection from URL
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const clientId = params.get('client_id');
        if (clientId) {
            setNewTask(prev => ({ ...prev, client_id: clientId }));
            setShowTaskForm(true);
            // Optionally clear the query param to avoid re-opening on refresh? 
            // For now, let's keep it simple.
        }
    }, [location.search]);

    const fetchNotes = async (taskId) => {
        setLoadingNotes(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/notes/${taskId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) setNotes(await response.json());
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingNotes(false);
        }
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!newNote.trim()) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/notes/${selectedTask.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content: newNote })
            });
            if (response.ok) {
                setNewNote('');
                fetchNotes(selectedTask.id);
                fetchData();
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al enviar nota');
        }
    };

    const openTaskDetails = (task) => {
        setSelectedTask(task);
        fetchNotes(task.id);
    };

    useEffect(() => {
        fetchData();

        const heartbeatInterval = setInterval(() => {
            console.log(`[DEBUG TaskBoard] Socket status: connected=${socket.connected}, id=${socket.id}`);
        }, 10000);

        socket.on('tasks_updated', () => {
            console.log('[DEBUG TaskBoard] Received tasks_updated event');
            fetchData();
        });

        socket.on('notes_updated', (data) => {
            console.log('Real-time: Notes updated for', data.taskId);
            if (selectedTask && selectedTask.id == data.taskId) {
                fetchNotes(data.taskId);
            }
            fetchData(); // Update note counts
        });

        return () => {
            clearInterval(heartbeatInterval);
            socket.off('tasks_updated');
            socket.off('notes_updated');
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTask]);

    const handleUpdateStatus = async (taskId, newStatus) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: newStatus })
            });
            fetchData();
            toast.success(`Tarea movida a ${newStatus}`);
        } catch (error) {
            toast.error('No se pudo actualizar la tarea');
        }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('title', newTask.title);
            formData.append('description', newTask.description);
            formData.append('urgency', newTask.urgency);
            formData.append('category_id', newTask.category_id);
            formData.append('recurrence', newTask.recurrence);
            if (newTask.client_id) formData.append('client_id', newTask.client_id);
            if (newTask.due_date) formData.append('due_date', newTask.due_date);
            if (file) formData.append('attachment', file);

            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (response.ok) {
                const general = categories.find(c => c.name === 'General') || categories[0];
                setNewTask({ title: '', description: '', urgency: 'medium', category_id: general?.id || '', recurrence: 'none', client_id: '' });
                setFile(null);
                fetchData();
                toast.success('Tarea creada exitosamente');
                if (window.innerWidth <= 768) setShowTaskForm(false);
            } else {
                toast.error('Error al crear tarea');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error de red');
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'pending': return 'Pendiente';
            case 'in-progress': return 'En Progreso';
            case 'done': return 'Terminado';
            default: return status;
        }
    };

    const toggleColumn = (status) => {
        setCollapsedColumns(prev => ({
            ...prev,
            [status]: !prev[status]
        }));
    };

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando tablero...</div>;

    const filteredTasks = tasks.filter(t => {
        const matchesSearch = !searchQuery ||
            t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesCategory = !selectedCategoryId || t.category_id == selectedCategoryId;
        const matchesClient = !selectedClientId || t.client_id == selectedClientId;
        const matchesMine = !showOnlyMine || t.created_by === user?.id;

        return matchesSearch && matchesCategory && matchesClient && matchesMine;
    });

    const columns = {
        pending: filteredTasks.filter(t => t.status === 'pending'),
        'in-progress': filteredTasks.filter(t => t.status === 'in-progress'),
        done: filteredTasks.filter(t => t.status === 'done')
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Filters Bar */}
            <div style={{
                display: 'flex',
                gap: '0.8rem',
                marginBottom: '1.2rem',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'nowrap',
                overflowX: 'auto',
                paddingBottom: '5px'
            }} className="hide-scrollbar">
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button
                        onClick={() => setSelectedCategoryId(null)}
                        style={{
                            background: selectedCategoryId === null ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                            color: selectedCategoryId === null ? 'white' : 'inherit',
                            border: '1px solid var(--card-border)',
                            borderRadius: '20px', padding: '4px 12px', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        Todas
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategoryId(cat.id)}
                            style={{
                                background: selectedCategoryId == cat.id ? cat.color : 'rgba(255,255,255,0.05)',
                                color: selectedCategoryId == cat.id ? 'white' : 'inherit',
                                border: '1px solid var(--card-border)',
                                borderRadius: '20px', padding: '4px 12px', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s',
                                display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap'
                            }}
                        >
                            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: selectedCategoryId == cat.id ? 'white' : cat.color }}></div>
                            {cat.name}
                        </button>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <select
                        value={selectedClientId || ''}
                        onChange={(e) => setSelectedClientId(e.target.value || null)}
                        style={{
                            background: selectedClientId ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                            color: 'white',
                            border: '1px solid var(--card-border)',
                            borderRadius: '20px', padding: '4px 12px', fontSize: '0.75rem', cursor: 'pointer', outline: 'none'
                        }}
                    >
                        <option value="">Todos los Clientes</option>
                        {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={() => setShowOnlyMine(!showOnlyMine)}
                    style={{
                        background: showOnlyMine ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                        color: showOnlyMine ? 'white' : 'inherit',
                        border: '1px solid var(--card-border)',
                        borderRadius: '20px', padding: '4px 12px', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', flexShrink: 0
                    }}
                >
                    👤 Mías
                </button>
            </div>

            {/* NEW TASK FORM (Mobile Toggle) */}
            <div className="glass-panel" style={{ padding: '0.8rem', marginBottom: '1.5rem', border: '1px solid var(--card-border)' }}>
                {window.innerWidth <= 768 && (
                    <button
                        onClick={() => setShowTaskForm(!showTaskForm)}
                        style={{ width: '100%', background: 'transparent', border: 'none', color: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem' }}
                    >
                        <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{showTaskForm ? 'Cerrar Nueva Tarea' : '+ Crear Nueva Tarea'}</span>
                        {showTaskForm ? <X size={18} /> : <Plus size={18} />}
                    </button>
                )}

                <AnimatePresence>
                    {showTaskForm && (
                        <motion.form
                            initial={window.innerWidth <= 768 ? { height: 0, opacity: 0 } : false}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            onSubmit={handleCreateTask}
                            style={{ flexDirection: 'column', gap: '0.8rem', display: 'flex', overflow: 'hidden', paddingTop: window.innerWidth <= 768 ? '1rem' : '0' }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <input
                                    type="text"
                                    placeholder="¿Qué hay que hacer?"
                                    value={newTask.title}
                                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                    style={{
                                        background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)',
                                        padding: '0.5rem 0', fontSize: '1.1rem', color: 'inherit', outline: 'none'
                                    }}
                                    required
                                />
                                <input
                                    type="text"
                                    placeholder="Añadir descripción..."
                                    value={newTask.description}
                                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                    style={{ background: 'transparent', border: 'none', padding: '0.3rem 0', fontSize: '0.85rem', opacity: 0.6, outline: 'none' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                                        {categories.slice(0, 4).map(cat => (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                onClick={() => setNewTask({ ...newTask, category_id: cat.id })}
                                                style={{
                                                    background: newTask.category_id == cat.id ? cat.color : 'transparent',
                                                    border: `1px solid ${newTask.category_id == cat.id ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
                                                    color: newTask.category_id == cat.id ? 'white' : 'inherit',
                                                    borderRadius: '12px', padding: '2px 8px', fontSize: '0.7rem'
                                                }}
                                            >
                                                {cat.name}
                                            </button>
                                        ))}
                                    </div>

                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', opacity: 0.8, fontSize: '0.85rem' }}>
                                        <input type="file" onChange={(e) => setFile(e.target.files[0])} style={{ display: 'none' }} />
                                        <Paperclip size={14} /> {file ? 'Listo' : 'Adjuntar'}
                                    </label>

                                    {/* Date Picker */}
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', opacity: 0.8 }}>
                                        <CalendarIcon size={14} />
                                        <input
                                            type="date"
                                            value={newTask.due_date || ''}
                                            onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                                            style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                                        />
                                        <span style={{ fontSize: '0.8rem' }}>{newTask.due_date ? new Date(newTask.due_date).toLocaleDateString() : 'Fecha'}</span>
                                    </div>

                                    {/* Recurrence Selector */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <RotateCcw size={14} style={{ opacity: 0.8 }} />
                                        <select
                                            value={newTask.recurrence}
                                            onChange={(e) => setNewTask({ ...newTask, recurrence: e.target.value })}
                                            style={{ background: 'transparent', border: 'none', color: 'inherit', fontSize: '0.8rem', cursor: 'pointer', outline: 'none' }}
                                        >
                                            <option value="none">Una vez</option>
                                            <option value="daily">Diaria</option>
                                            <option value="weekly">Semanal</option>
                                            <option value="monthly">Mensual</option>
                                        </select>
                                    </div>

                                    {/* Urgency */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Flag size={14} style={{ opacity: 0.8 }} />
                                        <select
                                            value={newTask.urgency}
                                            onChange={(e) => setNewTask({ ...newTask, urgency: e.target.value })}
                                            style={{ background: 'transparent', border: 'none', color: 'inherit', fontSize: '0.8rem', cursor: 'pointer', outline: 'none' }}
                                        >
                                            <option value="low">Baja</option>
                                            <option value="medium">Media</option>
                                            <option value="high">Alta</option>
                                        </select>
                                    </div>

                                    {/* Client Selector (NEW) */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Users size={14} style={{ opacity: 0.8 }} />
                                        <select
                                            value={newTask.client_id}
                                            onChange={(e) => setNewTask({ ...newTask, client_id: e.target.value })}
                                            style={{ background: 'transparent', border: 'none', color: 'inherit', fontSize: '0.8rem', cursor: 'pointer', outline: 'none', maxWidth: '120px' }}
                                        >
                                            <option value="">Sin Cliente</option>
                                            {clients.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <button type="submit" className="btn-primary" style={{ borderRadius: '20px', padding: '0.5rem 1.5rem', fontSize: '0.85rem' }}>
                                    Crear Tarea
                                </button>
                            </div>
                        </motion.form>
                    )}
                </AnimatePresence>
            </div>

            {/* COLUMNS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', alignItems: 'start' }}>
                {Object.entries(columns).map(([status, statusTasks]) => {
                    const isCollapsed = collapsedColumns[status];
                    return (
                        <div key={status} style={{
                            background: isCollapsed ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.02)',
                            borderRadius: '14px',
                            padding: '0.8rem',
                            minHeight: isCollapsed ? 'auto' : '200px',
                            border: '1px solid rgba(255,255,255,0.03)',
                            transition: 'all 0.3s ease'
                        }}>
                            <h4
                                onClick={() => toggleColumn(status)}
                                style={{
                                    textTransform: 'capitalize',
                                    marginBottom: isCollapsed ? '0' : '1rem',
                                    borderBottom: isCollapsed ? 'none' : '1px solid var(--primary-color)',
                                    paddingBottom: '0.4rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    userSelect: 'none'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {isCollapsed ? <ChevronRight size={16} opacity={0.5} /> : <ChevronDown size={16} opacity={0.5} />}
                                    <span>{getStatusLabel(status)}</span>
                                </div>
                                <span style={{ opacity: 0.4 }}>{statusTasks.length}</span>
                            </h4>

                            {!isCollapsed && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    <AnimatePresence>
                                        {statusTasks.map(task => (
                                            <motion.div
                                                key={task.id}
                                                className="glass-panel task-card-compact"
                                                layout
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.98 }}
                                                transition={{ duration: 0.15 }}
                                                style={{
                                                    borderLeft: `4px solid ${task.urgency === 'high' ? '#ef4444' : task.urgency === 'medium' ? '#f59e0b' : '#10b981'}`
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.3rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <h5
                                                            style={{ margin: 0, fontSize: '0.92rem', fontWeight: '600', cursor: 'pointer', lineHeight: '1.2' }}
                                                            onClick={() => openTaskDetails(task)}
                                                        >
                                                            {task.title}
                                                        </h5>
                                                        {task.recurrence !== 'none' && <History size={12} style={{ opacity: 0.4 }} />}
                                                    </div>
                                                    <span style={{
                                                        background: task.category_color || '#94a3b8',
                                                        fontSize: '0.6rem', padding: '1px 6px', borderRadius: '10px', color: 'white', textTransform: 'uppercase', fontWeight: 'bold'
                                                    }}>{task.category_name || 'General'}</span>
                                                </div>

                                                {task.description && <p style={{ fontSize: '0.85rem', margin: '0.4rem 0', opacity: 0.6, lineHeight: '1.3', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{task.description}</p>}

                                                {task.client_name && (
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '0.2rem' }}>
                                                        <Users size={12} /> {task.client_name}
                                                    </div>
                                                )}

                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.6rem' }}>
                                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                        {task.attachment_url && (
                                                            <a href={`/uploads/${task.attachment_url}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', display: 'flex', alignItems: 'center' }}>
                                                                <Paperclip size={14} />
                                                            </a>
                                                        )}

                                                        <button
                                                            onClick={() => openTaskDetails(task)}
                                                            style={{
                                                                background: 'transparent',
                                                                border: 'none',
                                                                color: task.note_count > 0 ? '#10b981' : 'inherit',
                                                                opacity: task.note_count > 0 ? 1 : 0.4,
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '3px',
                                                                padding: 0
                                                            }}
                                                        >
                                                            <MessageSquare size={14} />
                                                            {task.note_count > 0 && <span style={{ fontSize: '0.65rem', fontWeight: 'bold' }}>{task.note_count}</span>}
                                                        </button>
                                                    </div>

                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        {status !== 'pending' && (
                                                            <button onClick={() => handleUpdateStatus(task.id, 'pending')} className="btn-status" title="Pendiente">
                                                                <RotateCcw size={14} />
                                                            </button>
                                                        )}
                                                        {status !== 'in-progress' && (
                                                            <button onClick={() => handleUpdateStatus(task.id, 'in-progress')} className="btn-status" title="En curso">
                                                                <Play size={14} />
                                                            </button>
                                                        )}
                                                        {status !== 'done' && (
                                                            <button onClick={() => handleUpdateStatus(task.id, 'done')} className="btn-status" style={{ color: '#10b981' }} title="Listo">
                                                                <Check size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                    {statusTasks.length === 0 && <div style={{ opacity: 0.2, fontStyle: 'italic', fontSize: '0.8rem', textAlign: 'center', padding: '1.5rem 0' }}>Vacío</div>}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* DETAIL MODAL / CHAT */}
            <AnimatePresence>
                {selectedTask && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px', backdropFilter: 'blur(8px)' }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            style={{
                                width: '100%',
                                maxWidth: '650px',
                                height: window.innerWidth < 640 ? '95vh' : '85vh',
                                display: 'flex', flexDirection: 'column',
                                overflow: 'hidden',
                                background: '#ffffff',
                                color: '#1e293b',
                                borderRadius: window.innerWidth < 640 ? '16px 16px 0 0' : '24px',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                                marginTop: window.innerWidth < 640 ? '5vh' : '0'
                            }}
                        >
                            <div style={{ padding: window.innerWidth < 640 ? '1rem 1.5rem' : '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: window.innerWidth < 640 ? '1.1rem' : '1.4rem', fontWeight: '700', color: '#0f172a' }}>{selectedTask.title}</h3>
                                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Autor: {selectedTask.creator_name || 'Admin'}</span>
                                </div>
                                <button
                                    onClick={() => setSelectedTask(null)}
                                    style={{ background: '#f1f5f9', border: 'none', color: '#64748b', cursor: 'pointer', padding: '8px', borderRadius: '50%' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', padding: window.innerWidth < 640 ? '1rem 1.5rem' : '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {selectedTask.description && (
                                    <div style={{ padding: '1.2rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                        <h5 style={{ margin: '0 0 8px 0', fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em' }}>Descripción</h5>
                                        <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.6', color: '#334155' }}>{selectedTask.description}</p>
                                    </div>
                                )}

                                {selectedTask.client_id && (
                                    <div style={{ padding: '1.2rem', background: 'var(--primary-color)08', borderRadius: '12px', border: '1px solid var(--primary-color)22' }}>
                                        <h5 style={{ margin: '0 0 8px 0', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--primary-color)', letterSpacing: '0.05em' }}>Información del Cliente</h5>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ fontWeight: '600', fontSize: '1rem' }}>{selectedTask.client_name}</div>
                                            {clients.find(c => c.id == selectedTask.client_id) && (
                                                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', fontSize: '0.9rem', opacity: 0.8 }}>
                                                    {clients.find(c => c.id == selectedTask.client_id).email && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                            <Mail size={14} /> {clients.find(c => c.id == selectedTask.client_id).email}
                                                        </div>
                                                    )}
                                                    {clients.find(c => c.id == selectedTask.client_id).phone && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                            <Phone size={14} /> {clients.find(c => c.id == selectedTask.client_id).phone}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', margin: '0.5rem 0' }}>
                                    <div style={{ flex: 1, height: '1px', background: '#f1f5f9' }}></div>
                                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.1em', fontWeight: 'bold' }}>Chat</span>
                                    <div style={{ flex: 1, height: '1px', background: '#f1f5f9' }}></div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                    {loadingNotes ? <div style={{ textAlign: 'center', opacity: 0.5 }}>Cargando...</div> : (
                                        notes.map(note => (
                                            <div key={note.id} style={{ alignSelf: note.user_id === user?.id ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px', textAlign: note.user_id === user?.id ? 'right' : 'left', padding: '0 4px' }}>
                                                    {note.author_name} • {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <div style={{
                                                    background: note.user_id === user?.id ? 'var(--primary-color)' : '#f1f5f9',
                                                    color: note.user_id === user?.id ? '#ffffff' : '#1e293b',
                                                    padding: '12px 16px',
                                                    borderRadius: '18px',
                                                    borderBottomRightRadius: note.user_id === user?.id ? '4px' : '18px',
                                                    borderBottomLeftRadius: note.user_id === user?.id ? '18px' : '4px',
                                                    fontSize: '0.95rem',
                                                    lineHeight: '1.5',
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                                }}>
                                                    {note.content}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    {notes.length === 0 && !loadingNotes && <div style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', padding: '2rem 0' }}>No hay comentarios.</div>}
                                </div>
                            </div>

                            <form onSubmit={handleAddNote} style={{ padding: window.innerWidth < 640 ? '1rem 1.5rem' : '1.2rem 2rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '12px', background: '#f8fafc' }}>
                                <input
                                    type="text"
                                    placeholder="Escribe un mensaje..."
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    style={{
                                        flex: 1, background: '#ffffff', border: '1px solid #e2e8f0',
                                        padding: '14px 20px', borderRadius: '30px', color: '#1e293b', outline: 'none',
                                        fontSize: '1rem'
                                    }}
                                />
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    style={{ borderRadius: '50%', width: '48px', height: '48px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    disabled={!newNote.trim()}
                                >
                                    <Send size={20} />
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default TaskBoard;
