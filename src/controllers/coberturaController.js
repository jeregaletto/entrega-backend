const pool = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');
const { limpiarTexto, esIdValido } = require('../utils/validators');
const coberturaService = require('../services/coberturaService');

// GET /coberturas y GET /coberturas/disponibles
// Usa el servicio de solo lectura, el mismo que consume el registro de pacientes
const listarCoberturas = async (req, res) => {
  try {
    const coberturas = await coberturaService.listarCoberturas();
    return sendResponse(res, 200, 'Lista de coberturas obtenida con éxito', coberturas);
  } catch (error) {
    console.error('Error en listarCoberturas:', error);
    return sendResponse(res, 500, 'Error al obtener las coberturas', null);
  }
};

// GET /coberturas/:id
const obtenerCobertura = async (req, res) => {
  const { id } = req.params;

  if (!esIdValido(id)) {
    return sendResponse(res, 400, 'El id de la cobertura debe ser un número entero positivo.', null);
  }

  try {
    const cobertura = await coberturaService.obtenerCoberturaPorId(id);

    if (!cobertura) {
      return sendResponse(res, 404, 'La cobertura solicitada no existe.', null);
    }

    return sendResponse(res, 200, 'Cobertura obtenida con éxito', cobertura);
  } catch (error) {
    console.error('Error en obtenerCobertura:', error);
    return sendResponse(res, 500, 'Error al obtener la cobertura', null);
  }
};

// POST /coberturas
const crearCobertura = async (req, res) => {
  const nombre = limpiarTexto(req.body.nombre);

  if (!nombre) {
    return sendResponse(res, 400, 'El campo nombre es obligatorio.', null);
  }

  try {
    const [existentes] = await pool.query('SELECT id FROM cobertura WHERE nombre = ?', [nombre]);
    if (existentes.length > 0) {
      return sendResponse(res, 400, 'Ya existe una cobertura registrada con ese nombre.', null);
    }

    const [result] = await pool.query('INSERT INTO cobertura (nombre) VALUES (?)', [nombre]);

    return sendResponse(res, 201, 'Cobertura creada exitosamente', {
      id: result.insertId,
      nombre
    });
  } catch (error) {
    console.error('Error en crearCobertura:', error);
    return sendResponse(res, 500, 'Error al crear la cobertura', null);
  }
};

// PUT /coberturas/:id
const actualizarCobertura = async (req, res) => {
  const { id } = req.params;

  if (!esIdValido(id)) {
    return sendResponse(res, 400, 'El id de la cobertura debe ser un número entero positivo.', null);
  }

  const nombre = limpiarTexto(req.body.nombre);

  if (!nombre) {
    return sendResponse(res, 400, 'El campo nombre es obligatorio.', null);
  }

  try {
    const [coberturas] = await pool.query('SELECT id FROM cobertura WHERE id = ?', [id]);
    if (coberturas.length === 0) {
      return sendResponse(res, 404, 'La cobertura que intenta modificar no existe.', null);
    }

    const [duplicadas] = await pool.query(
      'SELECT id FROM cobertura WHERE nombre = ? AND id <> ?',
      [nombre, id]
    );
    if (duplicadas.length > 0) {
      return sendResponse(res, 400, 'Ya existe otra cobertura registrada con ese nombre.', null);
    }

    await pool.query('UPDATE cobertura SET nombre = ? WHERE id = ?', [nombre, id]);

    return sendResponse(res, 200, 'Cobertura modificada exitosamente', {
      id: Number(id),
      nombre
    });
  } catch (error) {
    console.error('Error en actualizarCobertura:', error);
    return sendResponse(res, 500, 'Error al modificar la cobertura', null);
  }
};

// DELETE /coberturas/:id
const eliminarCobertura = async (req, res) => {
  const { id } = req.params;

  if (!esIdValido(id)) {
    return sendResponse(res, 400, 'El id de la cobertura debe ser un número entero positivo.', null);
  }

  try {
    const [coberturas] = await pool.query('SELECT id FROM cobertura WHERE id = ?', [id]);
    if (coberturas.length === 0) {
      return sendResponse(res, 404, 'La cobertura que intenta eliminar no existe.', null);
    }

    // Validar que ningún usuario tenga la cobertura asociada
    const [[{ usuarios }]] = await pool.query(
      'SELECT COUNT(*) AS usuarios FROM usuario WHERE id_cobertura = ?',
      [id]
    );

    if (usuarios > 0) {
      return sendResponse(
        res,
        409,
        'No se puede eliminar la cobertura porque tiene usuarios asociados.',
        { usuarios }
      );
    }

    await pool.query('DELETE FROM cobertura WHERE id = ?', [id]);

    return sendResponse(res, 200, 'Cobertura eliminada exitosamente', { id: Number(id) });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
      return sendResponse(res, 409, 'No se puede eliminar la cobertura porque tiene dependencias asociadas.', null);
    }
    console.error('Error en eliminarCobertura:', error);
    return sendResponse(res, 500, 'Error al eliminar la cobertura', null);
  }
};

module.exports = {
  listarCoberturas,
  obtenerCobertura,
  crearCobertura,
  actualizarCobertura,
  eliminarCobertura
};
