/**
  * Formato JSON Uniforme de Respuesta:
  * {
  *   "code": <numero_http_code>,
  *   "status": "<mensaje_o_estado>",
  *   "data": <objeto_o_null>
  * }
  */
const sendResponse = (res, code, status, data = null) => {
  return res.status(code).json({
    code,
    status,
    data
  });
};

module.exports = { sendResponse };
