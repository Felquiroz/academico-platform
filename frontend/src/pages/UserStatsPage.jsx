import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { HiOutlineUserGroup, HiOutlineClipboardCheck, HiOutlineChartBar, HiOutlineSearch } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function UserStatsPage() {
  const { get } = useApi();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const res = await get('/users', { silent: true });
      setUsers(res.data.data || res.data);
    } catch {}
    setLoading(false);
  };

  const fetchUserStats = async (userId) => {
    try {
      const res = await get(`/dashboard/user/${userId}/stats`, { silent: true });
      setStats(res.data);
      setSelectedUser(users.find(u => u.id === userId));
    } catch {}
  };

  const filteredUsers = search ? users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())) : users;

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Estadísticas por Usuario</h1>
          <p className="page-subtitle">Ver actividad y rendimiento de cada usuario</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: 'var(--space-lg)' }}>
        {/* Lista de usuarios */}
        <div className="card" style={{ maxHeight: '70vh', overflow: 'auto' }}>
          <div className="search-input" style={{ marginBottom: 16 }}>
            <HiOutlineSearch className="search-icon" />
            <input placeholder="Buscar usuario..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {filteredUsers.map(user => (
            <div key={user.id} onClick={() => fetchUserStats(user.id)}
              style={{
                padding: 12, marginBottom: 8, borderRadius: 8, cursor: 'pointer',
                background: selectedUser?.id === user.id ? 'var(--accent-primary)' : 'var(--bg-input)',
                color: selectedUser?.id === user.id ? '#fff' : 'inherit'
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                  {user.name?.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 500 }}>{user.name}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{user.email}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detalle del usuario */}
        <div className="card">
          {!stats ? (
            <div className="empty-state"><p>Selecciona un usuario para ver sus estadísticas</p></div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700 }}>
                  {stats.user.name?.charAt(0)}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{stats.user.name}</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>{stats.user.email} • <span className={`badge ${stats.user.role === 'admin' ? 'badge-danger' : stats.user.role === 'coordinator' ? 'badge-warning' : 'badge-info'}`}>{stats.user.role}</span></p>
                </div>
              </div>

              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                <div className="card" style={{ textAlign: 'center', padding: 16 }}>
                  <HiOutlineUserGroup style={{ fontSize: '1.5rem', color: 'var(--accent-primary)', marginBottom: 8 }} />
                  <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{stats.total_enrolled}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Inscripciones</div>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: 16 }}>
                  <HiOutlineClipboardCheck style={{ fontSize: '1.5rem', color: 'var(--success)', marginBottom: 8 }} />
                  <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{stats.created_activities}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Actividades Creadas</div>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: 16 }}>
                  <HiOutlineChartBar style={{ fontSize: '1.5rem', color: 'var(--info)', marginBottom: 8 }} />
                  <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{stats.attendance_rate}%</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tasa Asistencia</div>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: 16 }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: stats.user.active ? 'var(--success)' : 'var(--danger)' }}>
                    {stats.user.active ? '✅' : '❌'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{stats.user.active ? 'Activo' : 'Inactivo'}</div>
                </div>
              </div>

              {/* Estado de inscripciones */}
              <div>
                <h4 style={{ fontWeight: 600, marginBottom: 12 }}>Estado de Inscripciones</h4>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {stats.by_status.map(s => (
                    <div key={s.status} style={{ padding: '12px 16px', background: 'var(--bg-input)', borderRadius: 8 }}>
                      <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{s.count}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {s.status === 'registered' ? 'Registrados' : 
                         s.status === 'confirmed' ? 'Confirmados' : 
                         s.status === 'attended' ? 'Asistieron' : 'Ausentes'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}