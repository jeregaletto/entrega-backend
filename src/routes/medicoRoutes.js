// src/routes/medicoRoutes.js
const express = require('express');
const router = express.Router();
const medicoController = require('../controllers/medicoController');
const { verificarToken } = require('../middlewares/authMiddleware');

// Todas las rutas de médicos requieren autenticación previa (cualquier rol)
router.use(verificarToken);

router.get('/', medicoController.getAllMedicos);
router.get('/:id', medicoController.getMedicoById);

module.exports = router;
