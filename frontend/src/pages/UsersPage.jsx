import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useRefresh } from '../context/RefreshContext';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineSearch, HiOutlineX, HiOutlineMail } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const { get, post, put, del } = useApi();
  const { triggerRefresh } = useRefresh();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user', phone: '' });

  useEffect(() => { fetchUsers(); }, [search, filterRole]);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterRole) params.set('role', filterRole);
      const res = await get(`/users?${params}`, { silent: true });
      setUsers(res.data.data || res.data);
    } catch {}
    setLoading(false);
  };

  const generateEmail = (name) => {
    if (!name) return '';
    const cleanName = name.toLowerCase().trim();
    const parts = cleanName.split(' ').filter(p => p.length > 0);
    if (parts.length === 0) return '';
    if (parts.length === 1) {
      return `${parts[0]}@academico.cl`;
    }
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];
    return `${firstName}.${lastName}@academico.cl`;
  };

  const openCreate = () => { 
    setForm({ name: '', email: '', password: 'password123', role: 'user', phone: '' }); 
    setEditingId(null); 
    setShowModal(true); 
  };
  
  const openEdit = (u) => { 
    setForm({ name: u.name, email: u.email, password: '', role: u.role, phone: u.phone || '' }); 
    setEditingId(u.id); 
    setShowModal(true); 
  };

  const handleNameChange = (name) => {
    setForm(prev => ({ ...prev, name, email: prev.email || generateEmail(name) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        const { password, ...data } = form;
        await put(`/users/${editingId}`, data, { successMessage: 'Usuario actualizado' });
      } else {
        await post('/auth/register', form, { successMessage: 'Usuario creado exitosamente' });
      }
      setShowModal(false); 
      fetchUsers();
      triggerRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar usuario');
    }
  };

  const handleDelete = async (id) => { 
    if (!confirm('¿Desactivar este usuario?')) return; 
    await del(`/users/${id}`, { successMessage: 'Usuario desactivado' }); 
    fetchUsers(); 
    triggerRefresh(); 
  };

  const roleBadge = (role) => {
    const map = { admin: 'badge-danger', coordinator: 'badge-warning', user: 'badge-info' };
    const labels = { admin: 'Administrador', coordinator: 'Profesor', user: 'Alumno' };
    return <span className={`badge ${map[role]}`}>{labels[role]}</span>;
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Usuarios</h1>
          <p className="page-subtitle">Administrar estudiantes, profesores y administradores</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <HiOutlinePlus /> Nuevo Usuario
        </button>
      </div>

      <div className="filters-bar">
        <div className="search-input">
          <HiOutlineSearch className="search-icon" />
          <input placeholder="Buscar por nombre o email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 150 }} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">Todos los roles</option>
          <option value="admin">Administrador</option>
          <option value="coordinator">Profesor</option>
          <option value="user">Alumno</option>
        </select>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td><div style={{ fontWeight: 500 }}>{u.name}</div></td>
                <td>{u.email}</td>
                <td>{roleBadge(u.role)}</td>
                <td>
                  <span className={`badge ${u.active ? 'badge-success' : 'badge-secondary'}`}>
                    {u.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-icon btn-sm" onClick={() => openEdit(u)} title="Editar">
                      <HiOutlinePencil />
                    </button>
                    <button className="btn btn-icon btn-sm" onClick={() => handleDelete(u.id)} title="Desactivar" style={{ color: 'var(--danger)' }}>
                      <HiOutlineTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={5} className="empty-state">No hay usuarios</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Modal crear/editar usuario */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingId ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button className="btn btn-icon" onClick={() => setShowModal(false)}><HiOutlineX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nombre Completo *</label>
                <input className="form-input" value={form.name} onChange={e => handleNameChange(e.target.value)} required placeholder="Ej: Juan Pérez" />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <div style={{ position: 'relative' }}>
                  <input className="form-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required placeholder="juan.perez@academico.cl" style={{ paddingRight: 40 }} />
                  {!editingId && form.name && (
                    <button type="button" onClick={() => setForm({ ...form, email: generateEmail(form.name) })} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)' }} title="Generar email automático">
                      <HiOutlineMail />
                    </button>
                  )}
                </div>
                {!editingId && form.name && (
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Sugerido: {generateEmail(form.name)}</small>
                )}
              </div>
              {!editingId && (
                <div className="form-group">
                  <label className="form-label">Contraseña</label>
                  <input className="form-input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="password123" />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Por defecto: password123</small>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Rol</label>
                <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="user">Alumno</option>
                  <option value="coordinator">Profesor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+56 9 1234 5678" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Guardar Cambios' : 'Crear Usuario'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}