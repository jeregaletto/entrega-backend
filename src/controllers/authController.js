// src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { sendResponse } = require('../utils/responseHandler');
const { registrarAuditoria } = require('../utils/auditoriaHelper');

// GET /auth/coberturas
const getCoberturas = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, nombre FROM cobertura');
    return sendResponse(res, 200, 'Lista de coberturas obtenida con éxito', rows);
  } catch (error) {
    console.error('Error en getCoberturas:', error);
    return sendResponse(res, 500, 'Error al obtener las coberturas de la base de datos', null);
  }
};

// POST /auth/registro
const registro = async (req, res) => {
  const { nombre, apellido, dni, email, password, fecha_nacimiento, telefono, id_cobertura } = req.body;

  // Validación básica de campos requeridos
  if (!nombre || !apellido || !dni || !email || !password || !fecha_nacimiento) {
    return sendResponse(res, 400, 'Todos los campos obligatorios deben ser completados.', null);
  }

  try {
    // Validar si el DNI o Email ya existen
    const [existingUser] = await pool.query(
      'SELECT id, dni, email FROM usuario WHERE dni = ? OR email = ?',
      [dni, email]
    );

    if (existingUser.length > 0) {
      const isDni = existingUser.some(u => u.dni === dni);
      const isEmail = existingUser.some(u => u.email === email);
      
      let msg = 'El usuario ya se encuentra registrado.';
      if (isDni && isEmail) msg = 'El DNI y el Email ya se encuentran registrados.';
      else if (isDni) msg = 'El DNI ya se encuentra registrado.';
      else if (isEmail) msg = 'El Email ya se encuentra registrado.';

      return sendResponse(res, 400, msg, null);
    }

    // Hashear la contraseña con bcryptjs
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Asignar rol automático 'paciente'
    const rol = 'paciente';
    const id_sede = null; // Para pacientes el id_sede es null por defecto

    // Insertar el nuevo usuario en la base de datos
    const [result] = await pool.query(
      `INSERT INTO usuario (nombre, apellido, dni, email, password, fecha_nacimiento, telefono, rol, id_sede, id_cobertura)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, apellido, dni, email, hashedPassword, fecha_nacimiento, telefono || null, rol, id_sede, id_cobertura || null]
    );

    const nuevoUsuarioId = result.insertId;

    // Registrar log de auditoría (ALTA)
    // En el registro público de pacientes, el actor es el propio usuario recién creado
    await registrarAuditoria(
      nuevoUsuarioId,
      'ALTA',
      'usuario',
      nuevoUsuarioId,
      `Alta de usuario: ${nombre} ${apellido} (DNI: ${dni})`
    );

    return sendResponse(res, 201, 'Usuario registrado exitosamente', {
      id: nuevoUsuarioId,
      nombre,
      apellido,
      dni,
      email,
      rol
    });
  } catch (error) {
    console.error('Error en registro:', error);
    return sendResponse(res, 500, 'Error interno al registrar el usuario', null);
  }
};

// POST /auth/login
const login = async (req, res) => {
  const { dni, password } = req.body;

  if (!dni || !password) {
    return sendResponse(res, 400, 'Debe ingresar el DNI y la contraseña.', null);
  }

  try {
    // Buscar usuario por DNI
    const [users] = await pool.query('SELECT * FROM usuario WHERE dni = ?', [dni]);

    if (users.length === 0) {
      return sendResponse(res, 401, 'Credenciales inválidas (DNI o contraseña incorrectos).', null);
    }

    const usuario = users[0];

    // Validar contraseña hasheada
    const isMatch = await bcrypt.compare(password, usuario.password);
    if (!isMatch) {
      return sendResponse(res, 401, 'Credenciales inválidas (DNI o contraseña incorrectos).', null);
    }

    // Firmar JWT con { id, rol, id_sede }
    const payload = {
      id: usuario.id,
      rol: usuario.rol,
      id_sede: usuario.id_sede
    };

    const secret = process.env.JWT_SECRET || 'secret';
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

    const token = jwt.sign(payload, secret, { expiresIn });

    return sendResponse(res, 200, 'Inicio de sesión exitoso', {
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: usuario.rol,
        id_sede: usuario.id_sede
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    return sendResponse(res, 500, 'Error interno al procesar el inicio de sesión', null);
  }
};

// GET /auth/perfil (Protegido)
const getPerfil = async (req, res) => {
  try {
    const userId = req.user.id;
    const [users] = await pool.query(
      `SELECT u.id, u.nombre, u.apellido, u.dni, u.email, u.fecha_nacimiento, u.telefono, u.rol, u.id_sede, u.id_cobertura, c.nombre as cobertura_nombre
       FROM usuario u
       LEFT JOIN cobertura c ON u.id_cobertura = c.id
       WHERE u.id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return sendResponse(res, 404, 'Usuario no encontrado.', null);
    }

    return sendResponse(res, 200, 'Perfil obtenido con éxito', users[0]);
  } catch (error) {
    console.error('Error en getPerfil:', error);
    return sendResponse(res, 500, 'Error al obtener la información del perfil', null);
  }
};

module.exports = {
  getCoberturas,
  registro,
  login,
  getPerfil
};
