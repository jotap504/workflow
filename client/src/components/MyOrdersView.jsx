import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Calendar, Clock, ChevronRight, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

const MyOrdersView = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchOrders = async () => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch('/api/shop/my-orders', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setOrders(data);
            }
        } catch (error) {
            toast.error('Error al cargar pedidos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando tus pedidos...</div>;

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ShoppingBag className="text-primary" /> Mis Pedidos
                </h2>
                <p style={{ opacity: 0.6, fontSize: '0.9rem', marginTop: '5px' }}>Historial de compras y estado de envíos.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {orders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
                        <Package size={48} style={{ marginBottom: '1rem' }} />
                        <p>Aún no has realizado ninguna compra.</p>
                    </div>
                ) : (
                    orders.map(order => (
                        <div key={order.id} className="glass-panel" style={{ padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--card-border)' }}>
                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                <div style={{ background: 'var(--primary-color)11', color: 'var(--primary-color)', padding: '12px', borderRadius: '12px' }}>
                                    <Package size={24} />
                                </div>
                                <div>
                                    <h4 style={{ margin: '0 0 5px 0' }}>Pedido #{order.id}</h4>
                                    <div style={{ display: 'flex', gap: '15px', fontSize: '0.85rem', opacity: 0.6 }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={14} /> {new Date(order.created_at).toLocaleDateString()}</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> {order.status.toUpperCase()}</span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--primary-color)' }}>${order.total_amount.toLocaleString()}</div>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>{order.item_count} {order.item_count === 1 ? 'ítem' : 'ítems'}</div>
                                </div>
                                <ChevronRight size={20} opacity={0.3} />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </motion.div>
    );
};

export default MyOrdersView;
