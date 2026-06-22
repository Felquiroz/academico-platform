import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useRefresh } from '../context/RefreshContext';
import { HiOutlineCheck, HiOutlinePlus, HiOutlineClock, HiOutlineOfficeBuilding, HiOutlineClipboardList, HiOutlineCog } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function RequestsPage() {
  const { get, put, post } = useApi();
  const { canManage } = useAuth();
  const { triggerRefresh } = useRefresh();
  const [requests, setRequests] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ type: 'room', title: '', description: '', room_id: '', program_id: '', start_time: '', end_time: '', service_ids: [] });
  const [coordinators, setCoordinators] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  useEffect(() => { fetchAll(); }, [filter, triggerRefresh]);

  const fetchAll = async () => {
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const [reqRes, roomRes, progRes, servRes, teacherRes] = await Promise.all([
        get(`/requests${params}`, { silent: true }),
        get('/rooms', { silent: true }),
        get('/programs', { silent: true }),
        get('/services', { silent: true }),
        get('/requests/teachers', { silent: true }) // NUEVO: Traemos los coordinadores para el form
      ]);
      setRequests(reqRes.data.data || reqRes.data);
      setRooms(roomRes.data?.data || roomRes.data || []);
      setPrograms(progRes.data?.data || progRes.data || []);
      setServices(servRes.data?.data || servRes.data || []);
      setCoordinators(teacherRes.data?.data || teacherRes.data || []); // NUEVO: Guardamos los coordinadores en el estado
    // 🔍 EL CHIVATO: Abre la consola del navegador (F12) y mira qué imprime esto:
      console.log("🔴 RESPUESTA DE PROFESORES EN EL COORD:", teacherRes?.data);

      // Guardamos los datos asegurando los caminos comunes de Axios
      const listaProfesores = teacherRes?.data?.data || teacherRes?.data || [];
      setCoordinators(listaProfesores); 

    } catch (error) {
      console.error("🔴 ERROR EN FETCHALL DEL COORD:", error);
    } 
    
    setLoading(false);
  };

  const handleApprove = async (id) => {
    try {
      await put(`/requests/${id}/approve`, {}, { successMessage: 'Solicitud aprobada' });
      fetchAll();
      triggerRefresh();
    } catch {}
  };

  const handleReject = async (id) => {
    const notes = prompt('Motivo del rechazo (opcional):');
    try {
      await put(`/requests/${id}/reject`, { notes: notes || '' }, { successMessage: 'Solicitud rechazada' });
      fetchAll();
      triggerRefresh();
    } catch {}
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    // 1. Creamos el objeto limpio con los datos
    const payload = {
      ...form,
      teacher_id: selectedTeacherId ? Number(selectedTeacherId) : null
    };

    // 2. Imprimimos en la consola (fuera del objeto) para revisar qué viaja
    console.log("✈️ PAYLOAD QUE VA HACIA EL BACKEND:", payload);

    // 3. Enviamos el payload al servidor
    await post('/requests', payload, { successMessage: 'Solicitud enviada' });
    
    // 4. Si todo sale bien, limpiamos y cerramos
    setShowModal(false);
    setForm({ type: 'room', title: '', description: '', room_id: '', program_id: '', start_time: '', end_time: '', service_ids: [] });
    setSelectedTeacherId(''); 
    triggerRefresh();
    
  } catch (error) {
    // 🕵️‍♂️ Si el servidor tira error, lo atrapamos aquí para que no se refresque la pantalla
    console.error("💥 Error al enviar la solicitud:", error);
  }
};

  const toggleService = (serviceId) => {
    setForm(prev => ({
      ...prev,
      service_ids: prev.service_ids.includes(serviceId)
        ? prev.service_ids.filter(id => id !== serviceId)
        : [...prev.service_ids, serviceId]
    }));
  };

  const typeIcon = (type) => ({
    room: <HiOutlineOfficeBuilding />,
    activity: <HiOutlineClipboardList />,
    service: <HiOutlineCog />,
    general: <HiOutlineClipboardList />
  }[type]);

  const statusBadge = (status) => ({
    pending: 'badge-warning',
    approved: 'badge-success',
    rejected: 'badge-danger',
    cancelled: 'badge-secondary'
  }[status]);

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Solicitudes</h1>
          <p className="page-subtitle">Aprobar o rechazar solicitudes de salas, servicios y actividades</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <HiOutlinePlus /> Nueva Solicitud
        </button>
      </div>

      <div className="filters-bar">
        <button className={`btn ${filter === 'pending' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('pending')}>
          <HiOutlineClock /> Pendientes
        </button>
        <button className={`btn ${filter === 'approved' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('approved')}>
          Aprobadas
        </button>
        <button className={`btn ${filter === 'rejected' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('rejected')}>
          Rechazadas
        </button>
        <button className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('all')}>
          Todas
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {requests.map(req => {
          const reqServices = req.service_ids ? (Array.isArray(req.service_ids) ? req.service_ids : JSON.parse(req.service_ids)) : [];
          return (
            <div key={req.id} className="card" style={{ padding: 16, borderLeft: req.status === 'pending' ? '4px solid var(--warning)' : req.status === 'approved' ? '4px solid var(--success)' : '4px solid var(--danger)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    {typeIcon(req.type)}
                    <h3 style={{ fontWeight: 600, margin: 0 }}>{req.title}</h3>
                    <span className={`badge ${statusBadge(req.status)}`}>{req.status}</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8 }}>{req.description || 'Sin descripción'}</p>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <span>Solicitante: {req.user_name}</span>
                    {req.room_name && <span>Sala: {req.room_name}</span>}
                    {req.start_time && <span>Horario: {new Date(req.start_time).toLocaleString('es-CL')}</span>}
                    {reqServices.length > 0 && <span>Servicios: {reqServices.length} solicitados</span>}
                  </div>
                </div>
                {req.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-sm btn-primary" onClick={() => handleApprove(req.id)}>
                      <HiOutlineCheck /> Aprobar
                    </button>
                    <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleReject(req.id)}>
                      × Rechazar
                    </button>
                  </div>
                )}
              </div>
              {req.notes && <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nota: {req.notes}</div>}
            </div>
          );
        })}
        {requests.length === 0 && <div className="empty-state"><p>No hay solicitudes</p></div>}
      </div>

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
                <label className="form-label">Tipo de Solicitud</label>
                <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="room">Solicitud de Sala + Servicios</option>
                  <option value="activity">Actividad</option>
                  <option value="service">Solicitar Servicio</option>
                  <option value="general">General</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Título *</label>
                <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              
  <div className="form-group mb-3">
    <label className="form-label" style={{ fontWeight: 'bold' }}>
      Seleccionar Profesor para la clase
    </label>
    <select
      className="form-select"
      value={selectedTeacherId}
      onChange={e => setSelectedTeacherId(e.target.value)}
      required
    >
      <option value="">-- Selecciona un profesor --</option>
      {coordinators.map(t => (
        <option key={t.id} value={t.id}>
          {t.name} ({t.email})
        </option>
      ))}
    </select>
  </div>
  


              {form.type === 'room' && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Sala</label>
                      <select className="form-select" value={form.room_id} onChange={e => setForm({ ...form, room_id: e.target.value })}>
                        <option value="">Seleccionar sala</option>
                        {rooms.filter(r => r.active).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
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