# 📦 Sistema de Gestión de Inventario y POS (Point of Sale)

## 📝 Descripción del Sistema
Este es un ecosistema integral para la administración de negocios, permitiendo el control total de inventarios, procesos de venta (POS), compras, traslados entre bodegas, devoluciones y auditoría de movimientos. 

La plataforma utiliza una arquitectura **SPA (Single Page Application)** moderna, con un backend robusto en **Node.js** y una interfaz de usuario fluida desarrollada en **Vanilla JavaScript**, optimizada para el rendimiento y la facilidad de uso sin dependencias pesadas en el cliente.

---

## 🚀 Funcionalidades Principales
- **🛒 Punto de Venta (POS)**: Carrito de compras intuitivo, búsqueda de productos en tiempo real, emisión de tickets y gestión de pedidos pendientes.
- **📦 Control de Inventario**: Gestión multialmacén (Ubicaciones), stock mínimo, categorías y trazabilidad de productos.
- **🔄 Movimientos Inteligentes**: Módulo de Traslados (con flujo de aprobación admin) y Devoluciones (Ventas/Compras).
- **👥 Administración de Usuarios**: Sistema de roles (Admin/Operador) con permisos granulares.
- **📊 Reportes y Dashboard**: Visualización de métricas clave, historial de auditoría y exportación selectiva.
- **🔌 Integraciones Avanzadas**: 
  - **Google Sheets/Drive**: Exportación automática de informes.
  - **WhatsApp Proxy**: Notificaciones y comunicación fluida.
  - **QR/Barcodes**: Escaneo y generación para productos.

---

## 🛠️ Requisitos del Entorno
- **Node.js**: v16.x o superior.
- **MySQL**: Servidor local o remoto (MySQL 8.0 recomendado).
- **Navegador**: Google Chrome o Edge (recomendado por compatibilidad con librerías de impresión).

---

## 📥 Instalación

1. **Clonar el repositorio** y entrar en la carpeta raíz:
   ```bash
   cd inventario
   ```
2. **Instalar dependencias del Backend**:
   ```bash
   cd backend
   ```
   *Nota: No es necesario instalar dependencias en `frontend` ya que utiliza Vanilla JS.*
   ```bash
   npm install
   ```

---

## 🗄️ Preparación de la Base de Datos

1. Abre tu administrador de MySQL (XAMPP, MySQL Workbench, etc.).
2. Crea una base de datos llamada `inventario_db`:
   ```sql
   CREATE DATABASE inventario_db;
   ```
3. Importa el archivo de esquema completo:
   - Se encuentra en: `backend/database/schema.sql`.
   - Si existen migraciones adicionales en `backend/database/migrations/`, ejecútalas en orden numérico.

---

## ⚙️ Configuración y Variables de Entorno (.env)

En la raíz de la carpeta `backend`, crea un archivo `.env` basándote en `.env.example`:

```env
# Base de Datos
DB_HOST=localhost
DB_PORT=3306
DB_USER=tu_usuario
DB_PASSWORD=tu_password
DB_NAME=inventario_db

# Seguridad
JWT_SECRET=tu_clave_secreta_jwt
JWT_EXPIRES_IN=8h

# Servidor
PORT=3001
NODE_ENV=development

# Google OAuth2 (Configuración obligatoria para el módulo Google)
GOOGLE_CLIENT_ID=XXXXX.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=XXXXX
GOOGLE_REDIRECT_URI=http://localhost:3001/api/google/callback
```

### 🗝️ Configuración del Módulo de Google Cloud
1. Entra a [Google Cloud Console](https://console.cloud.google.com/).
2. Crea un **Nuevo Proyecto**.
3. En **API y Servicios** > **Biblioteca**, habilita:
   - `Google Sheets API`
   - `Google Drive API`
4. En **Pantalla de Consentimiento OAuth**, configura como "Externo" y añade los permisos necesarios.
5. En **Credenciales**, crea un **ID de cliente de OAuth 2.0 (Aplicación Web)**.
6. Añade en **URIs de redireccionamiento autorizados**: `http://localhost:3001/api/google/callback`.
7. Copia las credenciales generadas en tu `.env`.

---

## 🚦 Cómo Iniciar el Sistema

### 1. Iniciar el Servidor (Backend)
```bash
cd backend
npm run dev
```
El servidor escuchará en el puerto `3001`.

### 2. Iniciar el Proxy de WhatsApp (Opcional)
```bash
cd backend
npm run proxy:whatsapp
```
El proxy iniciará en el puerto `3003`.

### 3. Iniciar la Interfaz (Frontend)
Debes servir los archivos estáticos de la carpeta `frontend/`. 
- **VSCode**: Click derecho en `frontend/index.html` > **Open with Live Server**.
- **Npx**: `npx serve frontend` (desde la raíz).

---

## 🔑 Credenciales por Defecto
Al importar el `schema.sql`, se crea un usuario administrador:
- **Usuario**: `admin`
- **Contraseña**: `admin123`

---

## 📂 Estructura del Proyecto
- **/backend**: API RESTful con Express.
  - `/database`: Scripts de SQL y migraciones.
  - `/src/modules`: Lógica de negocio dividida por módulos (Auth, Ventas, Google, etc.).
- **/frontend**: Lado cliente.
  - `/js`: Controladores y lógica de la SPA.
  - `/styles`: Hojas de estilo CSS vainilla.
  - `index.html`: Punto de entrada único de la aplicación.
- **/files**: Almacenamiento local de imágenes y documentos generados.

---

## 📱 Notas del Módulo WhatsApp
Para que la integración funcione, asegúrate de que el puerto `3003` esté libre. Al iniciar el proxy, puedes acceder a la consola de estado en `http://localhost:3003/status`.
