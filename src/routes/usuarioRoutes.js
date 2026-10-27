// src/routes/usuarioRoutes.js
const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

// La administración de usuarios es exclusiva para usuarios con rol 'admin'
router.use(verificarToken, verificarRol('admin'));

router.get('/', usuarioController.getAllUsuarios);
router.get('/:id', usuarioController.getUsuarioById);
router.post('/', usuarioController.createUsuario);
router.put('/:id', usuarioController.updateUsuario);

module.exports = router;
