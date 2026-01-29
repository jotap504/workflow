import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, X, Check, Palette } from 'lucide-react';

const CategoriesView = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [formData, setFormData] = useState({ name: '', color: '#6366f1' });

    const fetchCategories = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/categories', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) setCategories(await response.json());
        } catch (error) {
            toast.error('Error al cargar categorías');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const url = editingCategory
            ? `/api/categories/${editingCategory.id}`
            : '/api/categories';
        const method = editingCategory ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                toast.success(editingCategory ? 'Categoría actualizada' : 'Categoría creada');
                setIsModalOpen(false);
                setEditingCategory(null);
                setFormData({ name: '', color: '#6366f1' });
                fetchCategories();
            } else {
                const data = await response.json();
                toast.error(data.error || 'Error al guardar');
            }
        } catch (error) {
            toast.error('Error de red');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar esta categoría? Las tareas asociadas podrían quedar sin categoría.')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/categories/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                toast.success('Categoría eliminada');
                fetchCategories();
            } else {
                toast.error('No se pudo eliminar');
            }
        } catch (error) {
            toast.error('Error de red');
        }
    };

    const openModal = (cat = null) => {
        if (cat) {
            setEditingCategory(cat);
            setFormData({ name: cat.name, color: cat.color });
        } else {
            setEditingCategory(null);
            setFormData({ name: '', color: '#6366f1' });
        }
        setIsModalOpen(true);
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando...</div>;

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ margin: 0 }}>Gestión de Categorías</h2>
                    <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>Administra las áreas de trabajo para tus clientes</p>
                </div>
                <button onClick={() => openModal()} className="btn-primary" style={{ borderRadius: '12px', padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Plus size={20} /> Nueva Categoría
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.2rem' }}>
                {categories.map(cat => (
                    <motion.div
                        key={cat.id}
                        className="glass-panel"
                        style={{ padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `6px solid ${cat.color}` }}
                    >
                        <div>
                            <h4 style={{ margin: 0 }}>{cat.name}</h4>
                            <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '4px' }}>Color: {cat.color}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => openModal(cat)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', color: 'var(--primary-color)' }}>
                                <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDelete(cat.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', color: '#ef4444' }}>
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-panel"
                            style={{ width: '100%', maxWidth: '450px', padding: '2rem' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0 }}>{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
                                <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}><X size={20} /></button>
                            </div>

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', opacity: 0.7, marginBottom: '6px' }}>Nombre</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', padding: '12px', borderRadius: '10px', color: 'inherit' }}
                                        placeholder="Ej: Atención al Cliente"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', opacity: 0.7, marginBottom: '6px' }}>Color Distintivo</label>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <input
                                            type="color"
                                            value={formData.color}
                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                            style={{ width: '50px', height: '50px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                                        />
                                        <input
                                            type="text"
                                            value={formData.color}
                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', padding: '12px', borderRadius: '10px', color: 'inherit' }}
                                        />
                                    </div>
                                </div>
                                <button type="submit" className="btn-primary" style={{ padding: '14px', borderRadius: '12px', marginTop: '1rem', fontWeight: '600' }}>
                                    {editingCategory ? 'Actualizar' : 'Crear'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default CategoriesView;
