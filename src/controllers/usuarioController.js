// src/controllers/usuarioController.js
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');
const { registrarAuditoria } = require('../utils/auditoriaHelper');

const esIdValido = (id) => Number.isInteger(Number(id)) && Number(id) > 0;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DNI_REGEX = /^\d{7,8}$/;
const TELEFONO_REGEX = /^\d{6,10}$/;

const esFechaValidaYNoFutura = (valor) => {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [anio, mes, dia] = valor.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (fecha.getUTCFullYear() !== anio || fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) {
    return false;
  }
  const hoy = new Date().toISOString().split('T')[0];
  return valor <= hoy;
};

const getUsuarioItem = async (executor, id) => {
  const [rows] = await executor.query(
    `SELECT 
      u.id, 
      u.nombre, 
      u.apellido, 
      u.dni, 
      u.email, 
      u.telefono,
      DATE_FORMAT(u.fecha_nacimiento, '%Y-%m-%d') AS fecha_nacimiento,
      u.rol, 
      u.id_sede, 
      s.nombre AS sede_nombre,
      u.id_cobertura, 
      c.nombre AS cobertura_nombre
     FROM usuario u
     LEFT JOIN sede s ON u.id_sede = s.id
     LEFT JOIN cobertura c ON u.id_cobertura = c.id
     WHERE u.id = ?`,
    [id]
  );

  if (rows.length === 0) return null;
  const user = rows[0];

  let especialidades = [];
  if (user.rol === 'medico') {
    const [esps] = await executor.query(
      `SELECT e.id, e.descripcion
       FROM medico_especialidad me
       INNER JOIN especialidad e ON me.id_especialidad = e.id
       WHERE me.id_medico = ?
       ORDER BY e.descripcion ASC`,
      [id]
    );
    especialidades = esps.map((e) => ({ id: e.id, descripcion: e.descripcion }));
  }

  return {
    id: user.id,
    nombre: user.nombre,
    apellido: user.apellido,
    dni: user.dni,
    email: user.email,
    telefono: user.telefono,
    fecha_nacimiento: user.fecha_nacimiento,
    rol: user.rol,
    id_sede: user.id_sede,
    sede_nombre: user.sede_nombre,
    id_cobertura: user.id_cobertura,
    cobertura_nombre: user.cobertura_nombre,
    especialidades
  };
};

