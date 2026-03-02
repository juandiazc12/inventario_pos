-- ============================================================
-- SCHEMA COMPLETO — Sistema de Inventario v2.0
-- MySQL 8.0+
-- ============================================================

CREATE DATABASE IF NOT EXISTS inventario_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE inventario_db;

-- TABLA: categorias
CREATE TABLE IF NOT EXISTS categorias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- TABLA: productos
CREATE TABLE IF NOT EXISTS productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  codigo VARCHAR(100) UNIQUE,
  categoria_id INT,
  precio_compra DECIMAL(12,2) DEFAULT 0,
  precio_venta DECIMAL(12,2) DEFAULT 0,
  stock INT DEFAULT 0,
  talla VARCHAR(50) DEFAULT NULL,
  imagen_url TEXT,
  qr_code TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL
);

-- TABLA: clientes
CREATE TABLE IF NOT EXISTS clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  documento VARCHAR(50) UNIQUE,
  telefono VARCHAR(20),
  email VARCHAR(150),
  direccion TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- TABLA: proveedores
CREATE TABLE IF NOT EXISTS proveedores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  contacto VARCHAR(150),
  telefono VARCHAR(20),
  email VARCHAR(150),
  direccion TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- TABLA: usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('admin','operador') DEFAULT 'operador',
  nombre VARCHAR(150),
  avatar_url TEXT,
  permisos JSON,
  activo BOOLEAN DEFAULT TRUE,
  ultimo_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLA: ventas
CREATE TABLE IF NOT EXISTS ventas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL,
  cantidad INT NOT NULL,
  precio_venta DECIMAL(12,2) NOT NULL,
  total DECIMAL(12,2) GENERATED ALWAYS AS (cantidad * precio_venta) STORED,
  cliente_id INT,
  usuario_id INT,
  ticket_numero VARCHAR(50),
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- TABLA: compras
CREATE TABLE IF NOT EXISTS compras (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL,
  cantidad INT NOT NULL,
  precio_compra DECIMAL(12,2) NOT NULL,
  total DECIMAL(12,2) GENERATED ALWAYS AS (cantidad * precio_compra) STORED,
  proveedor_id INT,
  usuario_id INT,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id),
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- TABLA: pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL,
  cantidad INT NOT NULL,
  precio_venta DECIMAL(12,2) NOT NULL,
  total DECIMAL(12,2) GENERATED ALWAYS AS (cantidad * precio_venta) STORED,
  cliente_id INT,
  usuario_id INT,
  estado ENUM('pendiente','en_proceso','completado','cancelado') DEFAULT 'pendiente',
  fecha_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_completado TIMESTAMP NULL,
  notas TEXT,
  FOREIGN KEY (producto_id) REFERENCES productos(id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- TABLA: insumos (materias primas, no se venden)
CREATE TABLE IF NOT EXISTS insumos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  categoria VARCHAR(100),
  cantidad DECIMAL(12,2) DEFAULT 0,
  unidad VARCHAR(30),
  precio_unitario DECIMAL(12,2) DEFAULT 0,
  proveedor_id INT,
  usuario_id INT,
  stock_minimo DECIMAL(12,2) DEFAULT 0,
  fecha_ultimo_ingreso TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- TABLA: auditoria/logs
CREATE TABLE IF NOT EXISTS auditoria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT,
  usuario_nombre VARCHAR(100),
  accion VARCHAR(100) NOT NULL,
  modulo VARCHAR(50),
  detalle TEXT,
  estado ENUM('exito','error','advertencia') DEFAULT 'exito',
  ip_address VARCHAR(45),
  user_agent TEXT,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- TABLA: ticket_counter (numeración correlativa)
CREATE TABLE IF NOT EXISTS ticket_counter (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ultimo_numero INT DEFAULT 0,
  prefijo VARCHAR(10) DEFAULT 'TKT'
);

-- TABLA: ubicaciones
CREATE TABLE IF NOT EXISTS ubicaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLA: inventario_por_ubicacion
CREATE TABLE IF NOT EXISTS inventario_por_ubicacion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL,
  ubicacion_id INT NOT NULL,
  stock INT DEFAULT 0,
  stock_minimo INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id),
  FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones(id),
  UNIQUE KEY unique_producto_ubicacion (producto_id, ubicacion_id)
);

