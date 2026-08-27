// src/routes/notificacionRoutes.js
const express = require('express');
const router = express.Router();
const notificacionController = require('../controllers/notificacionController');
const { verificarToken } = require('../middlewares/authMiddleware');

// Todas las operaciones sobre notificaciones requieren autenticación.
// No se restringe por rol: cualquier usuario logueado accede únicamente a las
// suyas, y el filtro por id_usuario se aplica dentro del controlador.
router.use(verificarToken);

// 1) LISTADO DE NOTIFICACIONES (GET /notificaciones)
// Devuelve las notificaciones del usuario autenticado, de la más reciente a la más antigua
router.get('/', notificacionController.getNotificaciones);

// 2) MARCAR COMO LEÍDA (PUT /notificaciones/:id/leer)
// Solo sobre notificaciones propias
router.put('/:id/leer', notificacionController.marcarNotificacionLeida);

module.exports = router;
