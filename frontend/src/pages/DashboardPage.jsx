import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useRefresh } from '../context/RefreshContext';
import { HiOutlineClipboardList, HiOutlineAcademicCap, HiOutlineUsers, HiOutlineOfficeBuilding,
  HiOutlineExclamation, HiOutlineTrendingUp, HiOutlineCalendar, HiOutlineClock, HiOutlineCheckCircle } from 'react-icons/hi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardPage() {
  const { get } = useApi();
  const { user, canManage } = useAuth();
  const { refreshTrigger } = useRefresh();
  const [stats, setStats] = useState(null);
  const [myStats, setMyStats] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [myUpcoming, setMyUpcoming] = useState([]);
  const [chart, setChart] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const requests = [
          get('/dashboard/stats', { silent: true }),
          get('/dashboard/upcoming?limit=5', { silent: true }),
          get('/dashboard/attendance-chart', { silent: true }),
        ];

        if (!canManage()) {
          requests.push(get('/dashboard/my-stats', { silent: true }));
        }

        if (canManage()) {
          requests.push(get('/dashboard/conflicts', { silent: true }).catch(() => ({ data: [] })));
        }

        const results = await Promise.all(requests);
        
        setStats(results[0].data);
        setUpcoming(results[1].data);
        setChart(results[2].data);

        if (!canManage()) {
          setMyStats(results[3].data);
          setMyUpcoming(results[3].data?.upcoming || []);
        }

        if (canManage()) {
          setConflicts(results[3]?.data || []);
        }
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetchAll();
  }, [canManage, refreshTrigger]);

  if (loading) return <div className="loading-page"><div className="spinner"></div><p>Cargando dashboard...</p></div>;

  // Dashboard para usuarios regulares (personalizado)
  if (!canManage() && myStats) {
    return (
      <div className="fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Bienvenido, {user?.name}</h1>
            <p className="page-subtitle">Tu resumen académico personal</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-md)' }}>
            <HiOutlineClipboardList style={{ fontSize: '1.5rem', color: 'var(--accent-primary)', marginBottom: 8 }} />
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{myStats.total_activities}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Inscripciones</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-md)' }}>
            <HiOutlineCheckCircle style={{ fontSize: '1.5rem', color: 'var(--success)', marginBottom: 8 }} />
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{myStats.confirmed}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Confirmadas</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-md)' }}>
            <HiOutlineCalendar style={{ fontSize: '1.5rem', color: 'var(--warning)', marginBottom: 8 }} />
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{myStats.upcoming_count}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Próximas</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-md)' }}>
            <HiOutlineTrendingUp style={{ fontSize: '1.5rem', color: 'var(--info)', marginBottom: 8 }} />
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{myStats.attended}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Asistencias</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title"><HiOutlineCalendar /> Próximas Clases</h3>
            </div>
            {myUpcoming.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {myUpcoming.map(act => (
                  <div key={act.id} style={{ padding: 12, background: 'var(--bg-input)', borderRadius: 8, borderLeft: '3px solid var(--accent-primary)' }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{act.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: 12 }}>
                      <span>📅 {new Date(act.start_time).toLocaleDateString('es-CL')}</span>
                      <span>📍 {act.room_name || 'Sin sala'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state"><p>No tienes clases próximas</p></div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title"><HiOutlineClock /> Historial Reciente</h3>
            </div>
            {myStats.recent?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {myStats.recent.map(act => (
                  <div key={act.id} style={{ padding: 10, borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{act.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{act.program_name}</div>
                    </div>
                    <span className={`badge ${act.status === 'completed' ? 'badge-success' : 'badge-info'}`}>
                      {act.status === 'completed' ? 'Completada' : 'En curso'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state"><p>Sin historial reciente</p></div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Dashboard para admin/coordinador
  const kpis = [
    { icon: <HiOutlineClipboardList />, value: stats?.total_activities || 0, label: 'Actividades Activas', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
    { icon: <HiOutlineAcademicCap />, value: stats?.total_programs || 0, label: 'Programas Activos', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
    { icon: <HiOutlineUsers />, value: stats?.total_users || 0, label: 'Usuarios Registrados', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    { icon: <HiOutlineOfficeBuilding />, value: stats?.total_rooms || 0, label: 'Salas Disponibles', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    { icon: <HiOutlineTrendingUp />, value: `${stats?.avg_attendance_rate || 0}%`, label: 'Asistencia Promedio', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { icon: <HiOutlineExclamation />, value: stats?.active_conflicts || 0, label: 'Conflictos Activos', color: stats?.active_conflicts > 0 ? '#ef4444' : '#10b981', bg: stats?.active_conflicts > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)' },
    { icon: <HiOutlineCalendar />, value: stats?.today_activities || 0, label: 'Actividades Hoy', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
  ];

  const chartData = chart.map(c => ({
    month: c.month,
    ...c.programs
  }));

  const programNames = chart.length > 0 ? Object.keys(chart[0].programs || {}) : [];
  const chartColors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#3b82f6'];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Resumen general de la plataforma académica</p>
        </div>
      </div>

      <div className="kpi-grid">
        {kpis.map((kpi, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-icon" style={{ background: kpi.bg, color: kpi.color }}>
              {kpi.icon}
            </div>
            <div className="kpi-value">{kpi.value}</div>
            <div className="kpi-label">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-lg)' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><HiOutlineTrendingUp /> Asistencia por Programa</h3>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: '#1a1f35', border: '1px solid #1e293b', borderRadius: 10, color: '#f1f5f9' }} />
                {programNames.map((name, i) => (
                  <Bar key={name} dataKey={name} fill={chartColors[i % chartColors.length]} radius={[4,4,0,0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><p>No hay datos de asistencia disponibles</p></div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><HiOutlineClock /> Próximas Actividades</h3>
          </div>
          {upcoming.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {upcoming.map((act) => (
                <div key={act.id} style={{ padding: '12px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--accent-primary)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>{act.title}</div>
                  <div style={{ display: 'flex', gap: 12, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <span>📅 {new Date(act.start_time).toLocaleDateString('es-CL')}</span>
                    <span>🕐 {new Date(act.start_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>📍 {act.room_name || 'Sin sala'}</span>
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <span className="badge badge-purple">{act.program_name}</span>
                    <span className="badge badge-info" style={{ marginLeft: 6 }}>{act.registered_count} inscritos</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state"><p>No hay actividades próximas</p></div>
          )}
        </div>
      </div>

      {conflicts.length > 0 && (
        <div className="card" style={{ marginTop: 'var(--space-lg)', borderColor: 'rgba(239,68,68,0.3)' }}>
          <div className="card-header">
            <h3 className="card-title" style={{ color: 'var(--danger)' }}>
              <HiOutlineExclamation /> Conflictos Activos ({conflicts.length})
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {conflicts.map((c) => (
              <div key={c.id} style={{ padding: 12, background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', borderLeft: '3px solid var(--danger)' }}>
                <span className="badge badge-danger" style={{ marginRight: 8 }}>{c.type}</span>
                {c.description}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}