import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, ShoppingBag, X, Plus, Minus, Check, ArrowRight, BookOpen, Package, Trash2, User, Instagram, Facebook, Smartphone, Mail, MapPin, Heart, Info, HelpCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const CustomerAuthModal = ({ isOpen, onClose, onSuccess }) => {
    const { login, register } = useAuth();
    const [isRegister, setIsRegister] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ email: '', password: '', username: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = isRegister
                ? await register(formData.email, formData.password, formData.username, 'customer')
                : await login(formData.email, formData.password);

            if (result.success) {
                toast.success(isRegister ? 'Cuenta creada con éxito' : 'Bienvenido de nuevo');
                onSuccess();
                onClose();
            } else {
                toast.error(result.error || 'Error en la autenticación');
            }
        } catch (error) {
            toast.error('Error inesperado');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="glass-panel"
                    style={{ width: 'min(100%, 400px)', padding: '2.5rem', position: 'relative', zIndex: 2001 }}
                >
                    <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent' }}><X size={20} /></button>

                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '15px', background: 'linear-gradient(45deg, #6366f1, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', margin: '0 auto 1rem' }}>
                            <User size={30} />
                        </div>
                        <h2 style={{ margin: 0 }}>{isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}</h2>
                        <p style={{ opacity: 0.6, fontSize: '0.9rem', marginTop: '5px' }}>Necesitas una cuenta de cliente para comprar.</p>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        {isRegister && (
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px' }}>Nombre de Usuario</label>
                                <input
                                    type="text"
                                    required
                                    className="glass-input"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white' }}
                                />
                            </div>
                        )}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px' }}>Email</label>
                            <input
                                type="email"
                                required
                                className="glass-input"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px' }}>Contraseña</label>
                            <input
                                type="password"
                                required
                                className="glass-input"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white' }}
                            />
                        </div>
                        <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '15px', borderRadius: '12px', fontWeight: '700', marginTop: '1rem' }}>
                            {loading ? 'Procesando...' : isRegister ? 'Registrarse' : 'Entrar'}
                        </button>
                    </form>

                    <button
                        onClick={() => setIsRegister(!isRegister)}
                        style={{ width: '100%', marginTop: '1.5rem', background: 'transparent', fontSize: '0.9rem', opacity: 0.7 }}
                    >
                        {isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
                    </button>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

const PublicStorefront = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const { cart, addToCart, removeFromCart, updateQuantity, cartTotal, cartCount, clearCart } = useCart();
    const { user, logout } = useAuth();
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [checkoutStep, setCheckoutStep] = useState('cart'); // cart, info, payment, success
    const [customerData, setCustomerData] = useState({ name: '', email: '' });
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [activeSection, setActiveSection] = useState('shop');
    const [settings, setSettings] = useState({
        shop_name: 'Carrito Pro',
        logo_url: '',
        banner_url: '',
        footer_text: '© 2026 Carrito Pro. Todos los derechos reservados.',
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

    const scrollToSection = (sectionId) => {
        setActiveSection(sectionId);
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            // Fallback for when section hasn't rendered yet or is top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };
    const navigate = useNavigate();

    const fetchProducts = async () => {
        try {
            const response = await fetch('/api/shop');
            if (response.ok) {
                const data = await response.json();
                setProducts(data);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const response = await fetch('/api/shop/settings');
            if (response.ok) {
                const data = await response.json();
                // If it's an object with keys, it's valid (even without id)
                if (data && Object.keys(data).length > 0) {
                    setSettings({
                        ...settings, // Fallback to defaults
                        ...data,
                        sections_config: typeof data.sections_config === 'string'
                            ? JSON.parse(data.sections_config)
                            : (data.sections_config || settings.sections_config)
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchSettings();
    }, []);

    const handleCheckout = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('Debes iniciar sesión para finalizar la compra');
            return;
        }

        try {
            const response = await fetch('/api/shop/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    items: cart,
                    total_amount: cartTotal,
                    customer_name: customerData.name,
                    customer_email: customerData.email
                })
            });

            if (response.ok) {
                setCheckoutStep('success');
                clearCart();
                toast.success('¡Compra realizada con éxito!');
            } else {
                toast.error('Error al procesar el pedido');
            }
        } catch (error) {
            toast.error('Error de red');
        }
    };

    if (loading) return <div style={{ padding: '5rem', textAlign: 'center' }}>Cargando tienda...</div>;

    return (
        <div className="store-container" style={{ minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-color)' }}>
            {/* Store Header */}
            <header className="glass-panel" style={{
                position: 'sticky',
                top: 0,
                zIndex: 100,
                padding: window.innerWidth < 768 ? '0.8rem 1rem' : '1rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderRadius: '0 0 20px 20px',
                borderTop: 'none'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => scrollToSection('shop')}>
                    {settings.logo_url ? (
                        <img src={settings.logo_url} alt="Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                    ) : (
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(45deg, #6366f1, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                            <ShoppingBag size={24} />
                        </div>
                    )}
                    <h1 style={{ fontSize: '1rem', margin: 0, fontWeight: '800' }}>{settings.shop_name}</h1>
                </div>

                <nav className="desktop-nav" style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                    <button
                        onClick={() => scrollToSection('shop')}
                        style={{ background: 'transparent', fontWeight: activeSection === 'shop' ? '700' : '500', color: activeSection === 'shop' ? 'var(--primary-color)' : 'inherit', border: 'none', cursor: 'pointer', fontSize: '0.7rem' }}
                    >
                        Tienda
                    </button>
                    {settings.sections_config.about && (
                        <button
                            onClick={() => scrollToSection('about')}
                            style={{ background: 'transparent', fontWeight: activeSection === 'about' ? '700' : '500', color: activeSection === 'about' ? 'var(--primary-color)' : 'inherit', border: 'none', cursor: 'pointer', fontSize: '0.7rem' }}
                        >
                            Nosotros
                        </button>
                    )}
                    {settings.sections_config.stories && (
                        <button
                            onClick={() => scrollToSection('stories')}
                            style={{ background: 'transparent', fontWeight: activeSection === 'stories' ? '700' : '500', color: activeSection === 'stories' ? 'var(--primary-color)' : 'inherit', border: 'none', cursor: 'pointer', fontSize: '0.7rem' }}
                        >
                            Historias
                        </button>
                    )}
                    {settings.sections_config.purchase_process && (
                        <button
                            onClick={() => scrollToSection('process')}
                            style={{ background: 'transparent', fontWeight: activeSection === 'process' ? '700' : '500', color: activeSection === 'process' ? 'var(--primary-color)' : 'inherit', border: 'none', cursor: 'pointer', fontSize: '0.7rem' }}
                        >
                            ¿Cómo Comprar?
                        </button>
                    )}
                    {settings.sections_config.contact && (
                        <button
                            onClick={() => scrollToSection('contact')}
                            style={{ background: 'transparent', fontWeight: activeSection === 'contact' ? '700' : '500', color: activeSection === 'contact' ? 'var(--primary-color)' : 'inherit', border: 'none', cursor: 'pointer', fontSize: '0.7rem' }}
                        >
                            Contacto
                        </button>
                    )}
                </nav>

                <div style={{ display: 'flex', gap: window.innerWidth < 768 ? '0.5rem' : '1.5rem', alignItems: 'center' }}>
                    {user ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ textAlign: 'right', display: 'none', sm: 'block' }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>{user.username}</div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Cliente</div>
                            </div>
                            <button
                                onClick={logout}
                                className="glass-panel"
                                style={{ padding: '6px 10px', color: '#ef4444', fontSize: '0.7rem' }}
                            >
                                Salir
                            </button>
                            {user.role === 'admin' && (
                                <button
                                    onClick={() => navigate('/hub')}
                                    className="glass-panel"
                                    style={{ padding: '6px 10px', fontWeight: '600', color: 'var(--primary-color)', fontSize: '0.75rem' }}
                                >
                                    Hub
                                </button>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsAuthModalOpen(true)}
                            className="glass-panel"
                            style={{ padding: '7px 14px', fontWeight: '600', fontSize: '0.75rem' }}
                        >
                            Iniciar Sesión
                        </button>
                    )}
                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="glass-panel"
                        style={{ padding: '7px 14px', display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', fontSize: '0.75rem' }}
                    >
                        <ShoppingCart size={16} />
                        <span style={{ fontWeight: '600', display: window.innerWidth < 768 ? 'none' : 'block' }}>Carrito</span>
                        {cartCount > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: '-8px',
                                right: '-8px',
                                background: 'var(--primary-color)',
                                color: 'white',
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                fontSize: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold'
                            }}>
                                {cartCount}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            <main className="container" style={{ padding: window.innerWidth < 768 ? '2rem 1rem' : '3rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '4rem' }}>
                {/* Shop Section */}
                <section id="shop">
                    <div style={{
                        marginBottom: '3rem',
                        textAlign: 'center',
                        padding: window.innerWidth < 768 ? '3rem 1.5rem' : '5rem 2rem',
                        borderRadius: window.innerWidth < 768 ? '15px' : '30px',
                        background: settings.banner_url ? `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${settings.banner_url})` : 'rgba(255,255,255,0.02)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        border: '1px solid var(--card-border)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.8rem)', fontWeight: '900', marginBottom: '1rem', textShadow: '0 5px 15px rgba(0,0,0,0.5)' }}
                        >
                            {settings.shop_name}
                        </motion.h2>
                        <p style={{ fontSize: '0.85rem', opacity: 0.9, maxWidth: '600px', margin: '0 auto', fontWeight: '500' }}>
                            Explora nuestra selección Premium de productos y servicios exclusivos.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
                        {products.map((product, idx) => (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.05 }}
                                className="glass-panel"
                                onClick={() => setSelectedProduct(product)}
                                style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden', cursor: 'pointer' }}
                            >
                                <div style={{ height: '200px', borderRadius: '12px', background: 'rgba(0,0,0,0.1)', overflow: 'hidden', position: 'relative' }}>
                                    {product.image_url ? (
                                        <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                                            <Package size={48} />
                                        </div>
                                    )}
                                    <div style={{
                                        position: 'absolute',
                                        top: '10px',
                                        right: '10px',
                                        padding: '5px 12px',
                                        borderRadius: '20px',
                                        background: 'rgba(0,0,0,0.6)',
                                        backdropFilter: 'blur(5px)',
                                        color: 'white',
                                        fontSize: '0.7rem',
                                        fontWeight: '700',
                                        textTransform: 'uppercase'
                                    }}>
                                        {product.type === 'course' ? 'Curso' : product.type === 'physical' ? 'Físico' : 'Digital'}
                                    </div>
                                    {product.discount_price && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '10px',
                                            left: '10px',
                                            padding: '5px 12px',
                                            borderRadius: '20px',
                                            background: '#ef4444',
                                            color: 'white',
                                            fontSize: '0.7rem',
                                            fontWeight: '800',
                                            textTransform: 'uppercase',
                                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                                        }}>
                                            Oferta
                                        </div>
                                    )}
                                    {product.stock <= 0 && (
                                        <div style={{
                                            position: 'absolute',
                                            inset: 0,
                                            background: 'rgba(0,0,0,0.6)',
                                            backdropFilter: 'blur(2px)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                            fontWeight: '800',
                                            fontSize: '1.2rem'
                                        }}>
                                            AGOTADO
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <h3 style={{ fontSize: '0.85rem', marginBottom: '6px' }}>{product.name}</h3>
                                    <p style={{ fontSize: '0.65rem', opacity: 0.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '2rem' }}>
                                        {product.description || 'Sin descripción disponible.'}
                                    </p>
                                </div>

                                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        {product.discount_price ? (
                                            <>
                                                <span style={{ fontSize: '0.85rem', opacity: 0.5, textDecoration: 'line-through' }}>
                                                    ${product.price.toLocaleString()}
                                                </span>
                                                <span style={{ fontSize: '1.05rem', fontWeight: '800', color: '#ef4444' }}>
                                                    ${product.discount_price.toLocaleString()}
                                                </span>
                                            </>
                                        ) : (
                                            <span style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--primary-color)' }}>
                                                ${product.price.toLocaleString()}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            addToCart({
                                                ...product,
                                                price: product.discount_price || product.price
                                            });
                                            toast.success(`Añadido: ${product.name}`);
                                        }}
                                        className="btn-primary"
                                        disabled={product.stock <= 0}
                                        style={{
                                            borderRadius: '8px',
                                            padding: '6px 12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            fontSize: '0.75rem',
                                            opacity: product.stock <= 0 ? 0.5 : 1,
                                            cursor: product.stock <= 0 ? 'not-allowed' : 'pointer',
                                            filter: product.stock <= 0 ? 'grayscale(1)' : 'none'
                                        }}
                                    >
                                        {product.stock <= 0 ? 'Sin Stock' : <><Plus size={18} /> Añadir</>}
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* About Section */}
                {settings.sections_config.about && (
                    <motion.section
                        id="about"
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        className="glass-panel"
                        style={{ padding: window.innerWidth < 768 ? '2rem 1.5rem' : '4rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}
                    >
                        <h2 style={{ fontSize: '1.6rem', fontWeight: '900', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Heart className="text-primary" /> Quiénes Somos
                        </h2>
                        <div style={{ fontSize: '0.85rem', lineHeight: '1.6', opacity: 0.8, whiteSpace: 'pre-wrap' }}>
                            {settings.about_content || 'Contenido no disponible.'}
                        </div>
                    </motion.section>
                )}

                {/* Stories Section */}
                {settings.sections_config.stories && (
                    <motion.section
                        id="stories"
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        className="glass-panel"
                        style={{ padding: window.innerWidth < 768 ? '2rem 1.5rem' : '4rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}
                    >
                        <h2 style={{ fontSize: '1.6rem', fontWeight: '900', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <BookOpen className="text-primary" /> Historias y Comunidad
                        </h2>
                        <div style={{ fontSize: '0.85rem', lineHeight: '1.6', opacity: 0.8, whiteSpace: 'pre-wrap' }}>
                            {settings.stories_content || 'Aún no hay historias para compartir.'}
                        </div>
                    </motion.section>
                )}

                {/* Process Section */}
                {settings.sections_config.purchase_process && (
                    <motion.section
                        id="process"
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        className="glass-panel"
                        style={{ padding: window.innerWidth < 768 ? '2rem 1.5rem' : '4rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}
                    >
                        <h2 style={{ fontSize: '1.6rem', fontWeight: '900', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <HelpCircle className="text-primary" /> Proceso de Compra
                        </h2>
                        <div style={{ fontSize: '0.85rem', lineHeight: '1.6', opacity: 0.8, whiteSpace: 'pre-wrap' }}>
                            {settings.purchase_process_content || 'Información sobre el proceso de compra disponible próximamente.'}
                        </div>
                    </motion.section>
                )}

                {/* Contact Section */}
                {settings.sections_config.contact && (
                    <motion.section
                        id="contact"
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        className="glass-panel"
                        style={{ padding: window.innerWidth < 768 ? '2rem 1.5rem' : '4rem', maxWidth: '800px', margin: '0 auto', textAlign: 'center', width: '100%' }}
                    >
                        <h2 style={{ fontSize: '1.75rem', fontWeight: '900', marginBottom: '1.5rem' }}>Ponte en Contacto</h2>
                        <p style={{ opacity: 0.7, marginBottom: '2rem', fontSize: '0.85rem' }}>¿Tienes alguna duda o necesitas asesoramiento? Estamos aquí para ayudarte.</p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {settings.contact_email && (
                                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '20px', background: 'rgba(255,255,255,0.03)' }}>
                                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Mail size={24} className="text-primary" />
                                    </div>
                                    <div style={{ textAlign: 'left' }}>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>Email</div>
                                        <div style={{ fontWeight: '600' }}>{settings.contact_email}</div>
                                    </div>
                                </div>
                            )}
                            {settings.contact_phone && (
                                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '20px', background: 'rgba(255,255,255,0.03)' }}>
                                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Smartphone size={24} className="text-primary" />
                                    </div>
                                    <div style={{ textAlign: 'left' }}>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>Teléfono / WhatsApp</div>
                                        <div style={{ fontWeight: '600' }}>{settings.contact_phone}</div>
                                    </div>
                                </div>
                            )}
                            {settings.address && (
                                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '20px', background: 'rgba(255,255,255,0.03)' }}>
                                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <MapPin size={24} className="text-primary" />
                                    </div>
                                    <div style={{ textAlign: 'left' }}>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>Ubicación</div>
                                        <div style={{ fontWeight: '600' }}>{settings.address}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.section>
                )}
            </main>

            {/* Footer Section */}
            <footer className="glass-panel" style={{ marginTop: '5rem', padding: window.innerWidth < 768 ? '3rem 1.5rem' : '4rem 2rem', borderRadius: '40px 40px 0 0', borderBottom: 'none' }}>
                <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '3rem' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                            {settings.logo_url ? <img src={settings.logo_url} alt="Logo" style={{ width: '30px', height: '30px' }} /> : <ShoppingBag size={24} className="text-primary" />}
                            <h3 style={{ margin: 0, fontWeight: '800' }}>{settings.shop_name}</h3>
                        </div>
                        <p style={{ opacity: 0.6, fontSize: '0.9rem', lineHeight: '1.6' }}>
                            Potenciando negocios y personas a través de soluciones digitales de alta calidad y productos certificados.
                        </p>
                    </div>

                    <div>
                        <h4 style={{ marginBottom: '1.5rem' }}>Enlaces Rápidos</h4>
                        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px', opacity: 0.7, fontSize: '0.9rem' }}>
                            <li style={{ cursor: 'pointer' }} onClick={() => setActiveSection('shop')}>Tienda Online</li>
                            {settings.sections_config.about && <li style={{ cursor: 'pointer' }} onClick={() => setActiveSection('about')}>Quíenes Somos</li>}
                            {settings.sections_config.stories && <li style={{ cursor: 'pointer' }} onClick={() => setActiveSection('stories')}>Nuestras Historias</li>}
                            {settings.sections_config.purchase_process && <li style={{ cursor: 'pointer' }} onClick={() => setActiveSection('process')}>Guía de Compra</li>}
                            <li style={{ cursor: 'pointer' }} onClick={() => setActiveSection('contact')}>Soporte y Contacto</li>
                        </ul>
                    </div>

                    <div>
                        <h4 style={{ marginBottom: '1.5rem' }}>Redes Sociales</h4>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            {settings.social_instagram && (
                                <a href={settings.social_instagram} target="_blank" rel="noopener noreferrer" className="glass-panel" style={{ width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'inherit' }}>
                                    <Instagram size={20} />
                                </a>
                            )}
                            {settings.social_facebook && (
                                <a href={settings.social_facebook} target="_blank" rel="noopener noreferrer" className="glass-panel" style={{ width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'inherit' }}>
                                    <Facebook size={20} />
                                </a>
                            )}
                            {settings.social_whatsapp && (
                                <a href={`https://wa.me/${settings.social_whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="glass-panel" style={{ width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'inherit' }}>
                                    <Smartphone size={20} />
                                </a>
                            )}
                        </div>
                    </div>
                </div>
                <div style={{ textAlign: 'center', marginTop: '4rem', opacity: 0.4, fontSize: '0.8rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {settings.footer_text}
                </div>
            </footer>

            {/* Shopping Cart Drawer */}
            <AnimatePresence>
                {isCartOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCartOpen(false)}
                            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 1000 }}
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            style={{
                                position: 'fixed',
                                top: 0,
                                right: 0,
                                bottom: 0,
                                width: 'min(100%, 450px)',
                                background: 'var(--bg-color)',
                                borderLeft: '1px solid var(--card-border)',
                                zIndex: 1001,
                                padding: '2rem',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                                    <ShoppingCart size={18} /> Tu Carrito
                                </h2>
                                <button onClick={() => { setIsCartOpen(false); setCheckoutStep('cart'); }} style={{ background: 'transparent', padding: '5px' }}><X size={24} /></button>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingRight: '10px' }} className="hide-scrollbar">
                                {checkoutStep === 'cart' && (
                                    <>
                                        {cart.length === 0 ? (
                                            <div style={{ textAlign: 'center', margin: 'auto', opacity: 0.5 }}>
                                                <ShoppingBag size={64} style={{ marginBottom: '1rem' }} />
                                                <p>Tu carrito está vacío.</p>
                                            </div>
                                        ) : (
                                            cart.map(item => (
                                                <div key={item.id} className="glass-panel" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', position: 'relative' }}>
                                                    <div style={{ width: '60px', height: '60px', borderRadius: '8px', background: 'rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                                                        {item.image_url && <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <h4 style={{ margin: '0 0 2px 0', fontSize: '1rem' }}>{item.name}</h4>
                                                        <div style={{ fontSize: '0.7rem', opacity: 0.6, textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px' }}>
                                                            {item.type === 'course' ? 'Curso' : item.type === 'physical' ? 'Físico' : 'Digital'}
                                                        </div>
                                                        <span style={{ fontWeight: '700', color: 'var(--primary-color)' }}>${(item.price * item.quantity).toLocaleString()}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }}
                                                            style={{ background: 'transparent', color: '#ef4444', padding: '4px', opacity: 0.7 }}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '4px' }}>
                                                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} style={{ padding: '4px', background: 'transparent' }}><Minus size={12} /></button>
                                                            <span style={{ fontWeight: 'bold', width: '20px', textAlign: 'center', fontSize: '0.9rem' }}>{item.quantity}</span>
                                                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} style={{ padding: '4px', background: 'transparent' }}><Plus size={12} /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </>
                                )}

                                {checkoutStep === 'info' && (
                                    <form id="checkout-form" onSubmit={handleCheckout} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        <h3 style={{ fontSize: '1.1rem', opacity: 0.8 }}>Datos de Envío / Contacto</h3>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px' }}>Nombre Completo</label>
                                            <input
                                                type="text"
                                                required
                                                className="glass-input"
                                                value={customerData.name}
                                                onChange={e => setCustomerData({ ...customerData, name: e.target.value })}
                                                style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.1)', border: '1px solid var(--card-border)', color: 'white' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px' }}>Correo Electrónico</label>
                                            <input
                                                type="email"
                                                required
                                                className="glass-input"
                                                value={customerData.email}
                                                onChange={e => setCustomerData({ ...customerData, email: e.target.value })}
                                                style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.1)', border: '1px solid var(--card-border)', color: 'white' }}
                                            />
                                        </div>
                                        <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid #6366f133' }}>
                                            <p style={{ margin: 0, fontSize: '0.85rem' }}>
                                                <strong>Nota:</strong> Los datos se validarán en el siguiente paso de pago simulado.
                                            </p>
                                        </div>
                                    </form>
                                )}

                                {checkoutStep === 'payment' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', textAlign: 'center' }}>
                                        <div style={{ padding: '2rem', background: '#009ee3', borderRadius: '16px', color: 'white' }}>
                                            <h3 style={{ margin: 0 }}>Mercado Pago</h3>
                                            <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>Pasarela Segura</p>
                                        </div>
                                        <div>
                                            <h4 style={{ margin: '0 0 10px 0' }}>Estás pagando</h4>
                                            <div style={{ fontSize: '2.5rem', fontWeight: '800' }}>${cartTotal.toLocaleString()}</div>
                                        </div>
                                        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'left' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                                <span style={{ opacity: 0.6 }}>Concepto:</span>
                                                <span>Carrito Pro Order</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ opacity: 0.6 }}>Email:</span>
                                                <span>{customerData.email}</span>
                                            </div>
                                        </div>
                                        <div style={{ border: '2px dashed #009ee333', padding: '1.5rem', borderRadius: '12px' }}>
                                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#009ee3', fontWeight: '600' }}>
                                                Simulación: Haz clic en el botón de abajo para confirmar el pago exitoso.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {checkoutStep === 'success' && (
                                    <div style={{ textAlign: 'center', margin: 'auto' }}>
                                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#10b98122', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                            <Check size={48} />
                                        </div>
                                        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>¡Pedido Realizado!</h3>
                                        <p style={{ opacity: 0.7, marginBottom: '2rem' }}>Hemos recibido tu compra. En breve recibirás un correo con los detalles.</p>
                                        <button onClick={() => navigate('/hub')} className="btn-primary" style={{ width: '100%', borderRadius: '12px', padding: '12px' }}>
                                            Ir a Mis Cursos / Hub
                                        </button>
                                    </div>
                                )}
                            </div>

                            {cart.length > 0 && checkoutStep !== 'success' && (
                                <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '2rem', marginTop: 'auto' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '1rem', fontWeight: '800' }}>
                                        <span>Total</span>
                                        <span style={{ color: 'var(--primary-color)' }}>${cartTotal.toLocaleString()}</span>
                                    </div>

                                    {checkoutStep === 'cart' ? (
                                        <button
                                            onClick={() => {
                                                if (!user) {
                                                    setIsAuthModalOpen(true);
                                                } else {
                                                    setCheckoutStep('info');
                                                    setCustomerData({ name: user.username, email: user.email || '' });
                                                }
                                            }}
                                            className="btn-primary"
                                            style={{ width: '100%', borderRadius: '12px', padding: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: '600' }}
                                        >
                                            Continuar <ArrowRight size={20} />
                                        </button>
                                    ) : checkoutStep === 'info' ? (
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button onClick={() => setCheckoutStep('cart')} className="glass-panel" style={{ flex: 1, padding: '15px' }}>Atrás</button>
                                            <button
                                                onClick={(e) => {
                                                    const form = document.getElementById('checkout-form');
                                                    if (form.checkValidity()) {
                                                        e.preventDefault();
                                                        setCheckoutStep('payment');
                                                    } else {
                                                        form.reportValidity();
                                                    }
                                                }}
                                                className="btn-primary"
                                                style={{ flex: 2, padding: '15px', borderRadius: '12px', fontWeight: '600' }}
                                            >
                                                Pagar ahora
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button onClick={() => setCheckoutStep('info')} className="glass-panel" style={{ flex: 1, padding: '15px' }}>Atrás</button>
                                            <button
                                                onClick={handleCheckout}
                                                className="btn-primary"
                                                style={{ flex: 2, padding: '15px', borderRadius: '12px', fontWeight: '600', background: '#009ee3', border: 'none' }}
                                            >
                                                Confirmar Pago
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Product Detail Modal */}
            <AnimatePresence>
                {selectedProduct && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedProduct(null)}
                            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(15px)' }}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 50 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 50 }}
                            className="glass-panel"
                            style={{
                                width: 'min(95%, 900px)',
                                maxHeight: 'min(90vh, 600px)',
                                zIndex: 1101,
                                padding: 0,
                                overflow: 'hidden',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                                position: 'relative',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                            }}
                        >
                            <button
                                onClick={() => setSelectedProduct(null)}
                                style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 1102, background: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '8px', color: 'white' }}
                            >
                                <X size={24} />
                            </button>

                            <div style={{ background: '#000', height: '400px' }}>
                                {selectedProduct.image_url ? (
                                    <img src={selectedProduct.image_url} alt={selectedProduct.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3, color: 'white' }}>
                                        <Package size={80} />
                                    </div>
                                )}
                            </div>

                            <div style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
                                <div>
                                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                        <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'var(--primary-color)22', color: 'var(--primary-color)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase' }}>
                                            {selectedProduct.type}
                                        </span>
                                        {selectedProduct.category && (
                                            <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase' }}>
                                                {selectedProduct.category}
                                            </span>
                                        )}
                                    </div>
                                    <h2 style={{ fontSize: '1.4rem', fontWeight: '900', margin: 0 }}>{selectedProduct.name}</h2>
                                </div>

                                <p style={{ fontSize: '0.8rem', opacity: 0.7, lineHeight: '1.5', margin: 0 }}>
                                    {selectedProduct.description || 'No hay una descripción detallada para este producto.'}
                                </p>

                                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        {selectedProduct.discount_price ? (
                                            <>
                                                <span style={{ fontSize: '1rem', opacity: 0.5, textDecoration: 'line-through' }}>
                                                    ${selectedProduct.price.toLocaleString()}
                                                </span>
                                                <span style={{ fontSize: '2.5rem', fontWeight: '900', color: '#ef4444' }}>
                                                    ${selectedProduct.discount_price.toLocaleString()}
                                                </span>
                                            </>
                                        ) : (
                                            <span style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--primary-color)' }}>
                                                ${selectedProduct.price.toLocaleString()}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => {
                                            addToCart({
                                                ...selectedProduct,
                                                price: selectedProduct.discount_price || selectedProduct.price
                                            });
                                            toast.success(`Añadido: ${selectedProduct.name}`);
                                        }}
                                        disabled={selectedProduct.stock <= 0}
                                        className="btn-primary"
                                        style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}
                                    >
                                        {selectedProduct.stock <= 0 ? 'Sin Stock' : <><Plus size={22} /> Añadir al Carrito</>}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <CustomerAuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                onSuccess={() => {
                    if (checkoutStep === 'cart' && isCartOpen) {
                        setCheckoutStep('info');
                    }
                }}
            />

        </div>
    );
};

export default PublicStorefront;
