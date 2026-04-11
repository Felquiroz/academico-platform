import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useRefresh } from '../context/RefreshContext';
import { HiOutlineCalendar, HiOutlineCheck, HiOutlineClock, HiOutlineLocationMarker, HiOutlinePlus, HiOutlineUserAdd, HiOutlineAcademicCap } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function MyActivitiesPage() {
  const { get, post } = useApi();
  const { user } = useAuth();
  const { refreshTrigger, triggerRefresh } = useRefresh();
  const [activities, setActivities] = useState([]);
  const [programs, setPrograms] = useState({ enrolled: [], available: [] });
  const [loading, setLoading] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState('');

  useEffect(() => { fetchData(); }, [refreshTrigger]);

  const fetchData = async () => {
    try {
      const [activitiesRes, programsRes] = await Promise.all([
        get('/activities/my-activities', { silent: true }),
        get('/activities/my-programs', { silent: true })
      ]);
      
      const activitiesData = activitiesRes.data.data || activitiesRes.data || [];
      setActivities(activitiesData);
      
      if (programsRes.data?.data) {
        setPrograms(programsRes.data.data);
      }
    } catch {}
    setLoading(false);
  };

  const handleConfirm = async (activityId) => {
    try {
      await post(`/activities/${activityId}/confirm-attendance`, {}, { successMessage: '¡Asistencia confirmada!' });
      fetchData();
      triggerRefresh();
    } catch {}
  };

  const handleEnroll = async (activityId) => {
    try {
      await post(`/activities/${activityId}/enroll`, {}, { successMessage: '¡Inscripción exitosa!' });
      fetchData();
      triggerRefresh();
    } catch {}
  };

  const statusInfo = (act) => {
    const now = new Date();
    const start = new Date(act.start_time);
    const end = new Date(act.end_time);
    
    if (act.status === 'completed') return { label: 'Completada', color: 'var(--success)', icon: '✅' };
    if (now >= start && now <= end) return { label: 'En curso', color: 'var(--warning)', icon: '🔄' };
    if (now < start) return { label: 'Próxima', color: 'var(--info)', icon: '📅' };
    return { label: 'Programada', color: 'var(--accent-primary)', icon: '📋' };
  };

  const canConfirm = (act) => {
    if (act.attendance_status !== 'registered') return false;
    const now = new Date();
    const start = new Date(act.start_time);
    const hoursUntilStart = (start - now) / (1000 * 60 * 60);
    return hoursUntilStart <= 24 && hoursUntilStart >= -2;
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  // Filter activities by selected program
  const filteredActivities = selectedProgram 
    ? activities.filter(a => a.program_id === parseInt(selectedProgram))
    : activities;

  // Separate activities by status
  const enrolledActivities = filteredActivities.filter(a => a.attendance_status === 'registered' || a.attendance_status === 'confirmed' || a.attendance_status === 'attended');
  const availableActivities = filteredActivities.filter(a => a.attendance_status === 'available');
  const upcomingActivities = enrolledActivities.filter(a => new Date(a.start_time) > new Date() && a.status !== 'completed');
  const pastActivities = enrolledActivities.filter(a => new Date(a.start_time) <= new Date() || a.status === 'completed');

  const stats = {
    total: enrolledActivities.length,
    upcoming: upcomingActivities.length,
    confirmed: enrolledActivities.filter(a => a.attendance_status === 'confirmed').length,
    attended: enrolledActivities.filter(a => a.attendance_status === 'attended').length
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Mis Clases</h1>
          <p className="page-subtitle">Bienvenido, {user?.name}</p>
        </div>
      </div>

      {/* Mis Programas */}
      {programs.enrolled?.length > 0 && (
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <HiOutlineAcademicCap />
            <h3 style={{ fontWeight: 600, margin: 0 }}>Mis Programas</h3>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {programs.enrolled.map(p => (
              <button 
                key={p.id} 
                className={`badge ${selectedProgram === p.id ? '' : 'badge-purple'}`}
                style={{ 
                  padding: '8px 16px', 
                  cursor: 'pointer',
                  background: selectedProgram === p.id ? 'var(--accent-primary)' : 'var(--bg-card)',
                  color: selectedProgram === p.id ? '#fff' : 'inherit',
                  border: '1px solid var(--border-color)'
                }}
                onClick={() => setSelectedProgram(selectedProgram === p.id ? '' : p.id)}
              >
                {p.name} ({p.type})
              </button>
            ))}
            {selectedProgram && (
              <button 
                className="btn btn-sm"
                onClick={() => setSelectedProgram('')}
                style={{ fontSize: '0.8rem' }}
              >
                Ver todos
              </button>
            )}
          </div>
        </div>
      )}

      {/* Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-md)' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{stats.total}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Clases</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-md)' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>{stats.confirmed}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Confirmadas</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-md)' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning)' }}>{stats.upcoming}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Próximas</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-md)' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--info)' }}>{stats.attended}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Asistidas</div>
        </div>
      </div>

      {/* Actividades Disponibles para Inscribirse */}
      {availableActivities.length > 0 && (
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <HiOutlineUserAdd /> Disponible para Inscribirse
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {availableActivities.map(act => {
              const info = statusInfo(act);
              return (
                <div key={act.id} className="card" style={{ padding: 'var(--space-md)', borderLeft: '4px solid var(--success)', background: 'var(--bg-card-hover)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: '1.2rem' }}>{info.icon}</span>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>{act.title}</h3>
                        <span className="badge badge-purple">{act.program_name}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, fontSize: '0.85rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>📅 {new Date(act.start_time).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>🕐 {new Date(act.start_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} - {new Date(act.end_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
                        {act.room_name && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>📍 {act.room_name}</span>}
                      </div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => handleEnroll(act.id)}>
                      <HiOutlinePlus /> Inscribirse
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Próximas Clases */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <HiOutlineCalendar /> Mis Próximas Clases
        </h2>
        {upcomingActivities.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {upcomingActivities.map(act => {
              const info = statusInfo(act);
              return (
                <div key={act.id} className="card" style={{ padding: 'var(--space-md)', borderLeft: '4px solid var(--accent-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: '1.2rem' }}>{info.icon}</span>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>{act.title}</h3>
                        <span className="badge badge-purple">{act.program_name}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, fontSize: '0.85rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>📅 {new Date(act.start_time).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>🕐 {new Date(act.start_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} - {new Date(act.end_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
                        {act.room_name && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>📍 {act.room_name}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                      <span className="badge" style={{ background: info.color, color: '#fff' }}>{info.label}</span>
                      {canConfirm(act) && (
                        <button className="btn btn-primary btn-sm" onClick={() => handleConfirm(act.id)}>
                          <HiOutlineCheck /> Confirmar Asistencia
                        </button>
                      )}
                      {act.attendance_status === 'confirmed' && (
                        <span className="badge badge-success">✅ Confirmado</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card empty-state">
            <p>No tienes clases próximas</p>
            {availableActivities.length > 0 && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Mira las actividades disponibles abajo</p>}
          </div>
        )}
      </div>

      {/* Historial */}
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
          📂 Historial de Clases
        </h2>
        {pastActivities.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {pastActivities.map(act => (
              <div key={act.id} className="card" style={{ padding: 'var(--space-md)', opacity: 0.8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>{act.title}</h3>
                  <span className="badge badge-success">
                    {act.attendance_status === 'attended' ? 'Asistió' : 
                     act.attendance_status === 'confirmed' ? 'Confirmado' : 
                     'No asistió'}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <div>📅 {new Date(act.start_time).toLocaleDateString('es-CL')}</div>
                  <div>📚 {act.program_name}</div>
                  {act.room_name && <div>📍 {act.room_name}</div>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card empty-state"><p>Sin historial de clases</p></div>
        )}
      </div>
    </div>
  );
}