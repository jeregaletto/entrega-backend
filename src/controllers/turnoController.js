// src/controllers/turnoController.js
const pool = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');
const { crearNotificacion } = require('../utils/notificacionHelper');

/**
 * Normaliza una cadena de tiempo al formato estándar 'HH:mm:ss'.
 */
const normalizarHora = (h) => {
  if (!h) return '';
  const parts = h.toString().trim().split(':');
  const hh = parts[0].padStart(2, '0');
  const mm = (parts[1] || '00').padStart(2, '0');
  return `${hh}:${mm}`;
};

/**
 * Formatea una fecha al formato 'YYYY-MM-DD'.
 */
const formatearFecha = (fecha) => {
  if (!fecha) return '';
  if (fecha instanceof Date) {
    return fecha.toISOString().split('T')[0];
  }
  return fecha.toString().substring(0, 10);
};

// POST /turnos - Alta de turno médico
const createTurno = async (req, res) => {
  const { id_agenda, id_medico, id_especialidad, id_sede, fecha, hora, nota } = req.body;
  const usuario = req.user;

  // Validación de nota obligatoria
  if (!nota || typeof nota !== 'string' || !nota.trim()) {
    return sendResponse(res, 400, 'La nota del turno es obligatoria.', null);
  }

  // Validación de hora obligatoria
  if (!hora || typeof hora !== 'string' || !hora.trim()) {
    return sendResponse(res, 400, 'La hora del turno es obligatoria.', null);
  }

  try {
    // Determinar el id_paciente según el rol del usuario autenticado
    let idPacienteFinal = null;

    if (usuario.rol === 'paciente') {
      idPacienteFinal = usuario.id;
    } else if (usuario.rol === 'operador' || usuario.rol === 'admin') {
      if (!req.body.id_paciente) {
        return sendResponse(res, 400, 'El campo id_paciente es obligatorio cuando un operador o administrador registra un turno.', null);
      }
      idPacienteFinal = Number(req.body.id_paciente);
    } else {
      return sendResponse(res, 403, 'Acceso denegado. No tiene permisos para registrar turnos.', null);
    }

    // Validar existencia y rol del paciente en la tabla usuario
    const [pacientes] = await pool.query(
      'SELECT id, nombre, apellido, rol, id_cobertura FROM usuario WHERE id = ?',
      [idPacienteFinal]
    );

    if (pacientes.length === 0 || pacientes[0].rol !== 'paciente') {
      return sendResponse(res, 400, 'El paciente especificado no existe o no posee el rol "paciente".', null);
    }

    const paciente = pacientes[0];

    // La cobertura SIEMPRE se toma de la tabla usuario (id_cobertura del paciente)
    const idCoberturaFinal = paciente.id_cobertura || null;

    // Buscar y validar la franja de agenda médica
    let agenda = null;

    if (id_agenda) {
      const [agendas] = await pool.query('SELECT * FROM agenda WHERE id = ?', [id_agenda]);
      if (agendas.length === 0) {
        return sendResponse(res, 400, 'La franja de agenda médica especificada no existe.', null);
      }
      agenda = agendas[0];
    } else if (id_medico && id_especialidad && id_sede && fecha) {
      const [agendas] = await pool.query(
        'SELECT * FROM agenda WHERE id_medico = ? AND id_especialidad = ? AND id_sede = ? AND fecha = ?',
        [id_medico, id_especialidad, id_sede, fecha]
      );
      if (agendas.length === 0) {
        return sendResponse(res, 400, 'No se encontró una franja de agenda médica para los datos indicados.', null);
      }
      agenda = agendas[0];
    } else {
      return sendResponse(res, 400, 'Debe especificar el id_agenda o los datos completos de la franja (id_medico, id_especialidad, id_sede, fecha).', null);
    }

    // Validar que la hora solicitada esté dentro del rango de atención de la agenda [hora_entrada, hora_salida]
    const horaSolicitada = normalizarHora(hora);
    const horaEntrada = normalizarHora(agenda.hora_entrada);
    const horaSalida = normalizarHora(agenda.hora_salida);

    if (horaSolicitada < horaEntrada || horaSolicitada > horaSalida) {
      return sendResponse(
        res,
        400,
        `El horario solicitado (${horaSolicitada}) está fuera del rango de atención de la franja horaria (${horaEntrada} a ${horaSalida}).`,
        null
      );
    }

    // Validar superposición: no debe existir un turno confirmado en esa misma agenda y hora exacta
    const [turnosSuperpuestos] = await pool.query(
      'SELECT id FROM turno WHERE id_agenda = ? AND hora = ? AND estado = "confirmado"',
      [agenda.id, horaSolicitada]
    );

    if (turnosSuperpuestos.length > 0) {
      return sendResponse(res, 400, 'El horario seleccionado ya se encuentra reservado por otro turno confirmado.', null);
    }

    const fechaTurno = formatearFecha(agenda.fecha);

    // Insertar el nuevo turno con estado 'confirmado'
    const [result] = await pool.query(
      `INSERT INTO turno (nota, id_agenda, fecha, hora, id_paciente, id_cobertura, estado)
       VALUES (?, ?, ?, ?, ?, ?, 'confirmado')`,
      [nota.trim(), agenda.id, fechaTurno, horaSolicitada, idPacienteFinal, idCoberturaFinal]
    );

    const nuevoTurnoId = result.insertId;

    // Generar notificación para el paciente
    await crearNotificacion(
      idPacienteFinal,
      'turno_confirmado',
      `Su turno para el día ${fechaTurno} a las ${horaSolicitada} ha sido confirmado con éxito.`
    );

    return sendResponse(res, 201, 'Turno creado y confirmado exitosamente', {
      id: nuevoTurnoId,
      nota: nota.trim(),
      id_agenda: agenda.id,
      fecha: fechaTurno,
      hora: horaSolicitada,
      id_paciente: idPacienteFinal,
      id_cobertura: idCoberturaFinal,
      estado: 'confirmado'
    });
  } catch (error) {
    console.error('Error en createTurno:', error);
    return sendResponse(res, 500, 'Error interno al registrar el turno médico', null);
  }
};

