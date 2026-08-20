const express = require('express');
const router = express.Router();
const coberturaController = require('../controllers/coberturaController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

// Servicio de solo lectura, público, reutilizable desde el registro de pacientes.
// Se declara antes del middleware de rol para que no quede protegido.
router.get('/disponibles', coberturaController.listarCoberturas);

// El resto del CRUD es exclusivo del rol administrador
router.use(verificarToken, verificarRol('administrador'));

router.get('/', coberturaController.listarCoberturas);
router.get('/:id', coberturaController.obtenerCobertura);
router.post('/', coberturaController.crearCobertura);
router.put('/:id', coberturaController.actualizarCobertura);
router.delete('/:id', coberturaController.eliminarCobertura);

module.exports = router;
