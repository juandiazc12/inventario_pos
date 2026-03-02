-- Migración: Agregar usuario_id (responsable) a insumos
-- Ejecutar una sola vez si tu base de datos ya existía antes de esta actualización
-- Si da error "Duplicate column", la columna ya existe.

ALTER TABLE insumos ADD COLUMN usuario_id INT NULL AFTER proveedor_id;
ALTER TABLE insumos ADD CONSTRAINT fk_insumos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL;
