import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Trash2, Shield, User as UserIcon, Plus, Key, Settings, Check, LayoutGrid } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

const UsersView = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'user' });
    const [categories, setCategories] = useState([]);
    const [selectedUserForPerms, setSelectedUserForPerms] = useState(null);
    const [userPerms, setUserPerms] = useState([]);
    const [selectedUserForApps, setSelectedUserForApps] = useState(null);
    const [userApps, setUserApps] = useState([]);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/admin/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setUsers(await response.json());
            } else {
                toast.error('Error al cargar usuarios');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error de red');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            });

            if (response.ok) {
                toast.success('Usuario creado exitosamente');
                setNewUser({ username: '', email: '', password: '', role: 'user' });
                setShowCreateForm(false);
                fetchUsers();
            } else {
                const data = await response.json();
                toast.error(data.error || 'Error al crear usuario');
            }
        } catch (error) {
            toast.error('Error de red');
        }
    };

    const handleUpdateRole = async (userId, newRole) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ role: newRole })
            });

            if (response.ok) {
                toast.success('Rol actualizado');
                fetchUsers();
            } else {
                const data = await response.json();
                toast.error(data.error || 'Error al actualizar');
            }
        } catch (error) {
            toast.error('Error de red');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm('¿Estás seguro de eliminar a este usuario?')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                toast.success('Usuario eliminado');
                fetchUsers();
            } else {
                const data = await response.json();
                toast.error(data.error || 'Error al eliminar');
            }
        } catch (error) {
            toast.error('Error de red');
        }
    };

    const handleResetPassword = async (userId) => {
        const newPassword = prompt('Ingrese la nueva contraseña:');
        if (!newPassword) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ password: newPassword })
            });

            if (response.ok) {
                toast.success('Contraseña blanqueada correctamente');
            } else {
                const data = await response.json();
                toast.error(data.error || 'Error al blanquear contraseña');
            }
        } catch (error) {
            toast.error('Error de red');
        }
    };

    const fetchCategories = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/categories', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) setCategories(await response.json());
        } catch (error) { console.error(error); }
    };

    const handleOpenPerms = async (user) => {
        setSelectedUserForPerms(user);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/users/${user.id}/categories`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) setUserPerms(await response.json());
        } catch (error) { console.error(error); }
    };

    const handleOpenApps = async (user) => {
        setSelectedUserForApps(user);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/users/${user.id}/apps`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) setUserApps(await response.json());
        } catch (error) { console.error(error); }
    };

    const handleToggleApp = (appId) => {
        setUserApps(prev =>
            prev.includes(appId) ? prev.filter(id => id !== appId) : [...prev, appId]
        );
    };

    const handleSaveApps = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/users/${selectedUserForApps.id}/apps`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ apps: userApps })
            });
            if (response.ok) {
                toast.success('Acceso a aplicaciones actualizado');
                setSelectedUserForApps(null);
            } else {
                toast.error('Error al guardar configuración');
            }
        } catch (error) { toast.error('Error de red'); }
    };

    const handleTogglePermission = (catId) => {
        setUserPerms(prev =>
            prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
        );
    };

    const handleSavePermissions = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/users/${selectedUserForPerms.id}/categories`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ categoryIds: userPerms })
            });
            if (response.ok) {
                toast.success('Permisos actualizados');
                setSelectedUserForPerms(null);
            } else {
                toast.error('Error al guardar permisos');
            }
        } catch (error) { toast.error('Error de red'); }
    };

    useEffect(() => {
        fetchUsers();
        fetchCategories();
    }, []);

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando usuarios...</div>;

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>Gestión de Usuarios</h3>
                <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="btn-primary"
                    style={{ padding: '8px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Plus size={18} /> {showCreateForm ? 'Cancelar' : 'Nuevo Usuario'}
                </button>
            </div>

            <AnimatePresence>
                {showCreateForm && (
                    <motion.form
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        onSubmit={handleCreateUser}
                        style={{ overflow: 'hidden', background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem', border: '1px solid var(--card-border)' }}
                    >
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.6, marginBottom: '4px' }}>Usuario</label>
                                <input
                                    type="text"
                                    value={newUser.username}
                                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                    required
                                    style={{ width: '100%', background: 'transparent', border: '1px solid var(--card-border)', padding: '10px', borderRadius: '8px', color: 'inherit', outline: 'none' }}
                                />
                            </div>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.6, marginBottom: '4px' }}>Email</label>
                                <input
                                    type="email"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    required
                                    style={{ width: '100%', background: 'transparent', border: '1px solid var(--card-border)', padding: '10px', borderRadius: '8px', color: 'inherit', outline: 'none' }}
                                />
                            </div>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.6, marginBottom: '4px' }}>Contraseña</label>
                                <input
                                    type="password"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                    required
                                    style={{ width: '100%', background: 'transparent', border: '1px solid var(--card-border)', padding: '10px', borderRadius: '8px', color: 'inherit', outline: 'none' }}
                                />
                            </div>
                            <div style={{ width: '150px' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.6, marginBottom: '4px' }}>Rol</label>
                                <select
                                    value={newUser.role}
                                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                    style={{ width: '100%', background: 'var(--card-bg)', border: '1px solid var(--card-border)', padding: '9px', borderRadius: '8px', color: 'inherit', outline: 'none' }}
                                >
                                    <option value="user">User</option>
                                    <option value="manager">Manager</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>
                        <button type="submit" className="btn-primary" style={{ marginTop: '1rem', width: '100%' }}>Crear Usuario</button>
                    </motion.form>
                )}
            </AnimatePresence>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--card-border)', opacity: 0.6 }}>
                            <th style={{ padding: '1rem' }}>Usuario</th>
                            <th style={{ padding: '1rem' }}>Rol</th>
                            <th style={{ padding: '1rem' }}>Fecha Registro</th>
                            <th style={{ padding: '1rem' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                    <div style={{ background: 'var(--primary-color)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                        <UserIcon size={16} />
                                    </div>
                                    {u.username}
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <select
                                        value={u.role}
                                        onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'inherit', padding: '4px 8px', outline: 'none' }}
                                    >
                                        <option value="user" style={{ background: '#1e293b' }}>User</option>
                                        <option value="manager" style={{ background: '#1e293b' }}>Manager</option>
                                        <option value="admin" style={{ background: '#1e293b' }}>Admin</option>
                                    </select>
                                </td>
                                <td style={{ padding: '1rem', opacity: 0.6, fontSize: '0.9rem' }}>
                                    {new Date(u.created_at).toLocaleDateString()}
                                </td>
                                <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => handleOpenApps(u)}
                                        style={{ background: 'transparent', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', opacity: 0.7, padding: '5px' }}
                                        title="Gestionar Acceso a Apps"
                                    >
                                        <LayoutGrid size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleOpenPerms(u)}
                                        style={{ background: 'transparent', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', opacity: 0.7, padding: '5px' }}
                                        title="Gestionar Permisos de Categoría"
                                    >
                                        <Settings size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleResetPassword(u.id)}
                                        style={{ background: 'transparent', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', opacity: 0.7, padding: '5px' }}
                                        title="Blanquear contraseña"
                                    >
                                        <Key size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteUser(u.id)}
                                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.7, padding: '5px' }}
                                        title="Eliminar usuario"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Permissions Modal */}
            <AnimatePresence>
                {selectedUserForPerms && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20000, padding: '20px' }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-panel"
                            style={{ width: '100%', maxWidth: '450px', padding: '2rem', background: 'var(--card-bg)' }}
                        >
                            <h4 style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>Permisos para: <b>{selectedUserForPerms.username}</b></h4>
                            <p style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '1.5rem' }}>Selecciona las categorías a las que este usuario tendrá acceso:</p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '2rem', maxHeight: '300px', overflowY: 'auto' }}>
                                {categories.map(cat => (
                                    <div
                                        key={cat.id}
                                        onClick={() => handleTogglePermission(cat.id)}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '0.8rem 1rem',
                                            borderRadius: '12px',
                                            background: userPerms.includes(cat.id) ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.03)',
                                            border: `1px solid ${userPerms.includes(cat.id) ? 'var(--primary-color)' : 'var(--card-border)'}`,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: cat.color }}></div>
                                            <span>{cat.name}</span>
                                        </div>
                                        {userPerms.includes(cat.id) && <Check size={18} color="var(--primary-color)" />}
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button className="btn-primary" style={{ flex: 1 }} onClick={handleSavePermissions}>Guardar</button>
                                <button
                                    className="glass-panel"
                                    style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--card-border)' }}
                                    onClick={() => setSelectedUserForPerms(null)}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Apps Modal */}
            <AnimatePresence>
                {selectedUserForApps && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20000, padding: '20px' }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-panel"
                            style={{ width: '100%', maxWidth: '450px', padding: '2rem', background: 'var(--card-bg)' }}
                        >
                            <h4 style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>Accesos para: <b>{selectedUserForApps.username}</b></h4>
                            <p style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '1.5rem' }}>Habilita qué aplicaciones de la suite puede utilizar:</p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '2rem' }}>
                                {[
                                    { id: 'workflow', name: 'Workflow', color: '#6366f1' },
                                    { id: 'shop', name: 'Carrito Pro', color: '#ec4899' },
                                    { id: 'crm', name: 'CRM Premium', color: '#10b981' }
                                ].map(app => (
                                    <div
                                        key={app.id}
                                        onClick={() => handleToggleApp(app.id)}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '0.8rem 1rem',
                                            borderRadius: '12px',
                                            background: userApps.includes(app.id) ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.03)',
                                            border: `1px solid ${userApps.includes(app.id) ? 'var(--primary-color)' : 'var(--card-border)'}`,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <span>{app.name}</span>
                                        {userApps.includes(app.id) && <Check size={18} color="var(--primary-color)" />}
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button className="btn-primary" style={{ flex: 1 }} onClick={handleSaveApps}>Guardar</button>
                                <button
                                    className="glass-panel"
                                    style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--card-border)' }}
                                    onClick={() => setSelectedUserForApps(null)}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default UsersView;
