import { useState, useRef, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { HiOutlineChat, HiOutlineX, HiOutlineCalendar, HiOutlineOfficeBuilding, HiOutlineCheck, HiOutlineClock } from 'react-icons/hi';

const STEPS = {
  INITIAL: 'initial',
  VIEW_ROOMS: 'view_rooms',
  SELECT_PROGRAM: 'select_program',
  SELECT_DATETIME: 'select_datetime',
  CONFIRM: 'confirm',
  SUCCESS: 'success'
};

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(STEPS.INITIAL);
  const [messages, setMessages] = useState([
    { role: 'bot', content: '¡Hola! 👋 Soy el asistente de reservas de salas. ¿Qué deseas hacer?' }
  ]);
  const [rooms, setRooms] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [bookingData, setBookingData] = useState({ date: '', startTime: '09:00', endTime: '10:00', title: '' });
  const [loading, setLoading] = useState(false);
  const { get, post } = useApi();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (role, content) => {
    setMessages(prev => [...prev, { role, content }]);
  };

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const [roomsRes, programsRes] = await Promise.all([
        get('/rooms?active=true&limit=50', { silent: true }),
        get('/programs?limit=50', { silent: true })
      ]);
      setRooms(roomsRes.data?.data || roomsRes.data || []);
      setPrograms(programsRes.data?.data || programsRes.data || []);
      setStep(STEPS.VIEW_ROOMS);
      addMessage('bot', 'Estas son las salas disponibles:\n\n');
    } catch (err) {
      addMessage('bot', 'Error al cargar las salas. Intenta más tarde.');
    }
    setLoading(false);
  };

  const handleOption = (option) => {
    if (option === 'view_rooms') {
      addMessage('user', 'Ver salas disponibles');
      fetchRooms();
    } else if (option === 'book') {
      addMessage('user', 'Reservar una sala');
      fetchRooms().then(() => {
        setTimeout(() => {
          addMessage('bot', 'Selecciona una sala de la lista上方 para continuar.');
        }, 500);
      });
    }
  };

  const selectRoom = (room) => {
    setSelectedRoom(room);
    addMessage('user', `Sala: ${room.name} (Capacidad: ${room.capacidad} personas)`);
    setStep(STEPS.SELECT_PROGRAM);
    addMessage('bot', `Perfecto, seleccionado: ${room.name}\n\nAhora selecciona un programa:`);
  };

  const selectProgram = (program) => {
    setSelectedProgram(program);
    addMessage('user', `Programa: ${program.name} (${program.type})`);
    setStep(STEPS.SELECT_DATETIME);
    addMessage('bot', `Perfecto, programa: ${program.name}\n\nAhora indica la fecha y horario:\n📅 Fecha (YYYY-MM-DD)\n⏰ Hora inicio (HH:MM)\n⏰ Hora fin (HH:MM)\n📝 Título de la actividad`);
  };

  const handleBookingSubmit = () => {
    if (!bookingData.date || !bookingData.startTime || !bookingData.endTime || !bookingData.title) {
      addMessage('bot', 'Por favor completa todos los campos: fecha, hora inicio, hora fin y título.');
      return;
    }
    
    const startTime = `${bookingData.date} ${bookingData.startTime}:00`;
    const endTime = `${bookingData.date} ${bookingData.endTime}:00`;
    
    addMessage('user', `Fecha: ${bookingData.date}\nHorario: ${bookingData.startTime} - ${bookingData.endTime}\nActividad: ${bookingData.title}`);
    
    setStep(STEPS.CONFIRM);
    addMessage('bot', `📋 *Confirmación de Reserva*\n\n🏢 Sala: ${selectedRoom.name}\n📚 Programa: ${selectedProgram?.name || 'N/A'}\n📅 Fecha: ${bookingData.date}\n⏰ Horario: ${bookingData.startTime} - ${bookingData.endTime}\n📝 Actividad: ${bookingData.title}\n\n¿Confirmar reserva? (Sí / No)`);
  };

  const confirmBooking = async () => {
    setLoading(true);
    const startTime = `${bookingData.date} ${bookingData.startTime}:00`;
    const endTime = `${bookingData.date} ${bookingData.endTime}:00`;
    
    try {
      const activityData = {
        title: bookingData.title,
        description: `Reserva de sala ${selectedRoom.name} vía chatbot`,
        start_time: startTime,
        end_time: endTime,
        room_id: selectedRoom.id,
        program_id: selectedProgram?.id || 1,
        type: 'meeting',
        status: 'scheduled'
      };
      
      await post('/activities', activityData, { silent: true });
      setStep(STEPS.SUCCESS);
      addMessage('bot', '✅ ¡Reserva confirmada!\n\nTu actividad ha sido creada y aparecerá en el calendario. ¿Necesitas algo más?');
    } catch (err) {
      addMessage('bot', `Error al crear la reserva: ${err.response?.data?.message || err.message}`);
      setStep(STEPS.SELECT_DATETIME);
    }
    setLoading(false);
  };

  const handleUserMessage = (msg) => {
    const lowerMsg = msg.toLowerCase();
    
    if (step === STEPS.CONFIRM) {
      if (lowerMsg.includes('sí') || lowerMsg.includes('si') || lowerMsg.includes('confirm') || lowerMsg.includes('ok')) {
        confirmBooking();
      } else if (lowerMsg.includes('no') || lowerMsg.includes('cancel')) {
        addMessage('bot', 'Reserva cancelada. ¿Qué deseas hacer?');
        setStep(STEPS.INITIAL);
        setSelectedRoom(null);
        setSelectedProgram(null);
        setBookingData({ date: '', startTime: '09:00', endTime: '10:00', title: '' });
      }
      return;
    }
    
    if (step === STEPS.SELECT_DATETIME) {
      const dateMatch = msg.match(/(\d{4}-\d{2}-\d{2})/);
      const titleMatch = msg.match(/[a-zA-Z]+/);
      
      let newData = { ...bookingData };
      let parsingMsg = '';
      
      if (dateMatch) {
        newData.date = dateMatch[1];
        parsingMsg += `📅 Fecha: ${newData.date}\n`;
      }
      
      const timeMatch = msg.match(/(\d{1,2}:\d{2})/g);
      if (timeMatch && timeMatch.length >= 2) {
        newData.startTime = timeMatch[0];
        newData.endTime = timeMatch[1];
        parsingMsg += `⏰ Horario: ${newData.startTime} - ${newData.endTime}\n`;
      }
      
      if (titleMatch) {
        newData.title = msg;
        parsingMsg += `📝 Título: ${newData.title}`;
      }
      
      setBookingData(newData);
      addMessage('user', msg);
      
      if (newData.date && newData.startTime && newData.endTime && newData.title) {
        handleBookingSubmit();
      } else {
        addMessage('bot', `Datos recibidos: ${parsingMsg}\n\nFaltan datos. Por favor indica: fecha (YYYY-MM-DD), hora inicio, hora fin y título de la actividad.`);
      }
      return;
    }
    
    if (step === STEPS.VIEW_ROOMS) {
      const room = rooms.find(r => r.name.toLowerCase().includes(lowerMsg) || r.id.toString() === msg);
      if (room) {
        selectRoom(room);
      } else {
        addMessage('user', msg);
        addMessage('bot', 'No encontré esa sala. Selecciona una de la lista o escribe "reservar" para agendar.');
      }
      return;
    }
    
    if (step === STEPS.SUCCESS) {
      if (lowerMsg.includes('sí') || lowerMsg.includes('si') || lowerMsg.includes('otro') || lowerMsg.includes('más')) {
        setStep(STEPS.INITIAL);
        setSelectedRoom(null);
        setSelectedProgram(null);
        setBookingData({ date: '', startTime: '09:00', endTime: '10:00', title: '' });
        setMessages([{ role: 'bot', content: '¡Perfecto! ¿Qué deseas hacer?' }]);
      } else if (lowerMsg.includes('no') || lowerMsg.includes('gracias')) {
        addMessage('bot', '¡De nada! Que tengas un buen día 👋');
        setTimeout(() => setOpen(false), 2000);
      }
      return;
    }
    
    addMessage('user', msg);
    
    if (lowerMsg.includes('hola') || lowerMsg.includes('hi') || lowerMsg.includes('buenas')) {
      addMessage('bot', '¡Hola! 👋 Estoy aquí para ayudarte con las salas. ¿Qué necesitas?');
    } else if (lowerMsg.includes('sala') || lowerMsg.includes('room') || lowerMsg.includes('disponible')) {
      fetchRooms();
    } else if (lowerMsg.includes('reservar') || lowerMsg.includes('agendar') || lowerMsg.includes('booking')) {
      fetchRooms().then(() => {
        setTimeout(() => {
          addMessage('bot', 'Perfecto, selecciona una sala de la lista para continuar.');
        }, 500);
      });
    } else {
      addMessage('bot', 'No entendí. Puedes escribir:\n- "Ver salas" para ver disponibles\n- "Reservar" para agendar una sala\n- "Hola" para saludar');
    }
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

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          border: 'none',
          color: 'white',
          fontSize: 24,
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <HiOutlineChat size={28} />
      </button>

      {open && (
        <div style={{
          position: 'fixed',
          bottom: 90,
          right: 20,
          width: 380,
          maxWidth: '90vw',
          height: 500,
          maxHeight: '80vh',
          background: 'var(--bg-card)',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <HiOutlineOfficeBuilding size={24} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '1rem' }}>Asistente de Salas</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>Reserva rápida</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                width: 32,
                height: 32,
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <HiOutlineX size={20} />
            </button>
          </div>

          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                padding: '10px 14px',
                borderRadius: 16,
                background: msg.role === 'user' 
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' 
                  : 'var(--bg-input)',
                color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                fontSize: '0.9rem',
                lineHeight: 1.4,
                whiteSpace: 'pre-wrap'
              }}>
                {msg.content}
              </div>
            ))}
            
            {step === STEPS.VIEW_ROOMS && rooms.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {rooms.map(room => (
                  <button
                    key={room.id}
                    onClick={() => selectRoom(room)}
                    style={{
                      padding: '12px 16px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 10,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{room.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Capacidad: {room.capacidad} | {room.ubicacion || 'Sin ubicación'}
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {step === STEPS.SELECT_PROGRAM && programs.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {programs.map(program => (
                  <button
                    key={program.id}
                    onClick={() => selectProgram(program)}
                    style={{
                      padding: '12px 16px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 10,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{program.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {program.type}
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {step === STEPS.SELECT_DATETIME && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  type="date"
                  value={bookingData.date}
                  onChange={e => setBookingData({ ...bookingData, date: e.target.value })}
                  style={inputStyle}
                  placeholder="Fecha (YYYY-MM-DD)"
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="time"
                    value={bookingData.startTime}
                    onChange={e => setBookingData({ ...bookingData, startTime: e.target.value })}
                    style={inputStyle}
                  />
                  <input
                    type="time"
                    value={bookingData.endTime}
                    onChange={e => setBookingData({ ...bookingData, endTime: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <input
                  type="text"
                  value={bookingData.title}
                  onChange={e => setBookingData({ ...bookingData, title: e.target.value })}
                  style={inputStyle}
                  placeholder="Título de la actividad"
                />
                <button
                  onClick={handleBookingSubmit}
                  disabled={loading}
                  style={{
                    padding: '12px',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    border: 'none',
                    borderRadius: 10,
                    color: 'white',
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  {loading ? 'Procesando...' : 'Continuar'}
                </button>
              </div>
            )}
            
            {step === STEPS.INITIAL && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={() => handleOption('view_rooms')} style={optionButtonStyle}>
                  <HiOutlineOfficeBuilding /> Ver salas
                </button>
                <button onClick={() => handleOption('book')} style={optionButtonStyle}>
                  <HiOutlineCalendar /> Reservar
                </button>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {step !== STEPS.SELECT_DATETIME && (
            <div style={{
              padding: 12,
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              gap: 8
            }}>
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe un mensaje..."
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 20,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontSize: '0.9rem'
                }}
              />
              <button
                onClick={handleSend}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <HiOutlineCheck />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid var(--border-color)',
  background: 'var(--bg-input)',
  color: 'var(--text-primary)',
  fontSize: '0.9rem',
  outline: 'none'
};

const optionButtonStyle = {
  padding: '10px 16px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-color)',
  borderRadius: 20,
  color: 'var(--text-primary)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: '0.85rem',
  transition: 'all 0.2s'
};