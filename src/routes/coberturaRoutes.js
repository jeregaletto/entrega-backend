// src/routes/coberturaRoutes.js
const express = require('express');
const router = express.Router();
const coberturaController = require('../controllers/coberturaController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');
const { auditar } = require('../middlewares/auditoriaMiddleware');

// Rutas públicas (para consulta general y registro de pacientes)
router.get('/', coberturaController.getAllCoberturas);
router.get('/:id', coberturaController.getCoberturaById);

// Rutas protegidas solo para rol 'admin'
router.post('/', verificarToken, verificarRol('admin'), auditar('cobertura'), coberturaController.createCobertura);
router.put('/:id', verificarToken, verificarRol('admin'), auditar('cobertura'), coberturaController.updateCobertura);
router.delete('/:id', verificarToken, verificarRol('admin'), auditar('cobertura'), coberturaController.deleteCobertura);

module.exports = router;
