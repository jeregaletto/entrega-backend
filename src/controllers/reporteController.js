// src/controllers/reporteController.js
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

/**
 * Valida los parámetros de consulta fecha_desde y fecha_hasta.
 * Retorna un mensaje de error si no son válidos, o null si la validación es exitosa.
 */
const validarRangoFechas = (fecha_desde, fecha_hasta) => {
  if (fecha_desde && !esFechaValida(fecha_desde)) {
    return 'El parámetro fecha_desde debe tener el formato YYYY-MM-DD y ser una fecha válida.';
  }
  if (fecha_hasta && !esFechaValida(fecha_hasta)) {
    return 'El parámetro fecha_hasta debe tener el formato YYYY-MM-DD y ser una fecha válida.';
  }
  if (fecha_desde && fecha_hasta && fecha_desde > fecha_hasta) {
    return 'El parámetro fecha_desde no puede ser posterior a fecha_hasta.';
  }
  return null;
};

/**
 * Construye la cláusula WHERE y el arreglo de parámetros para el filtro de fechas sobre turno.fecha.
 */
const construirFiltroFechas = (fecha_desde, fecha_hasta) => {
  const condiciones = [];
  const params = [];

  if (fecha_desde) {
    condiciones.push('t.fecha >= ?');
    params.push(fecha_desde);
  }

  if (fecha_hasta) {
    condiciones.push('t.fecha <= ?');
    params.push(fecha_hasta);
  }

  return {
    whereClause: condiciones.length > 0 ? ` AND ${condiciones.join(' AND ')}` : '',
    params
  };
};

// a) GET /reportes/turnos-por-especialidad
const getTurnosPorEspecialidad = async (req, res) => {
  const { fecha_desde, fecha_hasta } = req.query;

  const errorValidacion = validarRangoFechas(fecha_desde, fecha_hasta);
  if (errorValidacion) {
    return sendResponse(res, 400, errorValidacion, null);
  }

  try {
    const { whereClause, params } = construirFiltroFechas(fecha_desde, fecha_hasta);

    const query = `
      SELECT 
        e.id AS id_especialidad,
        e.descripcion,
        CAST(COUNT(t.id) AS SIGNED) AS cantidad_turnos
      FROM turno t
      INNER JOIN agenda a ON t.id_agenda = a.id
      INNER JOIN especialidad e ON a.id_especialidad = e.id
      WHERE 1=1 ${whereClause}
      GROUP BY e.id, e.descripcion
      ORDER BY cantidad_turnos DESC, e.descripcion ASC
    `;

    const [rows] = await pool.query(query, params);

    return sendResponse(res, 200, 'Reporte de turnos por especialidad obtenido con éxito', rows);
  } catch (error) {
    console.error('Error en getTurnosPorEspecialidad:', error);
    return sendResponse(res, 500, 'Error interno al generar el reporte de turnos por especialidad', null);
  }
};

// b) GET /reportes/turnos-por-sede
const getTurnosPorSede = async (req, res) => {
  const { fecha_desde, fecha_hasta } = req.query;

  const errorValidacion = validarRangoFechas(fecha_desde, fecha_hasta);
  if (errorValidacion) {
    return sendResponse(res, 400, errorValidacion, null);
  }

  try {
    const { whereClause, params } = construirFiltroFechas(fecha_desde, fecha_hasta);

    const query = `
      SELECT 
        s.id AS id_sede,
        s.nombre,
        CAST(COUNT(t.id) AS SIGNED) AS cantidad_turnos
      FROM turno t
      INNER JOIN agenda a ON t.id_agenda = a.id
      INNER JOIN sede s ON a.id_sede = s.id
      WHERE 1=1 ${whereClause}
      GROUP BY s.id, s.nombre
      ORDER BY cantidad_turnos DESC, s.nombre ASC
    `;

    const [rows] = await pool.query(query, params);

    return sendResponse(res, 200, 'Reporte de turnos por sede obtenido con éxito', rows);
  } catch (error) {
    console.error('Error en getTurnosPorSede:', error);
    return sendResponse(res, 500, 'Error interno al generar el reporte de turnos por sede', null);
  }
};

// c) GET /reportes/ranking-medicos
const getRankingMedicos = async (req, res) => {
  const { fecha_desde, fecha_hasta } = req.query;

  const errorValidacion = validarRangoFechas(fecha_desde, fecha_hasta);
  if (errorValidacion) {
    return sendResponse(res, 400, errorValidacion, null);
  }

  try {
    const { whereClause, params } = construirFiltroFechas(fecha_desde, fecha_hasta);

    const query = `
      SELECT 
        u.id AS id_medico,
        u.nombre,
        u.apellido,
        CAST(COUNT(t.id) AS SIGNED) AS cantidad_atendidos
      FROM turno t
      INNER JOIN agenda a ON t.id_agenda = a.id
      INNER JOIN usuario u ON a.id_medico = u.id
      WHERE t.estado = 'atendido' ${whereClause}
      GROUP BY u.id, u.nombre, u.apellido
      ORDER BY cantidad_atendidos DESC, u.apellido ASC, u.nombre ASC
    `;

    const [rows] = await pool.query(query, params);

    return sendResponse(res, 200, 'Ranking de médicos por turnos atendidos obtenido con éxito', rows);
  } catch (error) {
    console.error('Error en getRankingMedicos:', error);
    return sendResponse(res, 500, 'Error interno al generar el ranking de médicos', null);
  }
};

// d) GET /reportes/tasa-cancelacion
const getTasaCancelacion = async (req, res) => {
  const { fecha_desde, fecha_hasta } = req.query;

  const errorValidacion = validarRangoFechas(fecha_desde, fecha_hasta);
  if (errorValidacion) {
    return sendResponse(res, 400, errorValidacion, null);
  }

  try {
    const { whereClause, params } = construirFiltroFechas(fecha_desde, fecha_hasta);

    const query = `
      SELECT 
        CAST(COUNT(*) AS SIGNED) AS total_turnos,
        CAST(SUM(CASE WHEN t.estado = 'cancelado' THEN 1 ELSE 0 END) AS SIGNED) AS turnos_cancelados
      FROM turno t
      WHERE 1=1 ${whereClause}
    `;

    const [rows] = await pool.query(query, params);

    const totalTurnos = Number(rows[0].total_turnos) || 0;
    const turnosCancelados = Number(rows[0].turnos_cancelados) || 0;

    // Cálculo de la tasa como número decimal entre 0 y 1 (redondeada a 4 decimales)
    const tasaCancelacion = totalTurnos > 0 
      ? Number((turnosCancelados / totalTurnos).toFixed(4)) 
      : 0;

    return sendResponse(res, 200, 'Tasa de cancelación obtenida con éxito', {
      total_turnos: totalTurnos,
      turnos_cancelados: turnosCancelados,
      tasa_cancelacion: tasaCancelacion
    });
  } catch (error) {
    console.error('Error en getTasaCancelacion:', error);
    return sendResponse(res, 500, 'Error interno al calcular la tasa de cancelación', null);
  }
};

module.exports = {
  getTurnosPorEspecialidad,
  getTurnosPorSede,
  getRankingMedicos,
  getTasaCancelacion
};
