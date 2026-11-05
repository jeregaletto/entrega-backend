// src/app.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./config/db');
const { sendResponse } = require('./utils/responseHandler');

// Documentación de la API (Swagger UI)
const swaggerUi = require('swagger-ui-express');
const openapi = require('./docs/openapi.json');

// Importar rutas de Semana 1
const authRoutes = require('./routes/authRoutes');
const testRoutes = require('./routes/testRoutes');

// Importar rutas de Semana 2
const sedeRoutes = require('./routes/sedeRoutes');
const especialidadRoutes = require('./routes/especialidadRoutes');
const coberturaRoutes = require('./routes/coberturaRoutes');
const agendaRoutes = require('./routes/agendaRoutes');
const medicoRoutes = require('./routes/medicoRoutes');

// Importar rutas de Semana 3
const turnoRoutes = require('./routes/turnoRoutes');
const historialClinicoRoutes = require('./routes/historialClinicoRoutes');
const notificacionRoutes = require('./routes/notificacionRoutes');

// Importar rutas de Semana 4
const auditoriaRoutes = require('./routes/auditoriaRoutes');
const reporteRoutes = require('./routes/reporteRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const disponibilidadRoutes = require('./routes/disponibilidadRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS para permitir peticiones desde el frontend
app.use(cors({ origin: 'http://localhost:4200' }));

// Middleware para parsear JSON
app.use(express.json());

// Documentación interactiva de la API: http://localhost:3000/api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi, {
  customSiteTitle: 'API Clínica Médica - Documentación',
  swaggerOptions: { persistAuthorization: true }
}));

// Especificación OpenAPI en crudo, por si se quiere importar en otra herramienta
app.get('/api-docs.json', (req, res) => res.json(openapi));

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
app.use('/medicos', medicoRoutes);
app.use('/turnos', turnoRoutes);
app.use('/historial-clinico', historialClinicoRoutes);
app.use('/notificaciones', notificacionRoutes);
app.use('/auditoria', auditoriaRoutes);
app.use('/reportes', reporteRoutes);
app.use('/usuarios', usuarioRoutes);
app.use('/disponibilidad', disponibilidadRoutes);

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
