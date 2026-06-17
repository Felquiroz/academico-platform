import { useState, useRef, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { HiOutlineChat, HiOutlineX, HiOutlineCalendar, HiOutlineOfficeBuilding, HiOutlineCheck, HiOutlineArrowLeft, HiOutlineLocationMarker, HiOutlineUserGroup, HiOutlineCog, HiOutlineClock } from 'react-icons/hi';

const STEPS = {
  INITIAL: 'initial',
  VIEW_ROOMS: 'view_rooms',
  CHECK_ROOM: 'check_room',
  SELECT_DATETIME: 'select_datetime',
  VIEW_AVAILABLE_ROOMS: 'view_available_rooms',
  SELECT_PROGRAM: 'select_program',
  CONFIRM: 'confirm',
  SUCCESS: 'success'
};

const STEP_LABELS = {
  initial: 'Inicio',
  view_rooms: 'Ver salas',
  select_datetime: 'Fecha y hora',
  view_available_rooms: 'Elegir sala',
  select_program: 'Elegir programa',
  confirm: 'Confirmar',
  success: '¡Listo!'
};

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(STEPS.INITIAL);
  const [messages, setMessages] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [bookingData, setBookingData] = useState({ date: '', startTime: '09:00', endTime: '10:00', title: '' });
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const { get, post } = useApi();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      const name = user?.name || '';
      setMessages([
        { role: 'bot', content: `¡Hola${name ? ', ' + name.split(' ')[0] : ''}! 👋 Soy el asistente de reservas. ¿Qué deseas hacer?` }
      ]);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, step, typing]);

  const addMessage = (role, content) => {
    setMessages(prev => [...prev, { role, content }]);
  };

  const botTyping = async (action) => {
    setTyping(true);
    await action();
    setTyping(false);
  };

  const fetchAllRooms = async () => {
    setLoading(true);
    try {
      const [roomsRes, programsRes] = await Promise.all([
        get('/rooms?active=true&limit=50', { silent: true }),
        get('/programs?limit=50', { silent: true })
      ]);
      const r = roomsRes.data?.data || roomsRes.data || [];
      const p = programsRes.data?.data || programsRes.data || [];
      setRooms(r);
      setPrograms(p);
      return { rooms: r, programs: p };
    } catch {
      addMessage('bot', 'Error al cargar datos. Intenta más tarde.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const checkRoomAvailability = async (roomId, startTime, endTime) => {
    try {
      const res = await get(`/rooms/check-availability?room_id=${roomId}&start_time=${startTime}&end_time=${endTime}`, { silent: true });
      return res.data?.available !== undefined ? res.data.available : res.data?.data?.available;
    } catch {
      return false;
    }
  };

  const handleOption = async (option) => {
    if (option === 'view_rooms') {
      addMessage('user', 'Ver salas disponibles');
      setStep(STEPS.VIEW_ROOMS);
      addMessage('bot', 'Cargando salas...');
      const data = await botTyping(fetchAllRooms);
      if (data) {
        addMessage('bot', `Estas son las ${data.rooms.length} salas del sistema:`);
      }
    } else if (option === 'book') {
      addMessage('user', 'Reservar una sala');
      setStep(STEPS.SELECT_DATETIME);
      addMessage('bot', 'Para buscar salas disponibles, completa el formulario:\n\n📅 Fecha\n⏰ Hora inicio y fin\n📝 Título de la actividad');
      await fetchAllRooms();
    }
  };

  const goBack = () => {
    const prev = {
      [STEPS.VIEW_ROOMS]: STEPS.INITIAL,
      [STEPS.CHECK_ROOM]: STEPS.VIEW_ROOMS,
      [STEPS.SELECT_DATETIME]: STEPS.INITIAL,
      [STEPS.VIEW_AVAILABLE_ROOMS]: STEPS.SELECT_DATETIME,
      [STEPS.SELECT_PROGRAM]: STEPS.VIEW_AVAILABLE_ROOMS,
      [STEPS.CONFIRM]: STEPS.SELECT_PROGRAM,
    };
    setStep(prev[step] || STEPS.INITIAL);
  };

  const checkAvailabilityAndShowRooms = async () => {
    const startTime = `${bookingData.date} ${bookingData.startTime}:00`;
    const endTime = `${bookingData.date} ${bookingData.endTime}:00`;

    setLoading(true);
    addMessage('bot', '🔍 Verificando disponibilidad de salas...');

    try {
      const availResults = await Promise.all(
        rooms.map(async (room) => {
          const available = await checkRoomAvailability(room.id, startTime, endTime);
          return { ...room, available };
        })
      );

      const freeRooms = availResults.filter(r => r.available);
      setAvailableRooms(freeRooms);

      if (freeRooms.length === 0) {
        addMessage('bot', '❌ No hay salas disponibles en ese horario. Elige otra fecha u horario.');
        setStep(STEPS.SELECT_DATETIME);
      } else {
        addMessage('bot', `✅ ${freeRooms.length} sala(s) disponible(s) el ${bookingData.date} de ${bookingData.startTime} a ${bookingData.endTime}:`);
        setStep(STEPS.VIEW_AVAILABLE_ROOMS);
      }
    } catch {
      addMessage('bot', 'Error al verificar disponibilidad. Intenta de nuevo.');
      setStep(STEPS.SELECT_DATETIME);
    }
    setLoading(false);
  };

  const selectRoom = (room) => {
    setSelectedRoom(room);
    addMessage('user', `Sala: ${room.name} (${room.capacidad} pers)`);
    setStep(STEPS.SELECT_PROGRAM);
    addMessage('bot', `Perfecto, elegiste: **${room.name}**\n\nAhora selecciona un programa:`);
  };

  const selectProgram = (program) => {
    setSelectedProgram(program);
    addMessage('user', `Programa: ${program.name}`);
    setStep(STEPS.CONFIRM);
    addMessage('bot', `📋 **Resumen de la reserva**\n\n🏢 Sala: **${selectedRoom.name}**\n📚 Programa: **${program.name}**\n📅 Fecha: **${bookingData.date}**\n⏰ Horario: **${bookingData.startTime} - ${bookingData.endTime}**\n📝 Actividad: **${bookingData.title}**`);
  };

  const confirmBooking = async () => {
    setLoading(true);
    const startTime = `${bookingData.date} ${bookingData.startTime}:00`;
    const endTime = `${bookingData.date} ${bookingData.endTime}:00`;

    const available = await checkRoomAvailability(selectedRoom.id, startTime, endTime);
    if (!available) {
      addMessage('bot', '❌ La sala ya no está disponible. Elige otra sala u horario.');
      setStep(STEPS.VIEW_AVAILABLE_ROOMS);
      setLoading(false);
      return;
    }

    try {
      await post('/activities', {
        title: bookingData.title,
        description: `Reserva de sala ${selectedRoom.name} vía chatbot`,
        start_time: startTime,
        end_time: endTime,
        room_id: selectedRoom.id,
        program_id: selectedProgram?.id || 1,
        type: 'meeting',
        status: 'scheduled'
      }, { silent: true });
      setStep(STEPS.SUCCESS);
      addMessage('bot', '✅ **¡Reserva confirmada!**\n\nTu actividad ya está en el calendario.');
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      if (errorMsg.toLowerCase().includes('conflicto') || errorMsg.toLowerCase().includes('ocupada')) {
        addMessage('bot', `❌ La sala ya está ocupada en ese horario. Elige otra.`);
        setStep(STEPS.VIEW_AVAILABLE_ROOMS);
      } else {
        addMessage('bot', `Error: ${errorMsg}`);
        setStep(STEPS.SELECT_DATETIME);
      }
    }
    setLoading(false);
  };

  const checkSpecificRoom = (room) => {
    setSelectedRoom(room);
    addMessage('user', `🔍 ${room.name}`);
    setStep(STEPS.CHECK_ROOM);
    setBookingData({ date: '', startTime: '09:00', endTime: '10:00', title: '' });
    addMessage('bot', `¿En qué fecha y horario quieres verificar **${room.name}**?`);
  };

  const handleCheckRoomSubmit = async () => {
    if (!bookingData.date || !bookingData.startTime || !bookingData.endTime) {
      addMessage('bot', 'Completa la fecha y horario.');
      return;
    }
    const startTime = `${bookingData.date} ${bookingData.startTime}:00`;
    const endTime = `${bookingData.date} ${bookingData.endTime}:00`;
    setLoading(true);
    addMessage('user', `📅 ${bookingData.date} | ${bookingData.startTime} - ${bookingData.endTime}`);
    addMessage('bot', `🔍 Verificando disponibilidad de **${selectedRoom.name}**...`);

    try {
      const available = await checkRoomAvailability(selectedRoom.id, startTime, endTime);
      if (available) {
        addMessage('bot', `✅ **${selectedRoom.name}** está **DISPONIBLE** el ${bookingData.date} de ${bookingData.startTime} a ${bookingData.endTime}.\n\n¿Quieres reservarla?`);
        setStep(STEPS.CONFIRM);
      } else {
        addMessage('bot', `❌ **${selectedRoom.name}** está **OCUPADA** en ese horario.\n\nPrueba con otro horario o elige otra sala.`);
        setStep(STEPS.VIEW_ROOMS);
      }
    } catch {
      addMessage('bot', 'Error al verificar disponibilidad.');
    }
    setLoading(false);
  };

  const handleBookingSubmit = () => {
    if (!bookingData.date || !bookingData.startTime || !bookingData.endTime || !bookingData.title) {
      addMessage('bot', 'Completa todos los campos: fecha, hora inicio, hora fin y título.');
      return;
    }
    if (bookingData.startTime >= bookingData.endTime) {
      addMessage('bot', 'La hora de inicio debe ser anterior a la hora de fin.');
      return;
    }
    addMessage('user', `📅 ${bookingData.date} | ${bookingData.startTime}-${bookingData.endTime}\n📝 ${bookingData.title}`);
    checkAvailabilityAndShowRooms();
  };

  const handleUserMessage = (msg) => {
    const lowerMsg = msg.toLowerCase();

    if (step === STEPS.CONFIRM) {
      if (lowerMsg.includes('sí') || lowerMsg.includes('si') || lowerMsg.includes('ok')) {
        addMessage('user', 'Sí, confirmar');
        confirmBooking();
      } else if (lowerMsg.includes('no') || lowerMsg.includes('cancel')) {
        addMessage('user', 'No, cancelar');
        addMessage('bot', 'Reserva cancelada.');
        setStep(STEPS.INITIAL);
        resetState();
      }
      return;
    }

    if (step === STEPS.VIEW_AVAILABLE_ROOMS) {
      const room = availableRooms.find(r => r.name.toLowerCase().includes(lowerMsg) || r.id.toString() === msg);
      if (room) {
        addMessage('user', msg);
        selectRoom(room);
      } else {
        addMessage('user', msg);
        addMessage('bot', 'Elige una sala de la lista o escribe "volver" para cambiar fecha.');
        if (lowerMsg.includes('volver') || lowerMsg.includes('atrás')) goBack();
      }
      return;
    }

    if (step === STEPS.CHECK_ROOM) {
      if (lowerMsg.includes('volver') || lowerMsg.includes('atrás')) {
        addMessage('user', 'Volver');
        goBack();
      } else {
        addMessage('user', msg);
        addMessage('bot', 'Usa el formulario para ingresar fecha y horario, o escribe "volver".');
      }
      return;
    }

    if (step === STEPS.SUCCESS) {
      if (lowerMsg.includes('sí') || lowerMsg.includes('si') || lowerMsg.includes('otro') || lowerMsg.includes('más')) {
        setStep(STEPS.INITIAL);
        resetState();
        setMessages([{ role: 'bot', content: '¿Qué deseas hacer ahora?' }]);
      } else {
        addMessage('user', msg);
        addMessage('bot', '¡Gracias! Que tengas un buen día 👋');
        setTimeout(() => setOpen(false), 2000);
      }
      return;
    }

    addMessage('user', msg);

    if (lowerMsg.includes('hola') || lowerMsg.includes('buenas')) {
      addMessage('bot', '¡Hola! ¿En qué puedo ayudarte?');
    } else if (lowerMsg.includes('sala') || lowerMsg.includes('disponible') || lowerMsg.includes('ver')) {
      handleOption('view_rooms');
    } else if (lowerMsg.includes('reservar') || lowerMsg.includes('agendar') || lowerMsg.includes('booking')) {
      handleOption('book');
    } else if (lowerMsg.includes('gracias')) {
      addMessage('bot', '¡De nada! 😊');
    } else {
      addMessage('bot', 'Opciones:\n🏢 "Ver salas" — ver disponibles\n📅 "Reservar" — agendar una sala\n👋 "Hola" — saludar');
    }
  };

  const resetState = () => {
    setSelectedRoom(null);
    setSelectedProgram(null);
    setAvailableRooms([]);
    setBookingData({ date: '', startTime: '09:00', endTime: '10:00', title: '' });
  };

  const [inputValue, setInputValue] = useState('');

  const handleSend = () => {
    if (!inputValue.trim()) return;
    handleUserMessage(inputValue);
    setInputValue('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  const formatEquipment = (equip) => {
    if (!equip) return '';
    try {
      const items = typeof equip === 'string' ? JSON.parse(equip) : equip;
      return items.slice(0, 3).join(', ') + (items.length > 3 ? '...' : '');
    } catch { return ''; }
  };

  const stepIndex = Object.values(STEPS).indexOf(step);
  const totalSteps = Object.values(STEPS).length;

  return (
    <>
      <button onClick={() => setOpen(true)}
        style={{
          position: 'fixed', bottom: 20, right: 20,
          width: 60, height: 60, borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          border: 'none', color: 'white', cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.2s'
        }}
        onMouseEnter={e => e.target.style.transform = 'scale(1.1)'}
        onMouseLeave={e => e.target.style.transform = 'scale(1)'}
      >
        <HiOutlineChat size={28} />
      </button>

      {open && (
        <div style={{
          position: 'fixed', bottom: 90, right: 20,
          width: 420, maxWidth: '95vw', height: 560, maxHeight: '85vh',
          background: 'var(--bg-card)', borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)', zIndex: 1000,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          border: '1px solid var(--border-color)'
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 18px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <HiOutlineOfficeBuilding size={22} />
              <div>
                <div style={{ fontWeight: 600 }}>Asistente de Salas</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>
                  {step !== STEPS.INITIAL && step !== STEPS.SUCCESS ? STEP_LABELS[step] : ''}
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            ><HiOutlineX size={18} /></button>
          </div>

          {/* Progress bar */}
          {step !== STEPS.INITIAL && step !== STEPS.SUCCESS && step !== STEPS.VIEW_ROOMS && (
            <div style={{ height: 3, background: 'var(--border-color)' }}>
              <div style={{ height: '100%', width: `${(stepIndex / (totalSteps - 3)) * 100}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', transition: 'width 0.3s' }} />
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12, fontSize: '1rem' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '88%',
                padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: msg.role === 'user' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'var(--bg-input)',
                color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                fontSize: '1rem', lineHeight: 1.6, whiteSpace: 'pre-wrap',
                animation: 'fadeIn 0.2s'
              }}>
                {msg.content}
              </div>
            ))}

            {typing && (
              <div style={{ alignSelf: 'flex-start', background: 'var(--bg-input)', padding: '12px 18px', borderRadius: '16px 16px 16px 4px', display: 'flex', gap: 4 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text-muted)', animation: 'bounce 1s infinite' }} />
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text-muted)', animation: 'bounce 1s infinite 0.2s' }} />
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text-muted)', animation: 'bounce 1s infinite 0.4s' }} />
              </div>
            )}

            {/* Room list (clickable to check availability) */}
            {step === STEPS.VIEW_ROOMS && rooms.map(room => (
              <button key={room.id} onClick={() => checkSpecificRoom(room)}
                style={{
                  padding: '14px 16px', background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)', borderRadius: 10,
                  cursor: 'pointer', textAlign: 'left',
                  width: '100%', transition: 'all 0.15s'
                }}
                onMouseEnter={e => e.target.style.background = 'var(--bg-card-hover)'}
                onMouseLeave={e => e.target.style.background = 'var(--bg-input)'}
              >
                <div style={{ fontWeight: 600, marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{room.name}</span>
                  <span style={{ color: 'var(--info)', fontWeight: 400 }}>Ver disponibilidad →</span>
                </div>
                <div style={{ color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
                  <span><HiOutlineUserGroup size={16} style={{ verticalAlign: 'middle' }} /> {room.capacidad}</span>
                  {room.ubicacion && <span><HiOutlineLocationMarker size={16} style={{ verticalAlign: 'middle' }} /> {room.ubicacion}</span>}
                </div>
                {room.equipment && formatEquipment(room.equipment) && (
                  <div style={{ color: 'var(--text-muted)', marginTop: 6 }}>
                    <HiOutlineCog size={14} style={{ verticalAlign: 'middle' }} /> {formatEquipment(room.equipment)}
                  </div>
                )}
              </button>
            ))}

            {/* Available rooms (selectable) */}
            {step === STEPS.VIEW_AVAILABLE_ROOMS && availableRooms.map(room => (
              <button key={room.id} onClick={() => selectRoom(room)}
                style={{
                  padding: '14px 16px', background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)', borderRadius: 10,
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.15s',
                  borderLeft: '3px solid var(--success)'
                }}
                onMouseEnter={e => e.target.style.background = 'var(--bg-card-hover)'}
                onMouseLeave={e => e.target.style.background = 'var(--bg-input)'}
              >
                <div style={{ fontWeight: 600, marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{room.name}</span>
                  <span style={{ color: 'var(--success)' }}>Disponible ✓</span>
                </div>
                <div style={{ color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
                  <span><HiOutlineUserGroup size={16} style={{ verticalAlign: 'middle' }} /> {room.capacidad}</span>
                  {room.ubicacion && <span><HiOutlineLocationMarker size={16} style={{ verticalAlign: 'middle' }} /> {room.ubicacion}</span>}
                </div>
              </button>
            ))}

            {/* Program selection */}
            {step === STEPS.SELECT_PROGRAM && programs.filter(p => p.active !== false).map(prog => (
              <button key={prog.id} onClick={() => selectProgram(prog)}
                style={{
                  padding: '14px 16px', background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)', borderRadius: 10,
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => e.target.style.background = 'var(--bg-card-hover)'}
                onMouseLeave={e => e.target.style.background = 'var(--bg-input)'}
              >
                <div style={{ fontWeight: 600, marginBottom: 6 }}>{prog.name}</div>
                <div style={{ color: 'var(--text-muted)' }}>
                  <span className={`badge ${prog.type === 'magister' ? 'badge-purple' : 'badge-info'}`}>
                    {prog.type}
                  </span>
                </div>
              </button>
            ))}

            {/* Confirm buttons */}
            {step === STEPS.CONFIRM && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={confirmBooking} disabled={loading}
                  style={{
                    flex: 1, padding: '12px', borderRadius: 10, border: 'none',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: 'white', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1
                  }}
                >{loading ? 'Reservando...' : '✅ Confirmar'}</button>
                <button onClick={() => { addMessage('user', 'Cancelar'); addMessage('bot', 'Reserva cancelada.'); setStep(STEPS.INITIAL); resetState(); }}
                  style={{ padding: '12px 18px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >Cancelar</button>
              </div>
            )}

            {/* Check specific room form */}
            {step === STEPS.CHECK_ROOM && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ color: 'var(--text-secondary)' }}>
                  Verificando: <strong>{selectedRoom?.name}</strong>
                </div>
                <input type="date" value={bookingData.date}
                  onChange={e => setBookingData({ ...bookingData, date: e.target.value })}
                  style={inputStyle} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <HiOutlineClock size={14} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--text-muted)' }} />
                    <input type="time" value={bookingData.startTime}
                      onChange={e => setBookingData({ ...bookingData, startTime: e.target.value })}
                      style={{ ...inputStyle, paddingLeft: 28 }} />
                  </div>
                  <span style={{ alignSelf: 'center', color: 'var(--text-muted)' }}>a</span>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <HiOutlineClock size={14} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--text-muted)' }} />
                    <input type="time" value={bookingData.endTime}
                      onChange={e => setBookingData({ ...bookingData, endTime: e.target.value })}
                      style={{ ...inputStyle, paddingLeft: 28 }} />
                  </div>
                </div>
                <button onClick={handleCheckRoomSubmit} disabled={loading}
                  style={{
                    padding: '11px', borderRadius: 10, border: 'none',
                    background: loading ? 'var(--text-muted)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: 'white', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1
                  }}
                >{loading ? 'Verificando...' : '🔍 Verificar disponibilidad'}</button>
              </div>
            )}

            {/* DateTime form */}
            {step === STEPS.SELECT_DATETIME && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input type="date" value={bookingData.date}
                  onChange={e => setBookingData({ ...bookingData, date: e.target.value })}
                  style={inputStyle} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <HiOutlineClock size={14} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--text-muted)' }} />
                    <input type="time" value={bookingData.startTime}
                      onChange={e => setBookingData({ ...bookingData, startTime: e.target.value })}
                      style={{ ...inputStyle, paddingLeft: 28 }} />
                  </div>
                  <span style={{ alignSelf: 'center', color: 'var(--text-muted)' }}>a</span>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <HiOutlineClock size={14} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--text-muted)' }} />
                    <input type="time" value={bookingData.endTime}
                      onChange={e => setBookingData({ ...bookingData, endTime: e.target.value })}
                      style={{ ...inputStyle, paddingLeft: 28 }} />
                  </div>
                </div>
                <input type="text" value={bookingData.title}
                  onChange={e => setBookingData({ ...bookingData, title: e.target.value })}
                  style={inputStyle} placeholder="Título de la actividad" />
                <button onClick={handleBookingSubmit} disabled={loading}
                  style={{
                    padding: '11px', borderRadius: 10, border: 'none',
                    background: loading ? 'var(--text-muted)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: 'white', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1
                  }}
                >{loading ? 'Verificando...' : '🔍 Buscar salas disponibles'}</button>
              </div>
            )}

            {/* Initial buttons */}
            {step === STEPS.INITIAL && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => handleOption('view_rooms')} style={optionBtn}>
                  <HiOutlineOfficeBuilding /> Ver salas
                </button>
                <button onClick={() => handleOption('book')} style={optionBtn}>
                  <HiOutlineCalendar /> Reservar
                </button>
              </div>
            )}

            {/* Success actions */}
            {step === STEPS.SUCCESS && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setStep(STEPS.INITIAL); resetState(); setMessages([{ role: 'bot', content: '¿Qué deseas hacer ahora?' }]); }} style={optionBtn}>
                  Otra reserva
                </button>
                <button onClick={() => { addMessage('user', 'No, gracias'); addMessage('bot', '¡Hasta luego! 👋'); setTimeout(() => setOpen(false), 2000); }} style={optionBtn}>
                  Salir
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: 8, flexShrink: 0, background: 'var(--bg-card)' }}>
            {step !== STEPS.SELECT_DATETIME && step !== STEPS.CONFIRM && step !== STEPS.SUCCESS && step !== STEPS.INITIAL && (
              <button onClick={goBack} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 4px', display: 'flex', alignItems: 'center' }}>
                <HiOutlineArrowLeft size={20} />
              </button>
            )}
            <input type="text" value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={step === STEPS.SELECT_DATETIME || step === STEPS.CHECK_ROOM ? 'O escribe "volver"' : 'Escribe un mensaje...'}
              style={{
                flex: 1, padding: '12px 18px', borderRadius: 20,
                border: '1px solid var(--border-color)',
                background: 'var(--bg-input)', color: 'var(--text-primary)',
                outline: 'none', fontSize: '1rem'
              }}
            />
            {(step !== STEPS.SELECT_DATETIME && step !== STEPS.CHECK_ROOM && step !== STEPS.CONFIRM && step !== STEPS.SUCCESS) && (
              <button onClick={handleSend}
                style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  border: 'none', color: 'white', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}
              ><HiOutlineCheck size={18} /></button>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
      `}</style>
    </>
  );
}

const inputStyle = {
  width: '100%', padding: '14px 16px', borderRadius: 8,
  border: '1px solid var(--border-color)',
  background: 'var(--bg-input)', color: 'var(--text-primary)',
  fontSize: '1rem', outline: 'none', boxSizing: 'border-box'
};

const optionBtn = {
  padding: '14px 20px', background: 'var(--bg-input)',
  border: '1px solid var(--border-color)', borderRadius: 20,
  color: 'var(--text-primary)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 8,
  transition: 'all 0.15s'
};