import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useRefresh } from '../context/RefreshContext';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineSearch, HiOutlineX } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function ProgramsPage() {
  const { get, post, put, del } = useApi();
  const { canManage } = useAuth();
  const { triggerRefresh } = useRefresh();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', type: 'diplomado', start_date: '', end_date: '' });

  useEffect(() => { fetchPrograms(); }, [search, filterType]);

  const fetchPrograms = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterType) params.set('type', filterType);
      const res = await get(`/programs?${params}`, { silent: true });
      setPrograms(res.data);
    } catch {}
    setLoading(false);
  };

  const openCreate = () => { setForm({ name: '', description: '', type: 'diplomado', start_date: '', end_date: '' }); setEditingId(null); setShowModal(true); };
  const openEdit = (p) => { setForm({ name: p.name, description: p.description || '', type: p.type, start_date: p.start_date?.slice(0, 10), end_date: p.end_date?.slice(0, 10) }); setEditingId(p.id); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await put(`/programs/${editingId}`, form, { successMessage: 'Programa actualizado' });
      } else {
        await post('/programs', form, { successMessage: 'Programa creado' });
      }
      setShowModal(false);
      fetchPrograms();
      triggerRefresh();
    } catch {}
  };

  const handleDelete = async (id) => { 
    if (!confirm('¿Desactivar este programa?')) return; 
    await del(`/programs/${id}`, { successMessage: 'Programa desactivado' }); 
    fetchPrograms();
    triggerRefresh();
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Programas</h1><p className="page-subtitle">Diplomados y magíster</p></div>
        {canManage() && <button className="btn btn-primary" onClick={openCreate}><HiOutlinePlus /> Nuevo Programa</button>}
      </div>
      <div className="filters-bar">
        <div className="search-input"><HiOutlineSearch className="search-icon" /><input placeholder="Buscar programas..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <select className="form-select" style={{ width: 160 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Todos los tipos</option><option value="diplomado">Diplomado</option><option value="magister">Magíster</option>
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--space-lg)' }}>
        {programs.map(p => (
          <div key={p.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <span className={`badge ${p.type === 'magister' ? 'badge-purple' : 'badge-info'}`}>{p.type === 'magister' ? 'Magíster' : 'Diplomado'}</span>
              <span className={`badge ${p.active ? 'badge-success' : 'badge-danger'}`}>{p.active ? 'Activo' : 'Inactivo'}</span>
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8 }}>{p.name}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: 12, lineHeight: 1.5 }}>{p.description || 'Sin descripción'}</p>
            <div style={{ display: 'flex', gap: 16, fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>
              <span>📅 {p.start_date?.slice(0, 10)}</span>
              <span>→ {p.end_date?.slice(0, 10)}</span>
            </div>
            {canManage() && (
              <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border-light)', paddingTop: 12 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}><HiOutlinePencil /> Editar</button>
                <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(p.id)}><HiOutlineTrash /> Desactivar</button>
              </div>
            )}
          </div>
        ))}
        {programs.length === 0 && <div className="empty-state" style={{ gridColumn: '1/-1' }}><p>No hay programas</p></div>}
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">{editingId ? 'Editar Programa' : 'Nuevo Programa'}</h3><button className="btn btn-icon" onClick={() => setShowModal(false)}><HiOutlineX /></button></div>
            <form onSubmit={handleSubmit}>
              <div className="form-group"><label className="form-label">Nombre *</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="form-group"><label className="form-label">Descripción</label><textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Tipo *</label><select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="diplomado">Diplomado</option><option value="magister">Magíster</option></select></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Fecha Inicio *</label><input className="form-input" type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">Fecha Fin *</label><input className="form-input" type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} required /></div>
              </div>
              <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button><button type="submit" className="btn btn-primary">{editingId ? 'Guardar' : 'Crear'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
