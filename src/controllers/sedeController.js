// src/controllers/sedeController.js
const pool = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');
const { registrarAuditoria } = require('../utils/auditoriaHelper');

const esIdValido = (id) => Number.isInteger(Number(id)) && Number(id) > 0;

// GET /sedes - Listar todas las sedes
const getAllSedes = async (req, res) => {
  try {
    const [sedes] = await pool.query('SELECT id, nombre, direccion, telefono FROM sede ORDER BY id ASC');
    return sendResponse(res, 200, 'Lista de sedes obtenida con éxito', sedes);
  } catch (error) {
    console.error('Error en getAllSedes:', error);
    return sendResponse(res, 500, 'Error al obtener la lista de sedes', null);
  }
};

// GET /sedes/:id - Obtener sede por ID
const getSedeById = async (req, res) => {
  const { id } = req.params;

  if (!esIdValido(id)) {
    return sendResponse(res, 400, 'El ID de la sede debe ser un número entero positivo.', null);
  }

  try {
    const [rows] = await pool.query('SELECT id, nombre, direccion, telefono FROM sede WHERE id = ?', [id]);
    if (rows.length === 0) {
      return sendResponse(res, 404, 'Sede no encontrada', null);
    }
    return sendResponse(res, 200, 'Sede obtenida con éxito', rows[0]);
  } catch (error) {
    console.error('Error en getSedeById:', error);
    return sendResponse(res, 500, 'Error al obtener la sede', null);
  }
};

// POST /sedes - Crear una nueva sede
const createSede = async (req, res) => {
  const { nombre, direccion, telefono } = req.body;

  const nombreTrim = typeof nombre === 'string' ? nombre.trim() : '';
  const direccionTrim = typeof direccion === 'string' ? direccion.trim() : '';
  const telefonoTrim = typeof telefono === 'string' ? telefono.trim() : '';

  if (!nombreTrim) {
    return sendResponse(res, 400, 'El nombre de la sede es obligatorio.', null);
  }
  if (nombreTrim.length > 50) {
    return sendResponse(res, 400, 'El nombre de la sede no puede superar los 50 caracteres.', null);
  }
  if (!direccionTrim) {
    return sendResponse(res, 400, 'La dirección de la sede es obligatoria.', null);
  }
  if (direccionTrim.length > 100) {
    return sendResponse(res, 400, 'La dirección de la sede no puede superar los 100 caracteres.', null);
  }
  if (!telefonoTrim) {
    return sendResponse(res, 400, 'El teléfono de la sede es obligatorio.', null);
  }
  if (telefonoTrim.length > 15) {
    return sendResponse(res, 400, 'El teléfono de la sede no puede superar los 15 caracteres.', null);
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO sede (nombre, direccion, telefono) VALUES (?, ?, ?)',
      [nombreTrim, direccionTrim, telefonoTrim]
    );

    // Registrar log de auditoría (ALTA)
    await registrarAuditoria(
      req.user.id,
      'ALTA',
      'sede',
      result.insertId,
      `Alta de sede: ${nombreTrim}`
    );

    return sendResponse(res, 201, 'Sede creada exitosamente', {
      id: result.insertId,
      nombre: nombreTrim,
      direccion: direccionTrim,
      telefono: telefonoTrim
    });
  } catch (error) {
    console.error('Error en createSede:', error);
    return sendResponse(res, 500, 'Error interno al crear la sede', null);
  }
};

