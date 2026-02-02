import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, ShoppingCart, Package, ExternalLink, Activity } from 'lucide-react';

const ShopAdminView = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        type: 'physical',
        image_url: '',
        category: ''
    });

    const fetchProducts = async () => {
        try {
            const response = await fetch('/api/shop');
            if (response.ok) {
                const data = await response.json();
                setProducts(data);
            }
        } catch (error) {
            toast.error('Error al cargar productos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const method = editingProduct ? 'PUT' : 'POST';
        const url = editingProduct ? `/api/shop/${editingProduct.id}` : '/api/shop';

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
                toast.success(editingProduct ? 'Producto actualizado' : 'Producto creado');
                setFormData({ name: '', description: '', price: '', type: 'physical', image_url: '', category: '' });
                setShowForm(false);
                setEditingProduct(null);
                fetchProducts();
            } else {
                toast.error('Error al guardar producto');
            }
        } catch (error) {
            toast.error('Error de red');
        }
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            description: product.description || '',
            price: product.price,
            type: product.type,
            image_url: product.image_url || '',
            category: product.category || ''
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este producto?')) return;
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`/api/shop/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                toast.success('Producto eliminado');
                fetchProducts();
            }
        } catch (error) {
            toast.error('Error de red');
        }
    };

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando catálogo...</div>;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ShoppingCart className="text-primary" /> Carrito Pro: Gestión
                    </h2>
                    <p style={{ opacity: 0.6, margin: '5px 0 0 0', fontSize: '0.9rem' }}>Administra tus productos, cursos y suscripciones.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => window.open('/store', '_blank')}
                        className="glass-panel"
                        style={{ borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', color: 'var(--primary-color)', border: '1px solid var(--primary-color)44' }}
                    >
                        <ExternalLink size={18} /> Ver Tienda
                    </button>
                    <button
                        onClick={() => {
                            setEditingProduct(null);
                            setFormData({ name: '', description: '', price: '', type: 'physical', image_url: '', category: '' });
                            setShowForm(!showForm);
                        }}
                        className="btn-primary"
                        style={{ borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
                    >
                        <Plus size={20} /> {showForm ? 'Cancelar' : 'Nuevo Producto'}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {showForm && (
                    <motion.form
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        onSubmit={handleSubmit}
                        style={{ overflow: 'hidden', background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem', border: '1px solid var(--card-border)' }}
                    >
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', opacity: 0.7, marginBottom: '6px' }}>Nombre del Producto</label>
                                <input
                                    type="text"
                                    required
                                    className="glass-input"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', color: 'white' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', opacity: 0.7, marginBottom: '6px' }}>Precio (ARS)</label>
                                <input
                                    type="number"
                                    required
                                    className="glass-input"
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                                    style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', color: 'white' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', opacity: 0.7, marginBottom: '6px' }}>Tipo de Producto</label>
                                <select
                                    className="glass-input"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'white' }}
                                >
                                    <option value="physical">Físico</option>
                                    <option value="virtual">Virtual / Descargable</option>
                                    <option value="course">Curso Online</option>
                                    <option value="subscription">Suscripción</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', opacity: 0.7, marginBottom: '6px' }}>URL de Imagen</label>
                                <input
                                    type="text"
                                    className="glass-input"
                                    value={formData.image_url}
                                    onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                                    placeholder="https://..."
                                    style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', color: 'white' }}
                                />
                            </div>
                        </div>
                        <div style={{ marginTop: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', opacity: 0.7, marginBottom: '6px' }}>Descripción</label>
                            <textarea
                                rows="3"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', color: 'white', resize: 'none' }}
                            ></textarea>
                        </div>
                        <button type="submit" className="btn-primary" style={{ marginTop: '1.5rem', width: '100%', padding: '12px', borderRadius: '10px' }}>
                            {editingProduct ? 'Actualizar Producto' : 'Guardar Producto'}
                        </button>
                    </motion.form>
                )}
            </AnimatePresence>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {products.length === 0 ? (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
                        <Package size={48} style={{ marginBottom: '1rem' }} />
                        <p>No hay productos registrados aún.</p>
                    </div>
                ) : (
                    products.map(product => (
                        <motion.div
                            key={product.id}
                            layout
                            className="glass-panel"
                            style={{
                                padding: '1.5rem',
                                border: '1px solid var(--card-border)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem',
                                position: 'relative'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{
                                    padding: '4px 10px',
                                    borderRadius: '20px',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    background: product.type === 'course' ? '#8b5cf622' : '#6366f122',
                                    color: product.type === 'course' ? '#a78bfa' : '#818cf8',
                                    textTransform: 'uppercase'
                                }}>
                                    {product.type === 'course' ? 'Curso' : product.type === 'physical' ? 'Físico' : 'Digital'}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => handleEdit(product)} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', padding: '5px' }}><Edit2 size={16} /></button>
                                    <button onClick={() => handleDelete(product.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '5px' }}><Trash2 size={16} /></button>
                                </div>
                            </div>

                            {product.image_url && (
                                <img
                                    src={product.image_url}
                                    alt={product.name}
                                    style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '12px', border: '1px solid var(--card-border)' }}
                                />
                            )}

                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{product.name}</h3>
                                <p style={{ fontSize: '0.9rem', opacity: 0.6, marginTop: '5px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {product.description || 'Sin descripción.'}
                                </p>
                            </div>

                            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary-color)' }}>
                                    ${product.price.toLocaleString()}
                                </span>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {!product.active && <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 'bold' }}>INACTIVO</span>}
                                    <Activity size={18} style={{ opacity: 0.3 }} />
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </motion.div>
    );
};

export default ShopAdminView;
