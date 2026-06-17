import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useRefresh } from '../context/RefreshContext';
import { HiOutlinePlus, HiOutlineClock, HiOutlineOfficeBuilding, HiOutlineCog } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function MyRequestsPage() {
  const { get, post } = useApi();
  const { user } = useAuth();
  const { triggerRefresh } = useRefresh();
  const [requests, setRequests] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ type: 'room', title: '', description: '', room_id: '', program_id: '', start_time: '', end_time: '', service_ids: [] });

  useEffect(() => { fetchData(); }, [triggerRefresh]);

  const fetchData = async () => {
    try {
      const [reqRes, roomRes, progRes, servRes] = await Promise.all([
        get('/requests/my', { silent: true }),
        get('/rooms', { silent: true }),
        get('/programs', { silent: true }),
        get('/services', { silent: true })
      ]);
      setRequests(reqRes.data.data || reqRes.data);
      setRooms(roomRes.data?.data || roomRes.data || []);
      setPrograms(progRes.data?.data || progRes.data || []);
      setServices(servRes.data?.data || servRes.data || []);
    } catch {}
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await post('/requests', form, { successMessage: 'Solicitud enviada al administrador' });
      setShowModal(false);
      setForm({ type: 'room', title: '', description: '', room_id: '', program_id: '', start_time: '', end_time: '', service_ids: [] });
      triggerRefresh();
    } catch {}
  };

  const toggleService = (serviceId) => {
    setForm(prev => ({
      ...prev,
      service_ids: prev.service_ids.includes(serviceId)
        ? prev.service_ids.filter(id => id !== serviceId)
        : [...prev.service_ids, serviceId]
    }));
  };

  const statusInfo = (status) => ({
    pending: { label: 'Pendiente', color: 'var(--warning)', icon: '⏳' },
    approved: { label: 'Aprobada', color: 'var(--success)', icon: '✅' },
    rejected: { label: 'Rechazada', color: 'var(--danger)', icon: '❌' }
  }[status]);

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  const pending = requests.filter(r => r.status === 'pending').length;
  const approved = requests.filter(r => r.status === 'approved').length;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Mis Solicitudes</h1>
          <p className="page-subtitle">Solicita salas, servicios y recursos al administrador</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <HiOutlinePlus /> Nueva Solicitud
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-md)' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning)' }}>{pending}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Pendientes</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-md)' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>{approved}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Aprobadas</div>
        </div>
      </div>

      {requests.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {requests.map(req => {
            const info = statusInfo(req.status);
            const reqServices = req.service_ids ? (Array.isArray(req.service_ids) ? req.service_ids : JSON.parse(req.service_ids)) : [];
            return (
              <div key={req.id} className="card" style={{ padding: 16, borderLeft: `4px solid ${info.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span>{info.icon}</span>
                      <h3 style={{ fontWeight: 600, margin: 0 }}>{req.title}</h3>
                      <span className="badge" style={{ background: info.color, color: '#fff', fontSize: '0.7rem' }}>{info.label}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {req.room_name && <span>Sala: {req.room_name} • </span>}
                      {req.start_time && <span>{new Date(req.start_time).toLocaleString('es-CL')}</span>}
                    </div>
                    {reqServices.length > 0 && (
                      <div style={{ fontSize: '0.8rem', marginTop: 4, color: 'var(--text-secondary)' }}>
                        <HiOutlineCog style={{ display: 'inline', verticalAlign: 'middle' }} /> Servicios solicitados: {reqServices.length}
                      </div>
                    )}
                    {req.notes && <div style={{ fontSize: '0.8rem', marginTop: 4, color: 'var(--text-secondary)' }}>Nota: {req.notes}</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state"><p>No has hecho solicitudes aún</p></div>
      )}

      {/* Modal crear solicitud */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="modal-title">Nueva Solicitud</h3>
              <button className="btn btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="room">Solicitar Sala + Servicios</option>
                  <option value="activity">Nueva Actividad</option>
                  <option value="service">Solicitar Servicio</option>
                  <option value="general">Otro</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Título *</label>
                <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="Ej: Sala para clases de inglés" />
              </div>
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Detalles de la solicitud..." />
              </div>
              {form.type === 'room' && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Sala</label>
                      <select className="form-select" value={form.room_id} onChange={e => setForm({ ...form, room_id: e.target.value })}>
                        <option value="">Seleccionar</option>
                        {rooms.filter(r => r.active).map(r => <option key={r.id} value={r.id}>{r.name} (Cap: {r.capacity})</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Programa</label>
                      <select className="form-select" value={form.program_id} onChange={e => setForm({ ...form, program_id: e.target.value })}>
                        <option value="">Seleccionar</option>
                        {programs.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Fecha Inicio</label>
                      <input className="form-input" type="datetime-local" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Fecha Fin</label>
                      <input className="form-input" type="datetime-local" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Servicios Adicionales</label>
                    <div style={{ maxHeight: 150, overflow: 'auto', border: '1px solid var(--border-color)', borderRadius: 8, padding: 8 }}>
                      {services.filter(s => s.active).map(s => (
                        <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 4, cursor: 'pointer', fontSize: '0.85rem' }}>
                          <input type="checkbox" checked={form.service_ids.includes(s.id)} onChange={() => toggleService(s.id)} style={{ accentColor: 'var(--accent-primary)' }} />
                          {s.name} (${s.cost_per_person}/pers)
                        </label>
                      ))}
                      {services.filter(s => s.active).length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No hay servicios disponibles</div>}
                    </div>
                  </div>
                </>
              )}
              {(form.type === 'service') && (
                <div className="form-group">
                  <label className="form-label">Servicios Solicitados</label>
                  <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid var(--border-color)', borderRadius: 8, padding: 8 }}>
                    {services.filter(s => s.active).map(s => (
                      <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 4, cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input type="checkbox" checked={form.service_ids.includes(s.id)} onChange={() => toggleService(s.id)} style={{ accentColor: 'var(--accent-primary)' }} />
                        {s.name} - ${s.cost_per_person}/pers
                      </label>
                    ))}
                    {services.filter(s => s.active).length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No hay servicios disponibles</div>}
                  </div>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Enviar Solicitud</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}