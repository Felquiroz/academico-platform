import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useRefresh } from '../context/RefreshContext';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineSearch } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function ProgramsPage() {
  const { get, post, put, del } = useApi();
  const { canManage } = useAuth();
  const { triggerRefresh } = useRefresh();
  const [studentSearch, setStudentSearch] = useState(''); // NUEVO: Estado para el buscador de alumnos
  const [programs, setPrograms] = useState([]);
  const [students, setStudents] = useState([]); // NUEVO: Estado para la lista de alumnos disponibles
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // NUEVO: Se agrega student_ids al estado inicial del formulario
  const [form, setForm] = useState({ 
    name: '', description: '', type: 'diplomado', start_date: '', end_date: '', student_ids: [] 
  });

  useEffect(() => { 
    fetchPrograms(); 
    fetchStudents(); // NUEVO: Cargar los alumnos al montar el componente
  }, [search, filterType]);

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

  // NUEVO: Función para obtener los alumnos del backend
  const fetchStudents = async () => {
  try {
    const res = await get('/alumnos', { silent: true }); // ← Asegúrate de que esta ruta sea la correcta
    console.log("Respuesta de alumnos:", res); // ← Para ver qué responde tu servidor
    setStudents(res.data || []);
  } catch (error) {
    console.error("Error al cargar alumnos:", error); // ← Esto te dirá si la petición falló
  }
};

  // NUEVO: Se reinicia student_ids al abrir el modal de creación
  const openCreate = () => { 
    setForm({ name: '', description: '', type: 'diplomado', start_date: '', end_date: '', student_ids: [] }); 
    setEditingId(null); 
    setShowModal(true); 
    setStudentSearch('');
  };

  // NUEVO: Se cargan los alumnos inscritos al editar (Asegúrate de que tu backend envíe los alumnos relacionados)
  const openEdit = (p) => { 
    setForm({ 
      name: p.name, 
      description: p.description || '', 
      type: p.type, 
      start_date: p.start_date?.slice(0, 10), 
      end_date: p.end_date?.slice(0, 10),
      // Asumiendo que p.alumnos viene del backend como un arreglo de objetos o IDs
      student_ids: p.alumnos ? p.alumnos.map(a => a.id) : [] 
    }); 
    setEditingId(p.id); 
    setStudentSearch('');
    setShowModal(true); 
  };

  // NUEVO: Función para manejar el marcado/desmarcado de checkboxes de alumnos
  const handleToggleStudent = (studentId) => {
    setForm(prev => {
      const isSelected = prev.student_ids.includes(studentId);
      if (isSelected) {
        return { ...prev, student_ids: prev.student_ids.filter(id => id !== studentId) };
      } else {
        return { ...prev, student_ids: [...prev.student_ids, studentId] };
      }
    });
  };

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

  // NUEVO: Filtramos la lista de alumnos en tiempo real
  const filteredStudents = students.filter(student => 
    student.nombre.toLowerCase().includes(studentSearch.toLowerCase()) ||
    student.correo.toLowerCase().includes(studentSearch.toLowerCase())
  );

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div className="fade-in">
      {/* HEADER Y FILTROS SE MANTIENEN IGUAL */}
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

      {/* LISTA DE PROGRAMAS SE MANTIENE IGUAL */}
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

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">{editingId ? 'Editar Programa' : 'Nuevo Programa'}</h3><button className="btn btn-icon" onClick={() => setShowModal(false)}>×</button></div>
            <form onSubmit={handleSubmit}>
              <div className="form-group"><label className="form-label">Nombre *</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="form-group"><label className="form-label">Descripción</label><textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Tipo *</label><select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="diplomado">Diplomado</option><option value="magister">Magíster</option></select></div>
              
              <div className="form-row">
                <div className="form-group"><label className="form-label">Fecha Inicio *</label><input className="form-input" type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">Fecha Fin *</label><input className="form-input" type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} required /></div>
              </div>

             
             {/* Lista de alumnos con buscador y checkboxes */}
              <div className="form-group">
                <label className="form-label">Alumnos Inscritos</label>
                
                {/* Input del buscador */}
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Buscar por nombre o correo..." 
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  style={{ marginBottom: '8px' }}
                />

                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border-light)', padding: '10px', borderRadius: '4px' }}>
                  {filteredStudents.length === 0 ? (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {students.length === 0 ? 'No hay alumnos registrados en el sistema.' : 'No se encontraron alumnos con esa búsqueda.'}
                    </span>
                  ) : (
                    filteredStudents.map(student => (
                      <label key={student.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input
                          type="checkbox"
                          checked={form.student_ids.includes(student.id)}
                          onChange={() => handleToggleStudent(student.id)}
                        />
                        {student.nombre} ({student.correo})
                      </label>
                    ))
                  )}
                </div>
                
                {/* Indicador de cuántos hay seleccionados */}
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
                  {form.student_ids.length} alumno(s) seleccionado(s)
                </div>
              </div> 
              
              <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button><button type="submit" className="btn btn-primary">{editingId ? 'Guardar' : 'Crear'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}