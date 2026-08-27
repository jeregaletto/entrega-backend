// src/app.js
const express = require('express');
require('dotenv').config();
const pool = require('./config/db');
const { sendResponse } = require('./utils/responseHandler');

// Importar rutas de Semana 1
const authRoutes = require('./routes/authRoutes');
const testRoutes = require('./routes/testRoutes');

// Importar rutas de Semana 2
const sedeRoutes = require('./routes/sedeRoutes');
const especialidadRoutes = require('./routes/especialidadRoutes');
const coberturaRoutes = require('./routes/coberturaRoutes');
const agendaRoutes = require('./routes/agendaRoutes');

// Importar rutas de Semana 3
const turnoRoutes = require('./routes/turnoRoutes');
const historialClinicoRoutes = require('./routes/historialClinicoRoutes');
const notificacionRoutes = require('./routes/notificacionRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON
app.use(express.json());

// Endpoint GET /health
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    return sendResponse(res, 200, 'Servidor y Base de Datos funcionando correctamente', {
      status: 'OK',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en /health:', error);
    return sendResponse(res, 500, 'Error de conexión con la Base de Datos', {
      error: error.message
    });
  }
});

// Montar Rutas de la Aplicación
app.use('/auth', authRoutes);
app.use('/test', testRoutes);
app.use('/sedes', sedeRoutes);
app.use('/especialidades', especialidadRoutes);
app.use('/coberturas', coberturaRoutes);
app.use('/agenda', agendaRoutes);
app.use('/turnos', turnoRoutes);
app.use('/historial-clinico', historialClinicoRoutes);
app.use('/notificaciones', notificacionRoutes);

// Manejador de rutas no encontradas (404)
app.use((req, res) => {
  sendResponse(res, 404, 'Ruta no encontrada', null);
});

// Manejador global de errores (500)
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  sendResponse(res, 500, 'Error interno del servidor', null);
});

// Iniciar Servidor
app.listen(PORT, () => {
  console.log(`Servidor de Clínica Médica ejecutándose en http://localhost:${PORT}`);
});
