-- sql/seed_extra_frontend.sql
-- Datos de prueba aditivos para soportar la construcción y verificación del frontend (Semanas 2 a 4)
-- NOTA: Este script SOLO agrega registros complementarios y no modifica ni elimina datos existentes.

-- 1. Especialidades adicionales (si no existen)
INSERT IGNORE INTO especialidad (id, descripcion) VALUES 
  (2, 'Pediatria'),
  (3, 'Cardiologia');

-- 2. Cobertura adicional (si no existe)
INSERT IGNORE INTO cobertura (id, nombre) VALUES 
  (2, 'OSDE');

-- 3. Médicos adicionales (password 'Password123!' con hash bcrypt 10 rondas)
-- Hash: $2a$10$R45bZaXcu.M04z7e3W5shueOJjsjSW91vYi/WUHFAwuZFX9GgnuuW
INSERT IGNORE INTO usuario (id, nombre, apellido, dni, email, password, fecha_nacimiento, telefono, rol, id_sede, id_cobertura) VALUES
  (6, 'Martin', 'Palermo', '23456789', 'mpalermo@clinica.com', '$2a$10$R45bZaXcu.M04z7e3W5shueOJjsjSW91vYi/WUHFAwuZFX9GgnuuW', '1980-05-15', '1145678901', 'medico', 1, NULL),
  (7, 'Lucia', 'Herrera', '27890123', 'lherrera@clinica.com', '$2a$10$R45bZaXcu.M04z7e3W5shueOJjsjSW91vYi/WUHFAwuZFX9GgnuuW', '1985-08-20', '1149876543', 'medico', 2, NULL);

-- 4. Especialidades asignadas a los médicos
INSERT IGNORE INTO medico_especialidad (id, id_medico, id_especialidad) VALUES
  (2, 6, 1), -- Martin Palermo -> Traumatologia
  (3, 6, 2), -- Martin Palermo -> Pediatria
  (4, 7, 3); -- Lucia Herrera -> Cardiologia

-- 5. Agendas de HOY y de MAÑANA (con médico atendiendo en sedes 1 y 2 en rangos distintos de HOY)
INSERT IGNORE INTO agenda (id, hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede) VALUES
  (10, '08:00', '12:00', CURDATE(), 6, 1, 1), -- Martin Palermo en Sede Centro (08:00 a 12:00)
  (11, '14:00', '18:00', CURDATE(), 6, 2, 2), -- Martin Palermo en Sede Norte (14:00 a 18:00)
  (12, '09:00', '13:00', DATE_ADD(CURDATE(), INTERVAL 1 DAY), 6, 1, 1), -- Martin Palermo mañana en Sede Centro
  (13, '13:00', '17:00', CURDATE(), 3, 1, 1); -- Ana Lopez en Sede Centro hoy

-- 6. Turnos de HOY en los 3 estados (confirmado, cancelado, atendido) para pacientes existentes (ids 2 y 5)
INSERT IGNORE INTO turno (id, nota, id_agenda, fecha, hora, id_paciente, id_cobertura, estado) VALUES
  (10, 'Consulta traumatológica matutina', 10, CURDATE(), '09:00', 2, 1, 'confirmado'),
  (11, 'Control post-yeso', 10, CURDATE(), '10:00', 5, 1, 'cancelado'),
  (12, 'Consulta pediátrica programada', 11, CURDATE(), '15:00', 2, 1, 'atendido');

-- 7. Historial clínico para el turno atendido de hoy
INSERT IGNORE INTO historial_clinico (id, id_turno, id_medico, id_paciente, diagnostico, tratamiento, observaciones, fecha_registro) VALUES
  (10, 12, 6, 2, 'Faringitis aguda', 'Amoxicilina 500mg cada 8hs por 7 días', 'Control de evolución en 5 días', NOW());
