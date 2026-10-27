// src/routes/sedeRoutes.js
const express = require('express');
const router = express.Router();
const sedeController = require('../controllers/sedeController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

// Todas las rutas de sedes requieren autenticación previa
router.use(verificarToken);

// GET accesible para cualquier usuario autenticado
router.get('/', sedeController.getAllSedes);
router.get('/:id', sedeController.getSedeById);

// POST, PUT y DELETE restringidos únicamente a usuarios con rol 'admin'
router.post('/', verificarRol('admin'), sedeController.createSede);
router.put('/:id', verificarRol('admin'), sedeController.updateSede);
router.delete('/:id', verificarRol('admin'), sedeController.deleteSede);

module.exports = router;
