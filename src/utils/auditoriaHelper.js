// src/utils/auditoriaHelper.js
const pool = require('../config/db');

/**
 * Función auxiliar para registrar una acción en la tabla `log_auditoria`.
 * Implementación "fire and forget" con try/catch interno: si la inserción
 * de auditoría falla, NO interrumpe ni revierte el flujo de la operación principal.
 *
 * @param {number} id_usuario - ID del usuario que ejecuta la acción (FK a `usuario.id`).
 * @param {'ALTA'|'BAJA'|'MODIFICACION'} accion - Acción realizada.
 * @param {string} entidad - Entidad afectada (ej: 'sede', 'especialidad', 'cobertura', 'usuario').
 * @param {number|null} id_entidad - ID del registro afectado en la entidad.
 * @param {string|null} detalle - Detalle descriptivo breve de la acción.
 * @returns {Promise<number|null>} ID del registro de auditoría insertado o null si falló.
 */
const registrarAuditoria = async (id_usuario, accion, entidad, id_entidad = null, detalle = null) => {
  try {
    if (!id_usuario || !accion || !entidad) {
      console.warn('Advertencia: Parámetros obligatorios faltantes para registrar auditoría (id_usuario, accion, entidad).');
      return null;
    }

    const [result] = await pool.query(
      `INSERT INTO log_auditoria (id_usuario, accion, entidad, id_entidad, detalle)
       VALUES (?, ?, ?, ?, ?)`,
      [id_usuario, accion, entidad, id_entidad !== undefined ? id_entidad : null, detalle !== undefined ? detalle : null]
    );

    return result.insertId;
  } catch (error) {
    console.error('Error al registrar log de auditoría en la base de datos:', error);
    // Operación no bloqueante: retornar null para preservar la continuidad del flujo principal
    return null;
  }
};

module.exports = {
  registrarAuditoria
};
