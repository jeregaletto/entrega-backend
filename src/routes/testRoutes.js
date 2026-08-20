const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');
const { sendResponse } = require('../utils/responseHandler');

// Endpoint de prueba de rol admin (requiere token y rol 'admin')
router.get('/admin', verificarToken, verificarRol('administrador'), (req, res) => {
  return sendResponse(res, 200, 'Acceso concedido a la sección de administración.', {
    user: req.user,
    mensaje: 'Bienvenido Administrador a la zona restringida.'
  });
});

module.exports = router;
