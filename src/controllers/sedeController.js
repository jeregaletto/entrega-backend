const pool = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');
const { limpiarTexto, esIdValido } = require('../utils/validators');

// GET /sedes
const listarSedes = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, direccion, telefono FROM sede ORDER BY nombre ASC'
    );
    return sendResponse(res, 200, 'Lista de sedes obtenida con éxito', rows);
  } catch (error) {
    console.error('Error en listarSedes:', error);
    return sendResponse(res, 500, 'Error al obtener las sedes', null);
  }
};

// GET /sedes/:id
const obtenerSede = async (req, res) => {
  const { id } = req.params;

  if (!esIdValido(id)) {
    return sendResponse(res, 400, 'El id de la sede debe ser un número entero positivo.', null);
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, direccion, telefono FROM sede WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return sendResponse(res, 404, 'La sede solicitada no existe.', null);
    }

    return sendResponse(res, 200, 'Sede obtenida con éxito', rows[0]);
  } catch (error) {
    console.error('Error en obtenerSede:', error);
    return sendResponse(res, 500, 'Error al obtener la sede', null);
  }
};

// POST /sedes
const crearSede = async (req, res) => {
  const nombre = limpiarTexto(req.body.nombre);
  const direccion = limpiarTexto(req.body.direccion);
  const telefono = limpiarTexto(req.body.telefono);

  if (!nombre || !direccion) {
    return sendResponse(res, 400, 'Los campos nombre y direccion son obligatorios.', null);
  }

  try {
    // Evitar sedes duplicadas por nombre
    const [existentes] = await pool.query('SELECT id FROM sede WHERE nombre = ?', [nombre]);
    if (existentes.length > 0) {
      return sendResponse(res, 400, 'Ya existe una sede registrada con ese nombre.', null);
    }

    const [result] = await pool.query(
      'INSERT INTO sede (nombre, direccion, telefono) VALUES (?, ?, ?)',
      [nombre, direccion, telefono]
    );

    return sendResponse(res, 201, 'Sede creada exitosamente', {
      id: result.insertId,
      nombre,
      direccion,
      telefono
    });
  } catch (error) {
    console.error('Error en crearSede:', error);
    return sendResponse(res, 500, 'Error al crear la sede', null);
  }
};

// PUT /sedes/:id
const actualizarSede = async (req, res) => {
  const { id } = req.params;

  if (!esIdValido(id)) {
    return sendResponse(res, 400, 'El id de la sede debe ser un número entero positivo.', null);
  }

  const nombre = limpiarTexto(req.body.nombre);
  const direccion = limpiarTexto(req.body.direccion);
  const telefono = limpiarTexto(req.body.telefono);

  if (!nombre || !direccion) {
    return sendResponse(res, 400, 'Los campos nombre y direccion son obligatorios.', null);
  }

  try {
    const [sedes] = await pool.query('SELECT id FROM sede WHERE id = ?', [id]);
    if (sedes.length === 0) {
      return sendResponse(res, 404, 'La sede que intenta modificar no existe.', null);
    }

    // El nombre no puede pisar el de otra sede
    const [duplicadas] = await pool.query(
      'SELECT id FROM sede WHERE nombre = ? AND id <> ?',
      [nombre, id]
    );
    if (duplicadas.length > 0) {
      return sendResponse(res, 400, 'Ya existe otra sede registrada con ese nombre.', null);
    }

    await pool.query(
      'UPDATE sede SET nombre = ?, direccion = ?, telefono = ? WHERE id = ?',
      [nombre, direccion, telefono, id]
    );

    return sendResponse(res, 200, 'Sede modificada exitosamente', {
      id: Number(id),
      nombre,
      direccion,
      telefono
    });
  } catch (error) {
    console.error('Error en actualizarSede:', error);
    return sendResponse(res, 500, 'Error al modificar la sede', null);
  }
};

// DELETE /sedes/:id
const eliminarSede = async (req, res) => {
  const { id } = req.params;

  if (!esIdValido(id)) {
    return sendResponse(res, 400, 'El id de la sede debe ser un número entero positivo.', null);
  }

  try {
    const [sedes] = await pool.query('SELECT id, nombre FROM sede WHERE id = ?', [id]);
    if (sedes.length === 0) {
      return sendResponse(res, 404, 'La sede que intenta eliminar no existe.', null);
    }

    // Validar dependencias antes de eliminar: médicos, operadores y agenda asociada
    const [[{ medicos }]] = await pool.query(
      "SELECT COUNT(*) AS medicos FROM usuario WHERE id_sede = ? AND rol = 'medico'",
      [id]
    );
    const [[{ operadores }]] = await pool.query(
      "SELECT COUNT(*) AS operadores FROM usuario WHERE id_sede = ? AND rol = 'operador'",
      [id]
    );
    const [[{ turnos }]] = await pool.query(
      'SELECT COUNT(*) AS turnos FROM agenda WHERE id_sede = ?',
      [id]
    );

    if (medicos > 0 || operadores > 0 || turnos > 0) {
      return sendResponse(
        res,
        409,
        'No se puede eliminar la sede porque tiene dependencias asociadas.',
        { medicos, operadores, agenda: turnos }
      );
    }

    await pool.query('DELETE FROM sede WHERE id = ?', [id]);

    return sendResponse(res, 200, 'Sede eliminada exitosamente', { id: Number(id) });
  } catch (error) {
    // Red de seguridad ante otra dependencia por clave foránea no contemplada
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
      return sendResponse(res, 409, 'No se puede eliminar la sede porque tiene dependencias asociadas.', null);
    }
    console.error('Error en eliminarSede:', error);
    return sendResponse(res, 500, 'Error al eliminar la sede', null);
  }
};

module.exports = {
  listarSedes,
  obtenerSede,
  crearSede,
  actualizarSede,
  eliminarSede
};
