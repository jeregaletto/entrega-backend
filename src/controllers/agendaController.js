// src/controllers/agendaController.js
const pool = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');

const esIdValido = (id) => Number.isInteger(Number(id)) && Number(id) > 0;

// Auxiliar para verificar si el usuario es paciente
const esPaciente = (req) => req.user && req.user.rol === 'paciente';

/**
 * Normaliza una hora en formato 'HH:mm' o 'HH:mm:ss' a 'HH:mm'.
 * Devuelve null si no coincide con un formato válido.
 */
const normalizarHoraAgenda = (h) => {
  if (typeof h !== 'string') return null;
  const match = h.trim().match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (!match) return null;
  return `${match[1]}:${match[2]}`;
};

/**
 * Valida que una fecha tenga formato 'YYYY-MM-DD' y corresponda a una fecha de calendario válida.
 */
const esFechaValida = (valor) => {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [anio, mes, dia] = valor.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
};

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

  if (medicoIdFiltro !== undefined && !esIdValido(medicoIdFiltro)) {
    return sendResponse(res, 400, 'El filtro de médico debe ser un número entero positivo.', null);
  }

  if (sedeIdFiltro !== undefined && !esIdValido(sedeIdFiltro)) {
    return sendResponse(res, 400, 'El filtro de sede debe ser un número entero positivo.', null);
  }

  if (fecha !== undefined && !esFechaValida(fecha)) {
    return sendResponse(res, 400, 'El parámetro fecha debe tener el formato YYYY-MM-DD y ser una fecha válida.', null);
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
        s.direccion AS sede_direccion,
        CAST((SELECT COUNT(*) FROM turno t WHERE t.id_agenda = a.id AND t.estado = 'confirmado') AS SIGNED) AS turnos_confirmados,
        CAST((SELECT COUNT(*) FROM turno t WHERE t.id_agenda = a.id) AS SIGNED) AS turnos_total
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
      params.push(Number(medicoIdFiltro));
    }

    if (sedeIdFiltro) {
      query += ' AND a.id_sede = ?';
      params.push(Number(sedeIdFiltro));
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

  if (!esIdValido(id)) {
    return sendResponse(res, 400, 'El ID de la agenda debe ser un número entero positivo.', null);
  }

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
        s.direccion AS sede_direccion,
        CAST((SELECT COUNT(*) FROM turno t WHERE t.id_agenda = a.id AND t.estado = 'confirmado') AS SIGNED) AS turnos_confirmados,
        CAST((SELECT COUNT(*) FROM turno t WHERE t.id_agenda = a.id) AS SIGNED) AS turnos_total
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

  const horaEntradaNorm = normalizarHoraAgenda(hora_entrada);
  if (!horaEntradaNorm) {
    return sendResponse(res, 400, 'El formato de hora_entrada debe ser HH:mm o HH:mm:ss válido.', null);
  }

  const horaSalidaNorm = normalizarHoraAgenda(hora_salida);
  if (!horaSalidaNorm) {
    return sendResponse(res, 400, 'El formato de hora_salida debe ser HH:mm o HH:mm:ss válido.', null);
  }

  if (horaSalidaNorm <= horaEntradaNorm) {
    return sendResponse(res, 400, 'La hora de salida debe ser posterior a la hora de entrada.', null);
  }

  if (!esFechaValida(fecha)) {
    return sendResponse(res, 400, 'El parámetro fecha debe tener el formato YYYY-MM-DD y ser una fecha válida.', null);
  }

  if (!esIdValido(id_medico)) {
    return sendResponse(res, 400, 'El ID de médico debe ser un número entero positivo.', null);
  }
  if (!esIdValido(id_especialidad)) {
    return sendResponse(res, 400, 'El ID de especialidad debe ser un número entero positivo.', null);
  }
  if (!esIdValido(id_sede)) {
    return sendResponse(res, 400, 'El ID de sede debe ser un número entero positivo.', null);
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

    // Validar que el médico posea la especialidad indicada
    const [medEspCheck] = await pool.query(
      'SELECT id FROM medico_especialidad WHERE id_medico = ? AND id_especialidad = ?',
      [id_medico, id_especialidad]
    );
    if (medEspCheck.length === 0) {
      return sendResponse(res, 400, 'El médico no tiene asignada la especialidad especificada.', null);
    }

    // Validar solapamiento con cualquier franja del mismo médico en la misma fecha (en cualquier sede)
    const [solapados] = await pool.query(
      `SELECT id FROM agenda 
       WHERE id_medico = ? AND fecha = ? AND (? < hora_salida AND ? > hora_entrada)`,
      [id_medico, fecha, horaEntradaNorm, horaSalidaNorm]
    );

    if (solapados.length > 0) {
      return sendResponse(res, 400, 'El médico ya posee una franja horaria que se solapa con el horario ingresado en esa fecha.', null);
    }

    // Insertar el registro con horas normalizadas a 'HH:mm'
    const [result] = await pool.query(
      `INSERT INTO agenda (hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [horaEntradaNorm, horaSalidaNorm, fecha, id_medico, id_especialidad, id_sede]
    );

    return sendResponse(res, 201, 'Franja de agenda creada exitosamente', {
      id: result.insertId,
      hora_entrada: horaEntradaNorm,
      hora_salida: horaSalidaNorm,
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

  if (!esIdValido(id)) {
    return sendResponse(res, 400, 'El ID de agenda debe ser un número entero positivo.', null);
  }

  const { hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede } = req.body;

  if (!hora_entrada || !hora_salida || !fecha || !id_medico || !id_especialidad || !id_sede) {
    return sendResponse(res, 400, 'Todos los campos son obligatorios para actualizar.', null);
  }

  const horaEntradaNorm = normalizarHoraAgenda(hora_entrada);
  if (!horaEntradaNorm) {
    return sendResponse(res, 400, 'El formato de hora_entrada debe ser HH:mm o HH:mm:ss válido.', null);
  }

  const horaSalidaNorm = normalizarHoraAgenda(hora_salida);
  if (!horaSalidaNorm) {
    return sendResponse(res, 400, 'El formato de hora_salida debe ser HH:mm o HH:mm:ss válido.', null);
  }

  if (horaSalidaNorm <= horaEntradaNorm) {
    return sendResponse(res, 400, 'La hora de salida debe ser posterior a la hora de entrada.', null);
  }

  if (!esFechaValida(fecha)) {
    return sendResponse(res, 400, 'El parámetro fecha debe tener el formato YYYY-MM-DD y ser una fecha válida.', null);
  }

  if (!esIdValido(id_medico)) {
    return sendResponse(res, 400, 'El ID de médico debe ser un número entero positivo.', null);
  }
  if (!esIdValido(id_especialidad)) {
    return sendResponse(res, 400, 'El ID de especialidad debe ser un número entero positivo.', null);
  }
  if (!esIdValido(id_sede)) {
    return sendResponse(res, 400, 'El ID de sede debe ser un número entero positivo.', null);
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

    // Validar que el médico posea la especialidad indicada
    const [medEspCheck] = await pool.query(
      'SELECT id FROM medico_especialidad WHERE id_medico = ? AND id_especialidad = ?',
      [id_medico, id_especialidad]
    );
    if (medEspCheck.length === 0) {
      return sendResponse(res, 400, 'El médico no tiene asignada la especialidad especificada.', null);
    }

    // Validar solapamiento con cualquier franja del mismo médico en la misma fecha (excluyendo el registro actual)
    const [solapados] = await pool.query(
      `SELECT id FROM agenda 
       WHERE id_medico = ? AND fecha = ? AND (? < hora_salida AND ? > hora_entrada) AND id != ?`,
      [id_medico, fecha, horaEntradaNorm, horaSalidaNorm, id]
    );

    if (solapados.length > 0) {
      return sendResponse(res, 400, 'El médico ya posee una franja horaria que se solapa con el horario ingresado en esa fecha.', null);
    }

    // Validar restricciones si la agenda tiene turnos confirmados asociados
    const [turnosConfirmados] = await pool.query(
      'SELECT id, hora FROM turno WHERE id_agenda = ? AND estado = "confirmado"',
      [id]
    );

    if (turnosConfirmados.length > 0) {
      // (a) No se pueden cambiar fecha, médico, especialidad ni sede
      const fechaOriginalStr = typeof agendaOriginal.fecha === 'string'
        ? agendaOriginal.fecha
        : (agendaOriginal.fecha instanceof Date ? agendaOriginal.fecha.toISOString().split('T')[0] : String(agendaOriginal.fecha));

      if (
        fechaOriginalStr !== fecha ||
        Number(agendaOriginal.id_medico) !== Number(id_medico) ||
        Number(agendaOriginal.id_especialidad) !== Number(id_especialidad) ||
        Number(agendaOriginal.id_sede) !== Number(id_sede)
      ) {
        return sendResponse(
          res,
          400,
          'No se pueden modificar la fecha, médico, especialidad ni sede de una agenda con turnos confirmados asociados.',
          null
        );
      }

      // (b) Todos los turnos confirmados deben seguir dentro de [hora_entrada, hora_salida] inclusive
      let turnosFuera = 0;
      for (const t of turnosConfirmados) {
        const horaTurno = t.hora ? t.hora.substring(0, 5) : '';
        if (horaTurno < horaEntradaNorm || horaTurno > horaSalidaNorm) {
          turnosFuera++;
        }
      }

      if (turnosFuera > 0) {
        return sendResponse(
          res,
          400,
          `No se puede modificar el horario: ${turnosFuera} turno(s) confirmado(s) quedarían fuera del nuevo rango (${horaEntradaNorm} a ${horaSalidaNorm}).`,
          null
        );
      }
    }

    await pool.query(
      `UPDATE agenda 
       SET hora_entrada = ?, hora_salida = ?, fecha = ?, id_medico = ?, id_especialidad = ?, id_sede = ?
       WHERE id = ?`,
      [horaEntradaNorm, horaSalidaNorm, fecha, id_medico, id_especialidad, id_sede, id]
    );

    return sendResponse(res, 200, 'Registro de agenda actualizado exitosamente', {
      id: Number(id),
      hora_entrada: horaEntradaNorm,
      hora_salida: horaSalidaNorm,
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

  if (!esIdValido(id)) {
    return sendResponse(res, 400, 'El ID de agenda debe ser un número entero positivo.', null);
  }

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
