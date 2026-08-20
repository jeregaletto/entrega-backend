const pool = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');
const { esIdValido, esFechaValida, normalizarHora } = require('../utils/validators');

// Consulta base reutilizada por el listado y el detalle de agenda
const SELECT_AGENDA = `
  SELECT a.id,
         DATE_FORMAT(a.fecha, '%Y-%m-%d') AS fecha,
         a.hora_entrada,
         a.hora_salida,
         a.id_medico,
         CONCAT(u.apellido, ', ', u.nombre) AS medico,
         a.id_especialidad,
         e.descripcion AS especialidad,
         a.id_sede,
         s.nombre AS sede
  FROM agenda a
  INNER JOIN usuario u ON a.id_medico = u.id
  INNER JOIN especialidad e ON a.id_especialidad = e.id
  INNER JOIN sede s ON a.id_sede = s.id
`;

// El médico solo gestiona su propia agenda; operador y administrador, la de cualquiera
const esGestorGeneral = (usuario) => usuario.rol === 'operador' || usuario.rol === 'administrador';

// Valida y normaliza el body de alta/modificación de agenda.
// Devuelve { error } con el mensaje a informar, o { datos } ya listos para la consulta.
const validarDatosAgenda = (body) => {
  const { fecha, id_medico, id_especialidad, id_sede } = body;

  if (!body.hora_entrada || !body.hora_salida || !fecha || !id_medico || !id_especialidad || !id_sede) {
    return { error: 'Los campos hora_entrada, hora_salida, fecha, id_medico, id_especialidad e id_sede son obligatorios.' };
  }

  if (!esFechaValida(fecha)) {
    return { error: 'El campo fecha debe tener el formato YYYY-MM-DD.' };
  }

  const horaEntrada = normalizarHora(body.hora_entrada);
  const horaSalida = normalizarHora(body.hora_salida);

  if (!horaEntrada || !horaSalida) {
    return { error: 'Los campos hora_entrada y hora_salida deben tener el formato HH:MM o HH:MM:SS.' };
  }

  if (horaEntrada >= horaSalida) {
    return { error: 'La hora_entrada debe ser anterior a la hora_salida.' };
  }

  if (!esIdValido(id_medico) || !esIdValido(id_especialidad) || !esIdValido(id_sede)) {
    return { error: 'Los campos id_medico, id_especialidad e id_sede deben ser números enteros positivos.' };
  }

  return {
    datos: {
      fecha,
      hora_entrada: horaEntrada,
      hora_salida: horaSalida,
      id_medico: Number(id_medico),
      id_especialidad: Number(id_especialidad),
      id_sede: Number(id_sede)
    }
  };
};

// Verifica que médico, especialidad y sede existan antes de tocar la agenda.
// Devuelve el mensaje de error correspondiente o null si está todo bien.
const validarReferencias = async ({ id_medico, id_especialidad, id_sede }) => {
  const [medicos] = await pool.query(
    "SELECT id FROM usuario WHERE id = ? AND rol = 'medico'",
    [id_medico]
  );
  if (medicos.length === 0) {
    return 'El id_medico indicado no corresponde a un usuario con rol medico.';
  }

  const [especialidades] = await pool.query('SELECT id FROM especialidad WHERE id = ?', [id_especialidad]);
  if (especialidades.length === 0) {
    return 'La especialidad indicada no existe.';
  }

  const [sedes] = await pool.query('SELECT id FROM sede WHERE id = ?', [id_sede]);
  if (sedes.length === 0) {
    return 'La sede indicada no existe.';
  }

  return null;
};

