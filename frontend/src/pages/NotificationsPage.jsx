import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { HiOutlineBell, HiOutlineCheck, HiOutlineTrash, HiOutlineCheckCircle } from 'react-icons/hi';

export default function NotificationsPage() {
  const { get, put, del } = useApi();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchNotifications(); }, [filter]);

  const fetchNotifications = async () => {
    try {
      const params = filter === 'unread' ? '?unread=true' : '';
      const res = await get(`/notifications${params}`, { silent: true });
      setNotifications(res.data);
    } catch {}
    setLoading(false);
  };

  const markAsRead = async (id) => { await put(`/notifications/${id}/read`, {}, { silent: true }); fetchNotifications(); };
  const markAllRead = async () => { await put('/notifications/read-all', {}, { successMessage: 'Todas marcadas como leídas' }); fetchNotifications(); };
  const deleteNotif = async (id) => { await del(`/notifications/${id}`, { silent: true }); fetchNotifications(); };

  const typeIcon = (type) => ({ info: '📋', warning: '⚠️', conflict: '🔴', reminder: '🔔' }[type] || '📋');
  const typeBadge = (type) => ({ info: 'badge-info', warning: 'badge-warning', conflict: 'badge-danger', reminder: 'badge-purple' }[type] || 'badge-info');

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Notificaciones</h1><p className="page-subtitle">Centro de alertas y avisos</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="form-select" style={{ width: 140 }} value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">Todas</option><option value="unread">No leídas</option>
          </select>
          <button className="btn btn-secondary" onClick={markAllRead}><HiOutlineCheckCircle /> Leer todas</button>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {notifications.map(n => (
          <div key={n.id} className="card" style={{
            padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 14,
            background: n.read ? 'var(--bg-card)' : 'var(--bg-card-hover)',
            borderLeft: n.read ? '3px solid transparent' : '3px solid var(--accent-primary)'
          }}>
            <span style={{ fontSize: '1.3rem', marginTop: 2 }}>{typeIcon(n.type)}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <strong style={{ fontSize: '0.9rem' }}>{n.title}</strong>
                <span className={`badge ${typeBadge(n.type)}`}>{n.type}</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: 6 }}>{n.message}</p>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{new Date(n.created_at).toLocaleString('es-CL')}</span>
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              {!n.read && <button className="btn btn-icon btn-sm" onClick={() => markAsRead(n.id)} title="Marcar como leída"><HiOutlineCheck /></button>}
              <button className="btn btn-icon btn-sm" onClick={() => deleteNotif(n.id)} title="Eliminar" style={{ color: 'var(--danger)' }}><HiOutlineTrash /></button>
            </div>
          </div>
        ))}
        {notifications.length === 0 && <div className="empty-state"><div className="empty-state-icon">🔔</div><p>No hay notificaciones</p></div>}
      </div>
    </div>
  );
}
