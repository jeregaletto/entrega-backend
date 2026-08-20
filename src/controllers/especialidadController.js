const pool = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');
const { limpiarTexto, esIdValido } = require('../utils/validators');

// GET /especialidades
const listarEspecialidades = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, descripcion FROM especialidad ORDER BY descripcion ASC'
    );
    return sendResponse(res, 200, 'Lista de especialidades obtenida con éxito', rows);
  } catch (error) {
    console.error('Error en listarEspecialidades:', error);
    return sendResponse(res, 500, 'Error al obtener las especialidades', null);
  }
};

// GET /especialidades/:id
const obtenerEspecialidad = async (req, res) => {
  const { id } = req.params;

  if (!esIdValido(id)) {
    return sendResponse(res, 400, 'El id de la especialidad debe ser un número entero positivo.', null);
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, descripcion FROM especialidad WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return sendResponse(res, 404, 'La especialidad solicitada no existe.', null);
    }

    return sendResponse(res, 200, 'Especialidad obtenida con éxito', rows[0]);
  } catch (error) {
    console.error('Error en obtenerEspecialidad:', error);
    return sendResponse(res, 500, 'Error al obtener la especialidad', null);
  }
};

// POST /especialidades
const crearEspecialidad = async (req, res) => {
  const descripcion = limpiarTexto(req.body.descripcion);

  if (!descripcion) {
    return sendResponse(res, 400, 'El campo descripcion es obligatorio.', null);
  }

  try {
    const [existentes] = await pool.query(
      'SELECT id FROM especialidad WHERE descripcion = ?',
      [descripcion]
    );
    if (existentes.length > 0) {
      return sendResponse(res, 400, 'Ya existe una especialidad con esa descripción.', null);
    }

    const [result] = await pool.query(
      'INSERT INTO especialidad (descripcion) VALUES (?)',
      [descripcion]
    );

    return sendResponse(res, 201, 'Especialidad creada exitosamente', {
      id: result.insertId,
      descripcion
    });
  } catch (error) {
    console.error('Error en crearEspecialidad:', error);
    return sendResponse(res, 500, 'Error al crear la especialidad', null);
  }
};

// PUT /especialidades/:id
const actualizarEspecialidad = async (req, res) => {
  const { id } = req.params;

  if (!esIdValido(id)) {
    return sendResponse(res, 400, 'El id de la especialidad debe ser un número entero positivo.', null);
  }

  const descripcion = limpiarTexto(req.body.descripcion);

  if (!descripcion) {
    return sendResponse(res, 400, 'El campo descripcion es obligatorio.', null);
  }

  try {
    const [especialidades] = await pool.query('SELECT id FROM especialidad WHERE id = ?', [id]);
    if (especialidades.length === 0) {
      return sendResponse(res, 404, 'La especialidad que intenta modificar no existe.', null);
    }

    const [duplicadas] = await pool.query(
      'SELECT id FROM especialidad WHERE descripcion = ? AND id <> ?',
      [descripcion, id]
    );
    if (duplicadas.length > 0) {
      return sendResponse(res, 400, 'Ya existe otra especialidad con esa descripción.', null);
    }

    await pool.query('UPDATE especialidad SET descripcion = ? WHERE id = ?', [descripcion, id]);

    return sendResponse(res, 200, 'Especialidad modificada exitosamente', {
      id: Number(id),
      descripcion
    });
  } catch (error) {
    console.error('Error en actualizarEspecialidad:', error);
    return sendResponse(res, 500, 'Error al modificar la especialidad', null);
  }
};

// DELETE /especialidades/:id
const eliminarEspecialidad = async (req, res) => {
  const { id } = req.params;

  if (!esIdValido(id)) {
    return sendResponse(res, 400, 'El id de la especialidad debe ser un número entero positivo.', null);
  }

  try {
    const [especialidades] = await pool.query('SELECT id FROM especialidad WHERE id = ?', [id]);
    if (especialidades.length === 0) {
      return sendResponse(res, 404, 'La especialidad que intenta eliminar no existe.', null);
    }

    // Validar que ningún médico la tenga asociada en medico_especialidad
    const [[{ medicos }]] = await pool.query(
      'SELECT COUNT(*) AS medicos FROM medico_especialidad WHERE id_especialidad = ?',
      [id]
    );
    // La agenda también referencia la especialidad: se controla para no romper con un 500
    const [[{ turnos }]] = await pool.query(
      'SELECT COUNT(*) AS turnos FROM agenda WHERE id_especialidad = ?',
      [id]
    );

    if (medicos > 0 || turnos > 0) {
      return sendResponse(
        res,
        409,
        'No se puede eliminar la especialidad porque tiene dependencias asociadas.',
        { medicos, agenda: turnos }
      );
    }

    await pool.query('DELETE FROM especialidad WHERE id = ?', [id]);

    return sendResponse(res, 200, 'Especialidad eliminada exitosamente', { id: Number(id) });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
      return sendResponse(res, 409, 'No se puede eliminar la especialidad porque tiene dependencias asociadas.', null);
    }
    console.error('Error en eliminarEspecialidad:', error);
    return sendResponse(res, 500, 'Error al eliminar la especialidad', null);
  }
};

module.exports = {
  listarEspecialidades,
  obtenerEspecialidad,
  crearEspecialidad,
  actualizarEspecialidad,
  eliminarEspecialidad
};
