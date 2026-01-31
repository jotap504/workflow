import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';

const ReportsView = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('/api/reports', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    setData(await response.json());
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, []);

    if (loading) return <div>Cargando reportes...</div>;
    if (!data) return <div>No hay datos disponibles</div>;

    // Process Data for Recharts
    const statusData = [
        { name: 'Pendiente', value: 0, color: 'var(--status-pending)' },
        { name: 'En Progreso', value: 0, color: 'var(--primary-color)' },
        { name: 'Terminado', value: 0, color: 'var(--status-done)' }
    ];

    data.status.forEach(item => {
        const target = statusData.find(d =>
            (d.name === 'Pendiente' && item.status === 'pending') ||
            (d.name === 'En Progreso' && item.status === 'in-progress') ||
            (d.name === 'Terminado' && item.status === 'done')
        );
        if (target) target.value = item.count;
    });

    const urgencyData = [
        { name: 'Baja', value: 0, color: '#10b981' }, // Green
        { name: 'Media', value: 0, color: '#f59e0b' }, // Orange
        { name: 'Alta', value: 0, color: '#ef4444' }  // Red
    ];

    data.urgency.forEach(item => {
        const target = urgencyData.find(d =>
            (d.name === 'Baja' && item.urgency === 'low') ||
            (d.name === 'Media' && item.urgency === 'medium') ||
            (d.name === 'Alta' && item.urgency === 'high')
        );
        if (target) target.value = item.count;
    });

    return (
        <div style={{ paddingBottom: '2rem' }}>
            <h2 style={{ marginBottom: '2rem' }}>Reportes y Métricas</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>

                {/* Status Chart */}
                <div className="glass-panel" style={{ padding: '1.5rem', minHeight: '400px' }}>
                    <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>Estado de Tareas</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={statusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px' }} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Urgency Chart */}
                <div className="glass-panel" style={{ padding: '1.5rem', minHeight: '400px' }}>
                    <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>Distribución de Urgencia</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={urgencyData}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                            <XAxis dataKey="name" stroke="currentColor" />
                            <YAxis stroke="currentColor" />
                            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'text-primary' }} />
                            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                                {urgencyData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '2rem', marginTop: '2rem', textAlign: 'center' }}>
                <h3 style={{ fontSize: '2em', color: 'var(--primary-color)' }}>{data.total}</h3>
                <p style={{ opacity: 0.7 }}>Tareas Totales Registradas</p>
            </div>
        </div>
    );
};

export default ReportsView;