// PUT /turnos/:id/cancelar - Cancelación de un turno
const cancelarTurno = async (req, res) => {
  const { id } = req.params;
  const usuario = req.user;

  try {
    // Buscar el turno junto con los datos de agenda asociados
    const [turnos] = await pool.query(
      `SELECT t.id, t.nota, t.id_agenda, t.fecha, t.hora, t.id_paciente, t.id_cobertura, t.estado,
              a.id_sede, a.id_medico
       FROM turno t
       INNER JOIN agenda a ON t.id_agenda = a.id
       WHERE t.id = ?`,
      [id]
    );

    if (turnos.length === 0) {
      return sendResponse(res, 404, 'Turno no encontrado.', null);
    }

    const turno = turnos[0];

    // Validar estado actual del turno
    if (turno.estado === 'cancelado') {
      return sendResponse(res, 400, 'El turno ya se encuentra cancelado.', null);
    }

    if (turno.estado === 'atendido') {
      return sendResponse(res, 400, 'No se puede cancelar un turno que ya ha sido marcado como atendido.', null);
    }

    // Validaciones de permisos según el rol
    if (usuario.rol === 'paciente') {
      if (Number(turno.id_paciente) !== Number(usuario.id)) {
        return sendResponse(res, 403, 'Acceso denegado. Solo puede cancelar sus propios turnos.', null);
      }
    } else if (usuario.rol === 'operador' || usuario.rol === 'medico') {
      if (Number(turno.id_sede) !== Number(usuario.id_sede)) {
        return sendResponse(res, 403, 'Acceso denegado. Solo puede cancelar turnos pertenecientes a su sede asignada.', null);
      }
    } else if (usuario.rol !== 'admin') {
      return sendResponse(res, 403, 'Acceso denegado. No posee permisos para cancelar este turno.', null);
    }

    // Actualizar el estado del turno a 'cancelado'
    await pool.query('UPDATE turno SET estado = "cancelado" WHERE id = ?', [id]);

    const fechaTurno = formatearFecha(turno.fecha);
    const horaTurno = normalizarHora(turno.hora);

    // Generar notificación para el paciente
    await crearNotificacion(
      turno.id_paciente,
      'turno_cancelado',
      `Su turno del día ${fechaTurno} a las ${horaTurno} ha sido cancelado.`
    );

    // Generar notificación para el médico si la cancelación fue realizada por otro usuario
    if (usuario.rol !== 'medico' || Number(usuario.id) !== Number(turno.id_medico)) {
      await crearNotificacion(
        turno.id_medico,
        'turno_cancelado',
        `El turno asignado del día ${fechaTurno} a las ${horaTurno} ha sido cancelado.`
      );
    }

    return sendResponse(res, 200, 'Turno cancelado exitosamente', {
      id: Number(id),
      estado: 'cancelado'
    });
  } catch (error) {
    console.error('Error en cancelarTurno:', error);
    return sendResponse(res, 500, 'Error interno al cancelar el turno médico', null);
  }
};

// PUT /turnos/:id/atender - Atender un turno médico
const atenderTurno = async (req, res) => {
  const { id } = req.params;
  const usuario = req.user;

  try {
    // Buscar el turno y los datos de la agenda
    const [turnos] = await pool.query(
      `SELECT t.id, t.nota, t.id_agenda, t.fecha, t.hora, t.id_paciente, t.id_cobertura, t.estado,
              a.id_medico, a.id_sede
       FROM turno t
       INNER JOIN agenda a ON t.id_agenda = a.id
       WHERE t.id = ?`,
      [id]
    );

    if (turnos.length === 0) {
      return sendResponse(res, 404, 'Turno no encontrado.', null);
    }

    const turno = turnos[0];

    // Solo el médico asignado a la franja puede atender el turno
    if (Number(turno.id_medico) !== Number(usuario.id)) {
      return sendResponse(res, 403, 'Acceso denegado. Solo puede atender turnos asignados a su propia agenda médica.', null);
    }

    // Validar estado previo del turno
    if (turno.estado === 'cancelado') {
      return sendResponse(res, 400, 'No es posible atender un turno que ha sido cancelado.', null);
    }

    if (turno.estado === 'atendido') {
      return sendResponse(res, 400, 'El turno ya ha sido marcado como atendido con anterioridad.', null);
    }

    if (turno.estado !== 'confirmado') {
      return sendResponse(res, 400, 'Solo se pueden atender turnos que se encuentren en estado "confirmado".', null);
    }

    // Actualizar estado a 'atendido'
    await pool.query('UPDATE turno SET estado = "atendido" WHERE id = ?', [id]);

    const fechaTurno = formatearFecha(turno.fecha);
    const horaTurno = normalizarHora(turno.hora);

    // Generar notificación para el paciente
    await crearNotificacion(
      turno.id_paciente,
      'turno_atendido',
      `Su turno del día ${fechaTurno} a las ${horaTurno} ha sido registrado como atendido.`
    );

    return sendResponse(res, 200, 'Turno marcado como atendido exitosamente', {
      id: Number(id),
      estado: 'atendido'
    });
  } catch (error) {
    console.error('Error en atenderTurno:', error);
    return sendResponse(res, 500, 'Error interno al marcar el turno como atendido', null);
  }
};

module.exports = {
  createTurno,
  cancelarTurno,
  atenderTurno
};
