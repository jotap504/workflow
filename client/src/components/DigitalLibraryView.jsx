import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Play, Download, ExternalLink, Library } from 'lucide-react';
import { toast } from 'sonner';

const DigitalLibraryView = () => {
    const [content, setContent] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchContent = async () => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch('/api/shop/my-content', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setContent(data);
            }
        } catch (error) {
            toast.error('Error al cargar tu librería');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContent();
    }, []);

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando tu contenido...</div>;

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Library className="text-primary" /> Mi Librería Digital
                </h2>
                <p style={{ opacity: 0.6, fontSize: '0.9rem', marginTop: '5px' }}>Accede a tus cursos, e-books y contenido exclusivo.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {content.length === 0 ? (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
                        <BookOpen size={48} style={{ marginBottom: '1rem' }} />
                        <p>No tienes contenido digital aún.</p>
                    </div>
                ) : (
                    content.map(item => (
                        <div key={item.id} className="glass-panel" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--card-border)' }}>
                            <div style={{ height: '140px', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', overflow: 'hidden' }}>
                                {item.image_url ? (
                                    <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
                                        <BookOpen size={48} />
                                    </div>
                                )}
                            </div>
                            <div>
                                <h4 style={{ margin: '0 0 5px 0' }}>{item.name}</h4>
                                <div style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', background: 'var(--primary-color)22', color: 'var(--primary-color)', display: 'inline-block', textTransform: 'uppercase', fontWeight: '700' }}>
                                    {item.type === 'course' ? 'Curso' : 'Digital'}
                                </div>
                            </div>
                            <button className="btn-primary" style={{ width: '100%', borderRadius: '10px', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: 'auto' }}>
                                {item.type === 'course' ? <><Play size={18} /> Ver Curso</> : <><Download size={18} /> Descargar</>}
                            </button>
                        </div>
                    ))
                )}
            </div>
        </motion.div>
    );
};

export default DigitalLibraryView;
