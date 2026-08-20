/**
 * Helpers de validación reutilizados por los CRUD de la semana 2.
 */

// Normaliza un texto recibido por body: recorta espacios y descarta vacíos
const limpiarTexto = (valor) => {
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim();
  return limpio.length > 0 ? limpio : null;
};

// Valida que un id de path/query sea un entero positivo
const esIdValido = (valor) => {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0;
};

// Valida formato de fecha YYYY-MM-DD y que sea una fecha real del calendario
const esFechaValida = (valor) => {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [anio, mes, dia] = valor.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
};

// Valida formato de hora HH:MM o HH:MM:SS
const esHoraValida = (valor) => {
  return typeof valor === 'string' && /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(valor);
};

// Lleva la hora a formato HH:MM:SS para comparar y guardar de forma uniforme
const normalizarHora = (valor) => {
  if (!esHoraValida(valor)) return null;
  return valor.length === 5 ? `${valor}:00` : valor;
};

module.exports = {
  limpiarTexto,
  esIdValido,
  esFechaValida,
  esHoraValida,
  normalizarHora
};