// GET /usuarios - Listar usuarios con paginación y filtros
const getAllUsuarios = async (req, res) => {
  const { page = 1, limit = 10, nombre, apellido, rol, id_sede } = req.query;

  const pageNum = Number(page);
  const limitNum = Number(limit);

  if (!Number.isInteger(pageNum) || pageNum <= 0) {
    return sendResponse(res, 400, 'El parámetro page debe ser un número entero positivo.', null);
  }

  if (!Number.isInteger(limitNum) || limitNum <= 0 || limitNum > 100) {
    return sendResponse(res, 400, 'El parámetro limit debe ser un número entero positivo entre 1 y 100.', null);
  }

  const ROLES_VALIDOS = ['admin', 'operador', 'medico', 'paciente'];
  if (rol !== undefined && !ROLES_VALIDOS.includes(rol)) {
    return sendResponse(res, 400, 'El parámetro rol debe ser uno de: admin, operador, medico, paciente.', null);
  }

  if (id_sede !== undefined && !esIdValido(id_sede)) {
    return sendResponse(res, 400, 'El parámetro id_sede debe ser un número entero positivo.', null);
  }

  try {
    const filtros = ['1=1'];
    const params = [];

    if (nombre && typeof nombre === 'string' && nombre.trim()) {
      filtros.push('LOWER(u.nombre) LIKE LOWER(?)');
      params.push(`%${nombre.trim()}%`);
    }

    if (apellido && typeof apellido === 'string' && apellido.trim()) {
      filtros.push('LOWER(u.apellido) LIKE LOWER(?)');
      params.push(`%${apellido.trim()}%`);
    }

    if (rol) {
      filtros.push('u.rol = ?');
      params.push(rol);
    }

    if (id_sede !== undefined) {
      filtros.push('u.id_sede = ?');
      params.push(Number(id_sede));
    }

    const whereClause = filtros.join(' AND ');

    // Conteo total para paginación
    const [countResult] = await pool.query(
      `SELECT COUNT(*) AS total FROM usuario u WHERE ${whereClause}`,
      params
    );
    const total = Number(countResult[0].total) || 0;

    const offset = (pageNum - 1) * limitNum;
    const queryUsuarios = `
      SELECT 
        u.id, 
        u.nombre, 
        u.apellido, 
        u.dni, 
        u.email, 
        u.telefono,
        DATE_FORMAT(u.fecha_nacimiento, '%Y-%m-%d') AS fecha_nacimiento,
        u.rol, 
        u.id_sede, 
        s.nombre AS sede_nombre,
        u.id_cobertura, 
        c.nombre AS cobertura_nombre
      FROM usuario u
      LEFT JOIN sede s ON u.id_sede = s.id
      LEFT JOIN cobertura c ON u.id_cobertura = c.id
      WHERE ${whereClause}
      ORDER BY u.apellido ASC, u.nombre ASC
      LIMIT ? OFFSET ?
    `;

    const [usuarios] = await pool.query(queryUsuarios, [...params, limitNum, offset]);

    // Obtener especialidades de los médicos incluidos en el resultado
    const medicosIds = usuarios.filter((u) => u.rol === 'medico').map((u) => u.id);
    const espPorMedico = {};

    if (medicosIds.length > 0) {
      const [esps] = await pool.query(
        `SELECT me.id_medico, e.id, e.descripcion
         FROM medico_especialidad me
         INNER JOIN especialidad e ON me.id_especialidad = e.id
         WHERE me.id_medico IN (?)
         ORDER BY e.descripcion ASC`,
        [medicosIds]
      );
      for (const esp of esps) {
        if (!espPorMedico[esp.id_medico]) {
          espPorMedico[esp.id_medico] = [];
        }
        espPorMedico[esp.id_medico].push({
          id: esp.id,
          descripcion: esp.descripcion
        });
      }
    }

    const items = usuarios.map((u) => ({
      id: u.id,
      nombre: u.nombre,
      apellido: u.apellido,
      dni: u.dni,
      email: u.email,
      telefono: u.telefono,
      fecha_nacimiento: u.fecha_nacimiento,
      rol: u.rol,
      id_sede: u.id_sede,
      sede_nombre: u.sede_nombre,
      id_cobertura: u.id_cobertura,
      cobertura_nombre: u.cobertura_nombre,
      especialidades: u.rol === 'medico' ? (espPorMedico[u.id] || []) : []
    }));

    return sendResponse(res, 200, 'Usuarios obtenidos con éxito', {
      items,
      total,
      page: pageNum,
      limit: limitNum
    });
  } catch (error) {
    console.error('Error en getAllUsuarios:', error);
    return sendResponse(res, 500, 'Error al obtener la lista de usuarios', null);
  }
};

// GET /usuarios/:id - Obtener usuario por ID
const getUsuarioById = async (req, res) => {
  const { id } = req.params;

  if (!esIdValido(id)) {
    return sendResponse(res, 400, 'El ID de usuario debe ser un número entero positivo.', null);
  }

  try {
    const item = await getUsuarioItem(pool, id);
    if (!item) {
      return sendResponse(res, 404, 'Usuario no encontrado', null);
    }
    return sendResponse(res, 200, 'Usuario obtenido con éxito', item);
  } catch (error) {
    console.error('Error en getUsuarioById:', error);
    return sendResponse(res, 500, 'Error al obtener el usuario', null);
  }
};