-- TABLA: traslados
CREATE TABLE IF NOT EXISTS traslados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE NOT NULL,
  ubicacion_origen_id INT NOT NULL,
  ubicacion_destino_id INT NOT NULL,
  solicitado_por INT NOT NULL,
  atendido_por INT,
  estado ENUM('pendiente','despachado','recibido','cancelado') DEFAULT 'pendiente',
  notas TEXT,
  fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_despacho TIMESTAMP NULL,
  fecha_recepcion TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (ubicacion_origen_id) REFERENCES ubicaciones(id),
  FOREIGN KEY (ubicacion_destino_id) REFERENCES ubicaciones(id),
  FOREIGN KEY (solicitado_por) REFERENCES usuarios(id),
  FOREIGN KEY (atendido_por) REFERENCES usuarios(id)
);

-- TABLA: traslados_detalle
CREATE TABLE IF NOT EXISTS traslados_detalle (
  id INT AUTO_INCREMENT PRIMARY KEY,
  traslado_id INT NOT NULL,
  producto_id INT NOT NULL,
  cantidad_solicitada INT NOT NULL,
  cantidad_enviada INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (traslado_id) REFERENCES traslados(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- TABLA: devoluciones
CREATE TABLE IF NOT EXISTS devoluciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE NOT NULL,
  tipo ENUM('venta','compra') NOT NULL,
  referencia_id INT NOT NULL,
  usuario_id INT NOT NULL,
  motivo ENUM(
    'producto_defectuoso',
    'producto_equivocado',
    'no_deseado',
    'exceso_de_pedido',
    'mal_estado',
    'otro'
  ) NOT NULL,
  motivo_detalle TEXT,
  estado ENUM('pendiente','aprobada','rechazada') DEFAULT 'pendiente',
  tipo_reembolso ENUM('efectivo','credito','cambio') DEFAULT 'efectivo',
  total_devuelto DECIMAL(10,2) DEFAULT 0,
  afecta_inventario BOOLEAN DEFAULT TRUE,
  notas TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- TABLA: devoluciones_detalle
CREATE TABLE IF NOT EXISTS devoluciones_detalle (
  id INT AUTO_INCREMENT PRIMARY KEY,
  devolucion_id INT NOT NULL,
  producto_id INT NOT NULL,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (devolucion_id) REFERENCES devoluciones(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- ============================================================
-- DATOS INICIALES
-- ============================================================

INSERT INTO ticket_counter (ultimo_numero, prefijo) VALUES (0, 'TKT');

-- Ubicaciones iniciales
INSERT INTO ubicaciones (nombre, descripcion) VALUES
  ('Local Principal', 'Tienda principal de venta al público'),
  ('Bodega Central', 'Almacén principal de productos'),
  ('Bodega Secundaria', 'Almacén secundario para productos de bajo movimiento');

-- Categorías de ejemplo
INSERT INTO categorias (nombre, descripcion) VALUES
  ('General', 'Categoría general'),
  ('Electrónica', 'Productos electrónicos'),
  ('Alimentos', 'Productos alimenticios'),
  ('Ropa', 'Prendas de vestir'),
  ('Hogar', 'Artículos para el hogar');

-- Usuario administrador por defecto
-- IMPORTANTE: Ejecutar el script setup-admin.js para generar el hash correcto
-- O reemplazar el hash aquí con uno generado por bcrypt para "admin123"
-- Hash de ejemplo para "admin123" con 10 rounds:
INSERT INTO usuarios (usuario, password_hash, rol, nombre, permisos)
VALUES (
  'admin',
  '$2a$10$R.n/9tIb36m79QBLeC6qKe9g.jSmOkglixQk442VPhXrz.RFnSujC',
  'admin',
  'Administrador',
  '["dashboard","inventario","productos","categorias","ventas","compras","pedidos","clientes","proveedores","insumos","usuarios","resumenes","auditoria","configuracion","google","whatsapp","traslados","devoluciones"]'
);
