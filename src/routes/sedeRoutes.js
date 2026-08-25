// src/routes/sedeRoutes.js
const express = require('express');
const router = express.Router();
const sedeController = require('../controllers/sedeController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

// Todas las rutas de sedes están restringidas únicamente a usuarios con rol 'admin'
router.use(verificarToken, verificarRol('admin'));

router.get('/', sedeController.getAllSedes);
router.get('/:id', sedeController.getSedeById);
router.post('/', sedeController.createSede);
router.put('/:id', sedeController.updateSede);
router.delete('/:id', sedeController.deleteSede);

module.exports = router;
