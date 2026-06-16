import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useRefresh } from '../context/RefreshContext';
import { HiOutlineCalendar, HiOutlineCheck, HiOutlineClock, HiOutlineLocationMarker, HiOutlineAcademicCap } from 'react-icons/hi';
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

  // NUEVO: Ahora recibe la modalidad (presencial o remoto) y la envía al backend
  const handleConfirm = async (activityId, modality) => {
    try {
      await post(`/activities/${activityId}/confirm-attendance`, { modalidad: modality }, { successMessage: `¡Asistencia ${modality} confirmada!` });
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

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  // 1. Filtrar por programa seleccionado (si hay uno)
  const filteredActivities = selectedProgram 
    ? activities.filter(a => a.program_id === parseInt(selectedProgram))
    : activities;

  // 2. Filtrar SOLO las actividades en las que el alumno está inscrito
  const enrolledActivities = filteredActivities.filter(a => 
    a.attendance_status === 'registered' || 
    a.attendance_status === 'confirmed' || 
    a.attendance_status === 'attended'
  );

  // 3. Dividir las actividades en 3 categorías para las nuevas secciones
  // Clases futuras que AÚN NO confirma
  const pendingConfirmationActivities = enrolledActivities.filter(a => 
    new Date(a.start_time) > new Date() && a.status !== 'completed' && a.attendance_status === 'registered'
  );
  
  // Clases futuras que YA confirmó
  const confirmedUpcomingActivities = enrolledActivities.filter(a => 
    new Date(a.start_time) > new Date() && a.status !== 'completed' && a.attendance_status === 'confirmed'
  );

  // Clases pasadas o completadas
  const pastActivities = enrolledActivities.filter(a => 
    new Date(a.start_time) <= new Date() || a.status === 'completed'
  );

  const stats = {
    total: enrolledActivities.length,
    pending: pendingConfirmationActivities.length,
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
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning)' }}>{stats.pending}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Por Confirmar</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-md)' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>{stats.confirmed}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Confirmadas</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-md)' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--info)' }}>{stats.attended}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Asistidas</div>
        </div>
      </div>

      {/* SECCIÓN 1: Clases por Confirmar */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <HiOutlineCalendar /> Clases por Confirmar Asistencia
        </h2>
        {pendingConfirmationActivities.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pendingConfirmationActivities.map(act => {
              const info = statusInfo(act);
              return (
                <div key={act.id} className="card" style={{ padding: 'var(--space-md)', borderLeft: '4px solid var(--warning)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ flex: 1, minWidth: '250px' }}>
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
                    
                    {/* Botones para seleccionar modalidad */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>¿Cómo vas a asistir?</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-primary btn-sm" onClick={() => handleConfirm(act.id, 'presencial')}>
                          📍 Presencial
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleConfirm(act.id, 'remoto')}>
                          💻 Remoto
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card empty-state">
            <p>No tienes clases pendientes por confirmar.</p>
          </div>
        )}
      </div>

      {/* SECCIÓN 2: Clases Confirmadas */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <HiOutlineCheck /> Clases Confirmadas
        </h2>
        {confirmedUpcomingActivities.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {confirmedUpcomingActivities.map(act => {
              const info = statusInfo(act);
              return (
                <div key={act.id} className="card" style={{ padding: 'var(--space-md)', borderLeft: '4px solid var(--success)', background: 'var(--bg-card-hover)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: '1.2rem' }}>{info.icon}</span>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>{act.title}</h3>
                        <span className="badge badge-purple">{act.program_name}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, fontSize: '0.85rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>📅 {new Date(act.start_time).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>🕐 {new Date(act.start_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} - {new Date(act.end_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                      <span className="badge badge-success" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                        ✅ Confirmado {act.modality ? `(${act.modality})` : ''}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card empty-state">
            <p>Aún no has confirmado asistencia a ninguna clase próxima.</p>
          </div>
        )}
      </div>

      {/* SECCIÓN 3: Historial */}
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
                  <span className={`badge ${act.attendance_status === 'attended' ? 'badge-success' : 'badge-danger'}`}>
                    {act.attendance_status === 'attended' ? 'Asistió' : 
                     act.attendance_status === 'confirmed' ? 'Confirmado (Pendiente)' : 
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