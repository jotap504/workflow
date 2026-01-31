import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
    Book,
    Plus,
    ChevronRight,
    ChevronDown,
    List,
    Save,
    PlusCircle,
    Trash2,
    Calculator
} from 'lucide-react';

const AccountingView = () => {
    const [activeTab, setActiveTab] = useState('accounts');
    const [accounts, setAccounts] = useState([]);
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAccountForm, setShowAccountForm] = useState(false);
    const [newAccount, setNewAccount] = useState({ code: '', name: '', type: 'Activo', parentId: '' });

    // Journal Entry State
    const [showEntryForm, setShowEntryForm] = useState(false);
    const [newEntry, setNewEntry] = useState({
        date: new Date().toISOString().split('T')[0],
        description: '',
        items: [{ accountId: '', debit: 0, credit: 0 }, { accountId: '', debit: 0, credit: 0 }]
    });

    const fetchAccounts = async () => {
        try {
            const response = await fetch('/api/accounting/accounts');
            if (response.ok) setAccounts(await response.json());
        } catch (error) { toast.error('Error al cargar plan de cuentas'); }
    };

    const fetchEntries = async () => {
        try {
            const response = await fetch('/api/accounting/entries');
            if (response.ok) setEntries(await response.json());
        } catch (error) { toast.error('Error al cargar asientos'); }
    };

    useEffect(() => {
        Promise.all([fetchAccounts(), fetchEntries()]).finally(() => setLoading(false));
    }, []);

    const handleCreateAccount = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/accounting/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAccount)
            });
            if (response.ok) {
                toast.success('Cuenta creada');
                setShowAccountForm(false);
                setNewAccount({ code: '', name: '', type: 'Activo', parentId: '' });
                fetchAccounts();
            }
        } catch (error) { toast.error('Error de red'); }
    };

    const handleCreateEntry = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/accounting/entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newEntry)
            });
            const data = await response.json();
            if (response.ok) {
                toast.success('Asiento registrado');
                setShowEntryForm(false);
                setNewEntry({
                    date: new Date().toISOString().split('T')[0],
                    description: '',
                    items: [{ accountId: '', debit: 0, credit: 0 }, { accountId: '', debit: 0, credit: 0 }]
                });
                fetchEntries();
            } else {
                toast.error(data.error || 'Error al guardar asiento');
            }
        } catch (error) { toast.error('Error de red'); }
    };

    const addEntryRow = () => {
        setNewEntry(prev => ({
            ...prev,
            items: [...prev.items, { accountId: '', debit: 0, credit: 0 }]
        }));
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

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Iniciando sistema contable...</div>;

    const totals = calculateTotals();
    const isBalanced = Math.abs(totals.debit - totals.credit) < 0.01;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'var(--primary-color)', padding: '10px', borderRadius: '12px', color: 'white' }}>
                        <Book size={24} />
                    </div>
                    <h2 style={{ margin: 0 }}>Contabilidad Pro</h2>
                </div>
                <div className="glass-panel" style={{ display: 'flex', padding: '4px', borderRadius: '12px' }}>
                    <button
                        onClick={() => setActiveTab('accounts')}
                        style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: activeTab === 'accounts' ? 'var(--primary-color)' : 'transparent', color: activeTab === 'accounts' ? 'white' : 'inherit', cursor: 'pointer' }}
                    >
                        Plan de Cuentas
                    </button>
                    <button
                        onClick={() => setActiveTab('entries')}
                        style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: activeTab === 'entries' ? 'var(--primary-color)' : 'transparent', color: activeTab === 'entries' ? 'white' : 'inherit', cursor: 'pointer' }}
                    >
                        Libro Diario
                    </button>
                </div>
            </div>

            {activeTab === 'accounts' ? (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0 }}>Estructura de Cuentas</h3>
                        <button onClick={() => setShowAccountForm(!showAccountForm)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Plus size={18} /> Nueva Cuenta
                        </button>
                    </div>

                    <AnimatePresence>
                        {showAccountForm && (
                            <motion.form
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                onSubmit={handleCreateAccount}
                                style={{ overflow: 'hidden', background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem', border: '1px solid var(--card-border)' }}
                            >
                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    <div style={{ flex: 1, minWidth: '120px' }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.6, marginBottom: '4px' }}>Código</label>
                                        <input type="text" value={newAccount.code} onChange={e => setNewAccount({ ...newAccount, code: e.target.value })} placeholder="1.1.01" required
                                            style={{ width: '100%', background: 'transparent', border: '1px solid var(--card-border)', padding: '10px', borderRadius: '8px', color: 'inherit' }} />
                                    </div>
                                    <div style={{ flex: 2, minWidth: '200px' }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.6, marginBottom: '4px' }}>Nombre</label>
                                        <input type="text" value={newAccount.name} onChange={e => setNewAccount({ ...newAccount, name: e.target.value })} placeholder="Caja Moneda Nacional" required
                                            style={{ width: '100%', background: 'transparent', border: '1px solid var(--card-border)', padding: '10px', borderRadius: '8px', color: 'inherit' }} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: '150px' }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.6, marginBottom: '4px' }}>Tipo</label>
                                        <select value={newAccount.type} onChange={e => setNewAccount({ ...newAccount, type: e.target.value })}
                                            style={{ width: '100%', background: 'var(--card-bg)', border: '1px solid var(--card-border)', padding: '9px', borderRadius: '8px', color: 'inherit' }}>
                                            <option value="Activo">Activo</option>
                                            <option value="Pasivo">Pasivo</option>
                                            <option value="Patrimonio Neto">Patrimonio Neto</option>
                                            <option value="Ingreso">Ingreso</option>
                                            <option value="Egreso">Egreso</option>
                                        </select>
                                    </div>
                                </div>
                                <button type="submit" className="btn-primary" style={{ marginTop: '1rem', width: '100%' }}>Guardar Cuenta</button>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    <div className="glass-panel" style={{ padding: '1rem' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--card-border)', opacity: 0.6 }}>
                                    <th style={{ padding: '1rem' }}>Código</th>
                                    <th style={{ padding: '1rem' }}>Nombre</th>
                                    <th style={{ padding: '1rem' }}>Tipo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {accounts.map(acc => (
                                    <tr key={acc.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '0.8rem 1rem', fontFamily: 'monospace' }}>{acc.code}</td>
                                        <td style={{ padding: '0.8rem 1rem' }}>{acc.name}</td>
                                        <td style={{ padding: '0.8rem 1rem' }}>
                                            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)' }}>{acc.type}</span>
                                        </td>
                                    </tr>
                                ))}
                                {accounts.length === 0 && (
                                    <tr><td colSpan="3" style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>No hay cuentas definidas</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0 }}>Registro de Asientos</h3>
                        <button onClick={() => setShowEntryForm(!showEntryForm)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <PlusCircle size={18} /> Nuevo Asiento
                        </button>
                    </div>

                    <AnimatePresence>
                        {showEntryForm && (
                            <motion.form
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                onSubmit={handleCreateEntry}
                                style={{ overflow: 'hidden', background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem', border: '1px solid var(--card-border)' }}
                            >
                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <div style={{ width: '150px' }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.6, marginBottom: '4px' }}>Fecha</label>
                                        <input type="date" value={newEntry.date} onChange={e => setNewEntry({ ...newEntry, date: e.target.value })} required
                                            style={{ width: '100%', background: 'transparent', border: '1px solid var(--card-border)', padding: '10px', borderRadius: '8px', color: 'inherit' }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.6, marginBottom: '4px' }}>Descripción</label>
                                        <input type="text" value={newEntry.description} onChange={e => setNewEntry({ ...newEntry, description: e.target.value })} placeholder="Ej: Venta de mercadería factura A-001" required
                                            style={{ width: '100%', background: 'transparent', border: '1px solid var(--card-border)', padding: '10px', borderRadius: '8px', color: 'inherit' }} />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                                    {newEntry.items.map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <select
                                                value={item.accountId}
                                                onChange={e => updateEntryItem(idx, 'accountId', e.target.value)}
                                                required
                                                style={{ flex: 2, background: 'var(--card-bg)', border: '1px solid var(--card-border)', padding: '9px', borderRadius: '8px', color: 'inherit' }}
                                            >
                                                <option value="">Seleccionar cuenta...</option>
                                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>)}
                                            </select>
                                            <input type="number" step="0.01" value={item.debit} onChange={e => updateEntryItem(idx, 'debit', e.target.value)} placeholder="Debe"
                                                style={{ flex: 1, background: 'transparent', border: '1px solid var(--card-border)', padding: '10px', borderRadius: '8px', color: 'inherit' }} />
                                            <input type="number" step="0.01" value={item.credit} onChange={e => updateEntryItem(idx, 'credit', e.target.value)} placeholder="Haber"
                                                style={{ flex: 1, background: 'transparent', border: '1px solid var(--card-border)', padding: '10px', borderRadius: '8px', color: 'inherit' }} />
                                        </div>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                                    <button type="button" onClick={addEntryRow} style={{ background: 'transparent', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <Plus size={16} /> Agregar Fila
                                    </button>
                                    <div style={{ display: 'flex', gap: '1.5rem', textAlign: 'right' }}>
                                        <div><small style={{ opacity: 0.6 }}>Total Debe</small><div style={{ fontWeight: 'bold' }}>$ {totals.debit.toFixed(2)}</div></div>
                                        <div><small style={{ opacity: 0.6 }}>Total Haber</small><div style={{ fontWeight: 'bold' }}>$ {totals.credit.toFixed(2)}</div></div>
                                        <div style={{ color: isBalanced ? '#10b981' : '#ef4444' }}><small>Diferencia</small><div style={{ fontWeight: 'bold' }}>$ {(totals.debit - totals.credit).toFixed(2)}</div></div>
                                    </div>
                                </div>

                                <button type="submit" disabled={!isBalanced || totals.debit === 0} className="btn-primary" style={{ width: '100%', opacity: isBalanced && totals.debit > 0 ? 1 : 0.5 }}>
                                    Confirmar Asiento
                                </button>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    <div className="glass-panel" style={{ padding: '0.5rem' }}>
                        {entries.map(entry => (
                            <div key={entry.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                                    <div>
                                        <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{new Date(entry.date).toLocaleDateString()}</span>
                                        <div style={{ fontWeight: '600' }}>{entry.description}</div>
                                    </div>
                                    <div style={{ opacity: 0.4, fontSize: '0.7rem' }}>#{entry.id.slice(-6)}</div>
                                </div>
                                <div style={{ paddingLeft: '1rem', fontSize: '0.9rem' }}>
                                    {entry.items.map((item, idx) => {
                                        const account = accounts.find(a => a.id === item.accountId);
                                        return (
                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                                <span style={{ flex: 1 }}>{account?.name || 'Cuenta eliminada'}</span>
                                                <div style={{ display: 'flex', width: '200px', textAlign: 'right' }}>
                                                    <span style={{ flex: 1 }}>{parseFloat(item.debit) > 0 ? `$ ${parseFloat(item.debit).toFixed(2)}` : ''}</span>
                                                    <span style={{ flex: 1 }}>{parseFloat(item.credit) > 0 ? `$ ${parseFloat(item.credit).toFixed(2)}` : ''}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                        {entries.length === 0 && (
                            <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>No hay asientos registrados aún</div>
                        )}
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default AccountingView;
