import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useRefresh } from '../context/RefreshContext';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineSearch, HiOutlineLightBulb, HiOutlineUserGroup, HiOutlineX, HiOutlineDownload, HiOutlineRefresh } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function ActivitiesPage() {
  const { get, post, put, del } = useApi();
  const { canManage } = useAuth();
  const { refreshTrigger, triggerRefresh } = useRefresh();
  const [activities, setActivities] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterProgram, setFilterProgram] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', program_id: '', room_id: '', start_time: '', end_time: '', estimated_attendees: '', repeat_until: '', repeat_days: [] });

  useEffect(() => { fetchAll(); }, [search, filterProgram, filterStatus, refreshTrigger]);

  const fetchAll = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterProgram) params.set('program_id', filterProgram);
      if (filterStatus) params.set('status', filterStatus);
      const [actRes, progRes, roomRes] = await Promise.all([
        get(`/activities?${params}`, { silent: true }),
        get('/programs', { silent: true }),
        get('/rooms', { silent: true })
      ]);
      setActivities(actRes.data);
      setPrograms(progRes.data);
      setRooms(roomRes.data);
    } catch {}
    setLoading(false);
  };

  const openCreate = () => {
    setForm({ title: '', description: '', program_id: '', room_id: '', start_time: '', end_time: '', estimated_attendees: '', repeat_until: '', repeat_days: [] });
    setEditingId(null);
    setSuggestions(null);
    setIsRecurring(false);
    setShowModal(true);
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (filterProgram) params.set('program_id', filterProgram);
      if (filterStatus) params.set('status', filterStatus);
      
      const response = await fetch(`http://localhost:4000/api/activities/export?format=csv&${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'actividades.csv';
      a.click();
      toast.success('Archivo exportado');
    } catch { toast.error('Error al exportar'); }
  };

  const handleAutoUpdateStatus = async () => {
    try {
      await put('/activities/update-status', {}, { silent: true });
      fetchAll();
      toast.success('Estados actualizados');
    } catch { toast.error('Error al actualizar'); }
  };

  const openEdit = (act) => {
    setForm({
      title: act.title, description: act.description || '',
      program_id: act.program_id, room_id: act.room_id || '',
      start_time: act.start_time?.replace(' ', 'T')?.slice(0, 16),
      end_time: act.end_time?.replace(' ', 'T')?.slice(0, 16),
      estimated_attendees: act.estimated_attendees || ''
    });
    setEditingId(act.id);
    setSuggestions(null);
    setShowModal(true);
  };

  const handleSuggestRoom = async () => {
    if (!form.estimated_attendees || !form.start_time || !form.end_time) {
      return toast.error('Ingresa asistentes estimados y horario primero');
    }
    try {
      const res = await get(`/rooms/suggest?attendees=${form.estimated_attendees}&start_time=${form.start_time}&end_time=${form.end_time}`, { silent: true });
      setSuggestions(res.data);
    } catch {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isRecurring && form.repeat_days.length > 0 ? '/activities/bulk' : '/activities';
      const payload = isRecurring && form.repeat_days.length > 0 
        ? { ...form, repeat_days: form.repeat_days.map(Number) }
        : form;
        
      if (editingId) {
        await put(`/activities/${editingId}`, form, { successMessage: 'Actividad actualizada' });
      } else {
      await post(endpoint, payload, { successMessage: isRecurring && form.repeat_days.length > 0 ? 'Actividades recurrentes creadas' : 'Actividad creada y notificaciones enviadas' });
      }
      setShowModal(false);
      fetchAll();
      triggerRefresh();
    } catch {}
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Cancelar esta actividad?')) return;
    await del(`/activities/${id}`, { successMessage: 'Actividad cancelada' });
    fetchAll();
    triggerRefresh();
  };

  const statusBadge = (status) => {
    const map = { scheduled: 'badge-info', in_progress: 'badge-warning', completed: 'badge-success', cancelled: 'badge-danger' };
    const labels = { scheduled: 'Programada', in_progress: 'En curso', completed: 'Completada', cancelled: 'Cancelada' };
    return <span className={`badge ${map[status]}`}>{labels[status]}</span>;
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Actividades</h1>
          <p className="page-subtitle">Gestión de actividades académicas</p>
        </div>
        {canManage() && <button className="btn btn-primary" onClick={openCreate} id="create-activity-btn"><HiOutlinePlus /> Nueva Actividad</button>}
        <button className="btn btn-secondary" onClick={handleExport} title="Exportar CSV"><HiOutlineDownload /> Exportar</button>
        <button className="btn btn-secondary" onClick={handleAutoUpdateStatus} title="Actualizar estados"><HiOutlineRefresh /> Actualizar Estados</button>
      </div>

      <div className="filters-bar">
        <div className="search-input">
          <HiOutlineSearch className="search-icon" />
          <input placeholder="Buscar actividades..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 180 }} value={filterProgram} onChange={e => setFilterProgram(e.target.value)}>
          <option value="">Todos los programas</option>
          {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="form-select" style={{ width: 150 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="scheduled">Programado</option>
          <option value="in_progress">En curso</option>
          <option value="completed">Completado</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr>
            <th>Actividad</th><th>Programa</th><th>Sala</th><th>Fecha</th><th>Horario</th><th>Asistentes</th><th>Estado</th>
            {canManage() && <th>Acciones</th>}
          </tr></thead>
          <tbody>
            {activities.map(act => (
              <tr key={act.id}>
                <td><div style={{ fontWeight: 600 }}>{act.title}</div></td>
                <td><span className="badge badge-purple">{act.program_name}</span></td>
                <td>
                  {act.room_name ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                      <span style={{ color: 'var(--accent-primary)' }}>📍</span> {act.room_name}
                    </span>
                  ) : <span style={{ color: 'var(--text-muted)' }}>— Sin asignar —</span>}
                </td>
                <td>{new Date(act.start_time).toLocaleDateString('es-CL')}</td>
                <td>{new Date(act.start_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} - {new Date(act.end_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</td>
                <td>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <HiOutlineUserGroup /> {act.registered_count || 0} / {act.estimated_attendees || '—'}
                  </span>
                </td>
                <td>{statusBadge(act.status)}</td>
                {canManage() && <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-icon btn-sm" onClick={() => openEdit(act)} title="Editar"><HiOutlinePencil /></button>
                    <button className="btn btn-icon btn-sm" onClick={() => handleDelete(act.id)} title="Cancelar" style={{ color: 'var(--danger)' }}><HiOutlineTrash /></button>
                  </div>
                </td>}
              </tr>
            ))}
            {activities.length === 0 && <tr><td colSpan={8} className="empty-state">No hay actividades</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingId ? 'Editar Actividad' : 'Nueva Actividad'}</h3>
              <button className="btn btn-icon" onClick={() => setShowModal(false)}><HiOutlineX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Título *</label>
                <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Programa *</label>
                  <select className="form-select" value={form.program_id} onChange={e => setForm({ ...form, program_id: e.target.value })} required>
                    <option value="">Seleccionar...</option>
                    {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Asistentes Estimados</label>
                  <input className="form-input" type="number" value={form.estimated_attendees} onChange={e => setForm({ ...form, estimated_attendees: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Inicio *</label>
                  <input className="form-input" type="datetime-local" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Fin *</label>
                  <input className="form-input" type="datetime-local" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Sala</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select className="form-select" value={form.room_id} onChange={e => setForm({ ...form, room_id: e.target.value })} style={{ flex: 1 }}>
                    <option value="">Sin sala asignada</option>
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name} (Cap: {r.capacity})</option>)}
                  </select>
                  <button type="button" className="btn btn-secondary" onClick={handleSuggestRoom} title="Sugerir sala">
                    <HiOutlineLightBulb /> Sugerir
                  </button>
                </div>
              </div>

              {/* Sugerencias de sala */}
              {suggestions && suggestions.suggestions?.length > 0 && (
                <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', padding: 12, marginBottom: 16, border: '1px solid var(--border-accent)' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-accent)', marginBottom: 8, fontWeight: 600 }}>💡 {suggestions.message}</p>
                  {suggestions.suggestions.map(s => (
                    <div key={s.room_id} onClick={() => setForm({ ...form, room_id: s.room_id })}
                      style={{ padding: 8, background: form.room_id == s.room_id ? 'rgba(99,102,241,0.15)' : 'transparent', borderRadius: 6, cursor: 'pointer', marginBottom: 4, fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.2s' }}>
                      <div>
                        <strong>{s.room_name}</strong> — Cap: {s.capacity}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.recommendation}</div>
                      </div>
                      <span className="badge badge-info">Ocupación: {s.occupancy_rate}%</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Actividades recurrentes */}
              {!editingId && (
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <input type="checkbox" id="isRecurring" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} />
                    <label htmlFor="isRecurring" style={{ fontWeight: 600, cursor: 'pointer' }}>Crear actividades recurrentes</label>
                  </div>
                  {isRecurring && (
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Repetir hasta</label>
                        <input className="form-input" type="date" value={form.repeat_until} onChange={e => setForm({ ...form, repeat_until: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Días de la semana</label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {[
                            { val: 1, label: 'Lun' },
                            { val: 2, label: 'Mar' },
                            { val: 3, label: 'Mié' },
                            { val: 4, label: 'Jue' },
                            { val: 5, label: 'Vie' },
                            { val: 6, label: 'Sáb' },
                            { val: 0, label: 'Dom' }
                          ].map(d => (
                            <label key={d.val} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '4px 8px', background: form.repeat_days.includes(d.val) ? 'var(--accent-primary)' : 'var(--bg-input)', borderRadius: 4, color: form.repeat_days.includes(d.val) ? '#fff' : 'inherit' }}>
                              <input type="checkbox" checked={form.repeat_days.includes(d.val)} onChange={e => {
                                const newDays = e.target.checked 
                                  ? [...form.repeat_days, d.val]
                                  : form.repeat_days.filter(day => day !== d.val);
                                setForm({ ...form, repeat_days: newDays });
                              }} style={{ display: 'none' }} />
                              {d.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Guardar Cambios' : (isRecurring && form.repeat_days.length > 0 ? 'Crear Serie' : 'Crear Actividad')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
