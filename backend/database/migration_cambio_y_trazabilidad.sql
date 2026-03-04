-- migration_cambio_y_trazabilidad.sql
-- Agrega soporte para cambios de producto y trazabilidad de estados de venta

USE inventario_db;

-- 1. Modificar tabla devoluciones para soportar producto de cambio
ALTER TABLE devoluciones 
ADD COLUMN producto_nuevo_id INT NULL AFTER referencia_id,
ADD COLUMN valor_adicional DECIMAL(10,2) DEFAULT 0 AFTER total_devuelto,
ADD CONSTRAINT fk_devolucion_producto_nuevo FOREIGN KEY (producto_nuevo_id) REFERENCES productos(id);

-- 2. Modificar tabla ventas para trazabilidad de estados
ALTER TABLE ventas 
ADD COLUMN estado_devolucion TINYINT DEFAULT 0 COMMENT '0: Normal, 1: Parcial, 2: Total/Cambiado';

-- 3. Actualizar el ENUM de motivos si es necesario (el esquema original ya tiene 'otro', pero 'cambio' es más específico)
-- Nota: En MySQL ALTER TABLE MODIFY para ENUM requiere re-especificar todos los valores.
-- El esquema original es: 'producto_defectuoso','producto_equivocado','no_deseado','exceso_de_pedido','mal_estado','otro'
ALTER TABLE devoluciones 
MODIFY COLUMN motivo ENUM(
    'producto_defectuoso',
    'producto_equivocado',
    'no_deseado',
    'exceso_de_pedido',
    'mal_estado',
    'cambio_producto',
    'otro'
) NOT NULL;