// POST /usuarios - Crear usuario (admin, operador o medico)
const createUsuario = async (req, res) => {
  const { nombre, apellido, dni, email, password, fecha_nacimiento, telefono, rol, id_sede, especialidades } = req.body;

  const ROLES_CREABLES = ['admin', 'operador', 'medico'];
  if (!rol || !ROLES_CREABLES.includes(rol)) {
    return sendResponse(res, 400, 'El rol debe ser admin, operador o medico.', null);
  }

  const nombreTrim = typeof nombre === 'string' ? nombre.trim() : '';
  const apellidoTrim = typeof apellido === 'string' ? apellido.trim() : '';
  const dniTrim = typeof dni === 'string' ? dni.trim() : (dni !== undefined && dni !== null ? String(dni).trim() : '');
  const emailTrim = typeof email === 'string' ? email.trim() : '';
  const telefonoTrim = typeof telefono === 'string' ? telefono.trim() : (telefono !== undefined && telefono !== null ? String(telefono).trim() : '');

  if (!nombreTrim) {
    return sendResponse(res, 400, 'El nombre es obligatorio.', null);
  }
  if (nombreTrim.length > 30) {
    return sendResponse(res, 400, 'El nombre no puede superar los 30 caracteres.', null);
  }

  if (!apellidoTrim) {
    return sendResponse(res, 400, 'El apellido es obligatorio.', null);
  }
  if (apellidoTrim.length > 30) {
    return sendResponse(res, 400, 'El apellido no puede superar los 30 caracteres.', null);
  }

  if (!dniTrim || !DNI_REGEX.test(dniTrim)) {
    return sendResponse(res, 400, 'El DNI debe contener 7 u 8 dígitos numéricos.', null);
  }

  if (!emailTrim || !EMAIL_REGEX.test(emailTrim)) {
    return sendResponse(res, 400, 'El email ingresado no es válido.', null);
  }
  if (emailTrim.length > 30) {
    return sendResponse(res, 400, 'El email no puede superar los 30 caracteres.', null);
  }

  if (!telefonoTrim || !TELEFONO_REGEX.test(telefonoTrim)) {
    return sendResponse(res, 400, 'El teléfono debe contener entre 6 y 10 dígitos numéricos.', null);
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return sendResponse(res, 400, 'La contraseña debe tener al menos 6 caracteres.', null);
  }

  if (!fecha_nacimiento || !esFechaValidaYNoFutura(fecha_nacimiento)) {
    return sendResponse(res, 400, 'La fecha de nacimiento debe tener formato YYYY-MM-DD válido y no puede ser futura.', null);
  }

  let sedeFinal = null;
  if (rol === 'operador' || rol === 'medico') {
    if (!id_sede || !esIdValido(id_sede)) {
      return sendResponse(res, 400, 'La sede es obligatoria para los roles operador y médico.', null);
    }
    const [sedeCheck] = await pool.query('SELECT id FROM sede WHERE id = ?', [id_sede]);
    if (sedeCheck.length === 0) {
      return sendResponse(res, 400, 'La sede especificada no existe.', null);
    }
    sedeFinal = Number(id_sede);
  } else if (rol === 'admin') {
    sedeFinal = null;
  }

  let especialidadesUnicas = [];
  if (rol === 'medico') {
    if (!Array.isArray(especialidades) || especialidades.length === 0) {
      return sendResponse(res, 400, 'El médico debe tener al menos una especialidad.', null);
    }
    especialidadesUnicas = [...new Set(especialidades.map(Number))];
    if (especialidadesUnicas.length !== especialidades.length) {
      return sendResponse(res, 400, 'El arreglo de especialidades no puede contener valores duplicados.', null);
    }
    for (const espId of especialidadesUnicas) {
      if (!esIdValido(espId)) {
        return sendResponse(res, 400, 'Los IDs de especialidad deben ser números enteros positivos.', null);
      }
    }
    const [checkEsps] = await pool.query(
      'SELECT id FROM especialidad WHERE id IN (?)',
      [especialidadesUnicas]
    );
    if (checkEsps.length !== especialidadesUnicas.length) {
      return sendResponse(res, 400, 'Una o más especialidades especificadas no existen.', null);
    }
  }

  try {
    // Validar duplicidad de DNI y Email con los mismos mensajes que auth/registro
    const [existingUser] = await pool.query(
      'SELECT id, dni, email FROM usuario WHERE dni = ? OR email = ?',
      [dniTrim, emailTrim]
    );

    if (existingUser.length > 0) {
      const isDni = existingUser.some((u) => u.dni === dniTrim);
      const isEmail = existingUser.some((u) => u.email === emailTrim);

      let msg = 'El usuario ya se encuentra registrado.';
      if (isDni && isEmail) msg = 'El DNI y el Email ya se encuentran registrados.';
      else if (isDni) msg = 'El DNI ya se encuentra registrado.';
      else if (isEmail) msg = 'El Email ya se encuentra registrado.';

      return sendResponse(res, 400, msg, null);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const connection = await pool.getConnection();
    let nuevoId = null;

    try {
      await connection.beginTransaction();

      const [result] = await connection.query(
        `INSERT INTO usuario (nombre, apellido, dni, email, password, fecha_nacimiento, telefono, rol, id_sede, id_cobertura)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        [nombreTrim, apellidoTrim, dniTrim, emailTrim, hashedPassword, fecha_nacimiento, telefonoTrim, rol, sedeFinal]
      );

      nuevoId = result.insertId;

      if (rol === 'medico') {
        for (const espId of especialidadesUnicas) {
          await connection.query(
            'INSERT INTO medico_especialidad (id_medico, id_especialidad) VALUES (?, ?)',
            [nuevoId, espId]
          );
        }
      }

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    // Auditoría sin datos sensibles
    await registrarAuditoria(
      req.user.id,
      'ALTA',
      'usuario',
      nuevoId,
      `Alta de usuario: ${nombreTrim} ${apellidoTrim} (Rol: ${rol})`
    );

    const itemCreado = await getUsuarioItem(pool, nuevoId);
    return sendResponse(res, 201, 'Usuario creado exitosamente', itemCreado);
  } catch (error) {
    console.error('Error en createUsuario:', error);
    return sendResponse(res, 500, 'Error interno al crear el usuario', null);
  }
};

// PUT /usuarios/:id - Actualizar usuario existente
const updateUsuario = async (req, res) => {
  const { id } = req.params;

  if (!esIdValido(id)) {
    return sendResponse(res, 400, 'El ID de usuario debe ser un número entero positivo.', null);
  }

  const { nombre, apellido, dni, email, password, fecha_nacimiento, telefono, rol, id_sede, id_cobertura, especialidades } = req.body;

  try {
    const [existing] = await pool.query('SELECT * FROM usuario WHERE id = ?', [id]);
    if (existing.length === 0) {
      return sendResponse(res, 404, 'Usuario no encontrado', null);
    }

    const usuarioActual = existing[0];

    // Rol inmutable
    if (rol !== undefined && rol !== usuarioActual.rol) {
      return sendResponse(res, 400, 'El rol no puede ser modificado.', null);
    }

    const nombreTrim = typeof nombre === 'string' ? nombre.trim() : '';
    const apellidoTrim = typeof apellido === 'string' ? apellido.trim() : '';
    const dniTrim = typeof dni === 'string' ? dni.trim() : (dni !== undefined && dni !== null ? String(dni).trim() : '');
    const emailTrim = typeof email === 'string' ? email.trim() : '';
    const telefonoTrim = typeof telefono === 'string' ? telefono.trim() : (telefono !== undefined && telefono !== null ? String(telefono).trim() : '');

    if (!nombreTrim) {
      return sendResponse(res, 400, 'El nombre es obligatorio.', null);
    }
    if (nombreTrim.length > 30) {
      return sendResponse(res, 400, 'El nombre no puede superar los 30 caracteres.', null);
    }

    if (!apellidoTrim) {
      return sendResponse(res, 400, 'El apellido es obligatorio.', null);
    }
    if (apellidoTrim.length > 30) {
      return sendResponse(res, 400, 'El apellido no puede superar los 30 caracteres.', null);
    }

    if (!dniTrim || !DNI_REGEX.test(dniTrim)) {
      return sendResponse(res, 400, 'El DNI debe contener 7 u 8 dígitos numéricos.', null);
    }

    if (!emailTrim || !EMAIL_REGEX.test(emailTrim)) {
      return sendResponse(res, 400, 'El email ingresado no es válido.', null);
    }
    if (emailTrim.length > 30) {
      return sendResponse(res, 400, 'El email no puede superar los 30 caracteres.', null);
    }

    if (!telefonoTrim || !TELEFONO_REGEX.test(telefonoTrim)) {
      return sendResponse(res, 400, 'El teléfono debe contener entre 6 y 10 dígitos numéricos.', null);
    }

    if (!fecha_nacimiento || !esFechaValidaYNoFutura(fecha_nacimiento)) {
      return sendResponse(res, 400, 'La fecha de nacimiento debe tener formato YYYY-MM-DD válido y no puede ser futura.', null);
    }

    // Contraseña opcional
    let passwordFinal = usuarioActual.password;
    if (password !== undefined && password !== null && password !== '') {
      if (typeof password !== 'string' || password.length < 6) {
        return sendResponse(res, 400, 'La contraseña debe tener al menos 6 caracteres.', null);
      }
      passwordFinal = await bcrypt.hash(password, 10);
    }

    // Unicidad de DNI y Email excluyendo al propio usuario
    const [duplicados] = await pool.query(
      'SELECT id, dni, email FROM usuario WHERE (dni = ? OR email = ?) AND id != ?',
      [dniTrim, emailTrim, id]
    );

    if (duplicados.length > 0) {
      const isDni = duplicados.some((u) => u.dni === dniTrim);
      const isEmail = duplicados.some((u) => u.email === emailTrim);

      let msg = 'El usuario ya se encuentra registrado.';
      if (isDni && isEmail) msg = 'El DNI y el Email ya se encuentran registrados.';
      else if (isDni) msg = 'El DNI ya se encuentra registrado.';
      else if (isEmail) msg = 'El Email ya se encuentra registrado.';

      return sendResponse(res, 400, msg, null);
    }

    let sedeFinal = null;
    let coberturaFinal = null;
    let especialidadesUnicas = [];

    if (usuarioActual.rol === 'paciente') {
      if (!id_cobertura || !esIdValido(id_cobertura)) {
        return sendResponse(res, 400, 'La cobertura es obligatoria para usuarios con rol paciente.', null);
      }
      const [cobCheck] = await pool.query('SELECT id FROM cobertura WHERE id = ?', [id_cobertura]);
      if (cobCheck.length === 0) {
        return sendResponse(res, 400, 'La cobertura especificada no existe.', null);
      }
      coberturaFinal = Number(id_cobertura);
      sedeFinal = null;
    } else if (usuarioActual.rol === 'operador') {
      if (!id_sede || !esIdValido(id_sede)) {
        return sendResponse(res, 400, 'La sede es obligatoria para el rol operador.', null);
      }
      const [sedeCheck] = await pool.query('SELECT id FROM sede WHERE id = ?', [id_sede]);
      if (sedeCheck.length === 0) {
        return sendResponse(res, 400, 'La sede especificada no existe.', null);
      }
      sedeFinal = Number(id_sede);
      coberturaFinal = null;
    } else if (usuarioActual.rol === 'admin') {
      sedeFinal = null;
      coberturaFinal = null;
    } else if (usuarioActual.rol === 'medico') {
      if (!id_sede || !esIdValido(id_sede)) {
        return sendResponse(res, 400, 'La sede es obligatoria para el rol médico.', null);
      }
      const [sedeCheck] = await pool.query('SELECT id FROM sede WHERE id = ?', [id_sede]);
      if (sedeCheck.length === 0) {
        return sendResponse(res, 400, 'La sede especificada no existe.', null);
      }
      sedeFinal = Number(id_sede);
      coberturaFinal = null;

      if (!Array.isArray(especialidades) || especialidades.length === 0) {
        return sendResponse(res, 400, 'El médico debe tener al menos una especialidad.', null);
      }
      especialidadesUnicas = [...new Set(especialidades.map(Number))];
      if (especialidadesUnicas.length !== especialidades.length) {
        return sendResponse(res, 400, 'El arreglo de especialidades no puede contener valores duplicados.', null);
      }
      for (const espId of especialidadesUnicas) {
        if (!esIdValido(espId)) {
          return sendResponse(res, 400, 'Los IDs de especialidad deben ser números enteros positivos.', null);
        }
      }
      const [checkEsps] = await pool.query(
        'SELECT id FROM especialidad WHERE id IN (?)',
        [especialidadesUnicas]
      );
      if (checkEsps.length !== especialidadesUnicas.length) {
        return sendResponse(res, 400, 'Una o más especialidades especificadas no existen.', null);
      }

      // Validar si se intenta quitar una especialidad que el médico ya utiliza en su agenda
      const [especialidadesEnAgenda] = await pool.query(
        `SELECT DISTINCT a.id_especialidad, e.descripcion
         FROM agenda a
         INNER JOIN especialidad e ON a.id_especialidad = e.id
         WHERE a.id_medico = ?`,
        [id]
      );

      for (const espAgenda of especialidadesEnAgenda) {
        if (!especialidadesUnicas.includes(Number(espAgenda.id_especialidad))) {
          return sendResponse(
            res,
            400,
            `No se puede quitar la especialidad "${espAgenda.descripcion}" porque el médico posee registros de agenda asociados a ella.`,
            null
          );
        }
      }
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        `UPDATE usuario 
         SET nombre = ?, apellido = ?, dni = ?, email = ?, password = ?, fecha_nacimiento = ?, telefono = ?, id_sede = ?, id_cobertura = ?
         WHERE id = ?`,
        [nombreTrim, apellidoTrim, dniTrim, emailTrim, passwordFinal, fecha_nacimiento, telefonoTrim, sedeFinal, coberturaFinal, id]
      );

      if (usuarioActual.rol === 'medico') {
        await connection.query('DELETE FROM medico_especialidad WHERE id_medico = ?', [id]);
        for (const espId of especialidadesUnicas) {
          await connection.query(
            'INSERT INTO medico_especialidad (id_medico, id_especialidad) VALUES (?, ?)',
            [id, espId]
          );
        }
      }

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    await registrarAuditoria(
      req.user.id,
      'MODIFICACION',
      'usuario',
      Number(id),
      `Modificación de usuario id=${id} (${nombreTrim} ${apellidoTrim})`
    );

    const itemActualizado = await getUsuarioItem(pool, id);
    return sendResponse(res, 200, 'Usuario actualizado exitosamente', itemActualizado);
  } catch (error) {
    console.error('Error en updateUsuario:', error);
    return sendResponse(res, 500, 'Error interno al actualizar el usuario', null);
  }
};

module.exports = {
  getAllUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario
};
