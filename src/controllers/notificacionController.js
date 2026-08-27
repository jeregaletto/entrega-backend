// src/controllers/notificacionController.js
const pool = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');

/**
 * Las notificaciones NO se crean desde un endpoint público: se generan
 * internamente con el helper `crearNotificacion` cada vez que ocurre un evento
 * de turno (confirmación, cancelación o atención).
 *
 * Este controlador expone únicamente la consulta y la marca de lectura,
 * siempre acotadas al usuario autenticado.
 */

// GET /notificaciones?leida=0|1 - Notificaciones del usuario autenticado
const getNotificaciones = async (req, res) => {
  const usuario = req.user;
  const { leida } = req.query;

  if (leida !== undefined && leida !== '0' && leida !== '1') {
    return sendResponse(res, 400, 'El filtro leida debe ser 0 (no leídas) o 1 (leídas).', null);
  }

  try {
    const filtros = ['n.id_usuario = ?'];
    const params = [usuario.id];

    if (leida !== undefined) {
      filtros.push('n.leida = ?');
      params.push(Number(leida));
    }

    // Orden descendente por fecha: la notificación más reciente aparece primero
    const [notificaciones] = await pool.query(
      `SELECT n.id,
              n.id_usuario,
              n.tipo,
              n.mensaje,
              DATE_FORMAT(n.fecha, '%Y-%m-%d %H:%i:%s') AS fecha,
              n.leida
       FROM notificacion n
       WHERE ${filtros.join(' AND ')}
       ORDER BY n.fecha DESC, n.id DESC`,
      params
    );

    // Se informa el total sin leer para que el front pueda mostrar el contador
    const [[{ no_leidas }]] = await pool.query(
      'SELECT COUNT(*) AS no_leidas FROM notificacion WHERE id_usuario = ? AND leida = 0',
      [usuario.id]
    );

    return sendResponse(res, 200, 'Notificaciones obtenidas con éxito', {
      no_leidas,
      total: notificaciones.length,
      notificaciones
    });
  } catch (error) {
    console.error('Error en getNotificaciones:', error);
    return sendResponse(res, 500, 'Error interno al obtener las notificaciones', null);
  }
};

// PUT /notificaciones/:id/leer - Marcar una notificación propia como leída
const marcarNotificacionLeida = async (req, res) => {
  const { id } = req.params;
  const usuario = req.user;

  if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
    return sendResponse(res, 400, 'El id de la notificación debe ser un número entero positivo.', null);
  }

  try {
    const [notificaciones] = await pool.query(
      'SELECT id, id_usuario, tipo, mensaje, leida FROM notificacion WHERE id = ?',
      [id]
    );

    if (notificaciones.length === 0) {
      return sendResponse(res, 404, 'Notificación no encontrada.', null);
    }

    const notificacion = notificaciones[0];

    // Cada usuario solo puede marcar como leídas sus propias notificaciones
    if (Number(notificacion.id_usuario) !== Number(usuario.id)) {
      return sendResponse(res, 403, 'Acceso denegado. Solo puede marcar como leídas sus propias notificaciones.', null);
    }

    if (Number(notificacion.leida) === 1) {
      return sendResponse(res, 200, 'La notificación ya se encontraba marcada como leída', {
        id: Number(id),
        leida: 1
      });
    }

    await pool.query('UPDATE notificacion SET leida = 1 WHERE id = ?', [id]);

    return sendResponse(res, 200, 'Notificación marcada como leída exitosamente', {
      id: Number(id),
      tipo: notificacion.tipo,
      mensaje: notificacion.mensaje,
      leida: 1
    });
  } catch (error) {
    console.error('Error en marcarNotificacionLeida:', error);
    return sendResponse(res, 500, 'Error interno al marcar la notificación como leída', null);
  }
};

module.exports = {
  getNotificaciones,
  marcarNotificacionLeida
};
