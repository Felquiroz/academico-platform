import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useRefresh } from '../context/RefreshContext';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash,  } from 'react-icons/hi';

export default function RoomsPage() {
  const { get, post, put, del } = useApi();
  const { isAdmin } = useAuth();
  const { triggerRefresh } = useRefresh();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', capacity: '', location: '', equipment: '' });

  useEffect(() => { fetchRooms(); }, []);

  const fetchRooms = async () => {
    try { const res = await get('/rooms', { silent: true }); setRooms(res.data); } catch {}
    setLoading(false);
  };

  const openCreate = () => { setForm({ name: '', capacity: '', location: '', equipment: '' }); setEditingId(null); setShowModal(true); };

  const openEdit = (r) => {
    setForm({ name: r.name, capacity: r.capacity, location: r.location || '', equipment: Array.isArray(r.equipment) ? r.equipment.join(', ') : '' });
    setEditingId(r.id); setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...form, capacity: parseInt(form.capacity), equipment: form.equipment ? form.equipment.split(',').map(s => s.trim()) : [] };
    try {
      if (editingId) await put(`/rooms/${editingId}`, data, { successMessage: 'Sala actualizada' });
      else await post('/rooms', data, { successMessage: 'Sala creada' });
      setShowModal(false); fetchRooms();
      triggerRefresh();
    } catch {}
  };

  const handleDelete = async (id) => { if (!confirm('¿Desactivar esta sala?')) return; await del(`/rooms/${id}`, { successMessage: 'Sala desactivada' }); fetchRooms(); triggerRefresh(); };

  const getCapacityColor = (cap) => {
    if (cap >= 80) return '#8b5cf6';
    if (cap >= 40) return '#6366f1';
    if (cap >= 20) return '#3b82f6';
    return '#10b981';
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Salas</h1><p className="page-subtitle">Gestión de espacios y equipamiento</p></div>
        {isAdmin() && <button className="btn btn-primary" onClick={openCreate}><HiOutlinePlus /> Nueva Sala</button>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-lg)' }}>
        {rooms.map(r => (
          <div key={r.id} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: getCapacityColor(r.capacity) }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{r.name}</h3>
              <span className={`badge ${r.active ? 'badge-success' : 'badge-danger'}`}>{r.active ? 'Activa' : 'Inactiva'}</span>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
              <span>📍 {r.location || 'Sin ubicación'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: getCapacityColor(r.capacity) }}>{r.capacity}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>personas<br />de capacidad</div>
            </div>
            {r.equipment && r.equipment.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                {r.equipment.map((eq, i) => <span key={i} className="badge" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', fontSize: '0.7rem' }}>{eq}</span>)}
              </div>
            )}
            {isAdmin() && (
              <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border-light)', paddingTop: 12 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(r)}><HiOutlinePencil /> Editar</button>
                <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(r.id)}><HiOutlineTrash /></button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">{editingId ? 'Editar Sala' : 'Nueva Sala'}</h3><button className="btn btn-icon" onClick={() => setShowModal(false)}>X</button></div>
            <form onSubmit={handleSubmit}>
              <div className="form-group"><label className="form-label">Nombre *</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Capacidad *</label><input className="form-input" type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">Ubicación</label><input className="form-input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
              </div>
              <div className="form-group"><label className="form-label">Equipamiento (separar con comas)</label><input className="form-input" value={form.equipment} onChange={e => setForm({ ...form, equipment: e.target.value })} placeholder="proyector, wifi, pizarra" /></div>
              <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button><button type="submit" className="btn btn-primary">{editingId ? 'Guardar' : 'Crear'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
