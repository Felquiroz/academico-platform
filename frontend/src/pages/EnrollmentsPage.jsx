import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useRefresh } from '../context/RefreshContext';
import { HiOutlineCheck, HiOutlineX, HiOutlineUserAdd, HiOutlineSearch, HiOutlineClipboardList } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function EnrollmentsPage() {
  const { get, post, put, del } = useApi();
  const { canManage } = useAuth();
  const { triggerRefresh } = useRefresh();
  const [activities, setActivities] = useState([]);
  const [users, setUsers] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [searchUser, setSearchUser] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [bulkUsers, setBulkUsers] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [actRes, usrRes] = await Promise.all([
        get('/activities', { silent: true }),
        get('/users', { silent: true })
      ]);
      setActivities(actRes.data.data || actRes.data);
      setUsers(usrRes.data.data || usrRes.data);
    } catch {}
    setLoading(false);
  };

  const fetchEnrollments = async (activityId) => {
    try {
      const res = await get(`/activities/${activityId}/attendees`, { silent: true });
      setEnrollments(res.data);
      setSelectedActivity(activities.find(a => a.id === parseInt(activityId)));
    } catch {}
  };

  const handleApprove = async (activityId, userId) => {
    try {
      await put(`/activities/${activityId}/attendees/${userId}`, { status: 'confirmed' }, { successMessage: 'Inscripción aprobada' });
      fetchEnrollments(activityId);
      triggerRefresh();
    } catch {}
  };

  const handleReject = async (activityId, userId) => {
    if (!confirm('¿Cancelar esta inscripción?')) return;
    try {
      await del(`/activities/${activityId}/attendees/${userId}`, { successMessage: 'Inscripción cancelada' });
      fetchEnrollments(activityId);
      triggerRefresh();
    } catch {}
  };

  const handleBulkRegister = async () => {
    if (!selectedActivity || !bulkUsers.trim()) return;
    const emails = bulkUsers.split(/[\n,;]/).map(e => e.trim()).filter(e => e);
    if (emails.length === 0) return toast.error('Ingresa emails válidos');

    try {
      const foundUsers = users.filter(u => emails.includes(u.email));
      if (foundUsers.length === 0) return toast.error('No se encontraron usuarios con esos emails');

      await post(`/activities/${selectedActivity.id}/attendees`, { user_ids: foundUsers.map(u => u.id) }, { successMessage: `${foundUsers.length} usuarios inscritos` });
      setShowRegisterModal(false);
      setBulkUsers('');
      fetchEnrollments(selectedActivity.id);
      triggerRefresh();
    } catch {}
  };

  const filteredUsers = searchUser ? users.filter(u => u.name.toLowerCase().includes(searchUser.toLowerCase()) || u.email.toLowerCase().includes(searchUser.toLowerCase())) : [];

  const pendingEnrollments = enrollments.filter(e => e.status === 'registered');

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Inscripciones</h1>
          <p className="page-subtitle">Aprobar, rechazar e inscribir usuarios</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 'var(--space-lg)' }}>
        {/* Lista de actividades */}
        <div className="card" style={{ maxHeight: '70vh', overflow: 'auto' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <HiOutlineClipboardList /> Actividades
          </h3>
          {activities.map(act => (
            <div key={act.id} onClick={() => fetchEnrollments(act.id)}
              style={{
                padding: 12, marginBottom: 8, borderRadius: 8, cursor: 'pointer',
                background: selectedActivity?.id === act.id ? 'var(--accent-primary)' : 'var(--bg-input)',
                color: selectedActivity?.id === act.id ? '#fff' : 'inherit'
              }}>
              <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{act.title}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{new Date(act.start_time).toLocaleDateString('es-CL')}</div>
            </div>
          ))}
        </div>

        {/* Detalle de inscripciones */}
        <div className="card">
          {!selectedActivity ? (
            <div className="empty-state"><p>Selecciona una actividad para ver las inscripciones</p></div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontWeight: 600 }}>{selectedActivity.title}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {enrollments.length} inscritos • {pendingEnrollments.length} pendientes
                  </p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowRegisterModal(true)}>
                  <HiOutlineUserAdd /> Inscribir Rápido
                </button>
              </div>

              {/* Pendientes */}
              {pendingEnrollments.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12, color: 'var(--warning)' }}>
                    Pendientes de Aprobación ({pendingEnrollments.length})
                  </h4>
                  {pendingEnrollments.map(enroll => (
                    <div key={enroll.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: 'var(--bg-input)', borderRadius: 8, marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{enroll.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{enroll.email}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-sm btn-primary" onClick={() => handleApprove(selectedActivity.id, enroll.user_id)}>
                          <HiOutlineCheck /> Aprobar
                        </button>
                        <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleReject(selectedActivity.id, enroll.user_id)}>
                          X Rechazar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Todos los inscritos */}
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>Todos los Inscritos</h4>
                {enrollments.filter(e => e.status !== 'registered').map(enroll => (
                  <div key={enroll.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderBottom: '1px solid var(--border-light)' }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{enroll.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{enroll.email}</div>
                    </div>
                    <span className={`badge ${
                      enroll.status === 'confirmed' ? 'badge-success' : 
                      enroll.status === 'attended' ? 'badge-info' : 
                      enroll.status === 'absent' ? 'badge-danger' : 'badge-warning'
                    }`}>
                      {enroll.status === 'confirmed' ? 'Confirmado' : 
                       enroll.status === 'attended' ? 'Asistió' : 
                       enroll.status === 'absent' ? 'Ausente' : 'Pendiente'}
                    </span>
                  </div>
                ))}
                {enrollments.filter(e => e.status !== 'registered').length === 0 && <p style={{ color: 'var(--text-muted)' }}>No hay inscripciones confirmadas</p>}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal registro rápido */}
      {showRegisterModal && (
        <div className="modal-overlay" onClick={() => setShowRegisterModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="modal-title">Inscribir Usuarios Rápido</h3>
              <button className="btn btn-icon" onClick={() => setShowRegisterModal(false)}>✕</button>
            </div>
            <div style={{ padding: 16 }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                Ingresa los emails de los usuarios a inscribir (separados por coma, newline o punto y coma):
              </p>
              <textarea className="form-textarea" rows={6} value={bulkUsers} onChange={e => setBulkUsers(e.target.value)} placeholder="ejemplo@email.com, otro@email.com" />
              <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {users.slice(0, 5).map(u => (
                  <button key={u.id} className="btn btn-sm btn-secondary" onClick={() => setBulkUsers(prev => prev + (prev ? ', ' : '') + u.email)}>
                    {u.email}
                  </button>
                ))}
              </div>
              <div className="modal-actions" style={{ marginTop: 16 }}>
                <button className="btn btn-secondary" onClick={() => setShowRegisterModal(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleBulkRegister}>Inscribir</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}