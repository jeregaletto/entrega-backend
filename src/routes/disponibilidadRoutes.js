// src/routes/disponibilidadRoutes.js
const express = require('express');
const router = express.Router();
const disponibilidadController = require('../controllers/disponibilidadController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

// Proteger todas las rutas con token de autenticación
router.use(verificarToken);

// Accesible para 'paciente' (para solicitar turno) y 'operador' (para gestionarlos)
router.use(verificarRol('paciente', 'operador'));

router.get('/fechas', disponibilidadController.getFechasDisponibles);
router.get('/horarios', disponibilidadController.getHorariosDisponibles);

module.exports = router;