// Un médico puede tener varios rangos horarios el mismo día, pero no superpuestos.
// idExcluido se usa en la modificación para no compararse contra sí mismo.
const existeSuperposicion = async ({ id_medico, fecha, hora_entrada, hora_salida }, idExcluido = null) => {
  // Hay superposición si el rango existente empieza antes de que termine el nuevo
  // y termina después de que el nuevo empieza.
  let sql = `SELECT COUNT(*) AS superpuestos
             FROM agenda
             WHERE id_medico = ? AND fecha = ?
               AND hora_entrada < ? AND hora_salida > ?`;
  const params = [id_medico, fecha, hora_salida, hora_entrada];

  if (idExcluido !== null) {
    sql += ' AND id <> ?';
    params.push(idExcluido);
  }

  const [[{ superpuestos }]] = await pool.query(sql, params);

  return superpuestos > 0;
};

// GET /agenda?id_medico=&id_sede=&fecha=
const listarAgenda = async (req, res) => {
  const { id_medico, id_sede, fecha } = req.query;

  const filtros = [];
  const params = [];

  if (id_medico !== undefined) {
    if (!esIdValido(id_medico)) {
      return sendResponse(res, 400, 'El filtro id_medico debe ser un número entero positivo.', null);
    }
    filtros.push('a.id_medico = ?');
    params.push(Number(id_medico));
  }

  if (id_sede !== undefined) {
    if (!esIdValido(id_sede)) {
      return sendResponse(res, 400, 'El filtro id_sede debe ser un número entero positivo.', null);
    }
    filtros.push('a.id_sede = ?');
    params.push(Number(id_sede));
  }

  if (fecha !== undefined) {
    if (!esFechaValida(fecha)) {
      return sendResponse(res, 400, 'El filtro fecha debe tener el formato YYYY-MM-DD.', null);
    }
    filtros.push('a.fecha = ?');
    params.push(fecha);
  }

  // El médico solo puede consultar su propia agenda
  if (req.user.rol === 'medico') {
    if (id_medico !== undefined && Number(id_medico) !== req.user.id) {
      return sendResponse(res, 403, 'Acceso denegado. Solo puede consultar su propia agenda.', null);
    }
    if (id_medico === undefined) {
      filtros.push('a.id_medico = ?');
      params.push(req.user.id);
    }
  }

  try {
    const where = filtros.length > 0 ? ` WHERE ${filtros.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `${SELECT_AGENDA}${where} ORDER BY a.fecha ASC, a.hora_entrada ASC`,
      params
    );

    return sendResponse(res, 200, 'Agenda obtenida con éxito', rows);
  } catch (error) {
    console.error('Error en listarAgenda:', error);
    return sendResponse(res, 500, 'Error al obtener la agenda', null);
  }
};

// GET /agenda/:id
const obtenerAgenda = async (req, res) => {
  const { id } = req.params;

  if (!esIdValido(id)) {
    return sendResponse(res, 400, 'El id de la agenda debe ser un número entero positivo.', null);
  }

  try {
    const [rows] = await pool.query(`${SELECT_AGENDA} WHERE a.id = ?`, [id]);

    if (rows.length === 0) {
      return sendResponse(res, 404, 'El turno de agenda solicitado no existe.', null);
    }

    if (req.user.rol === 'medico' && rows[0].id_medico !== req.user.id) {
      return sendResponse(res, 403, 'Acceso denegado. Solo puede consultar su propia agenda.', null);
    }

    return sendResponse(res, 200, 'Turno de agenda obtenido con éxito', rows[0]);
  } catch (error) {
    console.error('Error en obtenerAgenda:', error);
    return sendResponse(res, 500, 'Error al obtener el turno de agenda', null);
  }
};

// POST /agenda
const crearAgenda = async (req, res) => {
  const { error, datos } = validarDatosAgenda(req.body);
  if (error) {
    return sendResponse(res, 400, error, null);
  }

  // El médico solo puede cargar agenda a su nombre
  if (!esGestorGeneral(req.user) && datos.id_medico !== req.user.id) {
    return sendResponse(res, 403, 'Acceso denegado. Solo puede gestionar su propia agenda.', null);
  }

  try {
    const errorReferencias = await validarReferencias(datos);
    if (errorReferencias) {
      return sendResponse(res, 400, errorReferencias, null);
    }

    if (await existeSuperposicion(datos)) {
      return sendResponse(
        res,
        409,
        'El médico ya tiene cargado un rango horario que se superpone con el indicado para esa fecha.',
        null
      );
    }

    const [result] = await pool.query(
      `INSERT INTO agenda (hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [datos.hora_entrada, datos.hora_salida, datos.fecha, datos.id_medico, datos.id_especialidad, datos.id_sede]
    );

    return sendResponse(res, 201, 'Turno de agenda creado exitosamente', {
      id: result.insertId,
      ...datos
    });
  } catch (error) {
    console.error('Error en crearAgenda:', error);
    return sendResponse(res, 500, 'Error al crear el turno de agenda', null);
  }
};

