import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineX } from 'react-icons/hi';

export default function ServicesPage() {
  const { get, post, put, del } = useApi();
  const { canManage } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', cost_per_person: '', provider: '' });

  useEffect(() => { fetchServices(); }, []);
  const fetchServices = async () => { try { const res = await get('/services', { silent: true }); setServices(res.data); } catch {} setLoading(false); };

  const openCreate = () => { setForm({ name: '', description: '', cost_per_person: '', provider: '' }); setEditingId(null); setShowModal(true); };
  const openEdit = (s) => { setForm({ name: s.name, description: s.description || '', cost_per_person: s.cost_per_person, provider: s.provider || '' }); setEditingId(s.id); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) await put(`/services/${editingId}`, form, { successMessage: 'Servicio actualizado' });
      else await post('/services', form, { successMessage: 'Servicio creado' });
      setShowModal(false); fetchServices();
    } catch {}
  };

  const handleDelete = async (id) => { if (!confirm('¿Desactivar servicio?')) return; await del(`/services/${id}`, { successMessage: 'Servicio desactivado' }); fetchServices(); };

  const formatCLP = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(n);

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Servicios</h1><p className="page-subtitle">Coffee breaks, almuerzos y materiales</p></div>
        {canManage() && <button className="btn btn-primary" onClick={openCreate}><HiOutlinePlus /> Nuevo Servicio</button>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-lg)' }}>
        {services.map(s => (
          <div key={s.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{s.name}</h3>
              <span className={`badge ${s.active ? 'badge-success' : 'badge-danger'}`}>{s.active ? 'Activo' : 'Inactivo'}</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: 12 }}>{s.description || 'Sin descripción'}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div><span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{formatCLP(s.cost_per_person)}</span><span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}> / persona</span></div>
              {s.provider && <span className="badge" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>{s.provider}</span>}
            </div>
            {canManage() && (
              <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border-light)', paddingTop: 12 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(s)}><HiOutlinePencil /> Editar</button>
                <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(s.id)}><HiOutlineTrash /></button>
              </div>
            )}
          </div>
        ))}
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">{editingId ? 'Editar Servicio' : 'Nuevo Servicio'}</h3><button className="btn btn-icon" onClick={() => setShowModal(false)}>X</button></div>
            <form onSubmit={handleSubmit}>
              <div className="form-group"><label className="form-label">Nombre *</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="form-group"><label className="form-label">Descripción</label><textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Costo por persona (CLP) *</label><input className="form-input" type="number" value={form.cost_per_person} onChange={e => setForm({ ...form, cost_per_person: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">Proveedor</label><input className="form-input" value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} /></div>
              </div>
              <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button><button type="submit" className="btn btn-primary">{editingId ? 'Guardar' : 'Crear'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
