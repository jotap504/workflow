import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, ShoppingCart, Package, ExternalLink, Activity, Settings, Save, Globe, Info, Heart, Layout, Image as ImageIcon, Smartphone } from 'lucide-react';

const ShopAdminView = () => {
    const [activeTab, setActiveTab] = useState('products'); // products, settings
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [settings, setSettings] = useState({
        shop_name: 'Carrito Pro',
        logo_url: '',
        banner_url: '',
        footer_text: '',
        contact_email: '',
        contact_phone: '',
        address: '',
        social_instagram: '',
        social_facebook: '',
        social_whatsapp: '',
        sections_config: { about: true, stories: true, purchase_process: true, contact: true },
        about_content: '',
        stories_content: '',
        purchase_process_content: ''
    });

    const [uploading, setUploading] = useState(false);

    const handleImageUpload = async (file, target, isSetting = false) => {
        if (!file) return;
        setUploading(true);
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (response.ok) {
                const data = await response.json();
                if (isSetting) {
                    setSettings(prev => ({ ...prev, [target]: data.url }));
                } else {
                    setFormData(prev => ({ ...prev, [target]: data.url }));
                }
                toast.success('Imagen subida correctamente');
            } else {
                toast.error('Error al subir imagen');
            }
        } catch (error) {
            toast.error('Error de red al subir imagen');
        } finally {
            setUploading(false);
        }
    };

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        type: 'physical',
        image_url: '',
        category: '',
        stock: 10,
        discount_price: '',
        meta_features: ''
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

    const fetchSettings = async () => {
        try {
            const response = await fetch('/api/shop/settings');
            if (response.ok) {
                const data = await response.json();
                setSettings({
                    ...data,
                    sections_config: typeof data.sections_config === 'string'
                        ? JSON.parse(data.sections_config)
                        : (data.sections_config || settings.sections_config)
                });
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchSettings();
    }, []);

    const handleSettingsSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            const response = await fetch('/api/shop/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(settings)
            });

            if (response.ok) {
                toast.success('Configuración de la tienda actualizada');
            } else {
                toast.error('Error al guardar configuración');
            }
        } catch (error) {
            toast.error('Error de red');
        }
    };

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
                setFormData({ name: '', description: '', price: '', type: 'physical', image_url: '', category: '', stock: 10, discount_price: '', meta_features: '' });
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
            category: product.category || '',
            stock: product.stock,
            discount_price: product.discount_price || '',
            meta_features: product.meta_features || ''
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
                    <p style={{ opacity: 0.6, margin: '5px 0 0 0', fontSize: '0.9rem' }}>Administra tus productos y personaliza tu sitio web.</p>
                </div>

                <div className="glass-panel" style={{ display: 'flex', padding: '5px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)' }}>
                    <button
                        onClick={() => setActiveTab('products')}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '10px',
                            background: activeTab === 'products' ? 'var(--primary-color)' : 'transparent',
                            color: activeTab === 'products' ? 'white' : 'inherit',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: '600',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Package size={18} /> Productos
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '10px',
                            background: activeTab === 'settings' ? 'var(--primary-color)' : 'transparent',
                            color: activeTab === 'settings' ? 'white' : 'inherit',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: '600',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Settings size={18} /> Configuración
                    </button>
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
                            setFormData({ name: '', description: '', price: '', type: 'physical', image_url: '', category: '', stock: 10, discount_price: '', meta_features: '' });
                            setShowForm(!showForm);
                        }}
                        className="btn-primary"
                        style={{ borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
                    >
                        <Plus size={20} /> {showForm ? 'Cancelar' : 'Nuevo Producto'}
                    </button>
                </div>
            </div>

            {activeTab === 'products' && (
                <>
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
                                        <label style={{ display: 'block', fontSize: '0.85rem', opacity: 0.7, marginBottom: '6px' }}>Precio con Descuento (Opcional)</label>
                                        <input
                                            type="number"
                                            className="glass-input"
                                            value={formData.discount_price}
                                            onChange={e => setFormData({ ...formData, discount_price: e.target.value })}
                                            style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', color: 'white' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', opacity: 0.7, marginBottom: '6px' }}>Stock Disponible</label>
                                        <input
                                            type="number"
                                            className="glass-input"
                                            value={formData.stock}
                                            onChange={e => setFormData({ ...formData, stock: e.target.value })}
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
                                        <label style={{ display: 'block', fontSize: '0.85rem', opacity: 0.7, marginBottom: '6px' }}>Imagen del Producto</label>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <input
                                                type="text"
                                                className="glass-input"
                                                value={formData.image_url}
                                                onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                                                placeholder="URL o sube una imagen"
                                                style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', color: 'white' }}
                                            />
                                            <label className="btn-primary" style={{ padding: '10px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: uploading ? 0.5 : 1 }}>
                                                <ImageIcon size={20} />
                                                <input type="file" hidden onChange={e => handleImageUpload(e.target.files[0], 'image_url')} accept="image/*" disabled={uploading} />
                                            </label>
                                        </div>
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
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            {!product.active && <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 'bold' }}>INACTIVO</span>}
                                            {product.stock <= 0 ? (
                                                <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 'bold', background: '#ef444411', padding: '2px 6px', borderRadius: '4px' }}>SIN STOCK</span>
                                            ) : product.stock < 5 ? (
                                                <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 'bold' }}>STOCK BAJO: {product.stock}</span>
                                            ) : (
                                                <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>Stock: {product.stock}</span>
                                            )}
                                            <Activity size={18} style={{ opacity: 0.3 }} />
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </>
            )}

            {activeTab === 'settings' && (
                <motion.form
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onSubmit={handleSettingsSubmit}
                    style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
                >
                    {/* Branding Section */}
                    <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid var(--card-border)' }}>
                        <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Globe size={20} className="text-primary" /> Identidad y Branding
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', opacity: 0.7, marginBottom: '6px' }}>Nombre de la Tienda</label>
                                <input
                                    type="text"
                                    className="glass-input"
                                    value={settings.shop_name}
                                    onChange={e => setSettings({ ...settings, shop_name: e.target.value })}
                                    style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', opacity: 0.7, marginBottom: '6px' }}>Logo de la Tienda</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input
                                        type="text"
                                        className="glass-input"
                                        value={settings.logo_url}
                                        onChange={e => setSettings({ ...settings, logo_url: e.target.value })}
                                        placeholder="URL o sube una imagen"
                                        style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white' }}
                                    />
                                    <label className="btn-primary" style={{ padding: '10px 15px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: uploading ? 0.5 : 1 }}>
                                        <ImageIcon size={20} />
                                        <input type="file" hidden onChange={e => handleImageUpload(e.target.files[0], 'logo_url', true)} accept="image/*" disabled={uploading} />
                                    </label>
                                    <div style={{ width: '45px', height: '45px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                        {settings.logo_url ? <img src={settings.logo_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Logo" /> : <ImageIcon size={20} opacity={0.3} />}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', opacity: 0.7, marginBottom: '6px' }}>Banner de la Tienda</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input
                                        type="text"
                                        className="glass-input"
                                        value={settings.banner_url}
                                        onChange={e => setSettings({ ...settings, banner_url: e.target.value })}
                                        placeholder="URL o sube una imagen"
                                        style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white' }}
                                    />
                                    <label className="btn-primary" style={{ padding: '10px 15px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: uploading ? 0.5 : 1 }}>
                                        <ImageIcon size={20} />
                                        <input type="file" hidden onChange={e => handleImageUpload(e.target.files[0], 'banner_url', true)} accept="image/*" disabled={uploading} />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sections Visibility Section */}
                    <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid var(--card-border)' }}>
                        <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Layout size={20} className="text-primary" /> Secciones del Sitio
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            {[
                                { id: 'about', label: 'Quiénes Somos', icon: <Heart size={16} /> },
                                { id: 'stories', label: 'Historias / Blog', icon: <Info size={16} /> },
                                { id: 'purchase_process', label: 'Proceso de Compra', icon: <Globe size={16} /> },
                                { id: 'contact', label: 'Sección de Contacto', icon: <Smartphone size={16} /> }
                            ].map(section => (
                                <div key={section.id} className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: settings.sections_config[section.id] ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.02)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ opacity: settings.sections_config[section.id] ? 1 : 0.4 }}>{section.icon}</span>
                                        <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{section.label}</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.sections_config[section.id]}
                                        onChange={e => setSettings({
                                            ...settings,
                                            sections_config: { ...settings.sections_config, [section.id]: e.target.checked }
                                        })}
                                        style={{ cursor: 'pointer', width: '20px', height: '20px', accentColor: 'var(--primary-color)' }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Content Editor Section */}
                    <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid var(--card-border)' }}>
                        <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Edit2 size={20} className="text-primary" /> Contenido de Secciones
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', opacity: 0.7, marginBottom: '6px' }}>Contenido de "Quiénes Somos"</label>
                                <textarea
                                    className="glass-input"
                                    rows="4"
                                    value={settings.about_content}
                                    onChange={e => setSettings({ ...settings, about_content: e.target.value })}
                                    style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white', resize: 'vertical' }}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', opacity: 0.7, marginBottom: '6px' }}>Proceso de Compra</label>
                                    <textarea
                                        className="glass-input"
                                        rows="3"
                                        value={settings.purchase_process_content}
                                        onChange={e => setSettings({ ...settings, purchase_process_content: e.target.value })}
                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white', resize: 'vertical' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', opacity: 0.7, marginBottom: '6px' }}>Footer Text / Derechos</label>
                                    <textarea
                                        className="glass-input"
                                        rows="3"
                                        value={settings.footer_text}
                                        onChange={e => setSettings({ ...settings, footer_text: e.target.value })}
                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white', resize: 'vertical' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Social & Contact Section */}
                    <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid var(--card-border)' }}>
                        <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Smartphone size={20} className="text-primary" /> Contacto y Redes Sociales
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', opacity: 0.7, marginBottom: '6px' }}>Instagram (URL)</label>
                                <input type="text" className="glass-input" value={settings.social_instagram} onChange={e => setSettings({ ...settings, social_instagram: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', opacity: 0.7, marginBottom: '6px' }}>Facebook (URL)</label>
                                <input type="text" className="glass-input" value={settings.social_facebook} onChange={e => setSettings({ ...settings, social_facebook: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', opacity: 0.7, marginBottom: '6px' }}>WhatsApp (Número)</label>
                                <input type="text" className="glass-input" value={settings.social_whatsapp} onChange={e => setSettings({ ...settings, social_whatsapp: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', opacity: 0.7, marginBottom: '6px' }}>Teléfono de Contacto</label>
                                <input type="text" className="glass-input" value={settings.contact_phone} onChange={e => setSettings({ ...settings, contact_phone: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', opacity: 0.7, marginBottom: '6px' }}>Email de Contacto</label>
                                <input type="email" className="glass-input" value={settings.contact_email} onChange={e => setSettings({ ...settings, contact_email: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', opacity: 0.7, marginBottom: '6px' }}>Dirección / Ubicación</label>
                                <input type="text" className="glass-input" value={settings.address} onChange={e => setSettings({ ...settings, address: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white' }} />
                            </div>
                        </div>
                    </div>

                    <div style={{ position: 'sticky', bottom: '20px', zIndex: 100 }}>
                        <button
                            type="submit"
                            className="btn-primary"
                            style={{
                                width: '100%',
                                padding: '18px',
                                borderRadius: '15px',
                                fontSize: '1.1rem',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '15px',
                                boxShadow: '0 10px 30px rgba(99, 102, 241, 0.4)'
                            }}
                        >
                            <Save size={24} /> Guardar Toda la Configuración
                        </button>
                    </div>
                </motion.form>
            )}
        </motion.div>
    );
};

export default ShopAdminView;
