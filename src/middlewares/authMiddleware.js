const jwt = require('jsonwebtoken');
const { sendResponse } = require('../utils/responseHandler');

const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return sendResponse(res, 401, 'Acceso denegado. Token no proporcionado.', null);
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
  if (!token) {
    return sendResponse(res, 401, 'Acceso denegado. Formato de token inválido.', null);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    next();
  } catch (error) {
    return sendResponse(res, 401, 'Token inválido o expirado.', null);
  }
};

const verificarRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.user || !req.user.rol) {
      return sendResponse(res, 403, 'Acceso denegado. Rol no identificado.', null);
    }

    if (!rolesPermitidos.includes(req.user.rol)) {
      return sendResponse(res, 403, 'Acceso denegado. No posee los permisos necesarios.', null);
    }

    next();
  };
};

module.exports = {
  verificarToken,
  verificarRol
};
