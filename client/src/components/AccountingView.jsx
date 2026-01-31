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
    ArrowRightLeft,
    TrendingUp,
    TrendingDown,
    Building2,
    Search
} from 'lucide-react';

const AccountingView = () => {
    const [activeTab, setActiveTab] = useState('accounts');
    const [accounts, setAccounts] = useState([]);
    const [entries, setEntries] = useState([]);
    const [entities, setEntities] = useState([]);
    const [balances, setBalances] = useState({ accounts: {}, entities: {} });
    const [loading, setLoading] = useState(true);

    // Forms Toggle
    const [showAccountForm, setShowAccountForm] = useState(false);
    const [showEntityForm, setShowEntityForm] = useState(false);
    const [showEntryForm, setShowEntryForm] = useState(false);

    // Form States
    const [newAccount, setNewAccount] = useState({ code: '', name: '', type: 'Activo', parentId: '' });
    const [newEntity, setNewEntity] = useState({ name: '', type: 'Client', cuit: '', email: '' });
    const [newEntry, setNewEntry] = useState({
        date: new Date().toISOString().split('T')[0],
        description: '',
        items: [
            { accountId: '', entityId: '', debit: 0, credit: 0 },
            { accountId: '', entityId: '', debit: 0, credit: 0 }
        ]
    });

    const fetchData = async () => {
        try {
            const [accRes, entRes, entryRes, balRes] = await Promise.all([
                fetch('/api/accounting/accounts'),
                fetch('/api/accounting/entities'),
                fetch('/api/accounting/entries'),
                fetch('/api/accounting/balances')
            ]);

            if (accRes.ok) setAccounts(await accRes.json());
            if (entRes.ok) setEntities(await entRes.json());
            if (entryRes.ok) setEntries(await entryRes.json());
            if (balRes.ok) setBalances(await balRes.json());
        } catch (error) { toast.error('Error al sincronizar datos'); }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleCreateAccount = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/accounting/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAccount)
            });
            if (res.ok) {
                toast.success('Cuenta configurada');
                setShowAccountForm(false);
                fetchData();
            }
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
                    items: [{ accountId: '', entityId: '', debit: 0, credit: 0 }, { accountId: '', entityId: '', debit: 0, credit: 0 }]
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
                        <h2 style={{ margin: 0 }}>Business Finance</h2>
                        <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>Gestión Contable y Cuentas Corrientes</span>
                    </div>
                </div>
                <div className="glass-panel" style={{ display: 'flex', padding: '4px', borderRadius: '12px', gap: '4px' }}>
                    {[
                        { id: 'balances', label: 'Saldos', icon: <PieChart size={16} /> },
                        { id: 'entries', label: 'Libro Diario', icon: <List size={16} /> },
                        { id: 'entities', label: 'Entidades', icon: <Users size={16} /> },
                        { id: 'accounts', label: 'Plan de Cuentas', icon: <Book size={16} /> }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '8px 16px', borderRadius: '10px', border: 'none',
                                background: activeTab === tab.id ? 'var(--primary-color)' : 'transparent',
                                color: activeTab === tab.id ? 'white' : 'inherit', cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* TAB: BALANCES */}
            {activeTab === 'balances' && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <h3 style={{ marginTop: 0 }}>Saldos de Cuentas</h3>
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
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <h3 style={{ marginTop: 0 }}>Resumen de Entidades</h3>
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

            {/* TAB: ENTITIES */}
            {activeTab === 'entities' && (
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h3 style={{ margin: 0 }}>Clientes y Proveedores</h3>
                        <button onClick={() => setShowEntityForm(!showEntityForm)} className="btn-primary" style={{ padding: '10px 20px' }}>+ Nueva Entidad</button>
                    </div>

                    <AnimatePresence>
                        {showEntityForm && (
                            <motion.form initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} onSubmit={handleCreateEntity}
                                style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                                    <input type="text" placeholder="Nombre / Razón Social" value={newEntity.name} onChange={e => setNewEntity({ ...newEntity, name: e.target.value })} required className="glass-panel" style={{ padding: '10px', background: 'transparent', color: 'inherit' }} />
                                    <select value={newEntity.type} onChange={e => setNewEntity({ ...newEntity, type: e.target.value })} className="glass-panel" style={{ padding: '10px', background: 'var(--card-bg)', color: 'inherit' }}>
                                        <option value="Client">Cliente</option>
                                        <option value="Supplier">Proveedor</option>
                                    </select>
                                    <input type="text" placeholder="CUIT / CUIL" value={newEntity.cuit} onChange={e => setNewEntity({ ...newEntity, cuit: e.target.value })} className="glass-panel" style={{ padding: '10px', background: 'transparent', color: 'inherit' }} />
                                    <button type="submit" className="btn-primary">Guardar Entidad</button>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--card-border)', opacity: 0.6 }}>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Nombre</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Tipo</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Identificación</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Cuenta Corriente</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entities.map(ent => (
                                <tr key={ent.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '1rem', fontWeight: '500' }}>{ent.name}</td>
                                    <td style={{ padding: '1rem' }}>{ent.type === 'Client' ? 'Cliente' : 'Proveedor'}</td>
                                    <td style={{ padding: '1rem' }}>{ent.cuit || '-'}</td>
                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>
                                        $ {(balances.entities[ent.id]?.total || 0).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* TAB: ENTRIES */}
            {activeTab === 'entries' && (
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h3 style={{ margin: 0 }}>Registro de Operaciones</h3>
                        <button onClick={() => setShowEntryForm(!showEntryForm)} className="btn-primary">+ Nuevo Asiento</button>
                    </div>

                    <AnimatePresence>
                        {showEntryForm && (
                            <motion.form initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} onSubmit={handleCreateEntry}
                                style={{ overflow: 'hidden', paddingBottom: '2rem' }}>
                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                    <input type="date" value={newEntry.date} onChange={e => setNewEntry({ ...newEntry, date: e.target.value })} className="glass-panel" style={{ padding: '10px', color: 'inherit', background: 'transparent' }} />
                                    <input type="text" placeholder="Concepto del movimiento..." value={newEntry.description} onChange={e => setNewEntry({ ...newEntry, description: e.target.value })} className="glass-panel" style={{ flex: 1, padding: '10px', color: 'inherit', background: 'transparent' }} />
                                </div>

                                {newEntry.items.map((item, idx) => (
                                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <select value={item.accountId} onChange={e => updateEntryItem(idx, 'accountId', e.target.value)} required className="glass-panel" style={{ padding: '10px', background: 'var(--card-bg)', color: 'inherit' }}>
                                            <option value="">Seleccionar cuenta...</option>
                                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>)}
                                        </select>
                                        <select value={item.entityId} onChange={e => updateEntryItem(idx, 'entityId', e.target.value)} className="glass-panel" style={{ padding: '10px', background: 'var(--card-bg)', color: 'inherit' }}>
                                            <option value="">(Sin Entidad)</option>
                                            {entities.map(ent => <option key={ent.id} value={ent.id}>{ent.name}</option>)}
                                        </select>
                                        <input type="number" step="0.01" placeholder="Debe" value={item.debit} onChange={e => updateEntryItem(idx, 'debit', e.target.value)} className="glass-panel" style={{ padding: '10px', background: 'transparent', textAlign: 'right', color: 'inherit' }} />
                                        <input type="number" step="0.01" placeholder="Haber" value={item.credit} onChange={e => updateEntryItem(idx, 'credit', e.target.value)} className="glass-panel" style={{ padding: '10px', background: 'transparent', textAlign: 'right', color: 'inherit' }} />
                                    </div>
                                ))}

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', marginTop: '1rem' }}>
                                    <div style={{ color: isBalanced ? 'inherit' : '#ef4444' }}>
                                        <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>Diferencia: </span>
                                        <strong>$ {(totals.debit - totals.credit).toFixed(2)}</strong>
                                    </div>
                                    <button type="submit" disabled={!isBalanced || totals.debit === 0} className="btn-primary" style={{ padding: '8px 40px', opacity: isBalanced ? 1 : 0.5 }}>Confirmar</button>
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
                                            {item.entityId && <span style={{ marginLeft: '10px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(100,100,100,0.2)', fontSize: '0.75rem' }}>
                                                {entities.find(e => e.id === item.entityId)?.name}
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

            {/* TAB: ACCOUNTS (Plan de Cuentas) */}
            {activeTab === 'accounts' && (
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h3 style={{ margin: 0 }}>Estructura del Plan de Cuentas</h3>
                        <button onClick={() => setShowAccountForm(!showAccountForm)} className="btn-primary">+ Nueva Cuenta</button>
                    </div>

                    <AnimatePresence>
                        {showAccountForm && (
                            <motion.form initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} onSubmit={handleCreateAccount}
                                style={{ overflow: 'hidden', paddingBottom: '2rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr', gap: '1rem' }}>
                                    <input type="text" placeholder="Código (1.1.0)" value={newAccount.code} onChange={e => setNewAccount({ ...newAccount, code: e.target.value })} required className="glass-panel" style={{ padding: '10px', background: 'transparent', color: 'inherit' }} />
                                    <input type="text" placeholder="Nombre de la Cuenta" value={newAccount.name} onChange={e => setNewAccount({ ...newAccount, name: e.target.value })} required className="glass-panel" style={{ padding: '10px', background: 'transparent', color: 'inherit' }} />
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

                    <div className="glass-panel" style={{ padding: '1rem' }}>
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
            )}
        </motion.div>
    );
};

export default AccountingView;
