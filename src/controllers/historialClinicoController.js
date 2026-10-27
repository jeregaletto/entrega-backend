// src/controllers/historialClinicoController.js
const pool = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');

// POST /historial-clinico - Registro de diagnóstico, tratamiento y observaciones por el médico
const createHistorialClinico = async (req, res) => {
  const { id_turno, diagnostico, tratamiento, observaciones } = req.body;
  const usuario = req.user;

  // Validación de campos obligatorios
  if (!id_turno || !diagnostico || !tratamiento) {
    return sendResponse(res, 400, 'Los campos id_turno, diagnostico y tratamiento son obligatorios.', null);
  }

  const diagnosticoTrim = typeof diagnostico === 'string' ? diagnostico.trim() : '';
  const tratamientoTrim = typeof tratamiento === 'string' ? tratamiento.trim() : '';
  const observacionesTrim = typeof observaciones === 'string' ? observaciones.trim() : (observaciones ? String(observaciones).trim() : '');

  if (!diagnosticoTrim || !tratamientoTrim) {
    return sendResponse(res, 400, 'Los campos id_turno, diagnostico y tratamiento son obligatorios.', null);
  }

  if (diagnosticoTrim.length > 255) {
    return sendResponse(res, 400, 'El diagnóstico no puede superar los 255 caracteres.', null);
  }

  if (tratamientoTrim.length > 255) {
    return sendResponse(res, 400, 'El tratamiento no puede superar los 255 caracteres.', null);
  }

  if (observacionesTrim.length > 255) {
    return sendResponse(res, 400, 'Las observaciones no pueden superar los 255 caracteres.', null);
  }

  try {
    // Buscar el turno e información de agenda
    const [turnos] = await pool.query(
      `SELECT t.id, t.id_agenda, t.id_paciente, t.estado, a.id_medico
       FROM turno t
       INNER JOIN agenda a ON t.id_agenda = a.id
       WHERE t.id = ?`,
      [id_turno]
    );

    if (turnos.length === 0) {
      return sendResponse(res, 404, 'Turno no encontrado.', null);
    }

    const turno = turnos[0];

    // Validar que quien intenta cargar el historial sea el médico que atendió el turno
    if (Number(turno.id_medico) !== Number(usuario.id)) {
      return sendResponse(res, 403, 'Acceso denegado. Solo el médico que atendió el turno puede registrar su historial clínico.', null);
    }

    // Validar que el turno esté en estado 'atendido'
    if (turno.estado !== 'atendido') {
      return sendResponse(res, 400, 'No se puede registrar historial clínico sobre un turno que no ha sido marcado como "atendido".', null);
    }

    // Validar que no exista un historial clínico previo para este turno
    const [historialPrevio] = await pool.query(
      'SELECT id FROM historial_clinico WHERE id_turno = ?',
      [id_turno]
    );

    if (historialPrevio.length > 0) {
      return sendResponse(res, 400, 'Ya existe un registro de historial clínico para este turno.', null);
    }

    // Insertar el nuevo registro de historial clínico
    const [result] = await pool.query(
      `INSERT INTO historial_clinico (id_turno, id_medico, id_paciente, diagnostico, tratamiento, observaciones)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id_turno,
        usuario.id,           // id_medico: el médico autenticado que atiende
        turno.id_paciente,    // id_paciente: sacado del turno, no del body
        diagnosticoTrim,
        tratamientoTrim,
        observacionesTrim || null
      ]
    );

    return sendResponse(res, 201, 'Historial clínico registrado exitosamente', {
      id: result.insertId,
      id_turno: Number(id_turno),
      id_medico: usuario.id,
      id_paciente: turno.id_paciente,
      diagnostico: diagnosticoTrim,
      tratamiento: tratamientoTrim,
      observaciones: observacionesTrim || null
    });
  } catch (error) {
    console.error('Error en createHistorialClinico:', error);
    return sendResponse(res, 500, 'Error interno al registrar el historial clínico', null);
  }
};

// GET /historial-clinico/paciente/:id_paciente - Consulta de historial clínico
const getHistorialByPaciente = async (req, res) => {
  const usuario = req.user;
  let idPacienteBuscado = req.params.id_paciente ? Number(req.params.id_paciente) : null;

  try {
    // Si quien consulta es paciente, solo puede ver su propio historial
    if (usuario.rol === 'paciente') {
      if (idPacienteBuscado && idPacienteBuscado !== Number(usuario.id)) {
        return sendResponse(res, 403, 'Acceso denegado. Solo puede consultar su propio historial clínico.', null);
      }
      idPacienteBuscado = Number(usuario.id);

      const [historial] = await pool.query(
        `SELECT 
          h.id, 
          h.id_turno, 
          h.diagnostico, 
          h.tratamiento, 
          h.observaciones, 
          h.fecha,
          t.fecha AS turno_fecha,
          t.hora AS turno_hora,
          CONCAT(u_med.nombre, ' ', u_med.apellido) AS medico_nombre,
          e.descripcion AS especialidad_descripcion,
          s.nombre AS sede_nombre
        FROM historial_clinico h
        INNER JOIN turno t ON h.id_turno = t.id
        INNER JOIN agenda a ON t.id_agenda = a.id
        INNER JOIN usuario u_med ON a.id_medico = u_med.id
        INNER JOIN especialidad e ON a.id_especialidad = e.id
        INNER JOIN sede s ON a.id_sede = s.id
        WHERE t.id_paciente = ?
        ORDER BY h.fecha DESC, h.id DESC`,
        [idPacienteBuscado]
      );

      return sendResponse(res, 200, 'Historial clínico obtenido con éxito', historial);
    }

    // Si quien consulta es médico, solo puede ver las consultas que él mismo atendió para ese paciente
    if (usuario.rol === 'medico') {
      if (!idPacienteBuscado) {
        return sendResponse(res, 400, 'Debe indicar el id del paciente para consultar el historial clínico.', null);
      }

      const [historial] = await pool.query(
        `SELECT 
          h.id, 
          h.id_turno, 
          h.diagnostico, 
          h.tratamiento, 
          h.observaciones, 
          h.fecha,
          t.fecha AS turno_fecha,
          t.hora AS turno_hora,
          t.id_paciente,
          CONCAT(u_pac.nombre, ' ', u_pac.apellido) AS paciente_nombre,
          CONCAT(u_med.nombre, ' ', u_med.apellido) AS medico_nombre,
          e.descripcion AS especialidad_descripcion,
          s.nombre AS sede_nombre
        FROM historial_clinico h
        INNER JOIN turno t ON h.id_turno = t.id
        INNER JOIN agenda a ON t.id_agenda = a.id
        INNER JOIN usuario u_med ON a.id_medico = u_med.id
        INNER JOIN usuario u_pac ON t.id_paciente = u_pac.id
        INNER JOIN especialidad e ON a.id_especialidad = e.id
        INNER JOIN sede s ON a.id_sede = s.id
        WHERE t.id_paciente = ? AND a.id_medico = ?
        ORDER BY h.fecha DESC, h.id DESC`,
        [idPacienteBuscado, usuario.id]
      );

      return sendResponse(res, 200, 'Historial clínico del paciente atendido obtenido con éxito', historial);
    }

    // Cualquier otro rol no tiene permisos para acceder a esta consulta
    return sendResponse(res, 403, 'Acceso denegado. No posee permisos para consultar el historial clínico.', null);
  } catch (error) {
    console.error('Error en getHistorialByPaciente:', error);
    return sendResponse(res, 500, 'Error interno al consultar el historial clínico', null);
  }
};

module.exports = {
  createHistorialClinico,
  getHistorialByPaciente
};
