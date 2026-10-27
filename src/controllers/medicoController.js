// src/controllers/medicoController.js
const pool = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');

const esIdValido = (id) => Number.isInteger(Number(id)) && Number(id) > 0;

// GET /medicos - Listado de médicos con filtros opcionales (especialidad, sede)
const getAllMedicos = async (req, res) => {
  const { especialidad, sede } = req.query;

  if (especialidad !== undefined && !esIdValido(especialidad)) {
    return sendResponse(res, 400, 'El filtro especialidad debe ser un número entero positivo.', null);
  }

  if (sede !== undefined && !esIdValido(sede)) {
    return sendResponse(res, 400, 'El filtro sede debe ser un número entero positivo.', null);
  }

  try {
    const filtros = ["u.rol = 'medico'"];
    const params = [];

    if (especialidad !== undefined) {
      filtros.push('u.id IN (SELECT me.id_medico FROM medico_especialidad me WHERE me.id_especialidad = ?)');
      params.push(Number(especialidad));
    }

    if (sede !== undefined) {
      filtros.push('(u.id_sede = ? OR u.id IN (SELECT a.id_medico FROM agenda a WHERE a.id_sede = ?))');
      params.push(Number(sede), Number(sede));
    }

    const queryMedicos = `
      SELECT u.id, u.nombre, u.apellido, u.id_sede
      FROM usuario u
      WHERE ${filtros.join(' AND ')}
      ORDER BY u.apellido ASC, u.nombre ASC
    `;

    const [medicos] = await pool.query(queryMedicos, params);

    if (medicos.length === 0) {
      return sendResponse(res, 200, 'Médicos obtenidos con éxito', []);
    }

    const medicosIds = medicos.map((m) => m.id);

    const [especialidades] = await pool.query(
      `SELECT me.id_medico, e.id, e.descripcion
       FROM medico_especialidad me
       INNER JOIN especialidad e ON me.id_especialidad = e.id
       WHERE me.id_medico IN (?)
       ORDER BY e.descripcion ASC`,
      [medicosIds]
    );

    const espPorMedico = {};
    for (const esp of especialidades) {
      if (!espPorMedico[esp.id_medico]) {
        espPorMedico[esp.id_medico] = [];
      }
      espPorMedico[esp.id_medico].push({
        id: esp.id,
        descripcion: esp.descripcion
      });
    }

    const resultado = medicos.map((m) => ({
      id: m.id,
      nombre: m.nombre,
      apellido: m.apellido,
      id_sede: m.id_sede,
      especialidades: espPorMedico[m.id] || []
    }));

    return sendResponse(res, 200, 'Médicos obtenidos con éxito', resultado);
  } catch (error) {
    console.error('Error en getAllMedicos:', error);
    return sendResponse(res, 500, 'Error al obtener los médicos', null);
  }
};

// GET /medicos/:id - Obtener médico por ID
const getMedicoById = async (req, res) => {
  const { id } = req.params;

  if (!esIdValido(id)) {
    return sendResponse(res, 400, 'El ID del médico debe ser un número entero positivo.', null);
  }

  try {
    const [medicos] = await pool.query(
      "SELECT u.id, u.nombre, u.apellido, u.id_sede FROM usuario u WHERE u.id = ? AND u.rol = 'medico'",
      [id]
    );

    if (medicos.length === 0) {
      return sendResponse(res, 404, 'Médico no encontrado', null);
    }

    const medico = medicos[0];

    const [especialidades] = await pool.query(
      `SELECT e.id, e.descripcion
       FROM medico_especialidad me
       INNER JOIN especialidad e ON me.id_especialidad = e.id
       WHERE me.id_medico = ?
       ORDER BY e.descripcion ASC`,
      [medico.id]
    );

    return sendResponse(res, 200, 'Médico obtenido con éxito', {
      id: medico.id,
      nombre: medico.nombre,
      apellido: medico.apellido,
      id_sede: medico.id_sede,
      especialidades: especialidades.map((e) => ({
        id: e.id,
        descripcion: e.descripcion
      }))
    });
  } catch (error) {
    console.error('Error en getMedicoById:', error);
    return sendResponse(res, 500, 'Error al obtener el médico', null);
  }
};

module.exports = {
  getAllMedicos,
  getMedicoById
};
