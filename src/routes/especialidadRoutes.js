const express = require('express');
const router = express.Router();
const especialidadController = require('../controllers/especialidadController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

// Todos los endpoints de especialidades son exclusivos del rol administrador
router.use(verificarToken, verificarRol('administrador'));

router.get('/', especialidadController.listarEspecialidades);
router.get('/:id', especialidadController.obtenerEspecialidad);
router.post('/', especialidadController.crearEspecialidad);
router.put('/:id', especialidadController.actualizarEspecialidad);
router.delete('/:id', especialidadController.eliminarEspecialidad);

module.exports = router;
