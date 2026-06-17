import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useRefresh } from '../context/RefreshContext';
import { HiOutlineCheck, HiOutlineX, HiOutlineUserGroup, HiOutlineSearch } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function AttendancePage() {
  const { get, put } = useApi();
  const { triggerRefresh } = useRefresh();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAct, setSelectedAct] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [stats, setStats] = useState({});
  const [search, setSearch] = useState('');

  useEffect(() => { fetchActivities(); }, []);

  const fetchActivities = async () => {
    try {
      const res = await get('/activities/my-activities', { silent: true });
      const acts = res.data?.data || res.data || [];
      setActivities(acts.filter(a => a.status === 'scheduled' || a.status === 'in_progress'));
    } catch {}
    setLoading(false);
  };

  const loadAttendees = async (activityId) => {
    try {
      const [attRes, actRes] = await Promise.all([
        get(`/activities/${activityId}/attendees`, { silent: true }),
        get(`/activities/${activityId}`, { silent: true })
      ]);
      setAttendees(attRes.data || []);
      setStats(attRes.stats || {});
      setSelectedAct(actRes.data || { id: activityId });
    } catch { toast.error('Error al cargar asistentes'); }
  };

  const markAttendance = async (userId, status) => {
    try {
      await put(`/activities/${selectedAct.id}/attendees/${userId}`, { status }, {
        successMessage: status === 'attended' ? 'Asistencia marcada' : 'Ausencia marcada'
      });
      loadAttendees(selectedAct.id);
      triggerRefresh();
    } catch { toast.error('Error al actualizar'); }
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Registro de Asistencia</h1>
          <p className="page-subtitle">Marca asistencia de los alumnos a tus actividades</p>
        </div>
      </div>

      {!selectedAct ? (
        <>
          <div className="search-input" style={{ marginBottom: 'var(--space-lg)' }}>
            <HiOutlineSearch className="search-icon" />
            <input placeholder="Buscar actividad..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-md)' }}>
            {activities
              .filter(a => !search || a.title.toLowerCase().includes(search.toLowerCase()))
              .map(act => (
                <div key={act.id} className="card" style={{ padding: 'var(--space-md)', cursor: 'pointer' }}
                  onClick={() => loadAttendees(act.id)}>
                  <h3 style={{ fontWeight: 600, marginBottom: 4, fontSize: '0.95rem' }}>{act.title}</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <div>{act.program_name}</div>
                    <div>{new Date(act.start_time).toLocaleString('es-CL')}</div>
                    {act.room_name && <div>Sala: {act.room_name}</div>}
                  </div>
                </div>
              ))}
            {activities.length === 0 && <div className="empty-state"><p>No tienes actividades programadas</p></div>}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--space-lg)' }}>
            <button className="btn btn-secondary" onClick={() => setSelectedAct(null)}>← Volver</button>
            <div>
              <h2 style={{ fontWeight: 600, margin: 0 }}>{selectedAct.title}</h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {selectedAct.program_name} · {new Date(selectedAct.start_time).toLocaleString('es-CL')}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
              <span className="badge badge-success">{stats.attended || 0} Asistieron</span>
              <span className="badge badge-danger">{stats.absent || 0} Ausentes</span>
              <span className="badge badge-info">{stats.confirmed || 0} Confirmados</span>
            </div>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {attendees.map(a => (
                  <tr key={a.id || a.user_id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{a.user_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{a.user_email}</div>
                    </td>
                    <td>
                      <span className={`badge ${
                        a.status === 'attended' ? 'badge-success' :
                        a.status === 'absent' ? 'badge-danger' :
                        a.status === 'confirmed' ? 'badge-info' : 'badge-warning'
                      }`}>
                        {a.status === 'attended' ? 'Asistió' :
                         a.status === 'absent' ? 'Ausente' :
                         a.status === 'confirmed' ? 'Confirmado' : 'Registrado'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {a.status !== 'attended' && (
                          <button className="btn btn-sm btn-primary" onClick={() => markAttendance(a.user_id, 'attended')}>
                            <HiOutlineCheck /> Asistió
                          </button>
                        )}
                        {a.status !== 'absent' && (
                          <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={() => markAttendance(a.user_id, 'absent')}>
                            <HiOutlineX /> Ausente
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {attendees.length === 0 && (
                  <tr><td colSpan={3} className="empty-state">No hay alumnos registrados para esta actividad</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
