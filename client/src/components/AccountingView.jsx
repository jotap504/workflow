import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
    Book,
    Plus,
    List,
    PlusCircle,
    Users,
    PieChart,
    Download,
    Building2,
    FileSpreadsheet,
    Target,
    BarChart3,
    TrendingUp,
    TrendingDown,
    Calendar
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell
} from 'recharts';

const AccountingView = () => {
    const [activeTab, setActiveTab] = useState('balances');
    const [accounts, setAccounts] = useState([]);
    const [entries, setEntries] = useState([]);
    const [entities, setEntities] = useState([]);
    const [costCenters, setCostCenters] = useState([]);
    const [balances, setBalances] = useState({ accounts: {}, entities: {} });
    const [pnlData, setPnlData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Forms Toggle
    const [showAccountForm, setShowAccountForm] = useState(false);
    const [showEntityForm, setShowEntityForm] = useState(false);
    const [showEntryForm, setShowEntryForm] = useState(false);
    const [showCostCenterForm, setShowCostCenterForm] = useState(false);

    // Form States
    const [newAccount, setNewAccount] = useState({ code: '', name: '', type: 'Activo', parentId: '' });
    const [newEntity, setNewEntity] = useState({ name: '', type: 'Client', cuit: '', email: '' });
    const [newCostCenter, setNewCostCenter] = useState({ name: '', description: '' });
    const [newEntry, setNewEntry] = useState({
        date: new Date().toISOString().split('T')[0],
        description: '',
        items: [
            { accountId: '', entityId: '', costCenterId: '', debit: 0, credit: 0 },
            { accountId: '', entityId: '', costCenterId: '', debit: 0, credit: 0 }
        ]
    });

    const fetchData = async () => {
        try {
            const [accRes, entRes, entryRes, balRes, ccRes, pnlRes] = await Promise.all([
                fetch('/api/accounting/accounts'),
                fetch('/api/accounting/entities'),
                fetch('/api/accounting/entries'),
                fetch('/api/accounting/balances'),
                fetch('/api/accounting/cost-centers'),
                fetch('/api/accounting/reports/pnl?year=' + new Date().getFullYear())
            ]);

            if (accRes.ok) setAccounts(await accRes.json());
            if (entRes.ok) setEntities(await entRes.json());
            if (entryRes.ok) setEntries(await entryRes.json());
            if (balRes.ok) setBalances(await balRes.json());
            if (ccRes.ok) setCostCenters(await ccRes.json());
            if (pnlRes.ok) {
                const data = await pnlRes.json();
                const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                setPnlData(data.map((m, i) => ({ ...m, name: monthNames[i] })));
            }
        } catch (error) { toast.error('Error al sincronizar datos'); }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    // --- CSV EXPORT ENGINE ---
    const downloadCSV = (data, filename) => {
        if (!data || data.length === 0) {
            toast.error('No hay datos para exportar');
            return;
        }
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(';')];
        for (const row of data) {
            const values = headers.map(header => {
                const val = row[header];
                return `"${String(val).replace(/"/g, '""')}"`;
            });
            csvRows.push(values.join(';'));
        }
        const csvString = csvRows.join('\n');
        const blob = new Blob(['\ufeff' + csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportBalances = () => {
        const data = accounts.map(acc => {
            const bal = balances.accounts[acc.id] || { debit: 0, credit: 0, total: 0 };
            return {
                Codigo: acc.code, Nombre: acc.name, Tipo: acc.type,
                Debe: bal.debit.toFixed(2), Haber: bal.credit.toFixed(2),
                Saldo: bal.total.toFixed(2), Estado: bal.total >= 0 ? 'Deudor' : 'Acreedor'
            };
        });
        downloadCSV(data, 'Balances_Cuentas');
    };

    const handleCreateAccount = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/accounting/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAccount)
            });
            if (res.ok) { toast.success('Cuenta configurada'); setShowAccountForm(false); fetchData(); }
        } catch (error) { toast.error('Error de red'); }
    };

    const handleCreateEntity = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/accounting/entities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newEntity)
            });
            if (res.ok) {
                toast.success('Entidad registrada');
                setShowEntityForm(false);
                setNewEntity({ name: '', type: 'Client', cuit: '', email: '' });
                fetchData();
            }
        } catch (error) { toast.error('Error al registrar entidad'); }
    };

    const handleCreateCostCenter = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/accounting/cost-centers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCostCenter)
            });
            if (res.ok) {
                toast.success('Centro de Costo guardado');
                setShowCostCenterForm(false);
                setNewCostCenter({ name: '', description: '' });
                fetchData();
            }
        } catch (error) { toast.error('Error al guardar centro de costo'); }
    };

    const handleCreateEntry = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/accounting/entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newEntry)
            });
            const data = await res.json();
            if (res.ok) {
                toast.success('Asiento confirmado');
                setShowEntryForm(false);
                setNewEntry({
                    date: new Date().toISOString().split('T')[0],
                    description: '',
                    items: [{ accountId: '', entityId: '', costCenterId: '', debit: 0, credit: 0 }, { accountId: '', entityId: '', costCenterId: '', debit: 0, credit: 0 }]
                });
                fetchData();
            } else { toast.error(data.error); }
        } catch (error) { toast.error('Error de red'); }
    };

    const updateEntryItem = (index, field, value) => {
        const newItems = [...newEntry.items];
        newItems[index][field] = value;
        setNewEntry({ ...newEntry, items: newItems });
    };

    const calculateTotals = () => {
        const debit = newEntry.items.reduce((s, i) => s + (parseFloat(i.debit) || 0), 0);
        const credit = newEntry.items.reduce((s, i) => s + (parseFloat(i.credit) || 0), 0);
        return { debit, credit };
    };

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando Contabilidad Pro...</div>;

    const totals = calculateTotals();
    const isBalanced = Math.abs(totals.debit - totals.credit) < 0.01;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container" style={{ maxWidth: '1200px' }}>
            {/* Header & Tabs */}
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'var(--primary-color)', padding: '12px', borderRadius: '16px', color: 'white' }}>
                        <Building2 size={28} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: window.innerWidth < 640 ? '1.2rem' : '1.5rem' }}>Financial Hub</h2>
                        <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>Gestión Profesional y Resultados</span>
                    </div>
                </div>
                <div className="hide-scrollbar" style={{ display: 'flex', padding: '4px', borderRadius: '12px', gap: '4px', overflowX: 'auto', maxWidth: window.innerWidth < 640 ? '200px' : 'none' }}>
                    {[
                        { id: 'reports', label: 'Resultados', icon: <BarChart3 size={16} /> },
                        { id: 'balances', label: 'Saldos', icon: <PieChart size={16} /> },
                        { id: 'entries', label: 'Diario', icon: <List size={16} /> },
                        { id: 'entities', label: 'Entidades', icon: <Users size={16} /> },
                        { id: 'centers', label: 'Centros', icon: <Target size={16} /> },
                        { id: 'accounts', label: 'Plan', icon: <Book size={16} /> }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '8px 16px', borderRadius: '10px', border: 'none',
                                background: activeTab === tab.id ? 'var(--primary-color)' : 'transparent',
                                color: activeTab === tab.id ? 'white' : 'inherit', cursor: 'pointer',
                                transition: 'all 0.2s', whiteSpace: 'nowrap'
                            }}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* TAB: REPORTS (P&L) */}
            {activeTab === 'reports' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(3, 1fr)', gap: '1rem' }}>
                        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #10b981' }}>
                            <div style={{ background: '#10b98122', padding: '10px', borderRadius: '12px', color: '#10b981' }}><TrendingUp /></div>
                            <div>
                                <h4 style={{ margin: 0, opacity: 0.6, fontSize: '0.8rem' }}>Ingresos Totales</h4>
                                <h2 style={{ margin: 0 }}>$ {pnlData.reduce((s, m) => s + m.income, 0).toLocaleString()}</h2>
                            </div>
                        </div>
                        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #ef4444' }}>
                            <div style={{ background: '#ef444422', padding: '10px', borderRadius: '12px', color: '#ef4444' }}><TrendingDown /></div>
                            <div>
                                <h4 style={{ margin: 0, opacity: 0.6, fontSize: '0.8rem' }}>Egresos Totales</h4>
                                <h2 style={{ margin: 0 }}>$ {pnlData.reduce((s, m) => s + m.expense, 0).toLocaleString()}</h2>
                            </div>
                        </div>
                        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--primary-color)' }}>
                            <div style={{ background: 'var(--primary-color)22', padding: '10px', borderRadius: '12px', color: 'var(--primary-color)' }}><PieChart /></div>
                            <div>
                                <h4 style={{ margin: 0, opacity: 0.6, fontSize: '0.8rem' }}>Resultado Neto</h4>
                                <h2 style={{ margin: 0 }}>$ {pnlData.reduce((s, m) => s + m.profit, 0).toLocaleString()}</h2>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '2rem', height: '400px' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Calendar size={20} /> Evolución Mensual de Resultados
                        </h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={pnlData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}
                                    itemStyle={{ fontSize: '12px' }}
                                />
                                <Legend verticalAlign="top" height={36} />
                                <Bar dataKey="income" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="expense" name="Egresos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="profit" name="Ganancia Neta" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* TAB: BALANCES */}
            {activeTab === 'balances' && (
                <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 992 ? '1fr' : '2fr 1fr', gap: '2rem' }}>
                    <div className="glass-panel" style={{ padding: window.innerWidth < 640 ? '1rem' : '2rem' }}>
                        <div style={{ display: 'flex', flexDirection: window.innerWidth < 640 ? 'column' : 'row', justifyContent: 'space-between', alignItems: window.innerWidth < 640 ? 'stretch' : 'center', marginBottom: '1.5rem', gap: '1rem' }}>
                            <h3 style={{ margin: 0 }}>Estado de Cuentas</h3>
                            <button onClick={exportBalances} className="glass-panel" style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1px solid #10b98133', color: '#10b981', cursor: 'pointer' }}>
                                <FileSpreadsheet size={18} /> Planilla Excel
                            </button>
                        </div>
                        <div className="responsive-table-wrapper">
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--card-border)', opacity: 0.6 }}>
                                        <th style={{ padding: '1rem', textAlign: 'left' }}>Nombre de Cuenta</th>
                                        <th style={{ padding: '1rem', textAlign: 'right' }}>Debe</th>
                                        <th style={{ padding: '1rem', textAlign: 'right' }}>Haber</th>
                                        <th style={{ padding: '1rem', textAlign: 'right' }}>Saldo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {accounts.map(acc => {
                                        const bal = balances.accounts[acc.id] || { debit: 0, credit: 0, total: 0 };
                                        if (bal.debit === 0 && bal.credit === 0) return null;
                                        return (
                                            <tr key={acc.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '1rem' }}>{acc.name} <small style={{ opacity: 0.4 }}>({acc.code})</small></td>
                                                <td style={{ padding: '1rem', textAlign: 'right' }}>$ {bal.debit.toFixed(2)}</td>
                                                <td style={{ padding: '1rem', textAlign: 'right', color: '#94a3b8' }}>$ {bal.credit.toFixed(2)}</td>
                                                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: bal.total >= 0 ? '#10b981' : '#ef4444' }}>
                                                    $ {Math.abs(bal.total).toFixed(2)} {bal.total >= 0 ? 'D' : 'H'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <h3 style={{ marginTop: 0 }}>Cuentas Corrientes</h3>
                        {entities.map(ent => {
                            const bal = balances.entities[ent.id] || { total: 0 };
                            return (
                                <div key={ent.id} style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', marginBottom: '1rem', borderLeft: `4px solid ${ent.type === 'Client' ? '#3b82f6' : '#f59e0b'}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: '600' }}>{ent.name}</span>
                                        <span style={{ fontWeight: 'bold', color: bal.total === 0 ? 'inherit' : (bal.total > 0 ? '#10b981' : '#ef4444') }}>
                                            $ {Math.abs(bal.total).toFixed(2)}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>{ent.type === 'Client' ? 'Cliente' : 'Proveedor'}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* TAB: CENTERS */}
            {activeTab === 'centers' && (
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h3 style={{ margin: 0 }}>Centros de Costo e Inversión</h3>
                        <button onClick={() => setShowCostCenterForm(!showCostCenterForm)} className="btn-primary">+ Nuevo Centro</button>
                    </div>

                    <AnimatePresence>
                        {showCostCenterForm && (
                            <motion.form initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} onSubmit={handleCreateCostCenter} style={{ overflow: 'hidden', paddingBottom: '2rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '1rem' }}>
                                    <input type="text" placeholder="Nombre (Ej: Sucursal Centro)" value={newCostCenter.name} onChange={e => setNewCostCenter({ ...newCostCenter, name: e.target.value })} required className="glass-panel" style={{ padding: '10px', color: 'inherit', background: 'transparent' }} />
                                    <input type="text" placeholder="Descripción corta" value={newCostCenter.description} onChange={e => setNewCostCenter({ ...newCostCenter, description: e.target.value })} className="glass-panel" style={{ padding: '10px', color: 'inherit', background: 'transparent' }} />
                                    <button type="submit" className="btn-primary">Registrar</button>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
                        {costCenters.map(cc => (
                            <div key={cc.id} className="glass-panel" style={{ padding: '1.5rem', border: '1px solid var(--card-border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
                                    <Target size={18} color="var(--primary-color)" />
                                    <h4 style={{ margin: 0 }}>{cc.name}</h4>
                                </div>
                                <p style={{ fontSize: '0.8rem', opacity: 0.6, margin: 0 }}>{cc.description || 'Sin descripción'}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB: ENTRIES */}
            {activeTab === 'entries' && (
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <h3 style={{ margin: 0 }}>Libro Diario</h3>
                            <button onClick={() => downloadCSV(entries, 'Full_Journal_Log')} className="glass-panel" style={{ padding: '5px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px', color: '#10b981', cursor: 'pointer' }}>
                                <Download size={14} /> Backup CSV
                            </button>
                        </div>
                        <button onClick={() => setShowEntryForm(!showEntryForm)} className="btn-primary">+ Registrar Operación</button>
                    </div>

                    <AnimatePresence>
                        {showEntryForm && (
                            <motion.form initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} onSubmit={handleCreateEntry} style={{ overflow: 'hidden', paddingBottom: '2rem' }}>
                                <div style={{ display: 'flex', flexDirection: window.innerWidth < 640 ? 'column' : 'row', gap: '1rem', marginBottom: '1rem' }}>
                                    <input type="date" value={newEntry.date} onChange={e => setNewEntry({ ...newEntry, date: e.target.value })} className="glass-panel" style={{ padding: '10px', color: 'inherit', background: 'transparent' }} />
                                    <input type="text" placeholder="Concepto del movimiento..." value={newEntry.description} onChange={e => setNewEntry({ ...newEntry, description: e.target.value })} className="glass-panel" style={{ flex: 1, padding: '10px', color: 'inherit', background: 'transparent' }} />
                                </div>

                                {newEntry.items.map((item, idx) => (
                                    <div key={idx} className="glass-panel" style={{
                                        display: 'grid',
                                        gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '2fr 1fr 1fr 1fr 1fr',
                                        gap: '0.5rem',
                                        marginBottom: '1rem',
                                        padding: window.innerWidth < 768 ? '1rem' : '0',
                                        background: window.innerWidth < 768 ? 'rgba(255,255,255,0.03)' : 'transparent',
                                        border: window.innerWidth < 768 ? '1px solid var(--card-border)' : 'none'
                                    }}>
                                        <select value={item.accountId} onChange={e => updateEntryItem(idx, 'accountId', e.target.value)} required className="glass-panel" style={{ padding: '10px', background: 'var(--card-bg)', color: 'inherit' }}>
                                            <option value="">Seleccionar cuenta...</option>
                                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>)}
                                        </select>
                                        <select value={item.entityId} onChange={e => updateEntryItem(idx, 'entityId', e.target.value)} className="glass-panel" style={{ padding: '10px', background: 'var(--card-bg)', color: 'inherit' }}>
                                            <option value="">(Sin Entidad)</option>
                                            {entities.map(ent => <option key={ent.id} value={ent.id}>{ent.name}</option>)}
                                        </select>
                                        <select value={item.costCenterId} onChange={e => updateEntryItem(idx, 'costCenterId', e.target.value)} className="glass-panel" style={{ padding: '10px', background: 'var(--card-bg)', color: 'inherit' }}>
                                            <option value="">(Sin Centro)</option>
                                            {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
                                        </select>
                                        <input type="number" step="0.01" placeholder="Debe" value={item.debit} onChange={e => updateEntryItem(idx, 'debit', e.target.value)} className="glass-panel" style={{ padding: '10px', background: 'transparent', textAlign: 'right', color: 'inherit' }} />
                                        <input type="number" step="0.01" placeholder="Haber" value={item.credit} onChange={e => updateEntryItem(idx, 'credit', e.target.value)} className="glass-panel" style={{ padding: '10px', background: 'transparent', textAlign: 'right', color: 'inherit' }} />
                                    </div>
                                ))}

                                <div style={{
                                    display: 'flex',
                                    flexDirection: window.innerWidth < 640 ? 'column' : 'row',
                                    justifyContent: 'flex-end',
                                    alignItems: 'center',
                                    gap: '1.5rem',
                                    padding: '1.5rem',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '12px',
                                    marginTop: '1rem'
                                }}>
                                    <div style={{ color: isBalanced ? 'inherit' : '#ef4444', textAlign: 'center' }}>
                                        <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>Diferencia: </span>
                                        <strong>$ {(totals.debit - totals.credit).toFixed(2)}</strong>
                                    </div>
                                    <button type="submit" disabled={!isBalanced || totals.debit === 0} className="btn-primary" style={{ padding: '10px 40px', width: window.innerWidth < 640 ? '100%' : 'auto', opacity: isBalanced ? 1 : 0.5 }}>Confirmar Asiento</button>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    {entries.map(entry => (
                        <div key={entry.id} className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1rem', border: 'none', borderLeft: '4px solid var(--primary-color)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <strong>{entry.description}</strong>
                                <span style={{ opacity: 0.5 }}>{new Date(entry.date).toLocaleDateString()}</span>
                            </div>
                            <div style={{ marginTop: '1rem' }}>
                                {entry.items.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', opacity: 0.8 }}>
                                        <span style={{ flex: 1 }}>{accounts.find(a => a.id === item.accountId)?.name}
                                            {item.entityId && <span style={{ marginLeft: '10px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(50,50,50,0.4)', fontSize: '0.75rem' }}>
                                                {entities.find(e => e.id === item.entityId)?.name}
                                            </span>}
                                            {item.costCenterId && <span style={{ marginLeft: '5px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(100,50,50,0.2)', color: 'var(--primary-color)', fontSize: '0.75rem' }}>
                                                {costCenters.find(c => c.id === item.costCenterId)?.name}
                                            </span>}
                                        </span>
                                        <div style={{ width: '200px', display: 'flex', textAlign: 'right' }}>
                                            <span style={{ flex: 1 }}>{parseFloat(item.debit) ? `$ ${parseFloat(item.debit).toFixed(2)}` : ''}</span>
                                            <span style={{ flex: 1 }}>{parseFloat(item.credit) ? `$ ${parseFloat(item.credit).toFixed(2)}` : ''}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* TAB: ACCOUNTS */}
            {activeTab === 'accounts' && (
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h3 style={{ margin: 0 }}>Plan de Cuentas Maestro</h3>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={() => downloadCSV(accounts, 'Chart_of_Accounts')} className="glass-panel" style={{ padding: '8px 15px', color: '#6366f1', cursor: 'pointer' }}>Exportar Plan</button>
                            <button onClick={() => setShowAccountForm(!showAccountForm)} className="btn-primary">+ Nueva Cuenta</button>
                        </div>
                    </div>

                    <AnimatePresence>
                        {showAccountForm && (
                            <motion.form initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} onSubmit={handleCreateAccount} style={{ overflow: 'hidden', paddingBottom: '2rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr', gap: '1rem' }}>
                                    <input type="text" placeholder="Código" value={newAccount.code} onChange={e => setNewAccount({ ...newAccount, code: e.target.value })} required className="glass-panel" style={{ padding: '10px', background: 'transparent', color: 'inherit' }} />
                                    <input type="text" placeholder="Nombre completo" value={newAccount.name} onChange={e => setNewAccount({ ...newAccount, name: e.target.value })} required className="glass-panel" style={{ padding: '10px', background: 'transparent', color: 'inherit' }} />
                                    <select value={newAccount.type} onChange={e => setNewAccount({ ...newAccount, type: e.target.value })} className="glass-panel" style={{ padding: '10px', background: 'var(--card-bg)', color: 'inherit' }}>
                                        <option value="Activo">Activo</option>
                                        <option value="Pasivo">Pasivo</option>
                                        <option value="PN">Patrimonio Neto</option>
                                        <option value="Ingreso">Ingreso</option>
                                        <option value="Egreso">Egreso</option>
                                    </select>
                                    <button type="submit" className="btn-primary">Guardar</button>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    <div className="responsive-table-wrapper">
                        <div className="glass-panel" style={{ padding: '1rem', minWidth: '600px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--card-border)', opacity: 0.6 }}>
                                        <th style={{ padding: '1rem', textAlign: 'left' }}>Código</th>
                                        <th style={{ padding: '1rem', textAlign: 'left' }}>Nombre</th>
                                        <th style={{ padding: '1rem', textAlign: 'left' }}>Tipo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {accounts.map(acc => (
                                        <tr key={acc.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '0.8rem 1rem', fontFamily: 'monospace' }}>{acc.code}</td>
                                            <td style={{ padding: '0.8rem 1rem' }}>{acc.name}</td>
                                            <td style={{ padding: '0.8rem 1rem' }}><span style={{ fontSize: '0.75rem', opacity: 0.6, background: 'rgba(255,255,255,0.05)', padding: '2px 10px', borderRadius: '12px' }}>{acc.type}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default AccountingView;
