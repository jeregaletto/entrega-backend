// src/utils/notificacionHelper.js
const pool = require('../config/db');

/**
 * Función auxiliar para registrar una notificación en la base de datos.
 * Inserta un registro en la tabla `notificacion` con fecha automática y leida = 0.
 *
 * @param {number} id_usuario - ID del usuario destinatario (paciente o médico).
 * @param {string} tipo - Tipo de notificación ('turno_confirmado', 'turno_cancelado', 'turno_atendido', etc.).
 * @param {string} mensaje - Contenido descriptivo de la notificación.
 * @returns {Promise<number|null>} ID de la notificación creada o null si hubo error.
 */
const crearNotificacion = async (id_usuario, tipo, mensaje) => {
  try {
    if (!id_usuario || !tipo || !mensaje) {
      console.warn('Advertencia: Parámetros insuficientes para crear notificación.');
      return null;
    }

    const [result] = await pool.query(
      `INSERT INTO notificacion (id_usuario, tipo, mensaje, fecha, leida)
       VALUES (?, ?, ?, NOW(), 0)`,
      [id_usuario, tipo, mensaje]
    );

    return result.insertId;
  } catch (error) {
    console.error('Error al insertar notificación en la base de datos:', error);
    // No interrumpir el flujo transaccional principal si la notificación falla
    return null;
  }
};

module.exports = {
  crearNotificacion
};
