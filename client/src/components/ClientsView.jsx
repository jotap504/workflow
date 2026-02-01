import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
    Users,
    Plus,
    Search,
    Mail,
    Phone,
    User,
    Globe,
    FileText,
    Trash2,
    Edit2,
    CheckCircle2,
    XCircle
} from 'lucide-react';

const ClientsView = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingClient, setEditingClient] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        contactName: '',
        socialMedia: '',
        notes: ''
    });

    const fetchClients = async () => {
        try {
            const res = await fetch('/api/clients');
            if (res.ok) {
                const data = await res.json();
                setClients(data);
            }
        } catch (error) {
            toast.error('Error al cargar contactos');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.email) {
            toast.error('Nombre y Email son obligatorios');
            return;
        }

        try {
            const res = await fetch('/api/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingClient ? { ...formData, id: editingClient.id } : formData)
            });

            if (res.ok) {
                toast.success(editingClient ? 'Contacto actualizado' : 'Contacto creado');
                setShowForm(false);
                setEditingClient(null);
                setFormData({ name: '', email: '', phone: '', contactName: '', socialMedia: '', notes: '' });
                fetchClients();
            }
        } catch (error) {
            toast.error('Error al guardar contacto');
        }
    };

    const handleEdit = (client) => {
        setEditingClient(client);
        setFormData({
            name: client.name,
            email: client.email,
            phone: client.phone || '',
            contactName: client.contactName || '',
            socialMedia: client.socialMedia || '',
            notes: client.notes || ''
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este contacto?')) return;
        try {
            const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Contacto eliminado');
                fetchClients();
            }
        } catch (error) {
            toast.error('Error al eliminar');
        }
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando Contactos Pro...</div>;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container" style={{ maxWidth: '1100px' }}>
            {/* Header Area */}
            <div className="glass-panel" style={{
                padding: window.innerWidth < 640 ? '1.5rem' : '2rem',
                marginBottom: '2rem',
                borderRadius: '32px',
                display: 'flex',
                flexDirection: window.innerWidth < 640 ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: window.innerWidth < 640 ? 'stretch' : 'center',
                gap: '1.5rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', padding: '15px', borderRadius: '20px', color: 'white', boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)' }}>
                        <Users size={32} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: window.innerWidth < 640 ? '1.4rem' : '1.8rem', fontWeight: '800' }}>Contactos Pro</h2>
                        <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>Base de datos centralizada</span>
                    </div>
                </div>
                <button
                    onClick={() => {
                        setEditingClient(null);
                        setFormData({ name: '', email: '', phone: '', contactName: '', socialMedia: '', notes: '' });
                        setShowForm(true);
                    }}
                    className="btn-primary"
                    style={{ padding: '12px 24px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                >
                    <Plus size={20} /> Nuevo Contacto
                </button>
            </div>

            {/* Search Bar */}
            <div className="glass-panel" style={{ padding: '0.8rem 1.5rem', marginBottom: '2rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Search size={20} style={{ opacity: 0.4 }} />
                <input
                    type="text"
                    placeholder="Buscar por nombre o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: 'inherit', width: '100%', outline: 'none', fontSize: '1.1rem' }}
                />
            </div>

            {/* Form Modal/Overlay */}
            <AnimatePresence>
                {showForm && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-panel"
                            style={{ width: '100%', maxWidth: '600px', padding: '2.5rem', borderRadius: '32px', position: 'relative' }}
                        >
                            <button onClick={() => setShowForm(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.5 }}><XCircle size={24} /></button>
                            <h3 style={{ marginTop: 0, marginBottom: '2rem', fontSize: '1.5rem' }}>{editingClient ? 'Editar Contacto' : 'Crear Nuevo Contacto'}</h3>

                            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.2rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 640 ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.5rem', display: 'block' }}>Razón Social *</label>
                                        <div style={{ position: 'relative' }}>
                                            <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', opacity: 0.4 }} />
                                            <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="glass-panel" style={{ width: '100%', padding: '10px 10px 10px 40px', background: 'rgba(255,255,255,0.03)', color: 'inherit' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.5rem', display: 'block' }}>Email Principal *</label>
                                        <div style={{ position: 'relative' }}>
                                            <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', opacity: 0.4 }} />
                                            <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="glass-panel" style={{ width: '100%', padding: '10px 10px 10px 40px', background: 'rgba(255,255,255,0.03)', color: 'inherit' }} />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 640 ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.5rem', display: 'block' }}>Teléfono (Opcional)</label>
                                        <div style={{ position: 'relative' }}>
                                            <Phone size={16} style={{ position: 'absolute', left: '12px', top: '12px', opacity: 0.4 }} />
                                            <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="glass-panel" style={{ width: '100%', padding: '10px 10px 10px 40px', background: 'rgba(255,255,255,0.03)', color: 'inherit' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.5rem', display: 'block' }}>Persona de Contacto</label>
                                        <div style={{ position: 'relative' }}>
                                            <Users size={16} style={{ position: 'absolute', left: '12px', top: '12px', opacity: 0.4 }} />
                                            <input type="text" value={formData.contactName} onChange={e => setFormData({ ...formData, contactName: e.target.value })} className="glass-panel" style={{ width: '100%', padding: '10px 10px 10px 40px', background: 'rgba(255,255,255,0.03)', color: 'inherit' }} />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.5rem', display: 'block' }}>Redes Sociales / Bio</label>
                                    <div style={{ position: 'relative' }}>
                                        <Globe size={16} style={{ position: 'absolute', left: '12px', top: '12px', opacity: 0.4 }} />
                                        <input type="text" value={formData.socialMedia} onChange={e => setFormData({ ...formData, socialMedia: e.target.value })} className="glass-panel" style={{ width: '100%', padding: '10px 10px 10px 40px', background: 'rgba(255,255,255,0.03)', color: 'inherit' }} />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.5rem', display: 'block' }}>Notas Internas</label>
                                    <div style={{ position: 'relative' }}>
                                        <FileText size={16} style={{ position: 'absolute', left: '12px', top: '12px', opacity: 0.4 }} />
                                        <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="glass-panel" style={{ width: '100%', padding: '10px 10px 10px 40px', background: 'rgba(255,255,255,0.03)', color: 'inherit', minHeight: '100px', resize: 'none', fontFamily: 'inherit' }} />
                                    </div>
                                </div>

                                <button type="submit" className="btn-primary" style={{ padding: '15px', marginTop: '1rem', borderRadius: '16px', fontWeight: 'bold' }}>
                                    {editingClient ? 'Actualizar Contacto' : 'Guardar Contacto'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* List Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '1.5rem' }}>
                {filteredClients.map(client => (
                    <motion.div
                        layout
                        key={client.id}
                        className="glass-panel"
                        style={{ padding: '1.5rem', borderRadius: '24px', position: 'relative', border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--primary-color)11', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
                                    {client.name[0].toUpperCase()}
                                </div>
                                <div>
                                    <h4 style={{ margin: 0, fontWeight: '700' }}>{client.name}</h4>
                                    <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>{client.id.substring(0, 8)}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={() => handleEdit(client)} style={{ background: 'transparent', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', padding: '5px' }}><Edit2 size={16} /></button>
                                <button onClick={() => handleDelete(client.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '5px' }}><Trash2 size={16} /></button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.8 }}>
                                <Mail size={14} /> {client.email}
                            </div>
                            {client.phone && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.8 }}>
                                    <Phone size={14} /> {client.phone}
                                </div>
                            )}
                            {client.contactName && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.8 }}>
                                    <User size={14} /> {client.contactName}
                                </div>
                            )}
                        </div>

                        {client.notes && (
                            <div style={{ marginTop: '0.5rem', padding: '0.8rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', fontSize: '0.8rem', opacity: 0.6 }}>
                                {client.notes}
                            </div>
                        )}

                        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
                            <span style={{ fontSize: '0.7rem', opacity: 0.3 }}>Actualizado: {new Date(client.updated_at).toLocaleDateString()}</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {filteredClients.length === 0 && !loading && (
                <div style={{ textAlign: 'center', padding: '5rem', opacity: 0.4 }}>
                    <Users size={64} style={{ marginBottom: '1rem' }} />
                    <h3>No se encontraron contactos</h3>
                    <p>Crea tu primer cliente o proveedor para empezar.</p>
                </div>
            )}
        </motion.div>
    );
};

export default ClientsView;
