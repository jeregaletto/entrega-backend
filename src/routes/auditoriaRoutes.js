// src/routes/auditoriaRoutes.js
const express = require('express');
const router = express.Router();
const auditoriaController = require('../controllers/auditoriaController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

// El acceso a los logs de auditoría es exclusivo para usuarios con rol 'admin'
router.use(verificarToken, verificarRol('admin'));

// GET /auditoria - Consulta de logs de auditoría
router.get('/', auditoriaController.getAuditoria);

module.exports = router;
