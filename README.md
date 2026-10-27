# DOCUMENTO DE CONTEXTO TÉCNICO Y ESPECIFICACIÓN INTEGRAL DE API
## Sistema Backend - Clínica Médica (Semanas 1, 2, 3 y 4)

---

## 1. VISIÓN GENERAL

### 1.1. Stack Tecnológico y Dependencias Exactas
Información extraída de `package.json`:

```json
{
  "name": "entrega-backend",
  "version": "1.0.0",
  "description": "Trabajo Práctico Backend Semana 1 - Sistema Clínica Médica",
  "main": "src/app.js",
  "scripts": {
    "start": "node src/app.js",
    "dev": "nodemon src/app.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "mysql2": "^3.9.8"
  },
  "devDependencies": {
    "nodemon": "^3.1.14"
  }
}
```

* **Entorno de ejecución:** Node.js (CommonJS, `require` / `module.exports`).
* **Framework Web:** Express `^4.19.2`.
* **Motor de Base de Datos:** MySQL / MariaDB mediante el driver `mysql2/promise` `^3.9.8`.
* **Criptografía / Hash de contraseñas:** `bcryptjs` `^2.4.3`.
* **Autenticación:** `jsonwebtoken` `^9.0.2`.
* **Configuración:** `dotenv` `^16.4.5`.
* **Servidor de desarrollo:** `nodemon` `^3.1.14`.

### 1.2. Variables de Entorno y Puerto
Variables definidas en `.env.example`:

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=contraseña
DB_NAME=clinica
DB_PORT=3306
JWT_SECRET=codigo_jwt
JWT_EXPIRES_IN=24h
```

* **Puerto por defecto:** `3000` (evaluado en `src/app.js` como `process.env.PORT || 3000`).
* **Pool de conexiones MySQL (`src/config/db.js`):**
  * `host`: `process.env.DB_HOST || 'localhost'`
  * `user`: `process.env.DB_USER || 'root'`
  * `password`: `process.env.DB_PASSWORD || ''`
  * `database`: `process.env.DB_NAME || 'clinica'`
  * `port`: `process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306`
  * `waitForConnections`: `true`
  * `connectionLimit`: `10`
  * `queueLimit`: `0`

### 1.3. Árbol de Directorios Real del Repositorio
```
entrega-backend/
├── .env
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── postman_collection.json
├── README.md
├── sql/
│   └── seed_extra_frontend.sql
└── src/
    ├── app.js
    ├── config/
    │   └── db.js
    ├── controllers/
    │   ├── agendaController.js
    │   ├── auditoriaController.js
    │   ├── authController.js
    │   ├── coberturaController.js
    │   ├── especialidadController.js
    │   ├── historialClinicoController.js
    │   ├── medicoController.js
    │   ├── notificacionController.js
    │   ├── reporteController.js
    │   ├── sedeController.js
    │   ├── turnoController.js
    │   └── usuarioController.js
    ├── middlewares/
    │   └── authMiddleware.js
    ├── routes/
    │   ├── agendaRoutes.js
    │   ├── auditoriaRoutes.js
    │   ├── authRoutes.js
    │   ├── coberturaRoutes.js
    │   ├── especialidadRoutes.js
    │   ├── historialClinicoRoutes.js
    │   ├── medicoRoutes.js
    │   ├── notificacionRoutes.js
    │   ├── reporteRoutes.js
    │   ├── sedeRoutes.js
    │   ├── testRoutes.js
    │   ├── turnoRoutes.js
    │   └── usuarioRoutes.js
    └── utils/
        ├── auditoriaHelper.js
        ├── notificacionHelper.js
        └── responseHandler.js
