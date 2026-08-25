// src/controllers/agendaController.js
const pool = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');

// Auxiliar para verificar si el usuario es paciente
const esPaciente = (req) => req.user && req.user.rol === 'paciente';

// GET /agenda - Listar registros de agenda con filtros opcionales (medico, sede, fecha)
const getAllAgendas = async (req, res) => {
  if (esPaciente(req)) {
    return sendResponse(res, 403, 'Acceso denegado. Los pacientes no tienen permiso para consultar la agenda médica.', null);
  }

  const { medico, id_medico, sede, id_sede, fecha } = req.query;
  const medicoIdFiltro = medico || id_medico;
  const sedeIdFiltro = sede || id_sede;

  // Si el usuario es médico, solo puede consultar su propia agenda
  if (req.user.rol === 'medico') {
    if (medicoIdFiltro && Number(medicoIdFiltro) !== Number(req.user.id)) {
      return sendResponse(res, 403, 'Acceso denegado. Un médico solo puede consultar su propia agenda.', null);
    }
  }

  try {
    let query = `
      SELECT 
        a.id, 
        a.fecha, 
        a.hora_entrada, 
        a.hora_salida, 
        a.id_medico, 
        CONCAT(u.nombre, ' ', u.apellido) AS medico_nombre, 
        u.email AS medico_email,
        a.id_especialidad, 
        e.descripcion AS especialidad_descripcion, 
        a.id_sede, 
        s.nombre AS sede_nombre,
        s.direccion AS sede_direccion
      FROM agenda a
      INNER JOIN usuario u ON a.id_medico = u.id
      INNER JOIN especialidad e ON a.id_especialidad = e.id
      INNER JOIN sede s ON a.id_sede = s.id
      WHERE 1=1
    `;
    const params = [];

    // Aplicar restricción si es médico
    if (req.user.rol === 'medico') {
      query += ' AND a.id_medico = ?';
      params.push(req.user.id);
    } else if (medicoIdFiltro) {
      query += ' AND a.id_medico = ?';
      params.push(medicoIdFiltro);
    }

    if (sedeIdFiltro) {
      query += ' AND a.id_sede = ?';
      params.push(sedeIdFiltro);
    }

    if (fecha) {
      query += ' AND a.fecha = ?';
      params.push(fecha);
    }

    query += ' ORDER BY a.fecha ASC, a.hora_entrada ASC';

    const [agendas] = await pool.query(query, params);
    return sendResponse(res, 200, 'Agenda médica obtenida con éxito', agendas);
  } catch (error) {
    console.error('Error en getAllAgendas:', error);
    return sendResponse(res, 500, 'Error al consultar la agenda médica', null);
  }
};

// GET /agenda/:id - Obtener un registro específico de la agenda por ID
const getAgendaById = async (req, res) => {
  if (esPaciente(req)) {
    return sendResponse(res, 403, 'Acceso denegado. Los pacientes no tienen permiso para consultar la agenda médica.', null);
  }

  const { id } = req.params;

  try {
    const query = `
      SELECT 
        a.id, 
        a.fecha, 
        a.hora_entrada, 
        a.hora_salida, 
        a.id_medico, 
        CONCAT(u.nombre, ' ', u.apellido) AS medico_nombre, 
        u.email AS medico_email,
        a.id_especialidad, 
        e.descripcion AS especialidad_descripcion, 
        a.id_sede, 
        s.nombre AS sede_nombre,
        s.direccion AS sede_direccion
      FROM agenda a
      INNER JOIN usuario u ON a.id_medico = u.id
      INNER JOIN especialidad e ON a.id_especialidad = e.id
      INNER JOIN sede s ON a.id_sede = s.id
      WHERE a.id = ?
    `;
    const [rows] = await pool.query(query, [id]);

    if (rows.length === 0) {
      return sendResponse(res, 404, 'Registro de agenda no encontrado', null);
    }

    const agenda = rows[0];

    // Verificar permiso si es médico
    if (req.user.rol === 'medico' && Number(agenda.id_medico) !== Number(req.user.id)) {
      return sendResponse(res, 403, 'Acceso denegado. Un médico solo puede consultar su propia agenda.', null);
    }

    return sendResponse(res, 200, 'Registro de agenda obtenido con éxito', agenda);
  } catch (error) {
    console.error('Error en getAgendaById:', error);
    return sendResponse(res, 500, 'Error al obtener el registro de agenda', null);
  }
};

