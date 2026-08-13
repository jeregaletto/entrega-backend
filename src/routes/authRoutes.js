const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verificarToken } = require('../middlewares/authMiddleware');

// Endpoint público para obtener coberturas
router.get('/coberturas', authController.getCoberturas);

// Endpoint público para registro de usuario
router.post('/registro', authController.registro);

// Endpoint público para login de usuario
router.post('/login', authController.login);

// Endpoint protegido para obtener datos del perfil del usuario autenticado
router.get('/perfil', verificarToken, authController.getPerfil);

module.exports = router;