```

### 1.4. Montaje de Routers en `src/app.js`
En `src/app.js` el orden exacto de inicialización, middlewares globales y montaje de rutas es:

1. `app.use(cors({ origin: 'http://localhost:4200' }));` (habilitación de CORS para integración con el frontend).
2. `app.use(express.json());` (parseo del cuerpo JSON de peticiones).
3. Endpoint `GET /health` montado directamente en la raíz de Express.
4. Montaje de routers:
   * `app.use('/auth', authRoutes);` (Semana 1)
   * `app.use('/test', testRoutes);` (Semana 1)
   * `app.use('/sedes', sedeRoutes);` (Semana 2)
   * `app.use('/especialidades', especialidadRoutes);` (Semana 2)
   * `app.use('/coberturas', coberturaRoutes);` (Semana 2)
   * `app.use('/agenda', agendaRoutes);` (Semana 2)
   * `app.use('/medicos', medicoRoutes);` (Médicos y especialidades)
   * `app.use('/turnos', turnoRoutes);` (Semana 3)
   * `app.use('/historial-clinico', historialClinicoRoutes);` (Semana 3)
   * `app.use('/notificaciones', notificacionRoutes);` (Semana 3)
   * `app.use('/auditoria', auditoriaRoutes);` (Semana 4)
   * `app.use('/reportes', reporteRoutes);` (Semana 4)
   * `app.use('/usuarios', usuarioRoutes);` (Administración de usuarios - Solo Admin)
5. Manejador de rutas no encontradas (404):
   ```javascript
   app.use((req, res) => {
     sendResponse(res, 404, 'Ruta no encontrada', null);
   });
   ```
5. Manejador global de errores (500):
   ```javascript
   app.use((err, req, res, next) => {
     console.error('Unhandled Error:', err);
     sendResponse(res, 500, 'Error interno del servidor', null);
   });
   ```

### 1.5. Estructura Estándar de Respuesta (`src/utils/responseHandler.js`)
Todas las respuestas de la aplicación responden obligatoriamente a este envelope JSON:
```json
{
  "code": 200,
  "status": "<mensaje_textual_de_estado_o_error>",
  "data": {}
}
```
* `code` (Number): Código de estado HTTP.
* `status` (String): Mensaje explicativo o descriptivo de la operación.
* `data` (Object | Array | null): Payload de datos. Si no hay datos o en caso de error, es `null`.

---

## 2. BASE DE DATOS

### 2.1. Esquema Exacto de Tablas (DDL Real)

#### Tabla: `sede`
```sql
CREATE TABLE `sede` (
  `id` tinyint NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  `direccion` varchar(100) NOT NULL,
  `telefono` varchar(15) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
```

#### Tabla: `especialidad`
```sql
CREATE TABLE `especialidad` (
  `id` tinyint NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(30) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
```

#### Tabla: `cobertura`
```sql
CREATE TABLE `cobertura` (
  `id` tinyint NOT NULL AUTO_INCREMENT,
  `nombre` varchar(30) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
```

#### Tabla: `usuario`
```sql
CREATE TABLE `usuario` (
  `id` tinyint NOT NULL AUTO_INCREMENT,
  `apellido` varchar(30) NOT NULL,
  `nombre` varchar(30) NOT NULL,
  `fecha_nacimiento` date NOT NULL,
  `password` varchar(255) NOT NULL,
  `rol` varchar(20) NOT NULL,
  `email` varchar(30) NOT NULL,
  `telefono` varchar(10) NOT NULL,
  `dni` varchar(8) NOT NULL,
  `id_sede` tinyint DEFAULT NULL,
  `id_cobertura` tinyint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_sede` (`id_sede`),
  KEY `id_cobertura` (`id_cobertura`),
  CONSTRAINT `usuario_ibfk_1` FOREIGN KEY (`id_sede`) REFERENCES `sede` (`id`),
  CONSTRAINT `usuario_ibfk_2` FOREIGN KEY (`id_cobertura`) REFERENCES `cobertura` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
```
* Valores permitidos de `rol`: `'admin'`, `'operador'`, `'medico'`, `'paciente'`.
* Restricciones de negocio: Paciente tiene `id_sede = null`. Médicos y operadores tienen asignada una sede (`id_sede`).

#### Tabla: `medico_especialidad`
```sql
CREATE TABLE `medico_especialidad` (
  `id` tinyint NOT NULL AUTO_INCREMENT,
  `id_medico` tinyint NOT NULL,
  `id_especialidad` tinyint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `id_medico` (`id_medico`),
  KEY `id_especialidad` (`id_especialidad`),
  CONSTRAINT `medico_especialidad_ibfk_1` FOREIGN KEY (`id_medico`) REFERENCES `usuario` (`id`),
  CONSTRAINT `medico_especialidad_ibfk_2` FOREIGN KEY (`id_especialidad`) REFERENCES `especialidad` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
```

#### Tabla: `agenda`
```sql
CREATE TABLE `agenda` (
  `id` tinyint NOT NULL AUTO_INCREMENT,
  `hora_entrada` varchar(5) NOT NULL,
  `hora_salida` varchar(5) NOT NULL,
  `fecha` date NOT NULL,
  `id_medico` tinyint NOT NULL,
  `id_especialidad` tinyint NOT NULL,
  `id_sede` tinyint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `id_especialidad` (`id_especialidad`),
  KEY `id_medico` (`id_medico`),
  KEY `id_sede` (`id_sede`),
  CONSTRAINT `agenda_ibfk_1` FOREIGN KEY (`id_especialidad`) REFERENCES `especialidad` (`id`),
  CONSTRAINT `agenda_ibfk_2` FOREIGN KEY (`id_medico`) REFERENCES `usuario` (`id`),
  CONSTRAINT `agenda_ibfk_3` FOREIGN KEY (`id_sede`) REFERENCES `sede` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
```

#### Tabla: `turno`
```sql
CREATE TABLE `turno` (
  `id` tinyint NOT NULL AUTO_INCREMENT,
  `nota` varchar(40) DEFAULT NULL,
  `id_agenda` tinyint NOT NULL,
  `fecha` date DEFAULT NULL,
  `hora` varchar(5) DEFAULT NULL,
  `id_paciente` tinyint NOT NULL,
  `id_cobertura` tinyint NOT NULL,
  `estado` varchar(20) NOT NULL DEFAULT 'confirmado',
  PRIMARY KEY (`id`),
  KEY `id_agenda` (`id_agenda`),
  KEY `id_paciente` (`id_paciente`),
  KEY `id_cobertura` (`id_cobertura`),
  CONSTRAINT `turno_ibfk_1` FOREIGN KEY (`id_agenda`) REFERENCES `agenda` (`id`),
  CONSTRAINT `turno_ibfk_2` FOREIGN KEY (`id_paciente`) REFERENCES `usuario` (`id`),
  CONSTRAINT `turno_ibfk_3` FOREIGN KEY (`id_cobertura`) REFERENCES `cobertura` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
```
* Valores permitidos de `estado`: `'confirmado'`, `'cancelado'`, `'atendido'`.
* **Nulabilidad crítica de `id_cobertura`:** En la base de datos `id_cobertura` está definido como `NOT NULL`.

#### Tabla: `historial_clinico`
```sql
CREATE TABLE `historial_clinico` (
  `id` tinyint NOT NULL AUTO_INCREMENT,
  `id_turno` tinyint NOT NULL,
  `id_medico` tinyint NOT NULL,
  `id_paciente` tinyint NOT NULL,
  `diagnostico` varchar(255) NOT NULL,
  `tratamiento` varchar(255) DEFAULT NULL,
  `observaciones` varchar(255) DEFAULT NULL,
  `fecha` date NOT NULL,
  PRIMARY KEY (`id`),
  KEY `id_turno` (`id_turno`),
  KEY `id_medico` (`id_medico`),
  KEY `id_paciente` (`id_paciente`),
  CONSTRAINT `historial_ibfk_1` FOREIGN KEY (`id_turno`) REFERENCES `turno` (`id`),
  CONSTRAINT `historial_ibfk_2` FOREIGN KEY (`id_medico`) REFERENCES `usuario` (`id`),
  CONSTRAINT `historial_ibfk_3` FOREIGN KEY (`id_paciente`) REFERENCES `usuario` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
```
* **Columna de fecha:** La columna física en la base de datos real utilizada es `fecha date NOT NULL` (no `fecha_registro datetime`). Esto coincide plenamente con las consultas de selección y ordenamiento (`h.fecha`, `ORDER BY h.fecha DESC`) implementadas en `src/controllers/historialClinicoController.js`.
* **Inserción de historial (`src/controllers/historialClinicoController.js`):** El registro se vincula al `id_turno`, `id_medico` e `id_paciente`, guardando el diagnóstico, tratamiento y observaciones clínicas correspondientes de la atención brindada.

#### Tabla: `log_auditoria`
```sql
CREATE TABLE `log_auditoria` (
  `id` tinyint NOT NULL AUTO_INCREMENT,
  `id_usuario` tinyint NOT NULL,
  `accion` varchar(20) NOT NULL,
  `entidad` varchar(30) NOT NULL,
  `id_entidad` tinyint DEFAULT NULL,
  `detalle` varchar(255) DEFAULT NULL,
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `log_auditoria_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
```
* **Valores posibles de `accion`:** `'ALTA'`, `'BAJA'`, `'MODIFICACION'`.
* **Valores observados de `entidad`:** `'usuario'`, `'sede'`, `'especialidad'`, `'cobertura'`.

#### Tabla: `notificacion`
```sql
CREATE TABLE `notificacion` (
  `id` tinyint NOT NULL AUTO_INCREMENT,
  `id_usuario` tinyint NOT NULL,
  `tipo` varchar(30) NOT NULL,
  `mensaje` varchar(255) NOT NULL,
  `leida` tinyint(1) NOT NULL DEFAULT '0',
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `notificacion_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
```
* **Valores posibles de `tipo`:** `'turno_confirmado'`, `'turno_cancelado'`, `'turno_atendido'`.
* `leida`: Booleano numérico (`0` = no leída, `1` = leída).

---

### 2.2. Manejo de Formatos de Hora y Función `normalizarHora`
En la base de datos:
* `agenda.hora_entrada`: `varchar(5)` (formato `"HH:mm"`).
* `agenda.hora_salida`: `varchar(5)` (formato `"HH:mm"`).
* `turno.hora`: `varchar(5)` (formato `"HH:mm"`).

Función `normalizarHora` implementada en `src/controllers/turnoController.js`:
```javascript
const normalizarHora = (h) => {
  if (!h) return '';
  const parts = h.toString().trim().split(':');
  const hh = parts[0].padStart(2, '0');
  const mm = (parts[1] || '00').padStart(2, '0');
  return `${hh}:${mm}`;
};
```
* **Comportamiento exacto:**
  1. Si recibe valor vacío, null o undefined retorna `""`.
  2. Convierte a string, quita espacios en blanco externos (`trim()`) y separa por dos puntos (`:`).
  3. Aplica `padStart(2, '0')` a las horas y a los minutos (con fallback a `'00'`).
  4. Si se recibe `"15:30:00"`, extrae `"15"` y `"30"`, ignorando los segundos.
  5. Retorna siempre una cadena de 5 caracteres con formato `"HH:mm"`.
* **Comparaciones:** Se realizan mediante operadores léxicos de strings:
  ```javascript
  if (horaSolicitada < horaEntrada || horaSolicitada > horaSalida)
  ```
  Esto funciona correctamente dado que el formato normalizado `"HH:mm"` con ceros a la izquierda garantiza orden léxico idéntico al cronológico.

---

### 2.3. Datos de Prueba Existentes (Seed Data Real)

#### `sede`
| id | nombre | direccion | telefono |
|---|---|---|---|
| 1 | Sede Centro | San Martín 123 | 3424000001 |
| 2 | Sede Norte | Av. Rivadavia 456 | 3424000002 |

#### `especialidad`
| id | descripcion |
|---|---|
| 1 | Traumatologia |

#### `cobertura`
| id | nombre |
|---|---|
| 1 | Jerarquicos |

#### `usuario`
Contraseña en texto claro de los usuarios 1, 2, 3 y 4: `Password123!` (hasheadas con bcryptjs, coste 10).

| id | nombre | apellido | dni | email | rol | id_sede | id_cobertura | telefono | fecha_nacimiento |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Juan | Perez | 15200548 | jperez@gmail.com | operador | 1 | NULL | 3424568897 | 1995-12-30 |
| 2 | Franco | Friggeri | 36000960 | asdas@gaasds.com | paciente | NULL | 1 | 342545555 | 1998-03-14 |
| 3 | Ana | Lopez | 20111222 | alopez@clinica.com | medico | 1 | NULL | 3424111222 | 1980-05-10 |
| 4 | Marcos | Gomez | 18222333 | mgomez@clinica.com | admin | NULL | NULL | 3424222333 | 1975-08-01 |
| 5 | Carlos | Gómez | 40123456 | carlos.gomez@gmail.com | paciente | NULL | 1 | 3424112233 | 1995-06-20 |

#### `medico_especialidad`
| id | id_medico | id_especialidad |
|---|---|---|
| 1 | 3 | 1 |

#### `agenda`
| id | id_medico | id_especialidad | id_sede | fecha | hora_entrada | hora_salida |
|---|---|---|---|---|---|---|
| 2 | 3 | 1 | 1 | 2025-10-20 | 15:00 | 20:00 |

#### `turno`
| id | id_agenda | fecha | hora | id_paciente | id_cobertura | estado | nota |
|---|---|---|---|---|---|---|---|
| 2 | 2 | 2025-10-27 | 15:30 | 2 | 1 | atendido | Control de estudio |

#### `historial_clinico`
| id | id_turno | id_medico | id_paciente | diagnostico | tratamiento | observaciones | fecha |
|---|---|---|---|---|---|---|---|
| 1 | 2 | 3 | 2 | Esguince de tobillo grado I | Reposo y antiinflamatorios | Control en 15 dias | 2025-10-27 |

#### `log_auditoria`
| id | id_usuario | accion | entidad | id_entidad | detalle | fecha |
|---|---|---|---|---|---|---|
| 1 | 4 | ALTA | usuario | 2 | Alta de paciente Friggeri Franco | 2025-10-01 13:00:00 |

#### `notificacion`
| id | id_usuario | tipo | mensaje | leida | fecha |
|---|---|---|---|---|---|
| 1 | 2 | turno_confirmado | Tu turno del 27/10/2025 a las 15:30 fue confirmado. | 1 | 2025-10-01 12:00:00 |
| 2 | 3 | turno_atendido | Registraste el turno de Franco Friggeri como atendido. | 0 | 2025-10-27 19:00:00 |

---

## 3. SEGURIDAD

### 3.1. Hashing y Generación de JWT

* **Hashing:** `bcrypt.hash(password, 10)` utilizando `bcryptjs` con 10 rondas de salt.
* **Verificación de Hash:** `bcrypt.compare(password, usuario.password)`.
* **Payload exacto del JWT:**
  ```javascript
  {
    "id": usuario.id,
    "rol": usuario.rol,
    "id_sede": usuario.id_sede
  }
  ```
* **Secret:** `process.env.JWT_SECRET || 'secret'`.
* **Expiración:** `process.env.JWT_EXPIRES_IN || '24h'`.

### 3.2. Código Real de Middlewares (`src/middlewares/authMiddleware.js`)

```javascript
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
```

#### Errores Exactos de Autenticación y Autorización
* **401 Unauthorized:**
  * Header faltante: `"Acceso denegado. Token no proporcionado."`
  * Formato erróneo: `"Acceso denegado. Formato de token inválido."`
  * Token expirado / firma no válida: `"Token inválido o expirado."`
* **403 Forbidden:**
  * Sin rol en token: `"Acceso denegado. Rol no identificado."`
  * Rol no permitido: `"Acceso denegado. No posee los permisos necesarios."`

---

### 3.3. Matriz de Permisos por Rol

| Endpoint | Método | admin | operador | medico | paciente | Público |
|---|---|:---:|:---:|:---:|:---:|:---:|
| `/health` | GET | Sí | Sí | Sí | Sí | **SÍ** |
| `/auth/coberturas` | GET | Sí | Sí | Sí | Sí | **SÍ** |
| `/auth/registro` | POST | Sí | Sí | Sí | Sí | **SÍ** |
| `/auth/login` | POST | Sí | Sí | Sí | Sí | **SÍ** |
| `/auth/perfil` | GET | Sí | Sí | Sí | Sí | No |
| `/test/admin` | GET | **SÍ** | No | No | No | No |
| `/sedes` | GET | **SÍ** | No | No | No | No |
| `/sedes/:id` | GET | **SÍ** | No | No | No | No |
| `/sedes` | POST | **SÍ** | No | No | No | No |
| `/sedes/:id` | PUT | **SÍ** | No | No | No | No |
| `/sedes/:id` | DELETE | **SÍ** | No | No | No | No |
| `/especialidades` | GET | **SÍ** | No | No | No | No |
| `/especialidades/:id` | GET | **SÍ** | No | No | No | No |
| `/especialidades` | POST | **SÍ** | No | No | No | No |
| `/especialidades/:id` | PUT | **SÍ** | No | No | No | No |
| `/especialidades/:id` | DELETE | **SÍ** | No | No | No | No |
| `/coberturas` | GET | Sí | Sí | Sí | Sí | **SÍ** |
| `/coberturas/:id` | GET | Sí | Sí | Sí | Sí | **SÍ** |
| `/coberturas` | POST | **SÍ** | No | No | No | No |
| `/coberturas/:id` | PUT | **SÍ** | No | No | No | No |
| `/coberturas/:id` | DELETE | **SÍ** | No | No | No | No |
| `/agenda` | GET | Sí | Sí | Sí (propia) | No | No |
| `/agenda/:id` | GET | Sí | Sí | Sí (propia) | No | No |
| `/agenda` | POST | Sí | Sí | Sí (propia) | No | No |
| `/agenda/:id` | PUT | Sí | Sí | Sí (propia) | No | No |
| `/agenda/:id` | DELETE | Sí | Sí | Sí (propia) | No | No |
| `/turnos` | POST | Sí | Sí | No | Sí | No |
| `/turnos/:id/cancelar` | PUT | Sí | Sí (su sede) | Sí (su sede) | Sí (propios) | No |
| `/turnos/:id/atender` | PUT | No | No | **SÍ (su turno)** | No | No |
| `/turnos/mis-turnos` | GET | No | No | No | **SÍ (propios)** | No |
| `/turnos/programados` | GET | Sí | Sí (su sede) | Sí (propios) | No | No |
| `/turnos/sede` | GET | Sí | Sí (su sede) | No | No | No |
| `/historial-clinico` | POST | No | No | **SÍ (atendido)**| No | No |
| `/historial-clinico/paciente/:id_paciente` | GET | No | No | Sí (atendidos) | Sí (propio) | No |
| `/historial-clinico/paciente` | GET | No | No | No | **SÍ (propio)** | No |
| `/notificaciones` | GET | Sí | Sí | Sí | Sí | No |
| `/notificaciones/:id/leer` | PUT | Sí | Sí | Sí | Sí | No |
| `/auditoria` | GET | **SÍ** | No | No | No | No |
| `/reportes/turnos-por-especialidad` | GET | **SÍ** | No | No | No | No |
| `/reportes/turnos-por-sede` | GET | **SÍ** | No | No | No | No |
| `/reportes/ranking-medicos` | GET | **SÍ** | No | No | No | No |
| `/reportes/tasa-cancelacion` | GET | **SÍ** | No | No | No | No |
| `/usuarios` | GET | **SÍ** | No | No | No | No |
| `/usuarios/:id` | GET | **SÍ** | No | No | No | No |
| `/usuarios` | POST | **SÍ** | No | No | No | No |
| `/usuarios/:id` | PUT | **SÍ** | No | No | No | No |

---

## 4. CATÁLOGO COMPLETO DE ENDPOINTS

---

### MÓDULO 1: SALUD Y AUTENTICACIÓN (Semana 1)

#### 1. `GET /health`
* **Middlewares:** Ninguno (público).
* **Roles:** Todos / Sin autenticación.
* **Query Params:** Ninguno.
* **Body:** Ninguno.
* **Reglas:** Ejecuta `SELECT 1` contra el pool de la base de datos MySQL.
* **Respuestas:**
  * **200 OK:**
    ```json
    {
      "code": 200,
      "status": "Servidor y Base de Datos funcionando correctamente",
      "data": {
        "status": "OK",
        "timestamp": "2026-10-22T23:30:00.000Z"
      }
    }
    ```
  * **500 Internal Server Error:**
    ```json
    {
      "code": 500,
      "status": "Error de conexión con la Base de Datos",
      "data": {
        "error": "connect ECONNREFUSED 127.0.0.1:3306"
      }
    }
    ```
* **Efectos secundarios:** Ninguno.

---

#### 2. `GET /auth/coberturas`
* **Middlewares:** Ninguno (público).
* **Roles:** Todos / Sin autenticación.
* **Query Params:** Ninguno.
* **Body:** Ninguno.
* **Reglas:** Ejecuta `SELECT id, nombre FROM cobertura`.
* **Respuestas:**
  * **200 OK:**
    ```json
    {
      "code": 200,
      "status": "Lista de coberturas obtenida con éxito",
      "data": [
        { "id": 1, "nombre": "Jerarquicos" }
      ]
    }
    ```
  * **500 Internal Server Error:**
    ```json
    {
      "code": 500,
      "status": "Error al obtener las coberturas de la base de datos",
      "data": null
    }
    ```
* **Efectos secundarios:** Ninguno.

---

#### 3. `POST /auth/registro`
* **Middlewares:** Ninguno (público).
* **Roles:** Todos / Sin autenticación.
* **Query Params:** Ninguno.
* **Body (JSON):**
  * `nombre` (string, obligatorio)
  * `apellido` (string, obligatorio)
  * `dni` (string, obligatorio)
  * `email` (string, obligatorio)
  * `password` (string, obligatorio)
  * `fecha_nacimiento` (string YYYY-MM-DD, obligatorio)
  * `telefono` (string, opcional, default `null`)
  * `id_cobertura` (number, opcional, default `null`)
  ```json
  {
    "nombre": "Juan",
    "apellido": "Pérez",
    "dni": "12345678",
    "email": "juan.perez@example.com",
    "password": "Password123!",
    "fecha_nacimiento": "1990-05-15",
    "telefono": "1122334455",
    "id_cobertura": 1
  }
  ```
* **Reglas y orden de validación:**
  1. Verifica presencia de campos obligatorios: `!nombre || !apellido || !dni || !email || !password || !fecha_nacimiento`. Si falta alguno: **400 Bad Request**.
  2. Verifica existencia previa en base de datos (`SELECT id, dni, email FROM usuario WHERE dni = ? OR email = ?`):
     * Si existen ambos: `El DNI y el Email ya se encuentran registrados.` (**400**)
     * Si solo coincide DNI: `El DNI ya se encuentra registrado.` (**400**)
     * Si solo coincide Email: `El Email ya se encuentra registrado.` (**400**)
     * Mensaje de fallback: `El usuario ya se encuentra registrado.` (**400**)
  3. Hashea contraseña con `bcrypt.hash(password, 10)`.
  4. Asigna rol fijo `'paciente'` y sede fija `id_sede = null`.
  5. Inserta en la tabla `usuario`.
  6. **Efecto secundario:** Registra log de auditoría (`ALTA`, entidad `'usuario'`, id_usuario = nuevo ID generado).
* **Respuestas:**
  * **201 Created:**
    ```json
    {
      "code": 201,
      "status": "Usuario registrado exitosamente",
      "data": {
        "id": 6,
        "nombre": "Juan",
        "apellido": "Pérez",
        "dni": "12345678",
        "email": "juan.perez@example.com",
        "rol": "paciente"
      }
    }
    ```
  * **400 Bad Request (campos faltantes):**
    ```json
    {
      "code": 400,
      "status": "Todos los campos obligatorios deben ser completados.",
      "data": null
    }
    ```
  * **400 Bad Request (duplicado DNI/Email):**
    ```json
    {
      "code": 400,
      "status": "El DNI ya se encuentra registrado.",
      "data": null
    }
    ```
  * **500 Internal Server Error:**
    ```json
    {
      "code": 500,
      "status": "Error interno al registrar el usuario",
      "data": null
    }
    ```

---

#### 4. `POST /auth/login`
* **Middlewares:** Ninguno (público).
* **Roles:** Todos / Sin autenticación.
* **Query Params:** Ninguno.
* **Body (JSON):**
  * `dni` (string, obligatorio)
  * `password` (string, obligatorio)
  ```json
  {
    "dni": "18222333",
    "password": "Password123!"
  }
  ```
* **Reglas y orden de validación:**
  1. Si falta `!dni || !password`: **400 Bad Request**.
  2. Busca el usuario por DNI (`SELECT * FROM usuario WHERE dni = ?`). Si no existe: **401 Unauthorized**.
  3. Valida contraseña hasheada con `bcrypt.compare(password, usuario.password)`. Si no coincide: **401 Unauthorized**.
  4. Firma JWT con payload `{ id, rol, id_sede }`, duración 24h.
* **Respuestas:**
  * **200 OK:**
    ```json
    {
      "code": 200,
      "status": "Inicio de sesión exitoso",
      "data": {
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "usuario": {
          "id": 4,
          "nombre": "Marcos",
          "apellido": "Gomez",
          "email": "mgomez@clinica.com",
          "rol": "admin",
          "id_sede": null
        }
      }
    }
    ```
  * **400 Bad Request:**
    ```json
    {
      "code": 400,
      "status": "Debe ingresar el DNI y la contraseña.",
      "data": null
    }
    ```
  * **401 Unauthorized:**
    ```json
    {
      "code": 401,
      "status": "Credenciales inválidas (DNI o contraseña incorrectos).",
      "data": null
    }
    ```
  * **500 Internal Server Error:**
    ```json
    {
      "code": 500,
      "status": "Error interno al procesar el inicio de sesión",
      "data": null
    }
    ```
* **Efectos secundarios:** Ninguno (no se audita).

---

#### 5. `GET /auth/perfil`
* **Middlewares:** `verificarToken`.
* **Roles:** `admin`, `operador`, `medico`, `paciente`.
* **Query Params:** Ninguno.
* **Body:** Ninguno.
* **Reglas:**
  1. Obtiene `userId = req.user.id`.
  2. Ejecuta consulta `SELECT ... FROM usuario u LEFT JOIN cobertura c ON u.id_cobertura = c.id WHERE u.id = ?`.
  3. Si no encuentra el registro: **404 Not Found**.
* **Respuestas:**
  * **200 OK:**
    ```json
    {
      "code": 200,
      "status": "Perfil obtenido con éxito",
      "data": {
        "id": 2,
        "nombre": "Franco",
        "apellido": "Friggeri",
        "dni": "36000960",
        "email": "asdas@gaasds.com",
        "fecha_nacimiento": "1998-03-14T03:00:00.000Z",
        "telefono": "342545555",
        "rol": "paciente",
        "id_sede": null,
        "id_cobertura": 1,
        "cobertura_nombre": "Jerarquicos"
      }
    }
    ```
  * **401 Unauthorized:** `"Acceso denegado. Token no proporcionado."` / `"Token inválido o expirado."`
  * **404 Not Found:**
    ```json
    {
      "code": 404,
      "status": "Usuario no encontrado.",
      "data": null
    }
    ```
  * **500 Internal Server Error:**
    ```json
    {
      "code": 500,
      "status": "Error al obtener la información del perfil",
      "data": null
    }
    ```
* **Efectos secundarios:** Ninguno.

---

#### 6. `GET /test/admin`
* **Middlewares:** `verificarToken`, `verificarRol('admin')`.
* **Roles:** `admin`.
* **Query Params:** Ninguno.
* **Body:** Ninguno.
* **Respuestas:**
  * **200 OK:**
    ```json
    {
      "code": 200,
      "status": "Acceso concedido a la sección de administración.",
      "data": {
        "user": {
          "id": 4,
          "rol": "admin",
          "id_sede": null,
          "iat": 1729630000,
          "exp": 1729716400
        },
        "mensaje": "Bienvenido Administrador a la zona restringida."
      }
    }
    ```
  * **403 Forbidden:**
    ```json
    {
      "code": 403,
      "status": "Acceso denegado. No posee los permisos necesarios.",
      "data": null
    }
    ```

---

### MÓDULO 2: ENTIDADES BASE (Semana 2)

#### 7. `GET /sedes`
* **Middlewares:** `verificarToken`, `verificarRol('admin')`.
* **Roles:** `admin`.
* **Query Params:** Ninguno.
* **Body:** Ninguno.
* **Respuestas:**
  * **200 OK:**
    ```json
    {
      "code": 200,
      "status": "Lista de sedes obtenida con éxito",
      "data": [
        {
          "id": 1,
          "nombre": "Sede Centro",
          "direccion": "San Martín 123",
          "telefono": "3424000001"
        }
      ]
    }
    ```
  * **500 Internal Server Error:** `"Error al obtener la lista de sedes"`

---

#### 8. `GET /sedes/:id`
* **Middlewares:** `verificarToken`, `verificarRol('admin')`.
* **Roles:** `admin`.
* **Path Params:** `id` (number).
* **Respuestas:**
  * **200 OK:**
    ```json
    {
      "code": 200,
      "status": "Sede obtenida con éxito",
      "data": {
        "id": 1,
        "nombre": "Sede Centro",
        "direccion": "San Martín 123",
        "telefono": "3424000001"
      }
    }
    ```
  * **404 Not Found:**
    ```json
    {
      "code": 404,
      "status": "Sede no encontrada",
      "data": null
    }
    ```
  * **500 Internal Server Error:** `"Error al obtener la sede"`

---

#### 9. `POST /sedes`
* **Middlewares:** `verificarToken`, `verificarRol('admin')`.
* **Roles:** `admin`.
* **Body (JSON):**
  * `nombre` (string, obligatorio)
  * `direccion` (string, opcional, default `null`)
  * `telefono` (string, opcional, default `null`)
  ```json
  {
    "nombre": "Sede Sur",
    "direccion": "Av. Juan de Garay 890",
    "telefono": "3424000003"
  }
  ```
* **Reglas:** Valida `!nombre`. Si falta: **400 Bad Request**.
* **Efectos secundarios:** Registra log de auditoría (`ALTA`, entidad `'sede'`, detalle `'Alta de sede: ${nombre}'`).
* **Respuestas:**
  * **201 Created:**
    ```json
    {
      "code": 201,
      "status": "Sede creada exitosamente",
      "data": {
        "id": 3,
        "nombre": "Sede Sur",
        "direccion": "Av. Juan de Garay 890",
        "telefono": "3424000003"
      }
    }
    ```
  * **400 Bad Request:**
    ```json
    {
      "code": 400,
      "status": "El nombre de la sede es obligatorio",
      "data": null
    }
    ```
  * **500 Internal Server Error:** `"Error interno al crear la sede"`

---

#### 10. `PUT /sedes/:id`
* **Middlewares:** `verificarToken`, `verificarRol('admin')`.
* **Roles:** `admin`.
* **Path Params:** `id` (number).
* **Body (JSON):**
  * `nombre` (string, obligatorio)
  * `direccion` (string, opcional, default `null`)
  * `telefono` (string, opcional, default `null`)
  ```json
  {
    "nombre": "Sede Centro Remodelada",
    "direccion": "San Martín 125",
    "telefono": "3424000010"
  }
  ```
* **Reglas:**
  1. Valida `!nombre`: **400 Bad Request**.
  2. Verifica existencia en `sede`. Si no existe: **404 Not Found**.
  3. Ejecuta `UPDATE`.
* **Efectos secundarios:** Registra log de auditoría (`MODIFICACION`, entidad `'sede'`, detalle `'Modificación de sede id=${id} (${nombre})'`).
* **Respuestas:**
  * **200 OK:**
    ```json
    {
      "code": 200,
      "status": "Sede actualizada exitosamente",
      "data": {
        "id": 1,
        "nombre": "Sede Centro Remodelada",
        "direccion": "San Martín 125",
        "telefono": "3424000010"
      }
    }
    ```
  * **400 Bad Request:**
    ```json
    {
      "code": 400,
      "status": "El nombre de la sede es obligatorio para actualizar",
      "data": null
    }
    ```
  * **404 Not Found:** `"Sede no encontrada"`
  * **500 Internal Server Error:** `"Error interno al actualizar la sede"`

---

#### 11. `DELETE /sedes/:id`
* **Middlewares:** `verificarToken`, `verificarRol('admin')`.
* **Roles:** `admin`.
* **Path Params:** `id` (number).
* **Reglas y orden de validación:**
  1. Verifica existencia de la sede: si no existe: **404 Not Found**.
  2. Verifica integridad referencial con `usuario`: `SELECT COUNT(*) AS count FROM usuario WHERE id_sede = ?`. Si `count > 0`: **400 Bad Request**.
  3. Verifica integridad referencial con `agenda`: `SELECT COUNT(*) AS count FROM agenda WHERE id_sede = ?`. Si `count > 0`: **400 Bad Request**.
  4. Ejecuta `DELETE FROM sede WHERE id = ?`.
* **Efectos secundarios:** Registra log de auditoría (`BAJA`, entidad `'sede'`, detalle `'Baja de sede id=${id}'`).
* **Respuestas:**
  * **200 OK:**
    ```json
    {
      "code": 200,
      "status": "Sede eliminada exitosamente",
      "data": { "id": 1 }
    }
    ```
  * **400 Bad Request (usuarios asociados):**
    ```json
    {
      "code": 400,
      "status": "No se puede eliminar la sede: tiene 2 usuario(s) asociado(s).",
      "data": null
    }
    ```
  * **400 Bad Request (agendas asociadas):**
    ```json
    {
      "code": 400,
      "status": "No se puede eliminar la sede: tiene 1 registro(s) de agenda asociado(s).",
      "data": null
    }
    ```
  * **404 Not Found:** `"Sede no encontrada"`
  * **500 Internal Server Error:** `"Error interno al eliminar la sede"`

---

#### 12. `GET /especialidades`
* **Middlewares:** `verificarToken`, `verificarRol('admin')`.
* **Roles:** `admin`.
* **Query Params:** Ninguno.
* **Body:** Ninguno.
* **Respuestas:**
  * **200 OK:**
    ```json
    {
      "code": 200,
      "status": "Lista de especialidades obtenida con éxito",
      "data": [
        { "id": 1, "descripcion": "Traumatologia" }
      ]
    }
    ```
  * **500 Internal Server Error:** `"Error al obtener la lista de especialidades"`

---

#### 13. `GET /especialidades/:id`
* **Middlewares:** `verificarToken`, `verificarRol('admin')`.
* **Roles:** `admin`.
* **Path Params:** `id` (number).
* **Respuestas:**
  * **200 OK:**
    ```json
    {
      "code": 200,
      "status": "Especialidad obtenida con éxito",
      "data": { "id": 1, "descripcion": "Traumatologia" }
    }
    ```
  * **404 Not Found:** `"Especialidad no encontrada"`
  * **500 Internal Server Error:** `"Error al obtener la especialidad"`

---

#### 14. `POST /especialidades`
* **Middlewares:** `verificarToken`, `verificarRol('admin')`.
* **Roles:** `admin`.
* **Body (JSON):**
  * `descripcion` (string, obligatorio)
  ```json
  { "descripcion": "Cardiologia" }
  ```
* **Reglas:** Valida `!descripcion`: **400 Bad Request**.
* **Efectos secundarios:** Registra auditoría (`ALTA`, entidad `'especialidad'`, detalle `'Alta de especialidad: ${descripcion}'`).
* **Respuestas:**
  * **201 Created:**
    ```json
    {
      "code": 201,
      "status": "Especialidad creada exitosamente",
      "data": { "id": 2, "descripcion": "Cardiologia" }
    }
    ```
  * **400 Bad Request:**
    ```json
    {
      "code": 400,
      "status": "La descripción de la especialidad es obligatoria",
      "data": null
    }
    ```
  * **500 Internal Server Error:** `"Error interno al crear la especialidad"`

---

#### 15. `PUT /especialidades/:id`
* **Middlewares:** `verificarToken`, `verificarRol('admin')`.
* **Roles:** `admin`.
* **Path Params:** `id` (number).
* **Body (JSON):**
  * `descripcion` (string, obligatorio)
  ```json
  { "descripcion": "Traumatologia y Ortopedia" }
  ```
* **Reglas:**
  1. Valida `!descripcion`: **400 Bad Request**.
  2. Verifica existencia en `especialidad`. Si no existe: **404 Not Found**.
  3. Ejecuta `UPDATE`.
* **Efectos secundarios:** Registra auditoría (`MODIFICACION`, entidad `'especialidad'`, detalle `'Modificación de especialidad id=${id} (${descripcion})'`).
* **Respuestas:**
  * **200 OK:**
    ```json
    {
      "code": 200,
      "status": "Especialidad actualizada exitosamente",
      "data": { "id": 1, "descripcion": "Traumatologia y Ortopedia" }
    }
    ```
  * **400 Bad Request:**
    ```json
    {
      "code": 400,
      "status": "La descripción de la especialidad es obligatoria para actualizar",
      "data": null
    }
    ```
  * **404 Not Found:** `"Especialidad no encontrada"`
  * **500 Internal Server Error:** `"Error interno al actualizar la especialidad"`

---

#### 16. `DELETE /especialidades/:id`
* **Middlewares:** `verificarToken`, `verificarRol('admin')`.
* **Roles:** `admin`.
* **Path Params:** `id` (number).
* **Reglas y orden de validación:**
  1. Verifica existencia: si no existe: **404 Not Found**.
  2. Verifica en `medico_especialidad`: `SELECT COUNT(*) AS count FROM medico_especialidad WHERE id_especialidad = ?`. Si > 0: **400 Bad Request**.
  3. Verifica en `agenda`: `SELECT COUNT(*) AS count FROM agenda WHERE id_especialidad = ?`. Si > 0: **400 Bad Request**.
  4. Ejecuta `DELETE FROM especialidad WHERE id = ?`.
* **Efectos secundarios:** Registra auditoría (`BAJA`, entidad `'especialidad'`, detalle `'Baja de especialidad id=${id}'`).
* **Respuestas:**
  * **200 OK:**
    ```json
    {
      "code": 200,
      "status": "Especialidad eliminada exitosamente",
      "data": { "id": 1 }
    }
    ```
  * **400 Bad Request (médicos asignados):**
    ```json
    {
      "code": 400,
      "status": "No se puede eliminar la especialidad: tiene 1 médico(s) asignado(s).",
      "data": null
    }
    ```
  * **400 Bad Request (agendas asociadas):**
    ```json
    {
      "code": 400,
      "status": "No se puede eliminar la especialidad: tiene 1 registro(s) de agenda asociado(s).",
      "data": null
    }
    ```
  * **404 Not Found:** `"Especialidad no encontrada"`
  * **500 Internal Server Error:** `"Error interno al eliminar la especialidad"`

---

#### 17. `GET /coberturas`
* **Middlewares:** Ninguno (público).
* **Roles:** Todos / Sin autenticación.
* **Query Params:** Ninguno.
* **Body:** Ninguno.
* **Respuestas:**
  * **200 OK:**
    ```json
    {
      "code": 200,
      "status": "Lista de coberturas obtenida con éxito",
      "data": [
        { "id": 1, "nombre": "Jerarquicos" }
      ]
    }
    ```
  * **500 Internal Server Error:** `"Error al obtener la lista de coberturas"`

---

#### 18. `GET /coberturas/:id`
* **Middlewares:** Ninguno (público).
* **Roles:** Todos / Sin autenticación.
* **Path Params:** `id` (number).
* **Respuestas:**
  * **200 OK:**
    ```json
    {
      "code": 200,
      "status": "Cobertura obtenida con éxito",
      "data": { "id": 1, "nombre": "Jerarquicos" }
    }
    ```
  * **404 Not Found:** `"Cobertura no encontrada"`
  * **500 Internal Server Error:** `"Error al obtener la cobertura"`

---

#### 19. `POST /coberturas`
* **Middlewares:** `verificarToken`, `verificarRol('admin')`.
* **Roles:** `admin`.
* **Body (JSON):**
  * `nombre` (string, obligatorio)
  ```json
  { "nombre": "OSDE 210" }
  ```
* **Reglas:** Valida `!nombre`: **400 Bad Request**.
* **Efectos secundarios:** Registra auditoría (`ALTA`, entidad `'cobertura'`, detalle `'Alta de cobertura: ${nombre}'`).
* **Respuestas:**
  * **201 Created:**
    ```json
    {
      "code": 201,
      "status": "Cobertura creada exitosamente",
      "data": { "id": 2, "nombre": "OSDE 210" }
    }
    ```
  * **400 Bad Request:**
    ```json
    {
      "code": 400,
      "status": "El nombre de la cobertura es obligatorio",
      "data": null
    }
    ```
  * **500 Internal Server Error:** `"Error interno al crear la cobertura"`

---

#### 20. `PUT /coberturas/:id`
* **Middlewares:** `verificarToken`, `verificarRol('admin')`.
* **Roles:** `admin`.
* **Path Params:** `id` (number).
* **Body (JSON):**
  * `nombre` (string, obligatorio)
  ```json
  { "nombre": "Jerarquicos Salud" }
  ```
* **Reglas:**
  1. Valida `!nombre`: **400 Bad Request**.
  2. Verifica existencia en `cobertura`. Si no existe: **404 Not Found**.
  3. Ejecuta `UPDATE`.
* **Efectos secundarios:** Registra auditoría (`MODIFICACION`, entidad `'cobertura'`, detalle `'Modificación de cobertura id=${id} (${nombre})'`).
* **Respuestas:**
  * **200 OK:**
    ```json
    {
      "code": 200,
      "status": "Cobertura actualizada exitosamente",
      "data": { "id": 1, "nombre": "Jerarquicos Salud" }
    }
    ```
  * **400 Bad Request:**
    ```json
    {
      "code": 400,
      "status": "El nombre de la cobertura es obligatorio para actualizar",
      "data": null
    }
    ```
  * **404 Not Found:** `"Cobertura no encontrada"`
  * **500 Internal Server Error:** `"Error interno al actualizar la cobertura"`

---

#### 21. `DELETE /coberturas/:id`
* **Middlewares:** `verificarToken`, `verificarRol('admin')`.
* **Roles:** `admin`.
* **Path Params:** `id` (number).
* **Reglas y orden de validación:**
  1. Verifica existencia: si no existe: **404 Not Found**.
  2. Verifica en `usuario`: `SELECT COUNT(*) AS count FROM usuario WHERE id_cobertura = ?`. Si > 0: **400 Bad Request**.
  3. Verifica en `turno`: `SELECT COUNT(*) AS count FROM turno WHERE id_cobertura = ?`. Si > 0: **400 Bad Request**.
  4. Ejecuta `DELETE FROM cobertura WHERE id = ?`.
* **Efectos secundarios:** Registra auditoría (`BAJA`, entidad `'cobertura'`, detalle `'Baja de cobertura id=${id}'`).
* **Respuestas:**
  * **200 OK:**
    ```json
    {
      "code": 200,
      "status": "Cobertura eliminada exitosamente",
      "data": { "id": 1 }
    }
    ```
  * **400 Bad Request (usuarios asociados):**
    ```json
    {
      "code": 400,
      "status": "No se puede eliminar la cobertura: tiene 2 usuario(s) asociado(s).",
      "data": null
    }
    ```
  * **400 Bad Request (turnos asociados):**
    ```json
    {
      "code": 400,
      "status": "No se puede eliminar la cobertura: tiene 1 turno(s) asociado(s).",
      "data": null
    }
    ```
  * **404 Not Found:** `"Cobertura no encontrada"`
  * **500 Internal Server Error:** `"Error interno al eliminar la cobertura"`

---

#### 22. `GET /agenda`
* **Middlewares:** `verificarToken`, `verificarRol('admin', 'operador', 'medico')`. (Nota: Los pacientes son rechazados a nivel de router y en el controlador con 403).
* **Roles:** `admin`, `operador`, `medico`.
* **Query Params:**
  * `medico` o `id_medico` (number, opcional, alias aceptado).
  * `sede` o `id_sede` (number, opcional, alias aceptado).
  * `fecha` (string YYYY-MM-DD, opcional).
* **Reglas:**
  * Si el usuario es médico (`req.user.rol === 'medico'`), solo puede consultar su propia agenda. Si envía un id de médico diferente al propio: **403 Forbidden** (`"Acceso denegado. Un médico solo puede consultar su propia agenda."`). Si no pasa filtro, se aplica automáticamente `AND a.id_medico = req.user.id`.
* **Respuestas:**
  * **200 OK:**
    ```json
    {
      "code": 200,
      "status": "Agenda médica obtenida con éxito",
      "data": [
        {
          "id": 2,
          "fecha": "2025-10-20T03:00:00.000Z",
          "hora_entrada": "15:00",
          "hora_salida": "20:00",
          "id_medico": 3,
          "medico_nombre": "Ana Lopez",
          "medico_email": "alopez@clinica.com",
          "id_especialidad": 1,
          "especialidad_descripcion": "Traumatologia",
          "id_sede": 1,
          "sede_nombre": "Sede Centro",
          "sede_direccion": "San Martín 123"
        }
      ]
    }
    ```
  * **403 Forbidden (paciente):** `"Acceso denegado. Los pacientes no tienen permiso para consultar la agenda médica."`
  * **403 Forbidden (médico consultando otro):** `"Acceso denegado. Un médico solo puede consultar su propia agenda."`
  * **500 Internal Server Error:** `"Error al consultar la agenda médica"`

---

#### 23. `GET /agenda/:id`
* **Middlewares:** `verificarToken`, `verificarRol('admin', 'operador', 'medico')`.
* **Roles:** `admin`, `operador`, `medico`.
* **Path Params:** `id` (number).
* **Reglas:**
  1. Si no existe: **404 Not Found**.
  2. Si es médico y `Number(agenda.id_medico) !== Number(req.user.id)`: **403 Forbidden**.
* **Respuestas:**
  * **200 OK:** status: `"Registro de agenda obtenido con éxito"`, data: objeto agenda idéntico al item de listado.
  * **403 Forbidden:** `"Acceso denegado. Un médico solo puede consultar su propia agenda."`
  * **404 Not Found:** `"Registro de agenda no encontrado"`
  * **500 Internal Server Error:** `"Error al obtener el registro de agenda"`

---

#### 24. `POST /agenda`
* **Middlewares:** `verificarToken`, `verificarRol('admin', 'operador', 'medico')`.
* **Roles:** `admin`, `operador`, `medico`.
* **Body (JSON):**
  * `hora_entrada` (string "HH:mm", obligatorio)
  * `hora_salida` (string "HH:mm", obligatorio)
  * `fecha` (string YYYY-MM-DD, obligatorio)
  * `id_medico` (number, obligatorio)
  * `id_especialidad` (number, obligatorio)
  * `id_sede` (number, obligatorio)
  ```json
  {
    "hora_entrada": "08:00",
    "hora_salida": "12:00",
    "fecha": "2026-09-01",
    "id_medico": 3,
    "id_especialidad": 1,
    "id_sede": 1
  }
  ```
* **Reglas y orden de validación:**
  1. Verifica campos obligatorios: `!hora_entrada || !hora_salida || !fecha || !id_medico || !id_especialidad || !id_sede`. Si falta alguno: **400 Bad Request** (`"Todos los campos (hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede) son obligatorios."`).
  2. Si es médico y `Number(id_medico) !== Number(req.user.id)`: **403 Forbidden** (`"Acceso denegado. Un médico solo puede registrar franjas horarias en su propia agenda."`).
  3. Valida existencia de médico y rol en `usuario`: `SELECT id, rol FROM usuario WHERE id = ?`. Si no existe o no tiene rol `'medico'`: **400 Bad Request** (`"El ID de médico especificado no existe o no posee el rol \"medico\"."`).
  4. Valida especialidad: `SELECT id FROM especialidad WHERE id = ?`. Si no existe: **400 Bad Request** (`"La especialidad especificada no existe."`).
  5. Valida sede: `SELECT id FROM sede WHERE id = ?`. Si no existe: **400 Bad Request** (`"La sede especificada no existe."`).
  6. Inserta franja en `agenda`. (No se audita).
* **Respuestas:**
  * **201 Created:**
    ```json
    {
      "code": 201,
      "status": "Franja de agenda creada exitosamente",
      "data": {
        "id": 3,
        "hora_entrada": "08:00",
        "hora_salida": "12:00",
        "fecha": "2026-09-01",
        "id_medico": 3,
        "id_especialidad": 1,
        "id_sede": 1
      }
    }
    ```
  * **400 Bad Request:** Múltiples validaciones descritas arriba.
  * **403 Forbidden:** Mensaje de médico intentando crear franja de otro.
  * **500 Internal Server Error:** `"Error interno al crear el registro de agenda"`

---

#### 25. `PUT /agenda/:id`
* **Middlewares:** `verificarToken`, `verificarRol('admin', 'operador', 'medico')`.
* **Roles:** `admin`, `operador`, `medico`.
* **Path Params:** `id` (number).
* **Body (JSON):** Todos los 6 campos son obligatorios (`hora_entrada`, `hora_salida`, `fecha`, `id_medico`, `id_especialidad`, `id_sede`).
* **Reglas:**
  1. Si falta algún campo: **400 Bad Request** (`"Todos los campos son obligatorios para actualizar."`).
  2. Si no existe: **404 Not Found** (`"Registro de agenda no encontrado"`).
  3. Si es médico y no es dueño de la agenda o intenta transferirla a otro médico: **403 Forbidden** (`"Acceso denegado. Un médico solo puede modificar su propia agenda."`).
  4. Valida FKs de médico (`"El ID de médico especificado no existe o no tiene el rol \"medico\"."`), especialidad y sede.
* **Respuestas:**
  * **200 OK:**
    ```json
    {
      "code": 200,
      "status": "Registro de agenda actualizado exitosamente",
      "data": {
        "id": 2,
        "hora_entrada": "16:00",
        "hora_salida": "21:00",
        "fecha": "2025-10-20",
        "id_medico": 3,
        "id_especialidad": 1,
        "id_sede": 1
      }
    }
    ```
  * **400 Bad Request:** Validaciones de campos o FKs inexistentes.
  * **403 Forbidden:** Médicos ajenos.
  * **404 Not Found:** `"Registro de agenda no encontrado"`
  * **500 Internal Server Error:** `"Error interno al actualizar la agenda"`

---

#### 26. `DELETE /agenda/:id`
* **Middlewares:** `verificarToken`, `verificarRol('admin', 'operador', 'medico')`.
* **Roles:** `admin`, `operador`, `medico`.
* **Path Params:** `id` (number).
* **Reglas:**
  1. Si no existe: **404 Not Found** (`"Registro de agenda no encontrado"`).
  2. Si es médico y no es dueño: **403 Forbidden** (`"Acceso denegado. Un médico solo puede eliminar registros de su propia agenda."`).
  3. Integridad referencial: `SELECT COUNT(*) AS count FROM turno WHERE id_agenda = ?`. Si > 0: **400 Bad Request** (`"No se puede eliminar la agenda: existen ${count} turno(s) reservado(s) asociados a esta franja."`).
  4. Ejecuta `DELETE FROM agenda WHERE id = ?`.
* **Respuestas:**
  * **200 OK:**
    ```json
    {
      "code": 200,
      "status": "Registro de agenda eliminado exitosamente",
      "data": { "id": 2 }
    }
    ```
  * **400 Bad Request:** Turnos reservados asociados.
  * **403 Forbidden:** Sin permisos.
  * **404 Not Found:** No encontrado.
  * **500 Internal Server Error:** `"Error interno al eliminar el registro de la agenda"`

---

### MÓDULO 3: GESTIÓN DE TURNOS, HISTORIAL Y NOTIFICACIONES (Semana 3)

#### 27. `POST /turnos` (Alta de Turno Médico)
* **Middlewares:** `verificarToken`, `verificarRol('paciente', 'operador', 'admin')`.
* **Roles:** `paciente`, `operador`, `admin`.
* **Body (JSON):**
  * `nota` (string, obligatorio).
  * `hora` (string "HH:mm", obligatorio).
  * *Modo A:* `id_agenda` (number).
  * *Modo B:* `id_medico` (number), `id_especialidad` (number), `id_sede` (number), `fecha` (string YYYY-MM-DD).
  * `id_paciente` (number, obligatorio SOLO si el usuario es `operador` o `admin`).
  ```json
  {
    "id_agenda": 2,
    "hora": "15:30",
    "nota": "Dolor en articulación de rodilla"
  }
  ```
* **Reglas y orden exacto de validación:**
  1. Valida `!nota || typeof nota !== 'string' || !nota.trim()`: **400 Bad Request** (`"La nota del turno es obligatoria."`).
  2. Valida `!hora || typeof hora !== 'string' || !hora.trim()`: **400 Bad Request** (`"La hora del turno es obligatoria."`).
  3. Determinación de `id_paciente`:
     * Si `rol === 'paciente'`: `idPacienteFinal = req.user.id`.
     * Si `rol === 'operador' || rol === 'admin'`: exige `req.body.id_paciente`. Si falta: **400 Bad Request** (`"El campo id_paciente es obligatorio cuando un operador o administrador registra un turno."`).
     * Cualquier otro rol: **403 Forbidden** (`"Acceso denegado. No tiene permisos para registrar turnos."`).
  4. Valida paciente en base de datos: `SELECT id, nombre, apellido, rol, id_cobertura FROM usuario WHERE id = ?`. Si no existe o `rol !== 'paciente'`: **400 Bad Request** (`"El paciente especificado no existe o no posee el rol \"paciente\"."`).
  5. Obtención de cobertura: Se obtiene SIEMPRE de la tabla usuario (`paciente.id_cobertura`).
  6. Resolución de agenda:
     * Si viene `id_agenda`: busca por ID. Si no existe: **400 Bad Request** (`"La franja de agenda médica especificada no existe."`).
     * Sino si vienen `id_medico && id_especialidad && id_sede && fecha`: busca coincidencia. Si no existe: **400 Bad Request** (`"No se encontró una franja de agenda médica para los datos indicados."`).
     * Si no viene ninguno de los dos modos: **400 Bad Request** (`"Debe especificar el id_agenda o los datos completos de la franja (id_medico, id_especialidad, id_sede, fecha)."`).
  7. Rango de horario: Aplica `normalizarHora`. Si `horaSolicitada < horaEntrada || horaSolicitada > horaSalida`: **400 Bad Request** (``El horario solicitado (${horaSolicitada}) está fuera del rango de atención de la franja horaria (${horaEntrada} a ${horaSalida}).``).
  8. Control de superposición: `SELECT id FROM turno WHERE id_agenda = ? AND hora = ? AND estado = "confirmado"`. Si ya existe turno: **400 Bad Request** (`"El horario seleccionado ya se encuentra reservado por otro turno confirmado."`).
  9. Inserta el turno con estado inicial `'confirmado'`.
* **Efectos secundarios:**
  * **Notificación:** Crea notificación al paciente destinatario (`tipo: 'turno_confirmado'`, mensaje: ``Su turno para el día ${fechaTurno} a las ${horaSolicitada} ha sido confirmado con éxito.``).
  * **Auditoría:** No se audita.
* **Respuestas:**
  * **201 Created:**
    ```json
    {
      "code": 201,
      "status": "Turno creado y confirmado exitosamente",
      "data": {
        "id": 3,
        "nota": "Dolor en articulación de rodilla",
        "id_agenda": 2,
        "fecha": "2025-10-20",
        "hora": "15:30",
        "id_paciente": 2,
        "id_cobertura": 1,
        "estado": "confirmado"
      }
    }
    ```
  * **400 Bad Request:** Múltiples mensajes detallados según regla incumplida.
  * **500 Internal Server Error:** `"Error interno al registrar el turno médico"`

---

#### 28. `PUT /turnos/:id/cancelar` (Cancelación de Turno)
* **Middlewares:** `verificarToken`, `verificarRol('paciente', 'operador', 'medico', 'admin')`.
* **Roles:** `paciente`, `operador`, `medico`, `admin`.
* **Path Params:** `id` (number).
* **Body:** Ninguno.
* **Reglas y orden de validación:**
  1. Busca el turno y su agenda (`INNER JOIN agenda`). Si no existe: **404 Not Found** (`"Turno no encontrado."`).
  2. Estado previo:
     * Si `turno.estado === 'cancelado'`: **400 Bad Request** (`"El turno ya se encuentra cancelado."`).
     * Si `turno.estado === 'atendido'`: **400 Bad Request** (`"No se puede cancelar un turno que ya ha sido marcado como atendido."`).
  3. Matriz de permisos de cancelación:
     * Si `rol === 'paciente'`: `Number(turno.id_paciente) === Number(req.user.id)`. Si es ajeno: **403 Forbidden** (`"Acceso denegado. Solo puede cancelar sus propios turnos."`).
     * Si `rol === 'operador' || rol === 'medico'`: `Number(turno.id_sede) === Number(req.user.id_sede)`. Si es de otra sede: **403 Forbidden** (`"Acceso denegado. Solo puede cancelar turnos pertenecientes a su sede asignada."`).
     * Si `rol === 'admin'`: puede cancelar cualquier turno.
     * Fallback de rol no autorizado: **403 Forbidden** (`"Acceso denegado. No posee permisos para cancelar este turno."`).
  4. Actualiza en BD `UPDATE turno SET estado = "cancelado" WHERE id = ?`.
* **Efectos secundarios:**
  * **Notificación al paciente:** Siempre se genera (`tipo: 'turno_cancelado'`, mensaje: ``Su turno del día ${fechaTurno} a las ${horaTurno} ha sido cancelado.``).
  * **Notificación al médico:** Se genera únicamente si la cancelación NO fue realizada por ese mismo médico (`tipo: 'turno_cancelado'`, mensaje: ``El turno asignado del día ${fechaTurno} a las ${horaTurno} ha sido cancelado.``).
* **Respuestas:**
  * **200 OK:**
    ```json
    {
      "code": 200,
      "status": "Turno cancelado exitosamente",
      "data": {
        "id": 3,
        "estado": "cancelado"
      }
    }
    ```
  * **400 Bad Request:** Estado inválido para cancelar.
  * **403 Forbidden:** Permisos insuficientes.
  * **404 Not Found:** `"Turno no encontrado."`
  * **500 Internal Server Error:** `"Error interno al cancelar el turno médico"`

---

#### 29. `PUT /turnos/:id/atender` (Atención de Turno)
* **Middlewares:** `verificarToken`, `verificarRol('medico')`.
* **Roles:** `medico`.
* **Path Params:** `id` (number).
* **Body:** Ninguno.
* **Reglas y orden de validación:**
  1. Busca turno y agenda. Si no existe: **404 Not Found** (`"Turno no encontrado."`).
  2. Pertenencia: `Number(turno.id_medico) === Number(req.user.id)`. Si no es el médico de la franja: **403 Forbidden** (`"Acceso denegado. Solo puede atender turnos asignados a su propia agenda médica."`).
  3. Estado previo:
     * Si `turno.estado === 'cancelado'`: **400 Bad Request** (`"No es posible atender un turno que ha sido cancelado."`).
     * Si `turno.estado === 'atendido'`: **400 Bad Request** (`"El turno ya ha sido marcado como atendido con anterioridad."`).
     * Si `turno.estado !== 'confirmado'`: **400 Bad Request** (`"Solo se pueden atender turnos que se encuentren en estado \"confirmado\"."`).
  4. Actualiza en BD `UPDATE turno SET estado = "atendido" WHERE id = ?`.
* **Efectos secundarios:**
  * **Notificación al paciente:** Genera notificación (`tipo: 'turno_atendido'`, mensaje: ``Su turno del día ${fechaTurno} a las ${horaTurno} ha sido registrado como atendido.``).
* **Respuestas:**
  * **200 OK:**
    ```json
    {
      "code": 200,
      "status": "Turno marcado como atendido exitosamente",
      "data": {
        "id": 3,
        "estado": "atendido"
      }
    }
    ```
  * **400 Bad Request:** Estado incompatible.
  * **403 Forbidden:** Turno de otro médico.
  * **404 Not Found:** Turno inexistente.
  * **500 Internal Server Error:** `"Error interno al marcar el turno como atendido"`

---

#### 30. `GET /turnos/mis-turnos`
* **Middlewares:** `verificarToken`, `verificarRol('paciente')`.
* **Roles:** `paciente`.
* **Query Params:**
  * `estado` (string, opcional): Valores permitidos: `'confirmado'`, `'cancelado'`, `'atendido'`.
* **Reglas:**
  * Si se proporciona `estado` y no está en la lista de permitidos: **400 Bad Request** (`"El filtro estado debe ser uno de: confirmado, cancelado, atendido."`).
  * Filtra automáticamente por `t.id_paciente = req.user.id`.
  * **Ordenamiento:** `ORDER BY t.fecha ASC, t.hora ASC` (del más próximo al menos próximo).
* **Respuestas:**
  * **200 OK:**
    ```json
    {
      "code": 200,
      "status": "Turnos del paciente obtenidos con éxito",
      "data": [
        {
          "id": 2,
          "fecha": "2025-10-27",
          "hora": "15:30",
          "estado": "atendido",
          "nota": "Control de estudio",
          "id_agenda": 2,
          "id_paciente": 2,
          "paciente": "Friggeri, Franco",
          "id_cobertura": 1,
          "cobertura": "Jerarquicos",
          "id_medico": 3,
          "medico": "Lopez, Ana",
          "id_especialidad": 1,
          "especialidad": "Traumatologia",
          "id_sede": 1,
          "sede": "Sede Centro"
        }
      ]
    }
    ```
  * **400 Bad Request:** Estado inválido.
  * **500 Internal Server Error:** `"Error interno al obtener los turnos del paciente"`

---

#### 31. `GET /turnos/programados`
* **Middlewares:** `verificarToken`, `verificarRol('medico', 'operador', 'admin')`.
* **Roles:** `medico`, `operador`, `admin`.
* **Query Params:**
  * `fecha` (string YYYY-MM-DD, obligatorio).
  * `id_medico` (number, opcional).
* **Reglas y orden de validación:**
  1. Si falta `!fecha`: **400 Bad Request** (`"El parámetro fecha es obligatorio."`).
  2. Valida formato y calendario de fecha (`YYYY-MM-DD`): **400 Bad Request** (`"El parámetro fecha debe tener el formato YYYY-MM-DD."`).
  3. Si viene `id_medico` y no es entero positivo: **400 Bad Request** (`"El filtro id_medico debe ser un número entero positivo."`).
  4. Permisos por rol:
     * Si `rol === 'medico'`: Si especifica `id_medico` y no coincide con el suyo: **403 Forbidden** (`"Acceso denegado. Solo puede consultar sus propios turnos programados."`). Siempre filtra por su propio ID (`a.id_medico = req.user.id`).
     * Si `rol === 'operador'`: Solo accede a turnos de su sede (`a.id_sede = req.user.id_sede`). Si proporciona `id_medico`, filtra dentro de los médicos de su sede.
     * Si `rol === 'admin'`: Puede consultar cualquier médico.
  5. **Ordenamiento:** `ORDER BY t.hora ASC, s.nombre ASC`.
* **Respuestas:**
  * **200 OK:**
    ```json
    {
      "code": 200,
      "status": "Turnos programados obtenidos con éxito",
      "data": [
        {
          "id": 2,
          "fecha": "2025-10-27",
          "hora": "15:30",
          "estado": "atendido",
          "nota": "Control de estudio",
          "id_agenda": 2,
          "id_paciente": 2,
          "paciente": "Friggeri, Franco",
          "id_cobertura": 1,
          "cobertura": "Jerarquicos",
          "id_medico": 3,
          "medico": "Lopez, Ana",
          "id_especialidad": 1,
          "especialidad": "Traumatologia",
          "id_sede": 1,
          "sede": "Sede Centro"
        }
      ]
    }
    ```
  * **400 Bad Request:** Errores de fecha o formato.
  * **403 Forbidden:** Médico solicitando agenda de otro médico.
  * **500 Internal Server Error:** `"Error interno al obtener los turnos programados"`

---

#### 32. `GET /turnos/sede`
* **Middlewares:** `verificarToken`, `verificarRol('operador', 'admin')`.
* **Roles:** `operador`, `admin`.
* **Query Params:**
  * `fecha` (string YYYY-MM-DD, obligatorio).
  * `id_sede` (number, opcional para admin, validado para operador).
* **Reglas y orden de validación:**
  1. Si falta `!fecha`: **400 Bad Request** (`"El parámetro fecha es obligatorio."`).
  2. Valida fecha (`YYYY-MM-DD`): **400 Bad Request** (`"El parámetro fecha debe tener el formato YYYY-MM-DD."`).
  3. Si viene `id_sede` y no es entero positivo: **400 Bad Request** (`"El filtro id_sede debe ser un número entero positivo."`).
  4. Permisos por rol:
     * Si `rol === 'operador'`: Si proporciona `id_sede` y es distinta a su sede: **403 Forbidden** (`"Acceso denegado. Solo puede consultar los turnos de su sede asignada."`). Filtra siempre por `a.id_sede = req.user.id_sede`.
     * Si `rol === 'admin'`: Si pasa `id_sede`, filtra por ella; si no la pasa, devuelve los turnos de todas las sedes.
  5. **Ordenamiento:** `ORDER BY t.hora ASC, e.descripcion ASC`.
* **Respuestas:**
  * **200 OK:**
    ```json
    {
      "code": 200,
      "status": "Turnos de la sede obtenidos con éxito",
      "data": [
        {
          "id": 2,
          "fecha": "2025-10-27",
          "hora": "15:30",
          "estado": "atendido",
          "nota": "Control de estudio",
          "id_agenda": 2,
          "id_paciente": 2,
          "paciente": "Friggeri, Franco",
          "id_cobertura": 1,
          "cobertura": "Jerarquicos",
          "id_medico": 3,
          "medico": "Lopez, Ana",
          "id_especialidad": 1,
          "especialidad": "Traumatologia",
          "id_sede": 1,
          "sede": "Sede Centro"
        }
      ]
    }
    ```
  * **400 Bad Request:** Fecha faltante o formato incorrecto.
  * **403 Forbidden:** Operador consultando otra sede.
  * **500 Internal Server Error:** `"Error interno al obtener los turnos de la sede"`

---

#### 33. `POST /historial-clinico`
* **Middlewares:** `verificarToken`, `verificarRol('medico')`.
* **Roles:** `medico`.
* **Body (JSON):**
  * `id_turno` (number, obligatorio).
  * `diagnostico` (string, obligatorio).
  * `tratamiento` (string, obligatorio).
  * `observaciones` (string, opcional, default `null`).
  ```json
  {
    "id_turno": 2,
    "diagnostico": "Esguince de tobillo grado I",
    "tratamiento": "Reposo y antiinflamatorios",
    "observaciones": "Control en 15 dias"
  }
  ```
* **Reglas y orden de validación:**
  1. Si falta `!id_turno || !diagnostico || !tratamiento`: **400 Bad Request** (`"Los campos id_turno, diagnostico y tratamiento son obligatorios."`).
  2. Verifica existencia del turno y su agenda (`SELECT t.id, t.id_agenda, t.id_paciente, t.estado, a.id_medico FROM turno t INNER JOIN agenda a ON t.id_agenda = a.id WHERE t.id = ?`). Si no existe: **404 Not Found** (`"Turno no encontrado."`).
  3. Valida médico: `Number(turno.id_medico) === Number(req.user.id)`. Si es otro médico: **403 Forbidden** (`"Acceso denegado. Solo el médico que atendió el turno puede registrar su historial clínico."`).
  4. Valida estado del turno: `turno.estado === 'atendido'`. Si no fue atendido: **400 Bad Request** (`"No se puede registrar historial clínico sobre un turno que no ha sido marcado como \"atendido\"."`).
  5. Valida duplicados: `SELECT id FROM historial_clinico WHERE id_turno = ?`. Si ya existe registro: **400 Bad Request** (`"Ya existe un registro de historial clínico para este turno."`).
  6. Inserta en la tabla `historial_clinico` vinculando `id_medico: req.user.id` y `id_paciente: turno.id_paciente`.
* **Respuestas:**
  * **201 Created:**
    ```json
    {
      "code": 201,
      "status": "Historial clínico registrado exitosamente",
      "data": {
        "id": 2,
        "id_turno": 2,
        "id_medico": 3,
        "id_paciente": 2,
        "diagnostico": "Esguince de tobillo grado I",
        "tratamiento": "Reposo y antiinflamatorios",
        "observaciones": "Control en 15 dias"
      }
    }
    ```
  * **400 Bad Request:** Falta de campos, turno no atendido o registro existente.
  * **403 Forbidden:** Médico no asignado al turno.
  * **404 Not Found:** `"Turno no encontrado."`
  * **500 Internal Server Error:** `"Error interno al registrar el historial clínico"`

---

#### 34. `GET /historial-clinico/paciente/:id_paciente`
* **Middlewares:** `verificarToken`, `verificarRol('paciente', 'medico')`.
* **Roles:** `paciente`, `medico`.
* **Path Params:** `id_paciente` (number).
* **Reglas y orden de validación:**
  * Si `rol === 'paciente'`:
    * Si intenta consultar un `id_paciente` distinto al suyo: **403 Forbidden** (`"Acceso denegado. Solo puede consultar su propio historial clínico."`).
    * Accede a la totalidad de sus diagnósticos y atenciones.
  * Si `rol === 'medico'`:
    * Requiere `id_paciente` en path.
    * Solo accede a las atenciones que ese mismo médico le brindó al paciente (`AND a.id_medico = req.user.id`).
  * **Ordenamiento y columna de fecha:** La consulta en código selecciona `h.fecha` y ordena mediante `ORDER BY h.fecha DESC, h.id DESC`, consistente con la columna `fecha date NOT NULL` de la tabla física `historial_clinico`.
* **Respuestas:**
  * **200 OK (Paciente):**
    ```json
    {
      "code": 200,
      "status": "Historial clínico obtenido con éxito",
      "data": [
        {
          "id": 1,
          "id_turno": 2,
          "diagnostico": "Esguince de tobillo grado I",
          "tratamiento": "Reposo y antiinflamatorios",
          "observaciones": "Control en 15 dias",
          "fecha": "2025-10-27T19:00:00.000Z",
          "turno_fecha": "2025-10-27T03:00:00.000Z",
          "turno_hora": "15:30",
          "medico_nombre": "Ana Lopez",
          "especialidad_descripcion": "Traumatologia",
          "sede_nombre": "Sede Centro"
        }
      ]
    }
    ```
  * **200 OK (Médico):**
    ```json
    {
      "code": 200,
      "status": "Historial clínico del paciente atendido obtenido con éxito",
      "data": [
        {
          "id": 1,
          "id_turno": 2,
          "diagnostico": "Esguince de tobillo grado I",
          "tratamiento": "Reposo y antiinflamatorios",
          "observaciones": "Control en 15 dias",
          "fecha": "2025-10-27T19:00:00.000Z",
          "turno_fecha": "2025-10-27T03:00:00.000Z",
          "turno_hora": "15:30",
          "id_paciente": 2,
          "paciente_nombre": "Franco Friggeri",
          "medico_nombre": "Ana Lopez",
          "especialidad_descripcion": "Traumatologia",
          "sede_nombre": "Sede Centro"
        }
      ]
    }
    ```
  * **403 Forbidden:** Paciente intentando ver historial ajeno.
  * **500 Internal Server Error:** `"Error interno al consultar el historial clínico"`

---

#### 35. `GET /historial-clinico/paciente`
* **Middlewares:** `verificarToken`, `verificarRol('paciente')`.
* **Roles:** `paciente`.
* **Path Params:** Ninguno.
* **Reglas:** Atajo directo para que el paciente autenticado consulte su propio historial clínico sin especificar su ID en la URL.
* **Respuestas:** Idénticas a `GET /historial-clinico/paciente/:id_paciente` para rol paciente.

---

#### 36. `GET /notificaciones`
* **Middlewares:** `verificarToken`.
* **Roles:** `admin`, `operador`, `medico`, `paciente` (todos los usuarios autenticados).
* **Query Params:**
  * `leida` (string `"0"` o `"1"`, opcional).
* **Reglas y orden de validación:**
  1. Si se envía `leida` y no es `"0"` ni `"1"`: **400 Bad Request** (`"El filtro leida debe ser 0 (no leídas) o 1 (leídas)."`).
  2. Filtra estrictamente por el usuario autenticado: `n.id_usuario = req.user.id`.
  3. Ordena descendentemente: `ORDER BY n.fecha DESC, n.id DESC`.
  4. Calcula dinámicamente el conteo de no leídas (`no_leidas`).
* **Respuestas:**
  * **200 OK:**
    ```json
    {
      "code": 200,
      "status": "Notificaciones obtenidas con éxito",
      "data": {
        "no_leidas": 0,
        "total": 1,
        "notificaciones": [
          {
            "id": 1,
            "id_usuario": 2,
            "tipo": "turno_confirmado",
            "mensaje": "Tu turno del 27/10/2025 a las 15:30 fue confirmado.",
            "fecha": "2025-10-01 12:00:00",
            "leida": 1
          }
        ]
      }
    }
    ```
  * **400 Bad Request:**
    ```json
    {
      "code": 400,
      "status": "El filtro leida debe ser 0 (no leídas) o 1 (leídas).",
      "data": null
    }
    ```
  * **500 Internal Server Error:** `"Error interno al obtener las notificaciones"`

---

#### 37. `PUT /notificaciones/:id/leer`
* **Middlewares:** `verificarToken`.
* **Roles:** Todos los usuarios autenticados.
* **Path Params:** `id` (number).
* **Reglas y orden de validación:**
  1. Si `!Number.isInteger(Number(id)) || Number(id) <= 0`: **400 Bad Request** (`"El id de la notificación debe ser un número entero positivo."`).
  2. Busca notificación en la tabla. Si no existe: **404 Not Found** (`"Notificación no encontrada."`).
  3. Valida propiedad: `Number(notificacion.id_usuario) === Number(req.user.id)`. Si es ajena: **403 Forbidden** (`"Acceso denegado. Solo puede marcar como leídas sus propias notificaciones."`).
  4. Idempotencia: Si ya estaba leída (`leida === 1`), responde éxito sin error.
  5. Actualiza: `UPDATE notificacion SET leida = 1 WHERE id = ?`.
* **Respuestas:**
  * **200 OK (marcada exitosamente):**
    ```json
    {
      "code": 200,
      "status": "Notificación marcada como leída exitosamente",
      "data": {
        "id": 2,
        "tipo": "turno_atendido",
        "mensaje": "Registraste el turno de Franco Friggeri como atendido.",
        "leida": 1
      }
    }
    ```
  * **200 OK (ya estaba leída):**
    ```json
    {
      "code": 200,
      "status": "La notificación ya se encontraba marcada como leída",
      "data": {
        "id": 1,
        "leida": 1
      }
    }
    ```
  * **400 Bad Request:** ID no entero positivo.
  * **403 Forbidden:** Notificación de otro usuario.
  * **404 Not Found:** Notificación inexistente.
  * **500 Internal Server Error:** `"Error interno al marcar la notificación como leída"`

---

### MÓDULO 4: AUDITORÍA Y REPORTES (Semana 4)

#### 38. `GET /auditoria`
* **Middlewares:** `verificarToken`, `verificarRol('admin')`.
* **Roles:** `admin`.
* **Query Params:**
  * `usuario` o `id_usuario` (number, opcional, alias aceptado).
  * `entidad` (string, opcional, comparación insensible a mayúsculas/minúsculas).
  * `fecha_desde` (string YYYY-MM-DD, opcional).
  * `fecha_hasta` (string YYYY-MM-DD, opcional).
* **Reglas y orden de validación:**
  1. Si viene `usuario` y no es entero positivo: **400 Bad Request** (`"El parámetro usuario debe ser un número entero positivo."`).
  2. Si viene `fecha_desde` y no cumple `YYYY-MM-DD` de calendario: **400 Bad Request** (`"El parámetro fecha_desde debe tener el formato YYYY-MM-DD y ser una fecha válida."`).
  3. Si viene `fecha_hasta` y no cumple `YYYY-MM-DD` de calendario: **400 Bad Request** (`"El parámetro fecha_hasta debe tener el formato YYYY-MM-DD y ser una fecha válida."`).
  4. Rango cruzado: Si `fecha_desde && fecha_hasta && fecha_desde > fecha_hasta`: **400 Bad Request** (`"El parámetro fecha_desde no puede ser posterior a fecha_hasta."`).
  5. Consulta sobre `log_auditoria` con `INNER JOIN usuario` uniendo horas completas de inicio (`00:00:00`) y fin de día (`23:59:59`).
  6. **Ordenamiento:** `ORDER BY l.fecha DESC, l.id DESC`.
* **Respuestas:**
  * **200 OK:**
    ```json
    {
      "code": 200,
      "status": "Registros de auditoría obtenidos con éxito",
      "data": [
        {
          "id": 1,
          "id_usuario": 4,
          "usuario_nombre_completo": "Gomez, Marcos",
          "usuario_nombre": "Marcos",
          "usuario_apellido": "Gomez",
          "usuario_email": "mgomez@clinica.com",
          "usuario_rol": "admin",
          "accion": "ALTA",
          "entidad": "usuario",
          "id_entidad": 2,
          "detalle": "Alta de paciente Friggeri Franco",
          "fecha": "2025-10-01 13:00:00"
        }
      ]
    }
    ```
  * **400 Bad Request:** Parámetro inválido según las 4 validaciones previas.
  * **500 Internal Server Error:** `"Error interno al consultar los logs de auditoría"`

---

#### 39. `GET /reportes/turnos-por-especialidad`
* **Middlewares:** `verificarToken`, `verificarRol('admin')`.
* **Roles:** `admin`.
* **Query Params:**
  * `fecha_desde` (string YYYY-MM-DD, opcional).
  * `fecha_hasta` (string YYYY-MM-DD, opcional).
* **Reglas:**
  * Valida rango de fechas con la misma lógica estricta.
  * Agrupa por especialidad (`e.id`, `e.descripcion`) contando turnos históricos independientemente de su estado final.
  * **Ordenamiento:** `ORDER BY cantidad_turnos DESC, e.descripcion ASC`.
* **Respuestas:**
  * **200 OK:**
    ```json
    {
      "code": 200,
      "status": "Reporte de turnos por especialidad obtenido con éxito",
      "data": [
        {
          "id_especialidad": 1,
          "descripcion": "Traumatologia",
          "cantidad_turnos": 1
        }
      ]
    }
    ```
  * **400 Bad Request:** Rango de fechas no válido.
  * **500 Internal Server Error:** `"Error interno al generar el reporte de turnos por especialidad"`

---

#### 40. `GET /reportes/turnos-por-sede`
* **Middlewares:** `verificarToken`, `verificarRol('admin')`.
* **Roles:** `admin`.
* **Query Params:**
  * `fecha_desde` (string YYYY-MM-DD, opcional).
  * `fecha_hasta` (string YYYY-MM-DD, opcional).
* **Reglas:**
  * Agrupa por sede (`s.id`, `s.nombre`) contando turnos registrados a través de la agenda.
  * **Ordenamiento:** `ORDER BY cantidad_turnos DESC, s.nombre ASC`.
* **Respuestas:**
  * **200 OK:**
    ```json
    {
      "code": 200,
      "status": "Reporte de turnos por sede obtenido con éxito",
      "data": [
        {
          "id_sede": 1,
          "nombre": "Sede Centro",
          "cantidad_turnos": 1
        }
      ]
    }
    ```
  * **400 Bad Request:** Fechas inválidas.
  * **500 Internal Server Error:** `"Error interno al generar el reporte de turnos por sede"`

---

#### 41. `GET /reportes/ranking-medicos`
* **Middlewares:** `verificarToken`, `verificarRol('admin')`.
* **Roles:** `admin`.
* **Query Params:**
  * `fecha_desde` (string YYYY-MM-DD, opcional).
  * `fecha_hasta` (string YYYY-MM-DD, opcional).
* **Reglas:**
  * Filtra **única y estrictamente** turnos con `t.estado = 'atendido'`.
  * Agrupa por médico (`u.id`, `u.nombre`, `u.apellido`).
  * **Ordenamiento:** `ORDER BY cantidad_atendidos DESC, u.apellido ASC, u.nombre ASC`.
* **Respuestas:**
  * **200 OK:**
    ```json
    {
      "code": 200,
      "status": "Ranking de médicos por turnos atendidos obtenido con éxito",
      "data": [
        {
          "id_medico": 3,
          "nombre": "Ana",
          "apellido": "Lopez",
          "cantidad_atendidos": 1
        }
      ]
    }
    ```
  * **400 Bad Request:** Fechas inválidas.
  * **500 Internal Server Error:** `"Error interno al generar el ranking de médicos"`

---

#### 42. `GET /reportes/tasa-cancelacion`
* **Middlewares:** `verificarToken`, `verificarRol('admin')`.
* **Roles:** `admin`.
* **Query Params:**
  * `fecha_desde` (string YYYY-MM-DD, opcional).
  * `fecha_hasta` (string YYYY-MM-DD, opcional).
* **Reglas y fórmula matemática:**
  * Consulta SQL:
    ```sql
    SELECT 
      CAST(COUNT(*) AS SIGNED) AS total_turnos,
      CAST(SUM(CASE WHEN t.estado = 'cancelado' THEN 1 ELSE 0 END) AS SIGNED) AS turnos_cancelados
    FROM turno t
    WHERE 1=1 [AND t.fecha >= ?] [AND t.fecha <= ?]
    ```
  * En JavaScript:
    ```javascript
    const tasaCancelacion = totalTurnos > 0 
      ? Number((turnosCancelados / totalTurnos).toFixed(4)) 
      : 0;
    ```
  * Devuelve la tasa normalizada como float entre `0` y `1` (con hasta 4 decimales).
* **Respuestas:**
  * **200 OK:**
    ```json
    {
      "code": 200,
      "status": "Tasa de cancelación obtenida con éxito",
      "data": {
        "total_turnos": 10,
        "turnos_cancelados": 2,
        "tasa_cancelacion": 0.2
      }
    }
    ```
  * **400 Bad Request:** Fechas inválidas.
  * **500 Internal Server Error:** `"Error interno al calcular la tasa de cancelación"`

---

### MÓDULO 5: GESTIÓN DE USUARIOS (Administrador)

#### 43. `GET /usuarios` (Listado Paginado de Usuarios con Filtros)
* **Middlewares:** `verificarToken`, `verificarRol('admin')`.
* **Roles:** `admin` (exclusivo para Administrador).
* **Query Params:**
  * `page` (number, opcional, por defecto `1`): Entero positivo mayor a 0.
  * `limit` (number, opcional, por defecto `10`): Entero positivo entre 1 y 100.
  * `nombre` (string, opcional): Búsqueda parcial insensible a mayúsculas/minúsculas (`LOWER(u.nombre) LIKE LOWER('%...%')`).
  * `apellido` (string, opcional): Búsqueda parcial insensible a mayúsculas/minúsculas (`LOWER(u.apellido) LIKE LOWER('%...%')`).
  * `rol` (string, opcional): Filtro exacto por rol. Valores permitidos: `'admin'`, `'operador'`, `'medico'`, `'paciente'`.
  * `id_sede` (number, opcional): Entero positivo correspondiente al ID de una sede.
* **Reglas y orden de validación:**
  1. Si `page` no es un número entero positivo: **400 Bad Request** (`"El parámetro page debe ser un número entero positivo."`).
  2. Si `limit` no es un número entero positivo entre 1 y 100: **400 Bad Request** (`"El parámetro limit debe ser un número entero positivo entre 1 y 100."`).
  3. Si viene `rol` y no es uno de los permitidos: **400 Bad Request** (`"El parámetro rol debe ser uno de: admin, operador, medico, paciente."`).
  4. Si viene `id_sede` y no es un entero positivo: **400 Bad Request** (`"El parámetro id_sede debe ser un número entero positivo."`).
  5. Conteo total (`COUNT(*) AS total`) con los filtros aplicados para control de paginación.
  6. Consulta paginada con `LIMIT ? OFFSET ?` ordenando por `u.apellido ASC, u.nombre ASC`.
  7. Recuperación de especialidades médicas: Para los usuarios con rol `'medico'`, se realiza una consulta auxiliar contra `medico_especialidad` y `especialidad` para asociar el listado de especialidades asignadas (`[{ id, descripcion }]`). Para otros roles, se asigna un array vacío (`[]`).
  8. **Seguridad y confidencialidad:** El campo `password` es omitido de la respuesta.
* **Respuestas:**
  * **200 OK:**
    ```json
    {
      "code": 200,
      "status": "Usuarios obtenidos con éxito",
      "data": {
        "items": [
          {
            "id": 3,
            "nombre": "Ana",
            "apellido": "Lopez",
            "dni": "20111222",
            "email": "alopez@clinica.com",
            "telefono": "3424111222",
            "fecha_nacimiento": "1980-05-10",
            "rol": "medico",
            "id_sede": 1,
            "sede_nombre": "Sede Centro",
            "id_cobertura": null,
            "cobertura_nombre": null,
            "especialidades": [
              {
                "id": 1,
                "descripcion": "Traumatologia"
              }
            ]
          },
          {
            "id": 2,
            "nombre": "Franco",
            "apellido": "Friggeri",
            "dni": "36000960",
            "email": "asdas@gaasds.com",
            "telefono": "342545555",
            "fecha_nacimiento": "1998-03-14",
            "rol": "paciente",
            "id_sede": null,
            "sede_nombre": null,
            "id_cobertura": 1,
            "cobertura_nombre": "Jerarquicos",
            "especialidades": []
          }
        ],
        "total": 2,
        "page": 1,
        "limit": 10
      }
    }
    ```
  * **400 Bad Request:** Por parámetros inválidos (`page`, `limit`, `rol`, `id_sede`).
  * **401 Unauthorized:** Token no enviado o expirado.
  * **403 Forbidden:** Usuario autenticado no tiene rol `'admin'`.
  * **500 Internal Server Error:** `"Error al obtener la lista de usuarios"`
* **Efectos secundarios:** Ninguno.

---

#### 44. `GET /usuarios/:id` (Obtener Detalle de Usuario por ID)
* **Middlewares:** `verificarToken`, `verificarRol('admin')`.
* **Roles:** `admin` (exclusivo para Administrador).
* **Path Params:** `id` (number, obligatorio): Entero positivo.
* **Reglas y orden de validación:**
  1. Si `id` no es un número entero positivo: **400 Bad Request** (`"El ID de usuario debe ser un número entero positivo."`).
  2. Consulta la tabla `usuario` con `LEFT JOIN` a `sede` y `cobertura`. Si no existe: **404 Not Found** (`"Usuario no encontrado"`).
  3. Si el rol es `'medico'`, recupera sus especialidades asignadas desde `medico_especialidad`.
  4. Responde con el objeto completo del usuario sin exponer el hash de contraseña `password`.
* **Respuestas:**
  * **200 OK:**
    ```json
    {
      "code": 200,
      "status": "Usuario obtenido con éxito",
      "data": {
        "id": 3,
        "nombre": "Ana",
        "apellido": "Lopez",
        "dni": "20111222",
        "email": "alopez@clinica.com",
        "telefono": "3424111222",
        "fecha_nacimiento": "1980-05-10",
        "rol": "medico",
        "id_sede": 1,
        "sede_nombre": "Sede Centro",
        "id_cobertura": null,
        "cobertura_nombre": null,
        "especialidades": [
          {
            "id": 1,
            "descripcion": "Traumatologia"
          }
        ]
      }
    }
    ```
  * **400 Bad Request:** ID no entero positivo.
  * **401 Unauthorized:** Token no enviado o inválido.
  * **403 Forbidden:** No posee rol de administrador.
  * **404 Not Found:** `"Usuario no encontrado"`
  * **500 Internal Server Error:** `"Error al obtener el usuario"`

---

#### 45. `POST /usuarios` (Alta Administrativa de Usuario)
* **Middlewares:** `verificarToken`, `verificarRol('admin')`.
* **Roles:** `admin` (exclusivo para Administrador).
* **Query Params:** Ninguno.
* **Body (JSON):**
  * `nombre` (string, obligatorio, máx. 30 caracteres).
  * `apellido` (string, obligatorio, máx. 30 caracteres).
  * `dni` (string o number, obligatorio, 7 u 8 dígitos numéricos).
  * `email` (string, obligatorio, formato válido, máx. 30 caracteres).
  * `password` (string, obligatorio, longitud mínima 6 caracteres).
  * `fecha_nacimiento` (string YYYY-MM-DD, obligatorio, fecha de calendario válida no futura).
  * `rol` (string, obligatorio: `'admin'`, `'operador'`, `'medico'`, `'paciente'`).
  * `telefono` (string o number, obligatorio, entre 6 y 10 dígitos numéricos).
  * `id_sede` (number, obligatorio si el rol es `'medico'` u `'operador'`; omitido o null si es `'admin'` o `'paciente'`).
  * `id_cobertura` (number, opcional si es `'paciente'`, omitido o null para otros roles).
  * `especialidades` (array de numbers, obligatorio si el rol es `'medico'` con al menos 1 ID de especialidad, sin duplicados y existentes en la base de datos).
  ```json
  {
    "nombre": "Rodrigo",
    "apellido": "De Paul",
    "dni": "35123456",
    "email": "rdepaul@clinica.com",
    "password": "Password123!",
    "fecha_nacimiento": "1994-05-24",
    "telefono": "1134567890",
    "rol": "medico",
    "id_sede": 1,
    "especialidades": [1, 2]
  }
  ```
* **Reglas y orden exacto de validación:**
  1. Validación del rol: Debe ser uno de los roles permitidos (`admin`, `operador`, `medico`, `paciente`). Si no es válido: **400 Bad Request** (`"El rol debe ser admin, operador o medico."`).
  2. Validación de campos de texto y longitudes:
     * `nombre` no vacío y hasta 30 caracteres (400: `"El nombre es obligatorio."` o `"El nombre no puede superar los 30 caracteres."`).
     * `apellido` no vacío y hasta 30 caracteres (400: `"El apellido es obligatorio."` o `"El apellido no puede superar los 30 caracteres."`).
     * `dni` regex `^\d{7,8}$` (400: `"El DNI debe contener 7 u 8 dígitos numéricos."`).
     * `email` regex válido y hasta 30 caracteres (400: `"El email ingresado no es válido."` o `"El email no puede superar los 30 caracteres."`).
     * `telefono` regex `^\d{6,10}$` (400: `"El teléfono debe contener entre 6 y 10 dígitos numéricos."`).
     * `password` string con longitud mínima de 6 caracteres (400: `"La contraseña debe tener al menos 6 caracteres."`).
     * `fecha_nacimiento` formato `YYYY-MM-DD` válido y menor o igual a la fecha actual (400: `"La fecha de nacimiento debe tener formato YYYY-MM-DD válido y no puede ser futura."`).
  3. Validación de Sede:
     * Si `rol === 'operador' || rol === 'medico'`: `id_sede` es obligatorio y debe existir en la tabla `sede` (400: `"La sede es obligatoria para los roles operador y médico."` / `"La sede especificada no existe."`).
     * Si `rol === 'admin'` o `rol === 'paciente'`: `id_sede` queda como `null`.
  4. Validación de Especialidades Médicas:
     * Si `rol === 'medico'`: `especialidades` debe ser un array no vacío (400: `"El médico debe tener al menos una especialidad."`).
     * No permite IDs duplicados en el array (400: `"El arreglo de especialidades no puede contener valores duplicados."`).
     * Cada ID debe ser entero positivo y existir en la tabla `especialidad` (400: `"Una o más especialidades especificadas no existen."`).
  5. Control de unicidad de DNI y Email:
     * Consulta `SELECT id, dni, email FROM usuario WHERE dni = ? OR email = ?`.
     * Si colisionan ambos: **400 Bad Request** (`"El DNI y el Email ya se encuentran registrados."`).
     * Si colisiona DNI: **400 Bad Request** (`"El DNI ya se encuentra registrado."`).
     * Si colisiona Email: **400 Bad Request** (`"El Email ya se encuentra registrado."`).
  6. Hasheo criptográfico: La contraseña se hashea con `bcrypt.hash(password, 10)` utilizando coste de 10 rondas de salt.
  7. Transaccionalidad atómica:
     * Inicia transacción MySQL (`connection.beginTransaction()`).
     * Inserta el usuario en la tabla `usuario`.
     * Si es médico, inserta cada ID de especialidad en `medico_especialidad (id_medico, id_especialidad)`.
     * Confirma la transacción (`connection.commit()`) o revierte ante cualquier fallo (`connection.rollback()`).
  8. **Auditoría:** Registra log de auditoría (`ALTA`, entidad `'usuario'`, `id_entidad`: nuevo ID generado, detalle: `'Alta de usuario: ${nombre} ${apellido} (Rol: ${rol})'`).
* **Respuestas:**
  * **201 Created:**
    ```json
    {
      "code": 201,
      "status": "Usuario creado exitosamente",
      "data": {
        "id": 6,
        "nombre": "Rodrigo",
        "apellido": "De Paul",
        "dni": "35123456",
        "email": "rdepaul@clinica.com",
        "telefono": "1134567890",
        "fecha_nacimiento": "1994-05-24",
        "rol": "medico",
        "id_sede": 1,
        "sede_nombre": "Sede Centro",
        "id_cobertura": null,
        "cobertura_nombre": null,
        "especialidades": [
          {
            "id": 1,
            "descripcion": "Traumatologia"
          },
          {
            "id": 2,
            "descripcion": "Pediatria"
          }
        ]
      }
    }
    ```
  * **400 Bad Request:** Parámetro o validación de negocio incumplida (duplicados de DNI/Email, FKs inexistentes, regex de formato).
  * **401 Unauthorized:** Token no provisto o inválido.
  * **403 Forbidden:** No autorizado (solo rol `admin`).
  * **500 Internal Server Error:** `"Error interno al crear el usuario"`

---

#### 46. `PUT /usuarios/:id` (Modificación de Usuario Existente)
* **Middlewares:** `verificarToken`, `verificarRol('admin')`.
* **Roles:** `admin` (exclusivo para Administrador).
* **Path Params:** `id` (number, obligatorio): Entero positivo.
* **Body (JSON):**
  * `nombre` (string, obligatorio, máx. 30 caracteres).
  * `apellido` (string, obligatorio, máx. 30 caracteres).
  * `dni` (string o number, obligatorio, 7 u 8 dígitos).
  * `email` (string, obligatorio, formato válido, máx. 30 caracteres).
  * `telefono` (string o number, obligatorio, 6 a 10 dígitos).
  * `fecha_nacimiento` (string YYYY-MM-DD, obligatorio, fecha no futura).
  * `password` (string, opcional): Si se incluye y no está vacío, debe tener al menos 6 caracteres y se actualiza su hash con bcrypt. Si se omite o es vacío, se preserva intacta la contraseña existente.
  * `id_sede` (number, obligatorio para roles `'operador'` y `'medico'`; omitido/null si es `'admin'` o `'paciente'`).
  * `id_cobertura` (number, obligatorio para rol `'paciente'`; omitido/null para otros roles).
  * `especialidades` (array de numbers, obligatorio si es médico).
  * `rol` (opcional en el body, pero **estrictamente inmutable**).
  ```json
  {
    "nombre": "Rodrigo Javier",
    "apellido": "De Paul",
    "dni": "35123456",
    "email": "rdepaul@clinica.com",
    "telefono": "1134567899",
    "fecha_nacimiento": "1994-05-24",
    "id_sede": 1,
    "especialidades": [1, 2]
  }
  ```
* **Reglas y orden exacto de validación:**
  1. Si `id` no es entero positivo: **400 Bad Request** (`"El ID de usuario debe ser un número entero positivo."`).
  2. Verifica existencia del usuario en la base de datos: Si no existe: **404 Not Found** (`"Usuario no encontrado"`).
  3. **Inmutabilidad del Rol:** Si el body incluye `rol` y su valor difiere del rol actual almacenado: **400 Bad Request** (`"El rol no puede ser modificado."`).
  4. Validaciones de formatos, longitudes y regexes (nombre, apellido, dni, email, teléfono, fecha de nacimiento no futura).
  5. Password condicional: Si viene un valor de `password`, se valida `length >= 6` y se calcula `bcrypt.hash(password, 10)`. De lo contrario se mantiene el hash previo.
  6. Unicidad de DNI y Email con exclusión del propio usuario:
     * Verifica que no colisionen con otros usuarios (`WHERE (dni = ? OR email = ?) AND id != ?`).
     * Si colisiona: **400 Bad Request** (`"El DNI y el Email ya se encuentran registrados."` / `"El DNI ya se encuentra registrado."` / `"El Email ya se encuentra registrado."`).
  7. Reglas de claves foráneas según el rol del usuario:
     * Si `rol === 'paciente'`: `id_cobertura` es obligatorio y debe existir en `cobertura`. `id_sede` se establece en `null`.
     * Si `rol === 'operador'`: `id_sede` es obligatoria y debe existir en `sede`. `id_cobertura` se establece en `null`.
     * Si `rol === 'admin'`: `id_sede = null` e `id_cobertura = null`.
     * Si `rol === 'medico'`: `id_sede` obligatoria y existente; `especialidades` array válido de IDs únicos y existentes.
  8. **Protección de Especialidades en Agenda Médica:**
     * Si el usuario es médico, se comprueba si posee franjas horarias registradas en la tabla `agenda`.
     * Si se intenta desasignar una especialidad que el médico ya tiene en uso en su agenda: **400 Bad Request** (``No se puede quitar la especialidad "${descripcion}" porque el médico posee registros de agenda asociados a ella.``).
  9. Transaccionalidad atómica:
     * Inicia transacción MySQL (`connection.beginTransaction()`).
     * Ejecuta `UPDATE usuario SET ... WHERE id = ?`.
     * Si es médico, elimina las asignaciones previas en `medico_especialidad` y reinserta el nuevo set de especialidades validadas.
     * Confirma la transacción (`connection.commit()`).
  10. **Auditoría:** Registra log de auditoría (`MODIFICACION`, entidad `'usuario'`, `id_entidad`: ID del usuario modificado, detalle: `'Modificación de usuario id=${id} (${nombre} ${apellido})'`).
* **Respuestas:**
  * **200 OK:**
    ```json
    {
      "code": 200,
      "status": "Usuario actualizado exitosamente",
      "data": {
        "id": 6,
        "nombre": "Rodrigo Javier",
        "apellido": "De Paul",
        "dni": "35123456",
        "email": "rdepaul@clinica.com",
        "telefono": "1134567899",
        "fecha_nacimiento": "1994-05-24",
        "rol": "medico",
        "id_sede": 1,
        "sede_nombre": "Sede Centro",
        "id_cobertura": null,
        "cobertura_nombre": null,
        "especialidades": [
          {
            "id": 1,
            "descripcion": "Traumatologia"
          },
          {
            "id": 2,
            "descripcion": "Pediatria"
          }
        ]
      }
    }
    ```
  * **400 Bad Request:** Por rol modificado, especialidad con agenda en uso, campos inválidos o duplicados.
  * **401 Unauthorized:** Token no provisto o inválido.
  * **403 Forbidden:** No autorizado (solo rol `admin`).
  * **404 Not Found:** `"Usuario no encontrado"`
  * **500 Internal Server Error:** `"Error interno al actualizar el usuario"`

---

---

## 5. FLUJOS TRANSVERSALES

### 5.1. Ciclo de Vida del Turno Médico
```
[ POST /turnos ]
       │
       ▼
  "confirmado"
   (Notificación 'turno_confirmado' al paciente)
       │
       ├─────────────────────────────────────────┐
       │                                         │
       ▼ [ PUT /turnos/:id/cancelar ]            ▼ [ PUT /turnos/:id/atender ]
  "cancelado"                               "atendido"
   (Notificación 'turno_cancelado'           (Notificación 'turno_atendido'
    al paciente y al médico)                  al paciente)
                                                 │
                                                 ▼ [ POST /historial-clinico ]
                                            Carga de diagnóstico y tratamiento
```

* **Transición 1: Creación (`POST /turnos`)**
  * Estado: Nace en `'confirmado'`.
  * Notificación: Crea notificación `turno_confirmado` para el `id_paciente`.
* **Transición 2: Cancelación (`PUT /turnos/:id/cancelar`)**
  * Estado anterior requerido: `'confirmado'`. Si está en `'cancelado'` o `'atendido'` es rechazado con código 400.
  * Notificación 1: Para el paciente (`turno_cancelado`).
  * Notificación 2: Para el médico (`turno_cancelado`), si quien canceló no fue dicho médico.
* **Transición 3: Atención (`PUT /turnos/:id/atender`)**
  * Estado anterior requerido: Estrictamente `'confirmado'`.
  * Notificación: Para el paciente (`turno_atendido`).

---

### 5.2. Helper de Notificaciones (`src/utils/notificacionHelper.js`)
Código completo real:
```javascript
// src/utils/notificacionHelper.js
const pool = require('../config/db');

/**
 * Función auxiliar para registrar una notificación en la base de datos.
 * Inserta un registro en la tabla `notificacion` con fecha automática y leida = 0.
 *
 * @param {number} id_usuario - ID del usuario destinatario (paciente o médico).
 * @param {string} tipo - Tipo de notificación ('turno_confirmado', 'turno_cancelado', 'turno_atendido', etc.).
 * @param {string} mensaje - Contenido descriptivo de la notificación.
 * @returns {Promise<number|null>} ID de la notificación creada o null si hubo error.
 */
const crearNotificacion = async (id_usuario, tipo, mensaje) => {
  try {
    if (!id_usuario || !tipo || !mensaje) {
      console.warn('Advertencia: Parámetros insuficientes para crear notificación.');
      return null;
    }

    const [result] = await pool.query(
      `INSERT INTO notificacion (id_usuario, tipo, mensaje, fecha, leida)
       VALUES (?, ?, ?, NOW(), 0)`,
      [id_usuario, tipo, mensaje]
    );

    return result.insertId;
  } catch (error) {
    console.error('Error al insertar notificación en la base de datos:', error);
    // No interrumpir el flujo transaccional principal si la notificación falla
    return null;
  }
};

module.exports = {
  crearNotificacion
};
```
* **Invocaciones en el backend:**
  1. `turnoController.js -> createTurno`: Destinatario: paciente | Tipo: `'turno_confirmado'`.
  2. `turnoController.js -> cancelarTurno`: Destinatario: paciente | Tipo: `'turno_cancelado'`.
  3. `turnoController.js -> cancelarTurno`: Destinatario: médico | Tipo: `'turno_cancelado'`.
  4. `turnoController.js -> atenderTurno`: Destinatario: paciente | Tipo: `'turno_atendido'`.

---

### 5.3. Helper de Auditoría (`src/utils/auditoriaHelper.js`)
Código completo real:
```javascript
// src/utils/auditoriaHelper.js
const pool = require('../config/db');

/**
 * Función auxiliar para registrar una acción en la tabla `log_auditoria`.
 * Implementación "fire and forget" con try/catch interno: si la inserción
 * de auditoría falla, NO interrumpe ni revierte el flujo de la operación principal.
 *
 * @param {number} id_usuario - ID del usuario que ejecuta la acción (FK a `usuario.id`).
 * @param {'ALTA'|'BAJA'|'MODIFICACION'} accion - Acción realizada.
 * @param {string} entidad - Entidad afectada (ej: 'sede', 'especialidad', 'cobertura', 'usuario').
 * @param {number|null} id_entidad - ID del registro afectado en la entidad.
 * @param {string|null} detalle - Detalle descriptivo breve de la acción.
 * @returns {Promise<number|null>} ID del registro de auditoría insertado o null si falló.
 */
const registrarAuditoria = async (id_usuario, accion, entidad, id_entidad = null, detalle = null) => {
  try {
    if (!id_usuario || !accion || !entidad) {
      console.warn('Advertencia: Parámetros obligatorios faltantes para registrar auditoría (id_usuario, accion, entidad).');
      return null;
    }

    const [result] = await pool.query(
      `INSERT INTO log_auditoria (id_usuario, accion, entidad, id_entidad, detalle)
       VALUES (?, ?, ?, ?, ?)`,
      [id_usuario, accion, entidad, id_entidad !== undefined ? id_entidad : null, detalle !== undefined ? detalle : null]
    );

    return result.insertId;
  } catch (error) {
    console.error('Error al registrar log de auditoría en la base de datos:', error);
    // Operación no bloqueante: retornar null para preservar la continuidad del flujo principal
    return null;
  }
};

module.exports = {
  registrarAuditoria
};
```
* **Invocaciones en el backend:**
  1. `authController.js -> registro`: Acción `'ALTA'` | Entidad `'usuario'` | Detalle: ``Alta de usuario: ${nombre} ${apellido} (DNI: ${dni})``.
  2. `sedeController.js -> createSede`: Acción `'ALTA'` | Entidad `'sede'`.
  3. `sedeController.js -> updateSede`: Acción `'MODIFICACION'` | Entidad `'sede'`.
  4. `sedeController.js -> deleteSede`: Acción `'BAJA'` | Entidad `'sede'`.
  5. `especialidadController.js -> createEspecialidad`: Acción `'ALTA'` | Entidad `'especialidad'`.
  6. `especialidadController.js -> updateEspecialidad`: Acción `'MODIFICACION'` | Entidad `'especialidad'`.
  7. `especialidadController.js -> deleteEspecialidad`: Acción `'BAJA'` | Entidad `'especialidad'`.
  8. `coberturaController.js -> createCobertura`: Acción `'ALTA'` | Entidad `'cobertura'`.
  9. `coberturaController.js -> updateCobertura`: Acción `'MODIFICACION'` | Entidad `'cobertura'`.
  10. `coberturaController.js -> deleteCobertura`: Acción `'BAJA'` | Entidad `'cobertura'`.
  11. `usuarioController.js -> createUsuario`: Acción `'ALTA'` | Entidad `'usuario'` | Detalle: ``Alta de usuario: ${nombreTrim} ${apellidoTrim} (Rol: ${rol})``.
  12. `usuarioController.js -> updateUsuario`: Acción `'MODIFICACION'` | Entidad `'usuario'` | Detalle: ``Modificación de usuario id=${id} (${nombreTrim} ${apellidoTrim})``.

### 5.4. Entidades Auditadas vs. NO Auditadas
* **Entidades Auditadas:**
  * `usuario` (Auditada activamente tanto en el registro público de pacientes como en el alta y modificación administrativa por parte del Administrador).
  * `sede` (Altas, modificaciones y bajas).
  * `especialidad` (Altas, modificaciones y bajas).
  * `cobertura` (Altas, modificaciones y bajas).
* **Entidades NO Auditadas en el código:**
  * `agenda` (Ninguna operación de creación, actualización ni eliminación de franjas horarias está auditada).
  * `turno` (Altas, cancelaciones y atenciones de turnos **no** generan registro en `log_auditoria`).
  * `historial_clinico` (La carga de diagnósticos clínicos **no** se audita).
  * `notificacion` (La marcación de lectura **no** se audita).
  * `auth/login` (Los inicios de sesión exitosos o fallidos **no** se auditan).

---

### 5.5. Impacto de Estados de Turnos en Reportes de Semana 4
1. **`turnos-por-especialidad` y `turnos-por-sede`:** Cuentan la totalidad de turnos (`COUNT(t.id)`), sumando tanto `'confirmado'`, como `'cancelado'` y `'atendido'`.
2. **`ranking-medicos`:** Filtra con cláusula estricta `WHERE t.estado = 'atendido'`. Las cancelaciones o turnos aún no atendidos no suman al ranking médico.
3. **`tasa-cancelacion`:** Compara directamente los turnos con `estado = 'cancelado'` respecto del total general de turnos en el período seleccionado.

---

## 6. COLECCIÓN DE POSTMAN ACTUAL

### 6.1. Variables de Colección en `postman_collection.json`
* `baseUrl`: `"http://localhost:3000"`
* `token_admin`: `"TU_TOKEN_JWT_ADMIN"`
* `token_medico`: `"TU_TOKEN_JWT_MEDICO"`
* `token_paciente`: `"TU_TOKEN_JWT_PACIENTE"`
* `token_operador`: `"TU_TOKEN_JWT_OPERADOR"`
* `id_notificacion`: `"1"`

---

### 6.2. Carpetas y Requests Existentes

1. **📁 🔑 Setup Tokens (Login rápido)**
   * `[POST] Login Admin` (`{{baseUrl}}/auth/login` con credenciales de Marcos Gomez)
   * `[POST] Login Medico` (`{{baseUrl}}/auth/login` con credenciales de Ana Lopez)
   * `[POST] Login Paciente` (`{{baseUrl}}/auth/login` con credenciales de Franco Friggeri)
   * `[POST] Login Operador` (`{{baseUrl}}/auth/login` con credenciales de Juan Perez)
2. **📁 Auth & Health (Semana 1)**
   * `[GET] Health Check DB` (`{{baseUrl}}/health`)
   * `[GET] Obtener Coberturas (Auth)` (`{{baseUrl}}/auth/coberturas`)
   * `[POST] Registro de Usuario` (`{{baseUrl}}/auth/registro`)
   * `[POST] Login de Usuario` (`{{baseUrl}}/auth/login`)
   * `[GET] Perfil de Usuario (Protegido)` (`{{baseUrl}}/auth/perfil`)
   * `[GET] Test Rol Admin` (`{{baseUrl}}/test/admin`)
3. **📁 Sedes (Solo Admin)**
   * `[GET] Listar Sedes`
   * `[GET] Obtener Sede por ID`
   * `[POST] Crear Sede`
   * `[PUT] Actualizar Sede`
   * `[DELETE] Eliminar Sede`
4. **📁 Especialidades (Solo Admin)**
   * `[GET] Listar Especialidades`
   * `[GET] Obtener Especialidad por ID`
   * `[POST] Crear Especialidad`
   * `[PUT] Actualizar Especialidad`
   * `[DELETE] Eliminar Especialidad`
5. **📁 Coberturas**
   * `[GET] Listar Coberturas (Público)`
   * `[GET] Obtener Cobertura por ID`
   * `[POST] Crear Cobertura (Solo Admin)`
   * `[PUT] Actualizar Cobertura (Solo Admin)`
   * `[DELETE] Eliminar Cobertura (Solo Admin)`
6. **📁 Agenda Médica**
   * `[GET] Listar Agenda (con filtros opcionales)`
   * `[GET] Obtener Franja de Agenda por ID`
   * `[POST] Crear Franja de Agenda`
   * `[PUT] Actualizar Franja de Agenda`
   * `[DELETE] Eliminar Franja de Agenda`
7. **📁 Turnos**
   * `[POST] Alta de Turno - Paciente (Exitoso)`
   * `[POST] Alta de Turno - Operador (Exitoso)`
   * `[POST] Alta de Turno - Rechazado por Horario no Disponible (400)`
   * `[POST] Alta de Turno - Rechazado por Superposición (400)`
   * `[PUT] Cancelar Turno (Exitoso)`
   * `[PUT] Atender Turno - Solo Médico (Exitoso)`
8. **📁 Historial Clínico**
   * `[POST] Cargar Historial Clínico - Médico (Exitoso)`
   * `[GET] Consultar Historial - Paciente Propio (Exitoso)`
   * `[GET] Consultar Historial de Paciente - Médico (Exitoso)`
9. **📁 Turnos - Listados (Punto 5)**
   * `[GET] Mis Turnos - Paciente (más próximo primero)`
   * `[GET] Mis Turnos - Filtrado por estado`
   * `[GET] Mis Turnos - Estado inválido (400)`
   * `[GET] Mis Turnos - Médico intentando acceder (403)`
   * `[GET] Turnos Programados - Médico (su propia agenda)`
   * `[GET] Turnos Programados - Médico pidiendo otro médico (403)`
   * `[GET] Turnos Programados - Operador (médicos de su sede)`
   * `[GET] Turnos Programados - Sin fecha (400)`
   * `[GET] Turnos Programados - Fecha mal formada (400)`
   * `[GET] Turnos por Sede - Operador (su sede)`
   * `[GET] Turnos por Sede - Operador pidiendo otra sede (403)`
   * `[GET] Turnos por Sede - Admin (cualquier sede)`
   * `[GET] Turnos por Sede - Paciente sin acceso (403)`
10. **📁 Notificaciones (Punto 6)**
    * `[GET] Listar Notificaciones - Paciente (más reciente primero)`
    * `[GET] Listar Notificaciones - Solo no leídas`
    * `[GET] Listar Notificaciones - Filtro inválido (400)`
    * `[GET] Listar Notificaciones - Médico (las suyas)`
    * `[GET] Listar Notificaciones - Sin token (401)`
    * `[PUT] Marcar Notificación como Leída`
    * `[PUT] Marcar Notificación Ajena (403)`
    * `[PUT] Marcar Notificación Inexistente (404)`
    * `[POST] Alta de Notificación por endpoint - No existe (404)`
11. **📁 Cambios para el Frontend (Requerimientos A3 a A9)**
    * `[GET] A3 - GET Sedes (Público autenticado)`
    * `[GET] A3 - GET Sede por ID (Público autenticado)`
    * `[GET] A3 - GET Especialidades (Público autenticado)`
    * `[GET] A3 - GET Especialidad por ID (Público autenticado)`
    * `[GET] A4 - GET Médicos con filtros (especialidad y sede)`
    * `[GET] A4 - GET Médico por ID`
    * `[GET] A5 - GET Usuarios Paginado con Filtros (Admin)` (`{{baseUrl}}/usuarios?page=1&limit=10&rol=medico&id_sede=1`)
    * `[GET] A5 - GET Usuario por ID (Admin)` (`{{baseUrl}}/usuarios/3`)
    * `[POST] A5 - POST Crear Médico (Admin)` (`{{baseUrl}}/usuarios`)
    * `[PUT] A5 - PUT Modificar Usuario (Admin)` (`{{baseUrl}}/usuarios/6`)
    * `[GET] A6 - GET Auditoría Paginada (Admin)`
    * `[GET] A7 - GET Agenda con Contadores de Turnos`
    * `[GET] A7 - GET Agenda por ID con Contadores`
    * `[POST] A7 - POST Agenda con Horarios Normalizados (Admin)`
    * `[PUT] A7 - PUT Agenda con Validación de Turnos Asociados (Admin)`
    * `[GET] A8 - GET Turnos Programados (con id_sede, fecha nacimiento e historial)`
    * `[PUT] A8 - PUT Cancelar Turno Propio (Médico)`
    * `[POST] A9 - POST Historial Clínico con Validación de Longitud (Médico)`

---

### 6.3. Endpoints del Backend y Cobertura en la Colección de Postman

#### 6.3.1. Cobertura del Módulo `/usuarios` en Postman
Los endpoints implementados en `usuarioController.js` y `usuarioRoutes.js` se encuentran registrados en la colección `postman_collection.json` dentro de la carpeta **"Cambios para el Frontend" (Requerimiento A5)** con autenticación administrativa (`token_admin`):
* `GET /usuarios`: Cubierto mediante request `A5 - GET Usuarios Paginado con Filtros (Admin)` (`{{baseUrl}}/usuarios?page=1&limit=10&rol=medico&id_sede=1`).
* `GET /usuarios/:id`: Cubierto mediante request `A5 - GET Usuario por ID (Admin)` (`{{baseUrl}}/usuarios/3`).
* `POST /usuarios`: Cubierto mediante request `A5 - POST Crear Médico (Admin)` (`{{baseUrl}}/usuarios`).
* `PUT /usuarios/:id`: Cubierto mediante request `A5 - PUT Modificar Usuario (Admin)` (`{{baseUrl}}/usuarios/6`).

**Casos de prueba adicionales o pendientes recomendados para completar la suite de `/usuarios`:**
1. `POST /usuarios` para la creación de usuarios con rol `operador` (asignación de `id_sede`) y rol `admin` (sin sede ni cobertura).
2. `POST /usuarios` de validación negativa: Intento de alta con DNI o Email duplicado (verificación de respuesta 400 Bad Request y mensajes respectivos).
3. `POST /usuarios` de validación negativa: Intento de alta con fecha de nacimiento futura o rol inválido (400 Bad Request).
4. `PUT /usuarios/:id` de validación de integridad: Intento de mutación de rol (verificación de respuesta 400 Bad Request: `"El rol no puede ser modificado."`).
5. `PUT /usuarios/:id` de integridad referencial médica: Intento de desasignar una especialidad que el médico ya utiliza en su agenda (verificación de respuesta 400 Bad Request con mensaje descriptivo).
6. `PUT /usuarios/:id` para la actualización de un usuario con rol `paciente` asignando o modificando `id_cobertura`.
7. Pruebas de seguridad RBAC: Invocación de `GET /usuarios`, `POST /usuarios` o `PUT /usuarios/:id` utilizando tokens de paciente, médico u operador, verificando la respuesta 403 Forbidden.

#### 6.3.2. Endpoints del Backend SIN Request en la Colección Base
Los siguientes endpoints analíticos y auxiliares no cuentan con peticiones en las carpetas base de la colección `postman_collection.json`:
1. `GET /reportes/turnos-por-especialidad` (Semana 4 - Totalmente ausente de la colección).
2. `GET /reportes/turnos-por-sede` (Semana 4 - Totalmente ausente).
3. `GET /reportes/ranking-medicos` (Semana 4 - Totalmente ausente).
4. `GET /reportes/tasa-cancelacion` (Semana 4 - Totalmente ausente).
5. `GET /historial-clinico/paciente` (La variante de ruta directa sin parámetro `:id_paciente` para pacientes).

---

## 7. INCONSISTENCIAS Y PUNTOS A REVISAR

### 7.1. Verificación de Esquema: Columna `fecha` en `historial_clinico`
* **Esquema real verificado:** La base de datos física del sistema define la columna como `fecha date NOT NULL` (y no `fecha_registro datetime`).
* **Consistencia con el código:** Las consultas SQL ejecutadas en `src/controllers/historialClinicoController.js` (`SELECT ... h.fecha ... ORDER BY h.fecha DESC`) son plenamente consistentes con la tabla física en MariaDB/MySQL, garantizando la correcta ejecución, selección y ordenamiento temporal de las atenciones clínicas sin provocar errores de columna faltante.

---

### 7.2. Endpoints Duplicados y Alias en Rutas
* **`GET /auth/coberturas` vs `GET /coberturas`:**
  Existen dos endpoints públicos idénticos montados en routers distintos (`authRoutes` y `coberturaRoutes`) controlados por métodos diferentes (`authController.getCoberturas` y `coberturaController.getAllCoberturas`). Ambos hacen `SELECT id, nombre FROM cobertura`.
* **Ruta de consulta de historial:**
  `historialClinicoRoutes.js` monta dos rutas para la misma función:
  * `GET /historial-clinico/paciente/:id_paciente` (paciente y médico)
  * `GET /historial-clinico/paciente` (solo paciente)
* **Query Params con alias permitidos:**
  * En `GET /agenda`: `medico` o `id_medico` / `sede` o `id_sede`.
  * En `GET /auditoria`: `usuario` o `id_usuario`.

---

### 7.3. Riesgo de Inserción Null en `turno.id_cobertura`
* En `usuario`, `id_cobertura` es `DEFAULT NULL` (un paciente puede registrarse sin cobertura).
* En `turnoController.js`:
  ```javascript
  const idCoberturaFinal = paciente.id_cobertura || null;
  ```
* En la tabla `turno`, la columna `id_cobertura` está definida como `tinyint NOT NULL`.
* **Consecuencia:** Si un paciente que no tiene cobertura (`id_cobertura: null`) intenta solicitar un turno, la base de datos rechaza la operación con `ER_BAD_NULL_ERROR: Column 'id_cobertura' cannot be null`, respondiendo 500 al cliente.

---

### 7.4. Fallbacks Inseguros de Configuración
* En `src/middlewares/authMiddleware.js`:
  ```javascript
  jwt.verify(token, process.env.JWT_SECRET || 'secret');
  ```
  Si la variable `JWT_SECRET` se borra del `.env`, el sistema se degrada a la clave débil `'secret'`.
* En `src/config/db.js`:
  ```javascript
  password: process.env.DB_PASSWORD || ''
  ```

---

### 7.5. Ausencia de Validación de Orden Temporal en Agenda
* En `createAgenda` y `updateAgenda` (`src/controllers/agendaController.js`), no se valida que `hora_entrada < hora_salida`. El sistema permite registrar una franja con `hora_entrada: "18:00"` y `hora_salida: "08:00"`.
* Tampoco se valida que la `fecha` sea una fecha presente o futura.

---

### 7.6. Selección Arbitraria de Agenda en Alta de Turno por Franja
* En `createTurno` (`src/controllers/turnoController.js`), si el cliente no proporciona `id_agenda` sino `(id_medico, id_especialidad, id_sede, fecha)`, el código ejecuta:
  ```javascript
  const [agendas] = await pool.query(
    'SELECT * FROM agenda WHERE id_medico = ? AND id_especialidad = ? AND id_sede = ? AND fecha = ?',
    [id_medico, id_especialidad, id_sede, fecha]
  );
  agenda = agendas[0];
  ```
* Dado que el sistema permite múltiples franjas en el mismo día para un médico (por ejemplo de 08:00 a 12:00 y de 16:00 a 20:00), el código toma siempre la primera (`agendas[0]`) sin verificar si la hora solicitada por el paciente cae en la segunda franja, pudiendo rechazar erróneamente un turno disponible con el error de fuera de rango.

---

### 7.7. Códigos de Estado HTTP Discrepantes
* En `authController.registro`: Cuando el DNI o Email ya se encuentran registrados, el controlador responde **400 Bad Request** en lugar de **409 Conflict**.
* En `notificacionController.marcarNotificacionLeida`: Si la notificación ya fue leída, responde **200 OK** con status `"La notificación ya se encontraba marcada como leída"`.
* En `auditoriaController.js`: Valida el query param `usuario` como entero positivo. Si se pasa un string o valor `<= 0`, responde **400 Bad Request** con el mensaje textual `"El parámetro usuario debe ser un número entero positivo."`.


