// src/controllers/auditoriaController.js
const pool = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');

/**
 * Valida que una fecha tenga formato 'YYYY-MM-DD' y corresponda a una fecha de calendario válida.
 */
const esFechaValida = (valor) => {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [anio, mes, dia] = valor.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
};

// GET /auditoria - Consulta de logs de auditoría con filtros opcionales y paginación (Solo Admin)
const getAuditoria = async (req, res) => {
  const { usuario, id_usuario, entidad, fecha_desde, fecha_hasta, page = 1, limit = 10 } = req.query;
  const usuarioFiltro = usuario || id_usuario;

  // Validación de filtros page y limit
  const pageNum = Number(page);
  const limitNum = Number(limit);

  if (!Number.isInteger(pageNum) || pageNum <= 0) {
    return sendResponse(res, 400, 'El parámetro page debe ser un número entero positivo.', null);
  }

  if (!Number.isInteger(limitNum) || limitNum <= 0 || limitNum > 100) {
    return sendResponse(res, 400, 'El parámetro limit debe ser un número entero positivo entre 1 y 100.', null);
  }

  // Validación de filtro usuario
  if (usuarioFiltro !== undefined && !(Number.isInteger(Number(usuarioFiltro)) && Number(usuarioFiltro) > 0)) {
    return sendResponse(res, 400, 'El parámetro usuario debe ser un número entero positivo.', null);
  }

  // Validación de filtros de fecha
  if (fecha_desde && !esFechaValida(fecha_desde)) {
    return sendResponse(res, 400, 'El parámetro fecha_desde debe tener el formato YYYY-MM-DD y ser una fecha válida.', null);
  }

  if (fecha_hasta && !esFechaValida(fecha_hasta)) {
    return sendResponse(res, 400, 'El parámetro fecha_hasta debe tener el formato YYYY-MM-DD y ser una fecha válida.', null);
  }

  if (fecha_desde && fecha_hasta && fecha_desde > fecha_hasta) {
    return sendResponse(res, 400, 'El parámetro fecha_desde no puede ser posterior a fecha_hasta.', null);
  }

  try {
    const filtros = ['1=1'];
    const params = [];

    if (usuarioFiltro) {
      filtros.push('l.id_usuario = ?');
      params.push(Number(usuarioFiltro));
    }

    if (entidad && typeof entidad === 'string' && entidad.trim()) {
      filtros.push('LOWER(l.entidad) = LOWER(?)');
      params.push(entidad.trim());
    }

    if (fecha_desde) {
      filtros.push('l.fecha >= ?');
      params.push(`${fecha_desde} 00:00:00`);
    }

    if (fecha_hasta) {
      filtros.push('l.fecha <= ?');
      params.push(`${fecha_hasta} 23:59:59`);
    }

    const whereClause = filtros.join(' AND ');

    // Conteo total para paginación con los mismos filtros
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM log_auditoria l
      INNER JOIN usuario u ON l.id_usuario = u.id
      WHERE ${whereClause}
    `;
    const [countRows] = await pool.query(countQuery, params);
    const total = Number(countRows[0].total) || 0;

    const offset = (pageNum - 1) * limitNum;

    const query = `
      SELECT 
        l.id,
        l.id_usuario,
        CONCAT(u.apellido, ', ', u.nombre) AS usuario_nombre_completo,
        u.nombre AS usuario_nombre,
        u.apellido AS usuario_apellido,
        u.email AS usuario_email,
        u.rol AS usuario_rol,
        l.accion,
        l.entidad,
        l.id_entidad,
        l.detalle,
        DATE_FORMAT(l.fecha, '%Y-%m-%d %H:%i:%s') AS fecha
      FROM log_auditoria l
      INNER JOIN usuario u ON l.id_usuario = u.id
      WHERE ${whereClause}
      ORDER BY l.fecha DESC, l.id DESC
      LIMIT ? OFFSET ?
    `;

    const [logs] = await pool.query(query, [...params, limitNum, offset]);

    return sendResponse(res, 200, 'Registros de auditoría obtenidos con éxito', {
      items: logs,
      total,
      page: pageNum,
      limit: limitNum
    });
  } catch (error) {
    console.error('Error en getAuditoria:', error);
    return sendResponse(res, 500, 'Error interno al consultar los logs de auditoría', null);
  }
};

module.exports = {
  getAuditoria
};