// PUT /sedes/:id - Actualizar una sede existente
const updateSede = async (req, res) => {
  const { id } = req.params;

  if (!esIdValido(id)) {
    return sendResponse(res, 400, 'El ID de la sede debe ser un número entero positivo.', null);
  }

  const { nombre, direccion, telefono } = req.body;

  const nombreTrim = typeof nombre === 'string' ? nombre.trim() : '';
  const direccionTrim = typeof direccion === 'string' ? direccion.trim() : '';
  const telefonoTrim = typeof telefono === 'string' ? telefono.trim() : '';

  if (!nombreTrim) {
    return sendResponse(res, 400, 'El nombre de la sede es obligatorio para actualizar.', null);
  }
  if (nombreTrim.length > 50) {
    return sendResponse(res, 400, 'El nombre de la sede no puede superar los 50 caracteres.', null);
  }
  if (!direccionTrim) {
    return sendResponse(res, 400, 'La dirección de la sede es obligatoria para actualizar.', null);
  }
  if (direccionTrim.length > 100) {
    return sendResponse(res, 400, 'La dirección de la sede no puede superar los 100 caracteres.', null);
  }
  if (!telefonoTrim) {
    return sendResponse(res, 400, 'El teléfono de la sede es obligatorio para actualizar.', null);
  }
  if (telefonoTrim.length > 15) {
    return sendResponse(res, 400, 'El teléfono de la sede no puede superar los 15 caracteres.', null);
  }

  try {
    const [existing] = await pool.query('SELECT id FROM sede WHERE id = ?', [id]);
    if (existing.length === 0) {
      return sendResponse(res, 404, 'Sede no encontrada', null);
    }

    await pool.query(
      'UPDATE sede SET nombre = ?, direccion = ?, telefono = ? WHERE id = ?',
      [nombreTrim, direccionTrim, telefonoTrim, id]
    );

    // Registrar log de auditoría (MODIFICACION)
    await registrarAuditoria(
      req.user.id,
      'MODIFICACION',
      'sede',
      Number(id),
      `Modificación de sede id=${id} (${nombreTrim})`
    );

    return sendResponse(res, 200, 'Sede actualizada exitosamente', {
      id: Number(id),
      nombre: nombreTrim,
      direccion: direccionTrim,
      telefono: telefonoTrim
    });
  } catch (error) {
    console.error('Error en updateSede:', error);
    return sendResponse(res, 500, 'Error interno al actualizar la sede', null);
  }
};

// DELETE /sedes/:id - Eliminar una sede
const deleteSede = async (req, res) => {
  const { id } = req.params;

  if (!esIdValido(id)) {
    return sendResponse(res, 400, 'El ID de la sede debe ser un número entero positivo.', null);
  }

  try {
    const [existing] = await pool.query('SELECT id, nombre FROM sede WHERE id = ?', [id]);
    if (existing.length === 0) {
      return sendResponse(res, 404, 'Sede no encontrada', null);
    }

    // Verificar usuarios asociados a la sede
    const [usuarios] = await pool.query('SELECT COUNT(*) AS count FROM usuario WHERE id_sede = ?', [id]);
    if (usuarios[0].count > 0) {
      return sendResponse(res, 400, `No se puede eliminar la sede: tiene ${usuarios[0].count} usuario(s) asociado(s).`, null);
    }

    // Verificar registros en agenda asociados a la sede
    const [agendas] = await pool.query('SELECT COUNT(*) AS count FROM agenda WHERE id_sede = ?', [id]);
    if (agendas[0].count > 0) {
      return sendResponse(res, 400, `No se puede eliminar la sede: tiene ${agendas[0].count} registro(s) de agenda asociado(s).`, null);
    }

    await pool.query('DELETE FROM sede WHERE id = ?', [id]);

    // Registrar log de auditoría (BAJA)
    await registrarAuditoria(
      req.user.id,
      'BAJA',
      'sede',
      Number(id),
      `Baja de sede id=${id}`
    );

    return sendResponse(res, 200, 'Sede eliminada exitosamente', { id: Number(id) });
  } catch (error) {
    console.error('Error en deleteSede:', error);
    return sendResponse(res, 500, 'Error interno al eliminar la sede', null);
  }
};

module.exports = {
  getAllSedes,
  getSedeById,
  createSede,
  updateSede,
  deleteSede
};
