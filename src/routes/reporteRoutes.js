// src/routes/reporteRoutes.js
const express = require('express');
const router = express.Router();
const reporteController = require('../controllers/reporteController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

// Todos los reportes estadísticos son exclusivos para el rol 'admin'
router.use(verificarToken, verificarRol('admin'));

// a) GET /reportes/turnos-por-especialidad
router.get('/turnos-por-especialidad', reporteController.getTurnosPorEspecialidad);

// b) GET /reportes/turnos-por-sede
router.get('/turnos-por-sede', reporteController.getTurnosPorSede);

// c) GET /reportes/ranking-medicos
router.get('/ranking-medicos', reporteController.getRankingMedicos);

// d) GET /reportes/tasa-cancelacion
router.get('/tasa-cancelacion', reporteController.getTasaCancelacion);

module.exports = router;
