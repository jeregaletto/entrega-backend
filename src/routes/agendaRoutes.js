// src/routes/agendaRoutes.js
const express = require('express');
const router = express.Router();
const agendaController = require('../controllers/agendaController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

// Proteger todas las rutas con token de autenticación
router.use(verificarToken);

// Bloquear el rol 'paciente' a nivel de router para todas las operaciones de agenda
router.use(verificarRol('admin', 'operador', 'medico'));

router.get('/', agendaController.getAllAgendas);
router.get('/:id', agendaController.getAgendaById);
router.post('/', agendaController.createAgenda);
router.put('/:id', agendaController.updateAgenda);
router.delete('/:id', agendaController.deleteAgenda);

module.exports = router;
