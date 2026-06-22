import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useRefresh } from '../context/RefreshContext';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { HiOutlineTrash, HiOutlineUserGroup, HiOutlineLocationMarker,  } from 'react-icons/hi';

const defaultColors = [
  { bg: 'rgba(99,102,241,0.3)', border: '#6366f1', text: '#a5b4fc' },
  { bg: 'rgba(139,92,246,0.3)', border: '#8b5cf6', text: '#c4b5fd' },
  { bg: 'rgba(16,185,129,0.3)', border: '#10b981', text: '#6ee7b7' },
  { bg: 'rgba(245,158,11,0.3)', border: '#f59e0b', text: '#fcd34d' },
  { bg: 'rgba(59,130,246,0.3)', border: '#3b82f6', text: '#93c5fd' },
  { bg: 'rgba(239,68,68,0.3)', border: '#ef4444', text: '#fca5a5' },
  { bg: 'rgba(236,72,153,0.3)', border: '#ec4899', text: '#f9a8d4' },
  { bg: 'rgba(34,197,94,0.3)', border: '#22c55e', text: '#86efac' },
];

export default function CalendarPage() {
  const { get, put, del } = useApi();
  const { canManage } = useAuth();
  const { refreshTrigger, triggerRefresh } = useRefresh();
  const [events, setEvents] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [view, setView] = useState('dayGridMonth');
  const [filterProgram, setFilterProgram] = useState('');
  const [filterRoom, setFilterRoom] = useState('');
  const [rooms, setRooms] = useState([]);
  const [clickedDate, setClickedDate] = useState(null);

  useEffect(() => { fetchAll(); }, [refreshTrigger]);
  useEffect(() => { fetchEvents(); }, [filterProgram, filterRoom, refreshTrigger]);

  const fetchAll = async () => {
    try {
      const [progRes, roomRes] = await Promise.all([
        get('/programs?limit=100', { silent: true }),
        get('/rooms', { silent: true })
      ]);
      const progData = progRes.data?.data || progRes.data || [];
      setPrograms(progData);
      setRooms(roomRes.data?.data || roomRes.data || []);
    } catch {}
  };

  const fetchEvents = async () => {
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString();
      const res = await get(`/activities/calendar?start=${start}&end=${end}`, { silent: true });

      let filtered = res.data?.data || res.data || [];
      if (!Array.isArray(filtered)) {
        filtered = [];
      }

      if (filterProgram) {
        filtered = filtered.filter(e => e.program_id === parseInt(filterProgram));
      }
      if (filterRoom) {
        filtered = filtered.filter(e => e.room_id === parseInt(filterRoom));
      }

      const mapped = filtered.map((act, i) => {
        const colors = defaultColors[(act.program_id || i) % defaultColors.length];
        return {
          id: act.id,
          title: act.title,
          start: act.start_time,
          end: act.end_time,
          backgroundColor: colors.bg,
          borderColor: colors.border,
          textColor: colors.text,
          extendedProps: {
            ...act,
            room: act.room_name,
            program: act.program_name,
            programId: act.program_id,
            status: act.status,
            registered: act.registered_count
          }
        };
      });

      setEvents(mapped);
    } catch (err) { console.error(err); }
  };

  const handleEventClick = (info) => {
    setSelectedEvent(info.event.extendedProps);
    setShowModal(true);
  };

  const handleDateClick = (info) => {
    setClickedDate(info.dateStr);
  };

  const handleEventDrop = async (info) => {
    const newStart = info.event.start.toISOString().slice(0, 19).replace('T', ' ');
    const newEnd = info.event.end ? info.event.end.toISOString().slice(0, 19).replace('T', ' ') : newStart;
    
    try {
      await put(`/activities/${info.event.id}`, { start_time: newStart, end_time: newEnd }, { successMessage: 'Actividad movida' });
      fetchEvents();
    } catch {
      info.revert();
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent?.id || !confirm('¿Cancelar esta actividad?')) return;
    try {
      await del(`/activities/${selectedEvent.id}`, { successMessage: 'Actividad cancelada' });
      setShowModal(false);
      fetchEvents();
      triggerRefresh();
    } catch {}
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Calendario</h1>
          <p className="page-subtitle">Gestiona tus actividades - Click en evento para detalles, arrastra para mover</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="form-select" style={{ width: 150 }} value={filterProgram} onChange={e => setFilterProgram(e.target.value)}>
            <option value="">Todos los programas</option>
            {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="form-select" style={{ width: 150 }} value={filterRoom} onChange={e => setFilterRoom(e.target.value)}>
            <option value="">Todas las salas</option>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {programs.slice(0, 5).map((p, i) => (
              <span key={p.id} className="badge" style={{ background: defaultColors[i % defaultColors.length].bg, border: `1px solid ${defaultColors[i % defaultColors.length].border}`, color: defaultColors[i % defaultColors.length].text, fontSize: '0.7rem' }}>
                {p.name.substring(0, 15)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 'var(--space-md)' }}>
        <style>{`
          .fc { --fc-border-color: var(--border-color); --fc-page-bg-color: transparent; --fc-neutral-bg-color: var(--bg-input); --fc-today-bg-color: rgba(99,102,241,0.1); }
          .fc .fc-button { background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary); font-family: 'Inter', sans-serif; font-size: 0.85rem; padding: 6px 14px; }
          .fc .fc-button:hover { background: var(--bg-card-hover); border-color: var(--accent-primary); }
          .fc .fc-button-active { background: var(--accent-primary) !important; border-color: var(--accent-primary) !important; }
          .fc .fc-toolbar-title { font-size: 1.2rem; font-weight: 700; color: var(--text-primary); }
          .fc .fc-col-header-cell { background: var(--bg-secondary); padding: 8px; }
          .fc .fc-col-header-cell-cushion { color: var(--text-secondary); font-weight: 600; font-size: 0.8rem; text-transform: uppercase; }
          .fc .fc-daygrid-day-number { color: var(--text-primary); font-size: 0.85rem; padding: 6px; }
          .fc .fc-event { border-radius: 6px; padding: 3px 8px; font-size: 0.8rem; font-weight: 500; cursor: pointer; transition: all 0.2s; }
          .fc .fc-event:hover { transform: scale(1.02); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
          .fc .fc-event-main { padding: 2px; }
          .fc .fc-daygrid-event-dot { display: none; }
          .fc .fc-daygrid-day { cursor: pointer; }
          .fc .fc-daygrid-day:hover { background: var(--bg-card-hover); }
          .fc td, .fc th { border-color: var(--border-light) !important; }
          .fc .fc-scrollgrid { border-color: var(--border-light) !important; }
          .fc .fc-timegrid-slot { height: 48px; }
          .fc .fc-timegrid-slot-label { font-size: 0.75rem; }
          .fc-event-title { font-weight: 600; }
          .fc-event-time { font-size: 0.7rem; opacity: 0.8; }
        `}</style>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={view}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          locale="es"
          events={events}
          datesSet={fetchEvents}
          height="auto"
          eventDisplay="block"
          dayMaxEvents={3}
          editable={canManage()}
          droppable={canManage()}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          eventDrop={handleEventDrop}
          eventResize={(info) => {
            const newEnd = info.event.end.toISOString().slice(0, 19).replace('T', ' ');
            put(`/activities/${info.event.id}`, { end_time: newEnd }, { silent: true });
          }}
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          nowIndicator={true}
          eventContent={(arg) => (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 600, fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {arg.event.title}
              </div>
              {arg.event.extendedProps.room && (
                <div style={{ fontSize: '0.65rem', opacity: 0.8, display: 'flex', alignItems: 'center', gap: 2 }}>
                  📍 {arg.event.extendedProps.room}
                </div>
              )}
            </div>
          )}
        />
      </div>

      {/* Modal de detalle de evento */}
      {showModal && selectedEvent && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h3 className="modal-title">{selectedEvent.title}</h3>
              <button className="btn btn-icon" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="badge badge-purple">{selectedEvent.program_name}</span>
                  <span className={`badge ${
                    selectedEvent.status === 'scheduled' ? 'badge-info' :
                    selectedEvent.status === 'in_progress' ? 'badge-warning' :
                    selectedEvent.status === 'completed' ? 'badge-success' : 'badge-danger'
                  }`}>
                    {selectedEvent.status === 'scheduled' ? 'Programada' :
                     selectedEvent.status === 'in_progress' ? 'En curso' :
                     selectedEvent.status === 'completed' ? 'Completada' : 'Cancelada'}
                  </span>
                </div>

                <div style={{ background: 'var(--bg-input)', padding: 12, borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <HiOutlineLocationMarker style={{ color: 'var(--accent-primary)' }} />
                    <span>{selectedEvent.room_name || 'Sin sala asignada'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <HiOutlineUserGroup style={{ color: 'var(--accent-primary)' }} />
                    <span>{selectedEvent.registered || 0} asistentes</span>
                  </div>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <strong>Fecha:</strong> {new Date(selectedEvent.start_time).toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <strong>Horario:</strong> {new Date(selectedEvent.start_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedEvent.end_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                </div>

                {canManage() && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 16, borderTop: '1px solid var(--border-light)', paddingTop: 16 }}>
                    <button className="btn btn-sm" style={{ background: 'var(--danger)', color: '#fff' }} onClick={handleDelete}>
                      <HiOutlineTrash /> Cancelar Actividad
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}