import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, ShoppingBag, X, Plus, Minus, Check, ArrowRight, BookOpen, Package } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const PublicStorefront = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const { cart, addToCart, removeFromCart, updateQuantity, cartTotal, cartCount, clearCart } = useCart();
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [checkoutStep, setCheckoutStep] = useState('cart'); // cart, info, success
    const [customerData, setCustomerData] = useState({ name: '', email: '' });
    const navigate = useNavigate();

    const fetchProducts = async () => {
        try {
            const response = await fetch('/api/shop');
            if (response.ok) {
                const data = await response.json();
                setProducts(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
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
                padding: '1rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderRadius: '0 0 20px 20px',
                borderTop: 'none'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => navigate('/hub')}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(45deg, #6366f1, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <ShoppingBag size={24} />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', margin: 0, fontWeight: '800' }}>Carrito Pro</h1>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    {localStorage.getItem('token') && (
                        <button
                            onClick={() => navigate('/hub')}
                            className="glass-panel"
                            style={{ padding: '10px 20px', fontWeight: '600', color: 'var(--primary-color)' }}
                        >
                            Ir al Hub
                        </button>
                    )}
                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="glass-panel"
                        style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}
                    >
                        <ShoppingCart size={20} />
                        <span style={{ fontWeight: '600' }}>Carrito</span>
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

            <main className="container" style={{ padding: '3rem 1.5rem' }}>
                <section style={{ marginBottom: '4rem', textAlign: 'center' }}>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ fontSize: '3rem', fontWeight: '900', marginBottom: '1rem' }}
                    >
                        Potencia tu Negocio & Aprendizaje
                    </motion.h2>
                    <p style={{ fontSize: '1.2rem', opacity: 0.7, maxWidth: '600px', margin: '0 auto' }}>
                        Descubre nuestra selección Premium de productos físicos, cursos certificados y servicios digitales exclusivos.
                    </p>
                </section>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
                    {products.map((product, idx) => (
                        <motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="glass-panel"
                            style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden' }}
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
                            </div>

                            <div>
                                <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>{product.name}</h3>
                                <p style={{ fontSize: '0.9rem', opacity: 0.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '2.7rem' }}>
                                    {product.description || 'Sin descripción disponible.'}
                                </p>
                            </div>

                            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary-color)' }}>
                                    ${product.price.toLocaleString()}
                                </span>
                                <button
                                    onClick={() => {
                                        addToCart(product);
                                        toast.success(`Añadido: ${product.name}`);
                                    }}
                                    className="btn-primary"
                                    style={{ borderRadius: '10px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                    <Plus size={18} /> Añadir
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </main>

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
                                    <ShoppingCart /> Tu Carrito
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
                                                <div key={item.id} className="glass-panel" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                    <div style={{ width: '60px', height: '60px', borderRadius: '8px', background: 'rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                                                        {item.image_url && <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <h4 style={{ margin: '0 0 5px 0', fontSize: '1rem' }}>{item.name}</h4>
                                                        <span style={{ fontWeight: '700', color: 'var(--primary-color)' }}>${(item.price * item.quantity).toLocaleString()}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '4px' }}>
                                                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} style={{ padding: '4px', background: 'transparent' }}><Minus size={14} /></button>
                                                        <span style={{ fontWeight: 'bold', width: '20px', textAlign: 'center' }}>{item.quantity}</span>
                                                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} style={{ padding: '4px', background: 'transparent' }}><Plus size={14} /></button>
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
                                                <strong>Nota:</strong> En esta versión de prueba, el pago se procesará automáticamente al finalizar.
                                            </p>
                                        </div>
                                    </form>
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
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: '800' }}>
                                        <span>Total</span>
                                        <span style={{ color: 'var(--primary-color)' }}>${cartTotal.toLocaleString()}</span>
                                    </div>

                                    {checkoutStep === 'cart' ? (
                                        <button
                                            onClick={() => setCheckoutStep('info')}
                                            className="btn-primary"
                                            style={{ width: '100%', borderRadius: '12px', padding: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: '600' }}
                                        >
                                            Continuar <ArrowRight size={20} />
                                        </button>
                                    ) : (
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button onClick={() => setCheckoutStep('cart')} className="glass-panel" style={{ flex: 1, padding: '15px' }}>Atrás</button>
                                            <button
                                                form="checkout-form"
                                                type="submit"
                                                className="btn-primary"
                                                style={{ flex: 2, padding: '15px', borderRadius: '12px', fontWeight: '600' }}
                                            >
                                                Finalizar Compra
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PublicStorefront;
