import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineMenu } from 'react-icons/hi';

export default function ServicesPage() {
  const { get, post, put, del } = useApi();
  const { canManage } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', cost_per_person: '', provider: '' });
  const [menuModal, setMenuModal] = useState(null);
  const [menuOptions, setMenuOptions] = useState([]);
  const [newOption, setNewOption] = useState('');

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

  const openMenu = async (service) => {
    setMenuModal(service);
    setNewOption('');
    try {
      const res = await get(`/services/${service.id}/menu-options`, { silent: true });
      setMenuOptions(res.data || []);
    } catch { setMenuOptions([]); }
  };

  const addOption = async () => {
    if (!newOption.trim()) return;
    await post(`/services/${menuModal.id}/menu-options`, { option_name: newOption.trim() }, { successMessage: 'Opción agregada' });
    setNewOption('');
    const res = await get(`/services/${menuModal.id}/menu-options`, { silent: true });
    setMenuOptions(res.data || []);
  };

  const removeOption = async (optionId) => {
    if (!confirm('¿Eliminar opción?')) return;
    await del(`/services/menu-options/${optionId}`, { successMessage: 'Opción eliminada' });
    const res = await get(`/services/${menuModal.id}/menu-options`, { silent: true });
    setMenuOptions(res.data || []);
  };

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
                <button className="btn btn-secondary btn-sm" onClick={() => openMenu(s)}><HiOutlineMenu /> Menú</button>
                <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(s.id)}><HiOutlineTrash /></button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal crear/editar servicio */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">{editingId ? 'Editar Servicio' : 'Nuevo Servicio'}</h3><button className="btn btn-icon" onClick={() => setShowModal(false)}>×</button></div>
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

      {/* Modal opciones de menú */}
      {menuModal && (
        <div className="modal-overlay" onClick={() => setMenuModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3 className="modal-title">Opciones de menú: {menuModal.name}</h3>
              <button className="btn btn-icon" onClick={() => setMenuModal(null)}>×</button>
            </div>
            <div style={{ padding: 'var(--space-md)' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input className="form-input" value={newOption} onChange={e => setNewOption(e.target.value)} placeholder="Nueva opción..." />
                <button className="btn btn-primary btn-sm" onClick={addOption}>+</button>
              </div>
              {menuOptions.map(opt => (
                <div key={opt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span>{opt.option_name}</span>
                  <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={() => removeOption(opt.id)}><HiOutlineTrash /></button>
                </div>
              ))}
              {menuOptions.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Sin opciones aún</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
