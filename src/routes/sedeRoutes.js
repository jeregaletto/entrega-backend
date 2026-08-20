const express = require('express');
const router = express.Router();
const sedeController = require('../controllers/sedeController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

// Todos los endpoints de sedes son exclusivos del rol administrador
router.use(verificarToken, verificarRol('administrador'));

router.get('/', sedeController.listarSedes);
router.get('/:id', sedeController.obtenerSede);
router.post('/', sedeController.crearSede);
router.put('/:id', sedeController.actualizarSede);
router.delete('/:id', sedeController.eliminarSede);

module.exports = router; 
