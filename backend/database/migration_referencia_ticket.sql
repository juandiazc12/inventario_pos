-- ============================================================
-- MIGRACIÓN: Módulo de Devoluciones
-- Descripción: Agrega columna referencia_ticket para almacenar
--              el número de ticket de las devoluciones de venta
--              en lugar de usar el ID de una línea de venta.
-- FIX: Bug B-1/B-2 — referencia_id era incorrecto para ventas.
-- ============================================================

-- Agregar columna referencia_ticket si no existe
ALTER TABLE devoluciones 
    ADD COLUMN IF NOT EXISTS referencia_ticket VARCHAR(50) NULL 
    COMMENT 'Número de ticket de venta (para tipo = venta)' 
    AFTER referencia_id;

-- Hacer que referencia_id sea nullable (para devoluciones de venta que usan ticket)
ALTER TABLE devoluciones 
    MODIFY COLUMN referencia_id INT NULL;

-- Índice para búsquedas por ticket
CREATE INDEX IF NOT EXISTS idx_devoluciones_ticket 
    ON devoluciones (referencia_ticket);

-- ============================================================
-- VERIFICACIÓN: Correr después de la migración
-- ============================================================
-- SELECT id, tipo, referencia_id, referencia_ticket FROM devoluciones LIMIT 5;
