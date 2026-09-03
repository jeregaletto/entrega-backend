// src/routes/especialidadRoutes.js
const express = require('express');
const router = express.Router();
const especialidadController = require('../controllers/especialidadController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');
const { auditar } = require('../middlewares/auditoriaMiddleware');

// Todas las rutas de especialidades están restringidas únicamente a usuarios con rol 'admin'
router.use(verificarToken, verificarRol('admin'));

// Auditoría automática de altas, bajas y modificaciones sobre especialidad
router.use(auditar('especialidad'));

router.get('/', especialidadController.getAllEspecialidades);
router.get('/:id', especialidadController.getEspecialidadById);
router.post('/', especialidadController.createEspecialidad);
router.put('/:id', especialidadController.updateEspecialidad);
router.delete('/:id', especialidadController.deleteEspecialidad);

module.exports = router;
