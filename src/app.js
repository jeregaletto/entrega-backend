const express = require('express');
require('dotenv').config();
const pool = require('./config/db');
const { sendResponse } = require('./utils/responseHandler');
const authRoutes = require('./routes/authRoutes');
const testRoutes = require('./routes/testRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON en las peticiones
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

// Rutas de la aplicación
app.use('/auth', authRoutes);
app.use('/test', testRoutes);

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
