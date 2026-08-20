const express = require('express');
const router = express.Router();
const agendaController = require('../controllers/agendaController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

// La agenda la gestionan médicos (solo la propia), operadores y administradores.
// El rol paciente no tiene acceso: verificarRol responde 403.
router.use(verificarToken, verificarRol('medico', 'operador', 'administrador'));

router.get('/', agendaController.listarAgenda);
router.get('/:id', agendaController.obtenerAgenda);
router.post('/', agendaController.crearAgenda);
router.put('/:id', agendaController.actualizarAgenda);
router.delete('/:id', agendaController.eliminarAgenda);

module.exports = router;
