require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const programRoutes = require('./routes/programRoutes');
const roomRoutes = require('./routes/roomRoutes');
const activityRoutes = require('./routes/activityRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const attendeeRoutes = require('./routes/attendeeRoutes');
const requestRoutes = require('./routes/requestRoutes');

const app = express();
const PORT = process.env.PORT || 4000;

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173', 'http://localhost:5174'];

// ============================================
// MIDDLEWARES GLOBALES
// ============================================

// CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Parser JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 500, // máximo 500 peticiones por ventana
  message: { success: false, message: 'Demasiadas peticiones. Intenta de nuevo en 15 minutos.' }
});
app.use('/api/', limiter);

// ============================================
// RUTAS DE LA API
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/attendees', attendeeRoutes);
app.use('/api/requests', requestRoutes);

// Ruta de health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API Gestión Académica funcionando correctamente.',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Ruta 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Ruta ${req.method} ${req.path} no encontrada.` });
});

// Error handler global
app.use(errorHandler);

// ============================================
// INICIAR SERVIDOR
// ============================================
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   🎓 API Gestión Académica v1.0.0           ║');
  console.log(`║   🚀 Servidor corriendo en puerto ${PORT}        ║`);
  console.log(`║   📡 API: http://localhost:${PORT}/api          ║`);
  console.log('║   🏥 Health: /api/health                     ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
});

module.exports = app;