// PUT /agenda/:id
const actualizarAgenda = async (req, res) => {
  const { id } = req.params;

  if (!esIdValido(id)) {
    return sendResponse(res, 400, 'El id de la agenda debe ser un número entero positivo.', null);
  }

  const { error, datos } = validarDatosAgenda(req.body);
  if (error) {
    return sendResponse(res, 400, error, null);
  }

  try {
    const [agendas] = await pool.query('SELECT id, id_medico FROM agenda WHERE id = ?', [id]);
    if (agendas.length === 0) {
      return sendResponse(res, 404, 'El turno de agenda que intenta modificar no existe.', null);
    }

    // El médico no puede modificar agenda ajena ni reasignarla a otro médico
    if (!esGestorGeneral(req.user) && (agendas[0].id_medico !== req.user.id || datos.id_medico !== req.user.id)) {
      return sendResponse(res, 403, 'Acceso denegado. Solo puede gestionar su propia agenda.', null);
    }

    const errorReferencias = await validarReferencias(datos);
    if (errorReferencias) {
      return sendResponse(res, 400, errorReferencias, null);
    }

    if (await existeSuperposicion(datos, Number(id))) {
      return sendResponse(
        res,
        409,
        'El médico ya tiene cargado un rango horario que se superpone con el indicado para esa fecha.',
        null
      );
    }

    await pool.query(
      `UPDATE agenda
       SET hora_entrada = ?, hora_salida = ?, fecha = ?, id_medico = ?, id_especialidad = ?, id_sede = ?
       WHERE id = ?`,
      [datos.hora_entrada, datos.hora_salida, datos.fecha, datos.id_medico, datos.id_especialidad, datos.id_sede, id]
    );

    return sendResponse(res, 200, 'Turno de agenda modificado exitosamente', {
      id: Number(id),
      ...datos
    });
  } catch (error) {
    console.error('Error en actualizarAgenda:', error);
    return sendResponse(res, 500, 'Error al modificar el turno de agenda', null);
  }
};

// DELETE /agenda/:id
const eliminarAgenda = async (req, res) => {
  const { id } = req.params;

  if (!esIdValido(id)) {
    return sendResponse(res, 400, 'El id de la agenda debe ser un número entero positivo.', null);
  }

  try {
    const [agendas] = await pool.query('SELECT id, id_medico FROM agenda WHERE id = ?', [id]);
    if (agendas.length === 0) {
      return sendResponse(res, 404, 'El turno de agenda que intenta eliminar no existe.', null);
    }

    if (!esGestorGeneral(req.user) && agendas[0].id_medico !== req.user.id) {
      return sendResponse(res, 403, 'Acceso denegado. Solo puede gestionar su propia agenda.', null);
    }

    await pool.query('DELETE FROM agenda WHERE id = ?', [id]);

    return sendResponse(res, 200, 'Turno de agenda eliminado exitosamente', { id: Number(id) });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
      return sendResponse(res, 409, 'No se puede eliminar el turno de agenda porque tiene dependencias asociadas.', null);
    }
    console.error('Error en eliminarAgenda:', error);
    return sendResponse(res, 500, 'Error al eliminar el turno de agenda', null);
  }
};

module.exports = {
  listarAgenda,
  obtenerAgenda,
  crearAgenda,
  actualizarAgenda,
  eliminarAgenda
};
