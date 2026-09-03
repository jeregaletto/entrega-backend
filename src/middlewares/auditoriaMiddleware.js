// src/middlewares/auditoriaMiddleware.js
const { registrarAuditoria } = require('../utils/auditoriaHelper');

/**
 * Middleware de auditoría automática.
 *
 * Se monta a nivel de router y registra en `log_auditoria` toda alta, baja o
 * modificación que termine de forma exitosa, sin necesidad de repetir la
 * llamada dentro de cada controlador.
 *
 * El método HTTP determina la acción:
 *   POST -> ALTA | PUT -> MODIFICACION | DELETE -> BAJA
 *
 * Solo se audita si la respuesta sale con un código 2xx: un 400 o un 403
 * no llegan a modificar nada y por lo tanto no generan registro.
 *
 * @param {string} entidad - Entidad afectada ('sede', 'especialidad', 'cobertura', 'usuario').
 */
const ACCION_POR_METODO = {
  POST: 'ALTA',
  PUT: 'MODIFICACION',
  DELETE: 'BAJA'
};

/**
 * Arma un detalle legible a partir de los datos que devolvió el endpoint.
 */
const construirDetalle = (accion, entidad, datos, idEntidad) => {
  const etiqueta =
    (datos && (datos.nombre || datos.descripcion)) ||
    (datos && datos.apellido ? `${datos.nombre || ''} ${datos.apellido}`.trim() : null);

  const acciones = { ALTA: 'Alta', MODIFICACION: 'Modificación', BAJA: 'Baja' };
  const base = `${acciones[accion]} de ${entidad} id=${idEntidad !== null ? idEntidad : 's/d'}`;

  return etiqueta ? `${base}: ${etiqueta}` : base;
};

const auditar = (entidad) => {
  return (req, res, next) => {
    const accion = ACCION_POR_METODO[req.method];

    // Las consultas (GET) no se auditan
    if (!accion) return next();

    const enviarJson = res.json.bind(res);

    res.json = (body) => {
      try {
        const exitoso = body && typeof body.code === 'number' && body.code >= 200 && body.code < 300;

        if (exitoso) {
          const datos = body.data || null;

          // El id sale de la respuesta (alta) o de la ruta (modificación / baja)
          let idEntidad = null;
          if (datos && datos.id !== undefined && datos.id !== null) {
            idEntidad = Number(datos.id);
          } else if (req.params.id) {
            idEntidad = Number(req.params.id);
          }

          // En el registro público de pacientes no hay usuario autenticado:
          // el actor es el propio usuario recién creado.
          const idUsuario = (req.user && req.user.id) || (datos && datos.id) || null;

          // Fire and forget: el helper no propaga errores para no cortar la respuesta
          registrarAuditoria(
            idUsuario,
            accion,
            entidad,
            idEntidad,
            construirDetalle(accion, entidad, datos, idEntidad)
          );
        }
      } catch (error) {
        console.error('Error en el middleware de auditoría:', error);
      }

      return enviarJson(body);
    };

    next();
  };
};

module.exports = { auditar };
