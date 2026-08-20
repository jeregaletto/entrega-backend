# Clínica Médica — Backend

Trabajo práctico de backend. Cada entrega vive en su propia rama:

- `entrega-backend-1`: inicialización, registro/login con JWT y middlewares de autorización.
- `entrega-backend-2`: CRUD de sedes, especialidades, coberturas y agenda médica.

## Cómo levantar el proyecto

```bash
npm install
cp .env.example .env   # completar credenciales de MySQL y JWT_SECRET
npm run dev
```

## Formato de respuesta

Todos los endpoints, de éxito y de error, responden con la misma estructura:

```json
{ "code": 200, "status": "Mensaje descriptivo", "data": null }
```

## Endpoints de la semana 2

| Método | Ruta | Rol requerido |
| --- | --- | --- |
| GET | `/sedes` | administrador |
| GET | `/sedes/:id` | administrador |
| POST | `/sedes` | administrador |
| PUT | `/sedes/:id` | administrador |
| DELETE | `/sedes/:id` | administrador |
| GET | `/especialidades` | administrador |
| GET | `/especialidades/:id` | administrador |
| POST | `/especialidades` | administrador |
| PUT | `/especialidades/:id` | administrador |
| DELETE | `/especialidades/:id` | administrador |
| GET | `/coberturas/disponibles` | público (solo lectura) |
| GET | `/coberturas` | administrador |
| GET | `/coberturas/:id` | administrador |
| POST | `/coberturas` | administrador |
| PUT | `/coberturas/:id` | administrador |
| DELETE | `/coberturas/:id` | administrador |
| GET | `/agenda?id_medico=&id_sede=&fecha=` | medico (solo la propia), operador, administrador |
| GET | `/agenda/:id` | medico (solo la propia), operador, administrador |
| POST | `/agenda` | medico (solo la propia), operador, administrador |
| PUT | `/agenda/:id` | medico (solo la propia), operador, administrador |
| DELETE | `/agenda/:id` | medico (solo la propia), operador, administrador |

### Validaciones de dependencia

Antes de eliminar se controlan las dependencias y se responde `409` con la estructura
uniforme, nunca un `500`:

- **Sede**: médicos, operadores o agenda asociada.
- **Especialidad**: médicos asociados en `medico_especialidad` (y agenda que la referencie).
- **Cobertura**: usuarios que la tengan asignada.

### Agenda

- Un médico puede cargar varios rangos horarios para la misma fecha, siempre que no se superpongan.
- El listado se puede filtrar por `id_medico`, `id_sede` y `fecha` (o combinarlos).
- El rol `medico` solo accede y modifica su propia agenda; `operador` y `administrador`, la de cualquiera.
- El rol `paciente` no tiene acceso.

## Colecciones de Postman

- `postman_collection.json` — semana 1.
- `postman_collection_semana2.json` — semana 2. Ejecutar primero la carpeta
  `00 - Autenticación` para que se guarden los tokens de cada rol en las variables de colección.
