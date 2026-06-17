import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useRefresh } from '../context/RefreshContext';
import toast from 'react-hot-toast';

export default function MenuConfirmationPage() {
  const { get, post } = useApi();
  const { canManage } = useAuth();
  const { refreshTrigger } = useRefresh();
  const [activities, setActivities] = useState([]);
  const [menuOptions, setMenuOptions] = useState({});
  const [choices, setChoices] = useState({});
  const [loading, setLoading] = useState(true);
  const [teacherView, setTeacherView] = useState(null);

  useEffect(() => { fetchData(); }, [refreshTrigger]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let acts;
      if (canManage()) {
        const res = await get('/activities?limit=100', { silent: true });
        acts = (res.data || []).filter(a => a.status === 'scheduled');
      } else {
        const res = await get('/activities/my-activities/with-services', { silent: true });
        acts = res.data || [];
      }
      setActivities(acts);

      const allOpts = {};
      for (const act of acts) {
        const svcs = act._services || [];
        for (const svc of svcs) {
          const sid = svc.service_id;
          if (sid && !allOpts[sid]) {
            try {
              const optRes = await get(`/services/${sid}/menu-options`, { silent: true });
              allOpts[sid] = optRes.data || [];
            } catch { allOpts[sid] = []; }
          }
        }
      }
      setMenuOptions(allOpts);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const saveChoice = async (activityId, serviceId, menuOptionId) => {
    try {
      await post('/services/menu-choices/save', {
        activity_id: activityId,
        service_id: serviceId,
        menu_option_id: menuOptionId || null
      });
      setChoices(prev => ({ ...prev, [`${activityId}_${serviceId}`]: menuOptionId }));
    } catch {}
  };

  const loadTeacherView = async (activityId) => {
    try {
      const res = await get(`/activities/${activityId}/menu-choices`, { silent: true });
      setTeacherView(res.data || []);
    } catch {}
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  const hasServices = activities.some(a => (a._services || []).length > 0);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Confirmación de Menú</h1>
          <p className="page-subtitle">
            {canManage() ? 'Preferencias de menú de los alumnos' : 'Selecciona tus preferencias para las próximas actividades'}
          </p>
        </div>
      </div>

      {!hasServices && (
        <div className="empty-state">
          <p>No hay actividades con servicios de menú disponibles</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {activities.map(act => {
          const svcs = act._services || [];
          if (svcs.length === 0) return null;
          return (
            <div key={act.id} className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontWeight: 600, marginBottom: 4 }}>{act.title}</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                    {act.program_name} · {new Date(act.start_time).toLocaleString('es-CL')}
                    {act.room_name && <span> · {act.room_name}</span>}
                  </div>
                </div>
                {canManage() && (
                  <button className="btn btn-sm btn-secondary" onClick={() => loadTeacherView(act.id)}>
                    Ver elecciones
                  </button>
                )}
              </div>

              {!canManage() && svcs.map(svc => {
                const opts = menuOptions[svc.service_id] || [];
                const choiceKey = `${act.id}_${svc.service_id}`;
                return (
                  <div key={svc.service_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 8, marginBottom: 8 }}>
                    <span style={{ fontWeight: 500, minWidth: 120, fontSize: '0.85rem' }}>{svc.service_name}</span>
                    {opts.length > 0 ? (
                      <select
                        className="form-select"
                        style={{ flex: 1 }}
                        value={choices[choiceKey] || ''}
                        onChange={e => saveChoice(act.id, svc.service_id, parseInt(e.target.value) || null)}
                      >
                        <option value="">Seleccionar...</option>
                        {opts.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.option_name}</option>
                        ))}
                      </select>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sin opciones de menú</span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {teacherView && (
        <div className="modal-overlay" onClick={() => setTeacherView(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3 className="modal-title">Preferencias de Menú</h3>
              <button className="btn btn-icon" onClick={() => setTeacherView(null)}>×</button>
            </div>
            <div style={{ padding: 'var(--space-md)', maxHeight: 400, overflow: 'auto' }}>
              {teacherView.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Ningún alumno ha elegido aún</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr><th>Alumno</th><th>Servicio</th><th>Opción</th><th>Notas</th></tr>
                  </thead>
                  <tbody>
                    {teacherView.map((c, i) => (
                      <tr key={i}>
                        <td>{c.user_name}</td>
                        <td>{c.service_name}</td>
                        <td>{c.option_name || 'Sin elegir'}</td>
                        <td>{c.custom_notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
