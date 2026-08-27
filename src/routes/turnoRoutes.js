// src/routes/turnoRoutes.js
const express = require('express');
const router = express.Router();
const turnoController = require('../controllers/turnoController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

// Todas las operaciones de turnos requieren autenticación previa
router.use(verificarToken);

// 4) LISTADO "MIS TURNOS" (GET /turnos/mis-turnos)
// Exclusivo del rol 'paciente': devuelve sus propios turnos, del más próximo al menos próximo
router.get(
  '/mis-turnos',
  verificarRol('paciente'),
  turnoController.getMisTurnos
);

// 5) TURNOS PROGRAMADOS DE UN MÉDICO (GET /turnos/programados?fecha=YYYY-MM-DD)
// - 'medico': únicamente sus propios turnos
// - 'operador': turnos de los médicos de su sede
// - 'admin': cualquier médico
router.get(
  '/programados',
  verificarRol('medico', 'operador', 'admin'),
  turnoController.getTurnosProgramados
);

// 6) TURNOS DE UNA SEDE PARA UNA FECHA (GET /turnos/sede?fecha=YYYY-MM-DD)
// - 'operador': únicamente su sede asignada
// - 'admin': cualquier sede
router.get(
  '/sede',
  verificarRol('operador', 'admin'),
  turnoController.getTurnosPorSede
);

// 1) ALTA DE TURNO (POST /turnos)
// Accesible para rol 'paciente' y rol 'operador' (y 'admin')
router.post(
  '/',
  verificarRol('paciente', 'operador', 'admin'),
  turnoController.createTurno
);

// 2) CANCELACIÓN DE TURNO (PUT /turnos/:id/cancelar)
// Accesible para 'paciente' (propios), 'operador' / 'medico' (de su sede) y 'admin'
router.put(
  '/:id/cancelar',
  verificarRol('paciente', 'operador', 'medico', 'admin'),
  turnoController.cancelarTurno
);

// 3) ATENCIÓN DE TURNO (PUT /turnos/:id/atender)
// Exclusivo para rol 'medico' sobre turnos de su propia agenda
router.put(
  '/:id/atender',
  verificarRol('medico'),
  turnoController.atenderTurno
);

module.exports = router;
