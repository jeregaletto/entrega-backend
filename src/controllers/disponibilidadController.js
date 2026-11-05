// src/controllers/disponibilidadController.js
const pool = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');

const DURACION_TURNO_MINUTOS = 30;
const ESTADOS_OCUPADOS = ['confirmado', 'atendido'];

const esIdValido = (id) => Number.isInteger(Number(id)) && Number(id) > 0;

const esFechaValida = (valor) => {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [anio, mes, dia] = valor.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
};

// Convierte 'HH:mm' o 'HH:mm:ss' a minutos desde las 00:00
const horaAMinutos = (hora) => {
  const [h, m] = hora.substring(0, 5).split(':').map(Number);
  return h * 60 + m;
};

const minutosAHora = (minutos) => {
  const h = Math.floor(minutos / 60).toString().padStart(2, '0');
  const m = (minutos % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

// Fragmenta una franja [hora_entrada, hora_salida) en horarios de DURACION_TURNO_MINUTOS
const fragmentarFranja = (horaEntrada, horaSalida) => {
  const inicio = horaAMinutos(horaEntrada);
  const fin = horaAMinutos(horaSalida);
  const horarios = [];
  for (let actual = inicio; actual + DURACION_TURNO_MINUTOS <= fin; actual += DURACION_TURNO_MINUTOS) {
    horarios.push(minutosAHora(actual));
  }
  return horarios;
};

// GET /disponibilidad/fechas - Fechas futuras con agenda disponible para un médico/especialidad/sede
// GET /disponibilidad/fechas - Fechas futuras con agenda disponible para un médico/especialidad/sede
const getFechasDisponibles = async (req, res) => {
  const { id_medico, id_especialidad, id_sede } = req.query;
  console.log("Datos recibidos en backend:", req.query);

  if (!id_medico || !id_especialidad || !id_sede) {
    return sendResponse(res, 400, 'Los parámetros id_medico, id_especialidad e id_sede son obligatorios.', null);
  }

  if (!esIdValido(id_medico) || !esIdValido(id_especialidad) || !esIdValido(id_sede)) {
    return sendResponse(res, 400, 'Los parámetros id_medico, id_especialidad e id_sede deben ser números enteros positivos.', null);
  }

  try {
    // Las líneas de prueba van acá adentro, donde el 'await' es válido:
    
    const [debugRows] = await pool.query('SELECT * FROM agenda WHERE id_medico = ?', [id_medico]);


    const [rows] = await pool.query(
      `SELECT DISTINCT fecha FROM agenda
       WHERE id_medico = ? AND id_especialidad = ? AND id_sede = ? AND fecha >= CURDATE()
       ORDER BY fecha ASC`,
      [id_medico, id_especialidad, id_sede]
    );

    const fechas = rows.map((r) =>
      r.fecha instanceof Date ? r.fecha.toISOString().split('T')[0] : r.fecha
    );

    return sendResponse(res, 200, 'success', fechas);
  } catch (error) {
    console.error('Error en getFechasDisponibles:', error);
    return sendResponse(res, 500, 'Error al consultar las fechas disponibles', null);
  }
};

// GET /disponibilidad/horarios - Horarios libres de un médico/especialidad/sede en una fecha puntual
const getHorariosDisponibles = async (req, res) => {
  const { id_medico, id_especialidad, id_sede, fecha } = req.query;

  if (!id_medico || !id_especialidad || !id_sede || !fecha) {
    return sendResponse(res, 400, 'Los parámetros id_medico, id_especialidad, id_sede y fecha son obligatorios.', null);
  }

  if (!esIdValido(id_medico) || !esIdValido(id_especialidad) || !esIdValido(id_sede)) {
    return sendResponse(res, 400, 'Los parámetros id_medico, id_especialidad e id_sede deben ser números enteros positivos.', null);
  }

  if (!esFechaValida(fecha)) {
    return sendResponse(res, 400, 'El parámetro fecha debe tener el formato YYYY-MM-DD y ser una fecha válida.', null);
  }

  try {
    const [franjas] = await pool.query(
      `SELECT id, hora_entrada, hora_salida FROM agenda
       WHERE id_medico = ? AND id_especialidad = ? AND id_sede = ? AND fecha = ?`,
      [id_medico, id_especialidad, id_sede, fecha]
    );

    if (franjas.length === 0) {
      return sendResponse(res, 200, 'success', []);
    }

    const idsAgenda = franjas.map((f) => f.id);
    const [turnosOcupados] = await pool.query(
      `SELECT hora FROM turno
       WHERE id_agenda IN (?) AND fecha = ? AND estado IN (?)`,
      [idsAgenda, fecha, ESTADOS_OCUPADOS]
    );

    const horasOcupadas = new Set(turnosOcupados.map((t) => t.hora.substring(0, 5)));

    const horariosLibres = [];
    for (const franja of franjas) {
      const horarios = fragmentarFranja(franja.hora_entrada, franja.hora_salida);
      for (const h of horarios) {
        if (!horasOcupadas.has(h)) {
          horariosLibres.push(h);
        }
      }
    }

    horariosLibres.sort();

    return sendResponse(res, 200, 'success', horariosLibres);
  } catch (error) {
    console.error('Error en getHorariosDisponibles:', error);
    return sendResponse(res, 500, 'Error al consultar los horarios disponibles', null);
  }
};

module.exports = {
  getFechasDisponibles,
  getHorariosDisponibles
};
