import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { HiOutlineSearch } from 'react-icons/hi';

export default function AuditPage() {
  const { get } = useApi();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterEntity, setFilterEntity] = useState('');

  useEffect(() => { fetchLogs(); }, [filterEntity]);

  const fetchLogs = async () => {
    try {
      const params = filterEntity ? `?entity_type=${filterEntity}` : '';
      const res = await get(`/dashboard/audit${params}`, { silent: true });
      setLogs(res.data);
    } catch {}
    setLoading(false);
  };

  const actionBadge = (action) => {
    const map = { CREATE: 'badge-success', UPDATE: 'badge-warning', DELETE: 'badge-danger', REGISTER: 'badge-info', BULK_REGISTER: 'badge-info', REMOVE: 'badge-danger', ASSIGN_SERVICE: 'badge-purple' };
    return <span className={`badge ${map[action] || 'badge-info'}`}>{action}</span>;
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Auditoría</h1><p className="page-subtitle">Registro de todos los cambios del sistema</p></div>
      </div>
      <div className="filters-bar">
        <select className="form-select" style={{ width: 180 }} value={filterEntity} onChange={e => setFilterEntity(e.target.value)}>
          <option value="">Todas las entidades</option>
          <option value="user">Usuarios</option><option value="program">Programas</option>
          <option value="activity">Actividades</option><option value="room">Salas</option>
          <option value="service">Servicios</option><option value="attendee">Asistentes</option>
        </select>
      </div>
      <div className="table-container">
        <table className="table">
          <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>ID</th><th>Detalles</th></tr></thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id}>
                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(log.created_at).toLocaleString('es-CL')}</td>
                <td style={{ fontWeight: 500 }}>{log.user_name || 'Sistema'}</td>
                <td>{actionBadge(log.action)}</td>
                <td><span className="badge" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>{log.entity_type}</span></td>
                <td style={{ color: 'var(--text-muted)' }}>#{log.entity_id}</td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {log.new_values ? JSON.stringify(log.new_values).slice(0, 80) + '...' : '—'}
                </td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={6} className="empty-state">No hay registros de auditoría</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
