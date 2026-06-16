import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { HiOutlineHome, HiOutlineCalendar, HiOutlineClipboardList, HiOutlineOfficeBuilding,
  HiOutlineAcademicCap, HiOutlineUsers, HiOutlineCog, HiOutlineBell, HiOutlineLogout,
  HiOutlineShieldCheck, HiOutlineMenu, HiOutlineSun, HiOutlineMoon, HiOutlineSearch } from 'react-icons/hi';
import Chatbot from './Chatbot';

export default function Layout() {
  const { user, logout, canManage, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { get } = useApi();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : true;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('favorites') || '[]'));

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await get('/notifications/count', { silent: true });
        setUnreadCount(res.data.unread_count);
      } catch {}
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults(null);
      return;
    }
    const searchAll = async () => {
      try {
        const [activities, programs] = await Promise.all([
          get(`/activities?search=${searchQuery}&limit=5`, { silent: true }),
          get(`/programs?search=${searchQuery}&limit=5`, { silent: true })
        ]);
        setSearchResults({
          activities: activities.data?.data || activities.data || [],
          programs: programs.data?.data || programs.data || []
        });
      } catch {}
    };
    const timeout = setTimeout(searchAll, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const toggleFavorite = (id, type) => {
    const key = `${type}_${id}`;
    const newFavs = favorites.includes(key) 
      ? favorites.filter(f => f !== key)
      : [...favorites, key];
    setFavorites(newFavs);
    localStorage.setItem('favorites', JSON.stringify(newFavs));
  };

  const isFavorite = (id, type) => favorites.includes(`${type}_${id}`);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = canManage() 
    ? [
        { section: 'Principal', items: [
          { to: '/', icon: <HiOutlineHome />, label: 'Dashboard' },
          { to: '/calendar', icon: <HiOutlineCalendar />, label: 'Calendario' },
          //{ to: '/my-activities', icon: <HiOutlineClipboardList />, label: 'Mis Actividades' },
          { to: '/activities', icon: <HiOutlineClipboardList />, label: 'Gestión Actividades' },
          { to: '/my-requests', icon: <HiOutlineClipboardList />, label: 'Mis Solicitudes' },
        ]},
        { section: 'Gestión', items: [
          { to: '/programs', icon: <HiOutlineAcademicCap />, label: 'Programas' },
          { to: '/rooms', icon: <HiOutlineOfficeBuilding />, label: 'Salas' },
          { to: '/services', icon: <HiOutlineCog />, label: 'Servicios' },
          { to: '/requests', icon: <HiOutlineClipboardList />, label: 'Solicitudes' },
          { to: '/enrollments', icon: <HiOutlineUsers />, label: 'Inscripciones' },
          { to: '/user-stats', icon: <HiOutlineSearch />, label: 'Estadísticas Users' },
        ]},
        { section: 'Sistema', items: [
          { to: '/users', icon: <HiOutlineUsers />, label: 'Usuarios' },
          { to: '/notifications', icon: <HiOutlineBell />, label: 'Notificaciones', badge: unreadCount },
          ...(isAdmin() ? [{ to: '/audit', icon: <HiOutlineShieldCheck />, label: 'Auditoría' }] : []),
        ]},
      ]
    : [
        { section: 'Principal', items: [
          { to: '/', icon: <HiOutlineHome />, label: 'Mi Dashboard' },
          { to: '/my-activities', icon: <HiOutlineCalendar />, label: 'Mis Clases' },
          { to: '/calendar', icon: <HiOutlineCalendar />, label: 'Calendario' },
         // { to: '/my-requests', icon: <HiOutlineClipboardList />, label: 'Solicitudes' },
        ]},
        //{ section: 'Sistema', items: [
          //{ to: '/notifications', icon: <HiOutlineBell />, label: 'Notificaciones', badge: unreadCount },
        //]},
      ];

  return (
    <div className="app-layout">
      {/* Mobile toggle */}
      <button className="btn btn-icon" onClick={() => setMobileOpen(!mobileOpen)}
        style={{ position: 'fixed', top: 12, left: 12, zIndex: 200, display: 'none' }}
        id="mobile-menu-toggle">
        {mobileOpen ? <span style={{fontSize: 24, lineHeight: 1}}>×</span> : <HiOutlineMenu />}
      </button>

      {/* Global Search */}
      <div className="search-container" style={{ position: 'fixed', top: 12, right: 12, zIndex: 200 }}>
        <div style={{ position: 'relative' }}>
          <input 
            placeholder="Buscar..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ 
              padding: '8px 12px 8px 36px', 
              borderRadius: 8, 
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              width: 200
            }}
          />
          <HiOutlineSearch style={{ position: 'absolute', left: 10, top: 8, color: 'var(--text-muted)' }} />
          
          {searchResults && (searchResults.activities.length > 0 || searchResults.programs.length > 0) && (
            <div style={{ 
              position: 'absolute', top: '100%', right: 0, 
              background: 'var(--bg-card)', border: '1px solid var(--border-color)',
              borderRadius: 8, padding: 8, width: 300, maxHeight: 300, overflow: 'auto',
              boxShadow: 'var(--shadow-lg)'
            }}>
              {searchResults.activities.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>ACTIVIDADES</div>
                  {searchResults.activities.map(a => (
                    <div key={a.id} onClick={() => { navigate('/activities'); setSearchQuery(''); }}
                      style={{ padding: 8, cursor: 'pointer', borderRadius: 4, ':hover': { background: 'var(--bg-hover)' } }}>
                      <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{a.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.program_name}</div>
                    </div>
                  ))}
                </div>
              )}
              {searchResults.programs.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>PROGRAMAS</div>
                  {searchResults.programs.map(p => (
                    <div key={p.id} onClick={() => { navigate('/programs'); setSearchQuery(''); }}
                      style={{ padding: 8, cursor: 'pointer', borderRadius: 4 }}>
                      <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.type}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}
      
      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🎓</div>
          <div className="sidebar-logo-text">
            Académico
            <span>Gestión de Programas</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((section) => (
            <div key={section.section} className="sidebar-section">
              <div className="sidebar-section-title">{section.section}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="sidebar-link-icon">{item.icon}</span>
                  {item.label}
                  {item.badge > 0 && (
                    <span className="badge badge-danger" style={{ marginLeft: 'auto', padding: '2px 8px' }}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-user">
          <button className="btn btn-icon" onClick={() => setDarkMode(!darkMode)} title={darkMode ? 'Modo claro' : 'Modo oscuro'}>
            {darkMode ? <HiOutlineSun /> : <HiOutlineMoon />}
          </button>
          <div className="sidebar-avatar">
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name}</div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
          <button className="btn btn-icon" onClick={handleLogout} title="Cerrar sesión" id="logout-btn">
            <HiOutlineLogout />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content fade-in">
        <Outlet />
      </main>

      <Chatbot />
    </div>
  );
}