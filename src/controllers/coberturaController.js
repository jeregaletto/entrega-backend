// src/controllers/coberturaController.js
const pool = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');
const { registrarAuditoria } = require('../utils/auditoriaHelper');

const esIdValido = (id) => Number.isInteger(Number(id)) && Number(id) > 0;

// GET /coberturas - Listar todas las coberturas (Público / Accesible sin rol admin)
const getAllCoberturas = async (req, res) => {
  try {
    const [coberturas] = await pool.query('SELECT id, nombre FROM cobertura ORDER BY id ASC');
    return sendResponse(res, 200, 'Lista de coberturas obtenida con éxito', coberturas);
  } catch (error) {
    console.error('Error en getAllCoberturas:', error);
    return sendResponse(res, 500, 'Error al obtener la lista de coberturas', null);
  }
};

// GET /coberturas/:id - Obtener cobertura por ID
const getCoberturaById = async (req, res) => {
  const { id } = req.params;

  if (!esIdValido(id)) {
    return sendResponse(res, 400, 'El ID de la cobertura debe ser un número entero positivo.', null);
  }

  try {
    const [rows] = await pool.query('SELECT id, nombre FROM cobertura WHERE id = ?', [id]);
    if (rows.length === 0) {
      return sendResponse(res, 404, 'Cobertura no encontrada', null);
    }
    return sendResponse(res, 200, 'Cobertura obtenida con éxito', rows[0]);
  } catch (error) {
    console.error('Error en getCoberturaById:', error);
    return sendResponse(res, 500, 'Error al obtener la cobertura', null);
  }
};

// POST /coberturas - Crear cobertura (Solo Admin)
const createCobertura = async (req, res) => {
  const { nombre } = req.body;
  const nombreTrim = typeof nombre === 'string' ? nombre.trim() : '';

  if (!nombreTrim) {
    return sendResponse(res, 400, 'El nombre de la cobertura es obligatorio.', null);
  }
  if (nombreTrim.length > 30) {
    return sendResponse(res, 400, 'El nombre de la cobertura no puede superar los 30 caracteres.', null);
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO cobertura (nombre) VALUES (?)',
      [nombreTrim]
    );

    // Registrar log de auditoría (ALTA)
    await registrarAuditoria(
      req.user.id,
      'ALTA',
      'cobertura',
      result.insertId,
      `Alta de cobertura: ${nombreTrim}`
    );

    return sendResponse(res, 201, 'Cobertura creada exitosamente', {
      id: result.insertId,
      nombre: nombreTrim
    });
  } catch (error) {
    console.error('Error en createCobertura:', error);
    return sendResponse(res, 500, 'Error interno al crear la cobertura', null);
  }
};

// PUT /coberturas/:id - Actualizar cobertura (Solo Admin)
const updateCobertura = async (req, res) => {
  const { id } = req.params;

  if (!esIdValido(id)) {
    return sendResponse(res, 400, 'El ID de la cobertura debe ser un número entero positivo.', null);
  }

  const { nombre } = req.body;
  const nombreTrim = typeof nombre === 'string' ? nombre.trim() : '';

  if (!nombreTrim) {
    return sendResponse(res, 400, 'El nombre de la cobertura es obligatorio para actualizar.', null);
  }
  if (nombreTrim.length > 30) {
    return sendResponse(res, 400, 'El nombre de la cobertura no puede superar los 30 caracteres.', null);
  }

  try {
    const [existing] = await pool.query('SELECT id FROM cobertura WHERE id = ?', [id]);
    if (existing.length === 0) {
      return sendResponse(res, 404, 'Cobertura no encontrada', null);
    }

    await pool.query('UPDATE cobertura SET nombre = ? WHERE id = ?', [nombreTrim, id]);

    // Registrar log de auditoría (MODIFICACION)
    await registrarAuditoria(
      req.user.id,
      'MODIFICACION',
      'cobertura',
      Number(id),
      `Modificación de cobertura id=${id} (${nombreTrim})`
    );

    return sendResponse(res, 200, 'Cobertura actualizada exitosamente', {
      id: Number(id),
      nombre: nombreTrim
    });
  } catch (error) {
    console.error('Error en updateCobertura:', error);
    return sendResponse(res, 500, 'Error interno al actualizar la cobertura', null);
  }
};

// DELETE /coberturas/:id - Eliminar cobertura (Solo Admin)
const deleteCobertura = async (req, res) => {
  const { id } = req.params;

  if (!esIdValido(id)) {
    return sendResponse(res, 400, 'El ID de la cobertura debe ser un número entero positivo.', null);
  }

  try {
    const [existing] = await pool.query('SELECT id FROM cobertura WHERE id = ?', [id]);
    if (existing.length === 0) {
      return sendResponse(res, 404, 'Cobertura no encontrada', null);
    }

    // Verificar si existen usuarios con esta cobertura
    const [usuarios] = await pool.query('SELECT COUNT(*) AS count FROM usuario WHERE id_cobertura = ?', [id]);
    if (usuarios[0].count > 0) {
      return sendResponse(res, 400, `No se puede eliminar la cobertura: tiene ${usuarios[0].count} usuario(s) asociado(s).`, null);
    }

    // Verificar si existen turnos con esta cobertura
    const [turnos] = await pool.query('SELECT COUNT(*) AS count FROM turno WHERE id_cobertura = ?', [id]);
    if (turnos[0].count > 0) {
      return sendResponse(res, 400, `No se puede eliminar la cobertura: tiene ${turnos[0].count} turno(s) asociado(s).`, null);
    }

    await pool.query('DELETE FROM cobertura WHERE id = ?', [id]);

    // Registrar log de auditoría (BAJA)
    await registrarAuditoria(
      req.user.id,
      'BAJA',
      'cobertura',
      Number(id),
      `Baja de cobertura id=${id}`
    );

    return sendResponse(res, 200, 'Cobertura eliminada exitosamente', { id: Number(id) });
  } catch (error) {
    console.error('Error en deleteCobertura:', error);
    return sendResponse(res, 500, 'Error interno al eliminar la cobertura', null);
  }
};

module.exports = {
  getAllCoberturas,
  getCoberturaById,
  createCobertura,
  updateCobertura,
  deleteCobertura
};
