// src/controllers/especialidadController.js
const pool = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');

// GET /especialidades - Listar todas las especialidades
const getAllEspecialidades = async (req, res) => {
  try {
    const [especialidades] = await pool.query('SELECT id, descripcion FROM especialidad ORDER BY id ASC');
    return sendResponse(res, 200, 'Lista de especialidades obtenida con éxito', especialidades);
  } catch (error) {
    console.error('Error en getAllEspecialidades:', error);
    return sendResponse(res, 500, 'Error al obtener la lista de especialidades', null);
  }
};

// GET /especialidades/:id - Obtener especialidad por ID
const getEspecialidadById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT id, descripcion FROM especialidad WHERE id = ?', [id]);
    if (rows.length === 0) {
      return sendResponse(res, 404, 'Especialidad no encontrada', null);
    }
    return sendResponse(res, 200, 'Especialidad obtenida con éxito', rows[0]);
  } catch (error) {
    console.error('Error en getEspecialidadById:', error);
    return sendResponse(res, 500, 'Error al obtener la especialidad', null);
  }
};

// POST /especialidades - Crear especialidad
const createEspecialidad = async (req, res) => {
  const { descripcion } = req.body;

  if (!descripcion) {
    return sendResponse(res, 400, 'La descripción de la especialidad es obligatoria', null);
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO especialidad (descripcion) VALUES (?)',
      [descripcion]
    );


    return sendResponse(res, 201, 'Especialidad creada exitosamente', {
      id: result.insertId,
      descripcion
    });
  } catch (error) {
    console.error('Error en createEspecialidad:', error);
    return sendResponse(res, 500, 'Error interno al crear la especialidad', null);
  }
};

// PUT /especialidades/:id - Actualizar especialidad
const updateEspecialidad = async (req, res) => {
  const { id } = req.params;
  const { descripcion } = req.body;

  if (!descripcion) {
    return sendResponse(res, 400, 'La descripción de la especialidad es obligatoria para actualizar', null);
  }

  try {
    const [existing] = await pool.query('SELECT id FROM especialidad WHERE id = ?', [id]);
    if (existing.length === 0) {
      return sendResponse(res, 404, 'Especialidad no encontrada', null);
    }

    await pool.query(
      'UPDATE especialidad SET descripcion = ? WHERE id = ?',
      [descripcion, id]
    );


    return sendResponse(res, 200, 'Especialidad actualizada exitosamente', {
      id: Number(id),
      descripcion
    });
  } catch (error) {
    console.error('Error en updateEspecialidad:', error);
    return sendResponse(res, 500, 'Error interno al actualizar la especialidad', null);
  }
};

// DELETE /especialidades/:id - Eliminar especialidad
const deleteEspecialidad = async (req, res) => {
  const { id } = req.params;

  try {
    const [existing] = await pool.query('SELECT id FROM especialidad WHERE id = ?', [id]);
    if (existing.length === 0) {
      return sendResponse(res, 404, 'Especialidad no encontrada', null);
    }

    // Verificar en medico_especialidad
    const [medicos] = await pool.query('SELECT COUNT(*) AS count FROM medico_especialidad WHERE id_especialidad = ?', [id]);
    if (medicos[0].count > 0) {
      return sendResponse(res, 400, `No se puede eliminar la especialidad: tiene ${medicos[0].count} médico(s) asignado(s).`, null);
    }

    // Verificar en agenda
    const [agendas] = await pool.query('SELECT COUNT(*) AS count FROM agenda WHERE id_especialidad = ?', [id]);
    if (agendas[0].count > 0) {
      return sendResponse(res, 400, `No se puede eliminar la especialidad: tiene ${agendas[0].count} registro(s) de agenda asociado(s).`, null);
    }

    await pool.query('DELETE FROM especialidad WHERE id = ?', [id]);


    return sendResponse(res, 200, 'Especialidad eliminada exitosamente', { id: Number(id) });
  } catch (error) {
    console.error('Error en deleteEspecialidad:', error);
    return sendResponse(res, 500, 'Error interno al eliminar la especialidad', null);
  }
};

module.exports = {
  getAllEspecialidades,
  getEspecialidadById,
  createEspecialidad,
  updateEspecialidad,
  deleteEspecialidad
};
