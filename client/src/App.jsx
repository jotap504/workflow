import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import PrivateRoute from './components/PrivateRoute'
import Login from './pages/Login'
import Register from './pages/Register'

import TaskBoard from './components/TaskBoard'
import CalendarView from './components/CalendarView'
import PollsView from './components/PollsView'
import ReportsView from './components/ReportsView'
import HubView from './components/HubView'
import UsersView from './components/UsersView'
import AccountingView from './components/AccountingView'
import ProfileView from './components/ProfileView'
import CategoriesView from './components/CategoriesView'
import ClientsView from './components/ClientsView'
import ShopAdminView from './components/ShopAdminView'
import PublicStorefront from './components/PublicStorefront'
import NotificationBell from './components/NotificationBell';

import { LayoutDashboard, Calendar, Vote, BarChart, Users, LogOut, Moon, Sun, User, Layers, Menu, X, LayoutGrid } from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="container">
      <header className="glass-panel" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        padding: '0.8rem 1rem',
        borderRadius: '16px',
        position: 'relative',
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            className="mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: '5px', display: 'flex' }}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <h2 style={{ fontSize: '1.2rem', fontWeight: '800', letterSpacing: '0.5px', margin: 0, background: 'linear-gradient(90deg, #6366f1, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Bprocess</h2>

          <nav className="desktop-nav" style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', marginLeft: '1rem' }}>
            <NavIcon to="/hub" icon={<LayoutGrid size={18} />} label="Menu Principal" navigate={navigate} />
            <NavIcon to="/workflow" icon={<LayoutDashboard size={18} />} label="Tablero" navigate={navigate} />
            <NavIcon to="/workflow/calendar" icon={<Calendar size={18} />} label="Calendario" navigate={navigate} />
            <NavIcon to="/workflow/polls" icon={<Vote size={18} />} label="Votaciones" navigate={navigate} />
            <NavIcon to="/workflow/reports" icon={<BarChart size={18} />} label="Reportes" navigate={navigate} />
            <NavIcon to="/workflow/profile" icon={<User size={18} />} label="Perfil" navigate={navigate} />
            {(user?.role === 'admin' || user?.role === 'manager') && <NavIcon to="/workflow/categories" icon={<Layers size={18} />} label="Categorías" navigate={navigate} />}
            {(user?.role === 'admin' || user?.role === 'manager') && <NavIcon to="/workflow/users" icon={<Users size={18} />} label="Usuarios" navigate={navigate} />}
            {(user?.role === 'admin' || user?.role === 'manager') && <NavIcon to="/shop" icon={<ShoppingCart size={18} />} label="Tienda" navigate={navigate} />}
          </nav>
        </div>

        {/* Mobile Nav Dropdown */}
        <div className={`mobile-nav ${mobileMenuOpen ? 'open' : ''}`}>
          <button onClick={() => { navigate('/hub'); setMobileMenuOpen(false); }} style={{ textAlign: 'left', padding: '10px', background: 'transparent', border: 'none', color: 'inherit', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LayoutGrid size={20} /> Menu Principal
          </button>
          <button onClick={() => { navigate('/workflow'); setMobileMenuOpen(false); }} style={{ textAlign: 'left', padding: '10px', background: 'transparent', border: 'none', color: 'inherit', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LayoutDashboard size={20} /> Tablero
          </button>
          <button onClick={() => { navigate('/workflow/calendar'); setMobileMenuOpen(false); }} style={{ textAlign: 'left', padding: '10px', background: 'transparent', border: 'none', color: 'inherit', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={20} /> Calendario
          </button>
          <button onClick={() => { navigate('/polls'); setMobileMenuOpen(false); }} style={{ textAlign: 'left', padding: '10px', background: 'transparent', border: 'none', color: 'inherit', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Vote size={20} /> Votaciones
          </button>
          <button onClick={() => { navigate('/reports'); setMobileMenuOpen(false); }} style={{ textAlign: 'left', padding: '10px', background: 'transparent', border: 'none', color: 'inherit', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart size={20} /> Reportes
          </button>
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <button onClick={() => { navigate('/categories'); setMobileMenuOpen(false); }} style={{ textAlign: 'left', padding: '10px', background: 'transparent', border: 'none', color: 'inherit', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Layers size={20} /> Categorías
            </button>
          )}
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <button onClick={() => { navigate('/users'); setMobileMenuOpen(false); }} style={{ textAlign: 'left', padding: '10px', background: 'transparent', border: 'none', color: 'inherit', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users size={20} /> Usuarios
            </button>
          )}
          <button onClick={() => { navigate('/profile'); setMobileMenuOpen(false); }} style={{ textAlign: 'left', padding: '10px', background: 'transparent', border: 'none', color: 'inherit', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <User size={20} /> Mi Perfil
          </button>
          <button onClick={logout} style={{ textAlign: 'left', padding: '10px', background: 'transparent', border: 'none', color: '#ef4444', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '5px' }}>
            <LogOut size={20} /> Cerrar Sesión
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Search Bar - Hidden on small mobile */}
          <div className="desktop-search" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--card-border)',
                borderRadius: '20px',
                padding: '6px 12px 6px 30px',
                fontSize: '0.8rem',
                color: 'inherit',
                outline: 'none',
                width: '120px',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => e.target.style.width = '180px'}
              onBlur={(e) => e.target.style.width = '120px'}
            />
            <span style={{ position: 'absolute', left: '10px', fontSize: '0.8rem', opacity: 0.5 }}>🔍</span>
          </div>

          <NotificationBell />
          <div className="desktop-user" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: '1.1' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>{user?.username}</span>
            <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{user?.role}</span>
          </div>
          <button className="desktop-nav" onClick={logout} style={{
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }} title="Salir">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<TaskBoard searchQuery={searchQuery} />} />
          <Route path="calendar" element={<CalendarView />} />
          <Route path="polls" element={<PollsView />} />
          <Route path="reports" element={<ReportsView />} />
          <Route path="profile" element={<ProfileView />} />
          <Route path="users" element={<UsersView globalMode={false} />} />
          <Route path="categories" element={<CategoriesView />} />
        </Routes>
      </main>
    </div>
  )
}

const NavIcon = ({ to, icon, label, navigate }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <button
      onClick={() => navigate(to)}
      style={{
        background: isActive ? 'var(--primary-color)' : 'transparent',
        color: isActive ? 'white' : 'inherit',
        border: 'none',
        padding: '8px',
        borderRadius: '12px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
        opacity: isActive ? 1 : 0.6
      }}
      title={label}
    >
      {icon}
    </button>
  );
}

const AdminSuite = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user || user.role !== 'admin') {
    return <Navigate to="/hub" />;
  }

  return (
    <div className="container">
      <header className="glass-panel" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        padding: '0.8rem 1rem',
        borderRadius: '16px',
        position: 'relative',
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '800', letterSpacing: '0.5px', margin: 0, background: 'linear-gradient(90deg, #6366f1, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Bprocess Admin</h2>
          <nav className="desktop-nav" style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', marginLeft: '1rem' }}>
            <NavIcon to="/hub" icon={<LayoutGrid size={18} />} label="Menu Principal" navigate={navigate} />
            <NavIcon to="/admin-suite" icon={<Users size={18} />} label="Usuarios" navigate={navigate} />
            <NavIcon to="/admin-suite/categories" icon={<Layers size={18} />} label="Categorías" navigate={navigate} />
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: '1.1' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>{user?.username}</span>
            <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>Panel de Gestión</span>
          </div>
          <button onClick={logout} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <LogOut size={16} />
          </button>
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<UsersView globalMode={true} />} />
          <Route path="/categories" element={<CategoriesView />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light'
    setTheme(savedTheme)
    document.documentElement.setAttribute('data-theme', savedTheme)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <Toaster position="top-right" richColors toastOptions={{ style: { zIndex: 2000 } }} />

          {/* Global Theme Toggle (Absolute or fixed position, or in header of pages) */}
          <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000 }}>
            <button onClick={toggleTheme} className="glass-panel" style={{ padding: '0.5rem 1rem' }}>
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>

          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<PublicStorefront />} />
            <Route path="/hub" element={
              <PrivateRoute>
                <HubView />
              </PrivateRoute>
            } />
            <Route path="/accounting/*" element={
              <PrivateRoute>
                <AccountingView />
              </PrivateRoute>
            } />
            <Route path="/clients" element={
              <PrivateRoute>
                <ClientsView />
              </PrivateRoute>
            } />
            <Route path="/shop/*" element={
              <PrivateRoute>
                <ShopAdminView />
              </PrivateRoute>
            } />
            <Route path="/admin-suite/*" element={
              <PrivateRoute>
                <AdminSuite />
              </PrivateRoute>
            } />
            <Route path="/workflow/*" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />
          </Routes>
        </Router>
      </CartProvider>
    </AuthProvider>
  )
}

export default App
