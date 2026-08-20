const pool = require('../config/db');

/**
 * Servicio de solo lectura de coberturas.
 * Se reutiliza desde el registro de pacientes (semana 1) y desde el CRUD
 * de coberturas (semana 2) para no repetir la consulta en cada controlador.
 */

// Lista todas las coberturas disponibles
const listarCoberturas = async () => {
  const [rows] = await pool.query('SELECT id, nombre FROM cobertura ORDER BY nombre ASC');
  return rows;
};

// Devuelve una cobertura por id, o null si no existe
const obtenerCoberturaPorId = async (id) => {
  const [rows] = await pool.query('SELECT id, nombre FROM cobertura WHERE id = ?', [id]);
  return rows.length > 0 ? rows[0] : null;
};

module.exports = {
  listarCoberturas,
  obtenerCoberturaPorId
};
