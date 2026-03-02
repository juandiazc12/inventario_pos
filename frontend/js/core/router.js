/**
 * router.js — Navegación SPA con carga dinámica de módulos HTML
 */

const Router = {
    _loadedModules: new Set(),
    _currentSection: null,

    /**
     * Navega a una sección
     */
    async navigateTo(section) {
        if (!section) section = 'dashboard';

        // Cerrar modales abiertos al navegar
        if (window.Modal && typeof window.Modal.close === 'function') {
            window.Modal.close();
        }

        // Verificar permiso
        if (!Auth.hasPermission(section)) {
            Toast.show(`No tienes acceso al módulo: ${section}`, 'warning');
            return;
        }

        // Actualizar hash
        window.location.hash = section;
        AppState.set('currentSection', section);

        // Actualizar nav links activos
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.section === section);
        });

        // Actualizar título de página
        const titles = {
            dashboard: 'Dashboard', inventario: 'Inventario', productos: 'Productos',
            categorias: 'Categorías', ventas: 'Ventas / POS', compras: 'Compras',
            pedidos: 'Pedidos', clientes: 'Clientes', proveedores: 'Proveedores',
            insumos: 'Insumos', usuarios: 'Usuarios', resumenes: 'Resúmenes',
            auditoria: 'Auditoría', configuracion: 'Configuración', perfil: 'Mi Perfil',
            google: 'Google Sheets & Drive',
            traslados: 'Traslados de Bodega', devoluciones: 'Devoluciones'
        };
        document.getElementById('page-title').textContent = titles[section] || section;

        const routes = {
            'dashboard': { file: 'dashboard/dashboard' },
            'inventario': { file: 'inventario/inventario' },
            // Operaciones principales
            'ventas': { file: 'ventas/ventas' },
            'compras': { file: 'compras/compras' },
            'traslados': { file: 'traslados/traslados' },
            'devoluciones': { file: 'devoluciones/devoluciones' },
            'pedidos': { file: 'pedidos/pedidos' },
            // Catálogos
            'productos': { file: 'productos/productos' },
            'categorias': { file: 'categorias/categorias' },
            'clientes': { file: 'clientes/clientes' },
            'proveedores': { file: 'proveedores/proveedores' },
            'insumos': { file: 'insumos/insumos' },
            // Reportes
            'resumenes': { file: 'resumenes/resumenes' },
            'auditoria': { file: 'auditoria/auditoria', permission: 'auditoria' },
            // Integraciones
            'google': { file: 'google/google' },
            // Configuración
            'perfil': { file: 'perfil/perfil' },
            'configuracion': { file: 'configuracion/configuracion', permission: 'configuracion' },
            'usuarios': { file: 'usuarios/usuarios', permission: 'usuarios' }
        };

        // Cerrar sidebar en móvil
        document.getElementById('sidebar')?.classList.remove('mobile-open');
        document.getElementById('sidebar-overlay')?.classList.remove('active');

        // Mostrar loading
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = `
      <div class="loading-screen">
        <div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i></div>
        <p>Cargando ${titles[section] || section}...</p>
      </div>`;

        try {
            // Cargar HTML del módulo si no está cargado
            if (!this._loadedModules.has(section)) {
                const html = await fetch(`./js/modules/${section}/${section}.html`).then(r => {
                    if (!r.ok) throw new Error(`No se encontró el módulo ${section}`);
                    return r.text();
                });
                contentArea.innerHTML = html;
                this._loadedModules.add(section);
            } else {
                // Re-inyectar el HTML (para módulos que necesitan re-render)
                const html = await fetch(`./js/modules/${section}/${section}.html`).then(r => r.text());
                contentArea.innerHTML = html;
            }

            // Llamar init del módulo
            const moduleName = `${section}_module`;
            if (window[moduleName] && typeof window[moduleName].init === 'function') {
                await window[moduleName].init();
            }

            this._currentSection = section;
        } catch (err) {
            contentArea.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Error cargando el módulo: ${err.message}</p>
          <button class="btn btn-primary mt-2" onclick="Router.navigateTo('dashboard')">
            <i class="fas fa-home"></i> Ir al Dashboard
          </button>
        </div>`;
            console.error('Router error:', err);
        }
    },

    /**
     * Inicializa los listeners de navegación
     */
    init() {
        // Clicks en el sidebar
        document.querySelectorAll('.nav-link[data-section]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateTo(link.dataset.section);
            });
        });

        // Navegación con el hash
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.replace('#', '');
            if (hash && hash !== this._currentSection) {
                this.navigateTo(hash);
            }
        });
    }
};

window.Router = Router;

// Inicializar router cuando el DOM esté listo
// (se llama desde auth.js después del login)