// POST /agenda - Crear un nuevo registro en la agenda médica
const createAgenda = async (req, res) => {
  if (esPaciente(req)) {
    return sendResponse(res, 403, 'Acceso denegado. Los pacientes no tienen permiso para gestionar la agenda médica.', null);
  }

  const { hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede } = req.body;

  if (!hora_entrada || !hora_salida || !fecha || !id_medico || !id_especialidad || !id_sede) {
    return sendResponse(res, 400, 'Todos los campos (hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede) son obligatorios.', null);
  }

  // Verificar restricción si el usuario es médico
  if (req.user.rol === 'medico' && Number(id_medico) !== Number(req.user.id)) {
    return sendResponse(res, 403, 'Acceso denegado. Un médico solo puede registrar franjas horarias en su propia agenda.', null);
  }

  try {
    // Validar que el médico exista y posea el rol 'medico'
    const [medicoCheck] = await pool.query('SELECT id, rol FROM usuario WHERE id = ?', [id_medico]);
    if (medicoCheck.length === 0 || medicoCheck[0].rol !== 'medico') {
      return sendResponse(res, 400, 'El ID de médico especificado no existe o no posee el rol "medico".', null);
    }

    // Validar que la especialidad exista
    const [espCheck] = await pool.query('SELECT id FROM especialidad WHERE id = ?', [id_especialidad]);
    if (espCheck.length === 0) {
      return sendResponse(res, 400, 'La especialidad especificada no existe.', null);
    }

    // Validar que la sede exista
    const [sedeCheck] = await pool.query('SELECT id FROM sede WHERE id = ?', [id_sede]);
    if (sedeCheck.length === 0) {
      return sendResponse(res, 400, 'La sede especificada no existe.', null);
    }

    // Insertar el registro (se permiten múltiples franjas horarias para el mismo médico en la misma fecha)
    const [result] = await pool.query(
      `INSERT INTO agenda (hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede]
    );

    return sendResponse(res, 201, 'Franja de agenda creada exitosamente', {
      id: result.insertId,
      hora_entrada,
      hora_salida,
      fecha,
      id_medico: Number(id_medico),
      id_especialidad: Number(id_especialidad),
      id_sede: Number(id_sede)
    });
  } catch (error) {
    console.error('Error en createAgenda:', error);
    return sendResponse(res, 500, 'Error interno al crear el registro de agenda', null);
  }
};

// PUT /agenda/:id - Actualizar una franja horaria de la agenda médica
const updateAgenda = async (req, res) => {
  if (esPaciente(req)) {
    return sendResponse(res, 403, 'Acceso denegado. Los pacientes no tienen permiso para modificar la agenda médica.', null);
  }

  const { id } = req.params;
  const { hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede } = req.body;

  if (!hora_entrada || !hora_salida || !fecha || !id_medico || !id_especialidad || !id_sede) {
    return sendResponse(res, 400, 'Todos los campos son obligatorios para actualizar.', null);
  }

  try {
    const [existing] = await pool.query('SELECT * FROM agenda WHERE id = ?', [id]);
    if (existing.length === 0) {
      return sendResponse(res, 404, 'Registro de agenda no encontrado', null);
    }

    const agendaOriginal = existing[0];

    // Si es médico, verificar que sea el dueño del registro y que no intente reasignarlo a otro médico
    if (req.user.rol === 'medico') {
      if (Number(agendaOriginal.id_medico) !== Number(req.user.id) || Number(id_medico) !== Number(req.user.id)) {
        return sendResponse(res, 403, 'Acceso denegado. Un médico solo puede modificar su propia agenda.', null);
      }
    }

    // Validar existencia de médico, especialidad y sede
    const [medicoCheck] = await pool.query('SELECT id, rol FROM usuario WHERE id = ?', [id_medico]);
    if (medicoCheck.length === 0 || medicoCheck[0].rol !== 'medico') {
      return sendResponse(res, 400, 'El ID de médico especificado no existe o no tiene el rol "medico".', null);
    }

    const [espCheck] = await pool.query('SELECT id FROM especialidad WHERE id = ?', [id_especialidad]);
    if (espCheck.length === 0) {
      return sendResponse(res, 400, 'La especialidad especificada no existe.', null);
    }

    const [sedeCheck] = await pool.query('SELECT id FROM sede WHERE id = ?', [id_sede]);
    if (sedeCheck.length === 0) {
      return sendResponse(res, 400, 'La sede especificada no existe.', null);
    }

    await pool.query(
      `UPDATE agenda 
       SET hora_entrada = ?, hora_salida = ?, fecha = ?, id_medico = ?, id_especialidad = ?, id_sede = ?
       WHERE id = ?`,
      [hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede, id]
    );

    return sendResponse(res, 200, 'Registro de agenda actualizado exitosamente', {
      id: Number(id),
      hora_entrada,
      hora_salida,
      fecha,
      id_medico: Number(id_medico),
      id_especialidad: Number(id_especialidad),
      id_sede: Number(id_sede)
    });
  } catch (error) {
    console.error('Error en updateAgenda:', error);
    return sendResponse(res, 500, 'Error interno al actualizar la agenda', null);
  }
};

// DELETE /agenda/:id - Eliminar una franja horaria de la agenda médica
const deleteAgenda = async (req, res) => {
  if (esPaciente(req)) {
    return sendResponse(res, 403, 'Acceso denegado. Los pacientes no tienen permiso para eliminar la agenda médica.', null);
  }

  const { id } = req.params;

  try {
    const [existing] = await pool.query('SELECT * FROM agenda WHERE id = ?', [id]);
    if (existing.length === 0) {
      return sendResponse(res, 404, 'Registro de agenda no encontrado', null);
    }

    const agenda = existing[0];

    // Verificar permisos si es médico
    if (req.user.rol === 'medico' && Number(agenda.id_medico) !== Number(req.user.id)) {
      return sendResponse(res, 403, 'Acceso denegado. Un médico solo puede eliminar registros de su propia agenda.', null);
    }

    // Verificar si hay turnos asociados a esta agenda
    const [turnos] = await pool.query('SELECT COUNT(*) AS count FROM turno WHERE id_agenda = ?', [id]);
    if (turnos[0].count > 0) {
      return sendResponse(res, 400, `No se puede eliminar la agenda: existen ${turnos[0].count} turno(s) reservado(s) asociados a esta franja.`, null);
    }

    await pool.query('DELETE FROM agenda WHERE id = ?', [id]);
    return sendResponse(res, 200, 'Registro de agenda eliminado exitosamente', { id: Number(id) });
  } catch (error) {
    console.error('Error en deleteAgenda:', error);
    return sendResponse(res, 500, 'Error interno al eliminar el registro de la agenda', null);
  }
};

module.exports = {
  getAllAgendas,
  getAgendaById,
  createAgenda,
  updateAgenda,
  deleteAgenda
};
