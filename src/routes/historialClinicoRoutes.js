// src/routes/historialClinicoRoutes.js
const express = require('express');
const router = express.Router();
const historialClinicoController = require('../controllers/historialClinicoController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

// Todas las rutas de historial clínico requieren autenticación
router.use(verificarToken);

// a) POST /historial-clinico - Carga de historial clínico por el médico que atendió el turno
router.post(
  '/',
  verificarRol('medico'),
  historialClinicoController.createHistorialClinico
);

// b) GET /historial-clinico/paciente/:id_paciente - Consulta de historial clínico
// - Paciente: solo puede consultar su propio ID
// - Médico: solo puede consultar los turnos que él mismo atendió de dicho paciente
router.get(
  '/paciente/:id_paciente',
  verificarRol('paciente', 'medico'),
  historialClinicoController.getHistorialByPaciente
);

// GET /historial-clinico/paciente - Consulta directa del propio paciente
router.get(
  '/paciente',
  verificarRol('paciente'),
  historialClinicoController.getHistorialByPaciente
);

module.exports = router;
