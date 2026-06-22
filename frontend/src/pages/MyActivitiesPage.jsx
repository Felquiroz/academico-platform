import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useRefresh } from '../context/RefreshContext';
import { HiOutlineCalendar, HiOutlineCheck, HiOutlineAcademicCap, HiOutlineLocationMarker, HiOutlineVideoCamera } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function MyActivitiesPage() {
  const { get, post } = useApi();
  const { user } = useAuth();
  const { refreshTrigger, triggerRefresh } = useRefresh();
  
  const [activities, setActivities] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState('');

  // Estados para el modal de confirmación
  const [confirmModal, setConfirmModal] = useState(null);
  const [modality, setModality] = useState(''); // 'presencial' o 'remoto'
  const [menuOptions, setMenuOptions] = useState({});
  const [menuChoices, setMenuChoices] = useState({});
  const [loadingMenu, setLoadingMenu] = useState(false);

  useEffect(() => { fetchData(); }, [refreshTrigger]);

  const fetchData = async () => {
    try {
      // Usamos el endpoint con servicios para saber si la clase tiene opciones de comida
      const [activitiesRes, programsRes] = await Promise.all([
        get('/activities/my-activities/with-services', { silent: true }),
        get('/activities/my-programs', { silent: true })
      ]);
      
      const activitiesData = activitiesRes.data?.data || activitiesRes.data || [];
      setActivities(activitiesData);
      
      if (programsRes.data?.data) {
        setPrograms(programsRes.data.data?.enrolled || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // 1. Abrir Modal y cargar opciones de menú si hay servicios
  const openConfirmModal = async (act) => {
    setConfirmModal(act);
    setModality('');
    setMenuChoices({});
  };

  // 2. Al enviar, guardamos la asistencia y el servicio elegido
  const submitConfirmation = async () => {
    if (!modality) return toast.error('Por favor, selecciona si asistirás presencial o remoto.');
    
    // Si es presencial y la clase ofrece menús, obligar a elegir uno
    const svcs = confirmModal._services || [];
    if (modality === 'presencial' && svcs.length > 0 && !menuChoices.selectedServiceId) {
      return toast.error('Por favor, selecciona una de las opciones de menú disponibles.');
    }

    try {
      // Confirmar asistencia enviando la modalidad en español ('modalidad')
      await post(`/activities/${confirmModal.id}/confirm-attendance`, 
        { modalidad: modality }, 
        { successMessage: '¡Asistencia confirmada!' }
      );

      // Guardar la elección del menú si es presencial y seleccionó uno
      if (modality === 'presencial' && menuChoices.selectedServiceId) {
        await post('/services/menu-choices/save', {
          activity_id: confirmModal.id,
          service_id: parseInt(menuChoices.selectedServiceId),
          // Enviamos un valor por defecto o nulo para la opción ya que el servicio en sí es la elección
          menu_option_id: null 
        }, { silent: true });
      }

      setConfirmModal(null);
      fetchData();
      triggerRefresh();
    } catch (e) {
      console.error("Error al confirmar:", e);
    }
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

  const filteredActivities = selectedProgram 
    ? activities.filter(a => a.program_id === parseInt(selectedProgram))
    : activities;

  // Filtrar solo las que no son "available" (asegura que son a las que está inscrito)
  const enrolledActivities = filteredActivities.filter(a => a.attendance_status !== 'available');
  
  const upcomingActivities = enrolledActivities.filter(a => new Date(a.start_time) > new Date() && a.status !== 'completed');
  const pastActivities = enrolledActivities.filter(a => new Date(a.start_time) <= new Date() || a.status === 'completed');

  // Separar próximas en "Pendientes" y "Confirmadas"
  const pendingToConfirm = upcomingActivities.filter(a => a.attendance_status === 'registered');
  const alreadyConfirmed = upcomingActivities.filter(a => a.attendance_status === 'confirmed');

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
      {programs.length > 0 && (
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <HiOutlineAcademicCap />
            <h3 style={{ fontWeight: 600, margin: 0 }}>Mis Programas</h3>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {programs.map(p => (
              <button 
                key={p.id} 
                className={`badge ${selectedProgram === p.id ? '' : 'badge-purple'}`}
                style={{ 
                  padding: '8px 16px', cursor: 'pointer',
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
              <button className="btn btn-sm" onClick={() => setSelectedProgram('')} style={{ fontSize: '0.8rem' }}>Ver todos</button>
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

      {/* SECCIÓN: PENDIENTES DE CONFIRMAR */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <HiOutlineCalendar /> Pendientes de Confirmar
        </h2>
        {pendingToConfirm.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pendingToConfirm.map(act => {
              const info = statusInfo(act);
              return (
                <div key={act.id} className="card" style={{ padding: 'var(--space-md)', borderLeft: '4px solid var(--warning)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>{act.title}</h3>
                        <span className="badge badge-purple">{act.program_name}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, fontSize: '0.85rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                        <span>📅 {new Date(act.start_time).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                        <span>🕐 {new Date(act.start_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} - {new Date(act.end_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => openConfirmModal(act)}>
                        <HiOutlineCheck /> Confirmar Asistencia
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card empty-state" style={{ padding: 'var(--space-sm)' }}>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>No tienes clases pendientes por confirmar.</p>
          </div>
        )}
      </div>

      {/* SECCIÓN: YA CONFIRMADAS */}
      {alreadyConfirmed.length > 0 && (
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <HiOutlineCheck /> Clases Confirmadas
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {alreadyConfirmed.map(act => (
              <div key={act.id} className="card" style={{ padding: 'var(--space-md)', borderLeft: '4px solid var(--success)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>{act.title}</h3>
                  <span className="badge badge-success">✅ Confirmado</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <div>📅 {new Date(act.start_time).toLocaleDateString('es-CL')}</div>
                  <div>📚 {act.program_name}</div>
                  <div>💻 Modalidad: <strong style={{ textTransform: 'capitalize' }}>{act.modality || 'No especificada'}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECCIÓN: HISTORIAL */}
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
                     act.attendance_status === 'confirmed' ? 'Confirmado' : 'No asistió'}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <div>📅 {new Date(act.start_time).toLocaleDateString('es-CL')}</div>
                  <div>📚 {act.program_name}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card empty-state"><p>Sin historial de clases</p></div>
        )}
      </div>

      {/* MODAL DE CONFIRMACIÓN */}
      {confirmModal && (
        <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="modal fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="modal-title">Confirmar Asistencia</h3>
              <button className="btn btn-icon" onClick={() => setConfirmModal(null)}>×</button>
            </div>
            
            <div className="modal-body" style={{ padding: 'var(--space-md)' }}>
              <p style={{ marginBottom: 16 }}>¿Cómo asistirás a la clase <strong>{confirmModal.title}</strong>?</p>
              
              <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                <button 
                  className={`card ${modality === 'presencial' ? 'active-border' : ''}`}
                  style={{ flex: 1, padding: 16, textAlign: 'center', cursor: 'pointer', border: modality === 'presencial' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)' }}
                  onClick={() => setModality('presencial')}
                >
                  <HiOutlineLocationMarker style={{ fontSize: '1.5rem', color: 'var(--accent-primary)', marginBottom: 8 }} />
                  <div style={{ fontWeight: 600 }}>Presencial</div>
                </button>
                
                <button 
                  className={`card ${modality === 'remoto' ? 'active-border' : ''}`}
                  style={{ flex: 1, padding: 16, textAlign: 'center', cursor: 'pointer', border: modality === 'remoto' ? '2px solid var(--info)' : '1px solid var(--border-color)' }}
                  onClick={() => setModality('remoto')}
                >
                  <HiOutlineVideoCamera style={{ fontSize: '1.5rem', color: 'var(--info)', marginBottom: 8 }} />
                  <div style={{ fontWeight: 600 }}>Remoto (Online)</div>
                </button>
              </div>

              {/* SECCIÓN DE MENÚS (SOLO SI ES PRESENCIAL Y HAY SERVICIOS) */}
              {modality === 'presencial' && (confirmModal._services || []).length > 0 && (
                <div style={{ background: 'var(--bg-input)', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 600 }}>🍽️ Selecciona tu Opción de Menú</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {confirmModal._services.map(svc => (
                      <label 
                        key={svc.service_id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 10, 
                          padding: '10px 12px', 
                          background: 'var(--bg-card)', 
                          borderRadius: 6, 
                          border: menuChoices.selectedServiceId === String(svc.service_id) ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                          cursor: 'pointer' 
                        }}
                      >
                        <input 
                          type="radio" 
                          name="menuSelection"
                          value={svc.service_id}
                          checked={menuChoices.selectedServiceId === String(svc.service_id)}
                          onChange={e => setMenuChoices({ selectedServiceId: e.target.value })}
                          style={{ accentColor: 'var(--accent-primary)' }}
                        />
                        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{svc.service_name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              
            </div>

            <div className="modal-footer" style={{ padding: 'var(--space-md)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setConfirmModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={submitConfirmation} disabled={!modality}>
                Guardar Confirmación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}