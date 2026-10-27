// src/routes/especialidadRoutes.js
const express = require('express');
const router = express.Router();
const especialidadController = require('../controllers/especialidadController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

// Todas las rutas de especialidades requieren autenticación previa
router.use(verificarToken);

// GET accesible para cualquier usuario autenticado
router.get('/', especialidadController.getAllEspecialidades);
router.get('/:id', especialidadController.getEspecialidadById);

// POST, PUT y DELETE restringidos únicamente a usuarios con rol 'admin'
router.post('/', verificarRol('admin'), especialidadController.createEspecialidad);
router.put('/:id', verificarRol('admin'), especialidadController.updateEspecialidad);
router.delete('/:id', verificarRol('admin'), especialidadController.deleteEspecialidad);

module.exports = router;
