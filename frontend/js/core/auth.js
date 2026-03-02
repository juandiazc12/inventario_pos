/**
 * auth.js — Login, logout, sesión, JWT, timer de inactividad
 */

const Auth = {
    _inactivityTimer: null,
    INACTIVITY_TIMEOUT: 30 * 60 * 1000, // 30 minutos

    /**
     * Verifica si hay sesión activa al cargar la app
     */
    async checkSession() {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');

        if (!token || !userStr) {
            this.showLogin();
            return;
        }

        try {
            // Verificar token con el backend
            const user = await API.get('/auth/me');
            this._setUser(user);
            this.showApp();
        } catch (err) {
            this.showLogin();
        }
    },

    /**
     * Maneja el login
     */
    async handleLogin(usuario, password) {
        const result = await API.post('/auth/login', { usuario, password });
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        this._setUser(result.user);
        this.showApp();
        return result;
    },

    /**
     * Cierra sesión
     */
    handleLogout() {
        Swal.fire({
            title: '¿Cerrar sesión?',
            text: 'Se cerrará tu sesión actual.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, salir',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444'
        }).then(result => {
            if (result.isConfirmed) {
                this._clearSession();
            }
        });
    },

    _clearSession() {
        clearInterval(this._inactivityTimer);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        AppState.set('user', null);
        AppState.clearCache();
        this.showLogin();
    },

    /**
     * Oculta los elementos de navegación según los permisos del usuario
     */
    updateNavigationVisibility() {
        const user = AppState.get('user');
        if (!user) return;
        
        // Si es admin, mostrar todo
        if (user.rol === 'admin') {
            document.querySelectorAll('.nav-link[data-section]').forEach(link => {
                link.style.display = '';
            });
            return;
        }
        
        // Para operadores, ocultar según permisos
        const permisos = user.permisos || [];
        document.querySelectorAll('.nav-link[data-section]').forEach(link => {
            const section = link.dataset.section;
            const hasPermission = permisos.includes(section);
            link.style.display = hasPermission ? '' : 'none';
        });
    },

    /**
     * Verifica si el usuario tiene permiso para un módulo
     */
    hasPermission(modulo) {
        const user = AppState.get('user');
        if (!user) return false;
        if (user.rol === 'admin') return true;
        const permisos = user.permisos || [];
        return permisos.includes(modulo);
    },

    /**
     * Muestra la pantalla de login
     */
    showLogin() {
        document.getElementById('login-overlay').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
        document.getElementById('login-usuario').value = '';
        document.getElementById('login-password').value = '';
        document.getElementById('login-error').style.display = 'none';
    },

    /**
     * Muestra la app principal
     */
    showApp() {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('app').style.display = 'flex';

        const user = AppState.get('user');
        if (user) {
            const name = user.nombre || user.usuario;
            document.getElementById('header-user-name').textContent = name;
            const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            const avatarContainer = document.getElementById('header-avatar');
            if (avatarContainer) {
                if (user.avatar_url) {
                    avatarContainer.innerHTML = `<img src="${user.avatar_url}" alt="Avatar">`;
                } else {
                    avatarContainer.innerHTML = `<span id="header-avatar-initials">${initials}</span>`;
                }
            }

            // Mostrar elementos admin
            if (user.rol === 'admin') {
                document.body.classList.add('is-admin');
            } else {
                document.body.classList.remove('is-admin');
            }

            // Actualizar visibilidad de navegación según permisos
            this.updateNavigationVisibility();
        }

        this._startInactivityTimer();

        // Aplicar branding cargado
        const config = AppState.get('config');
        if (config && config.nombre_sistema) {
            const sidebarLogoText = document.getElementById('sidebarLogoText');
            if (sidebarLogoText) sidebarLogoText.textContent = config.nombre_sistema;
        }

        // Navegar a la sección del hash o dashboard
        const hash = window.location.hash.replace('#', '') || 'dashboard';
        Router.navigateTo(hash);

        // Inicializar campana de notificaciones
        if (window.Notifications && typeof Notifications.init === 'function') {
            Notifications.init();
        }
    },

    /**
     * Configura el usuario en el estado global
     */
    _setUser(user) {
        if (user.permisos && typeof user.permisos === 'string') {
            user.permisos = JSON.parse(user.permisos);
        }
        localStorage.setItem('user', JSON.stringify(user));
        AppState.set('user', user);
    },

    /**
     * Timer de inactividad: cierra sesión a los 30 minutos
     */
    _startInactivityTimer() {
        this._resetInactivityTimer();
        ['mousemove', 'keydown', 'click', 'touchstart'].forEach(evt => {
            document.addEventListener(evt, () => this._resetInactivityTimer(), { passive: true });
        });
    },

    _resetInactivityTimer() {
        clearTimeout(this._inactivityTimer);
        this._inactivityTimer = setTimeout(() => {
            Toast.show('Sesión cerrada por inactividad', 'warning');
            setTimeout(() => this._clearSession(), 2000);
        }, this.INACTIVITY_TIMEOUT);
    },

    /**
     * Carga el branding (nombre y logo) desde el endpoint público
     */
    async loadPublicConfig() {
        try {
            const config = await API.get('/configuracion/public');
            if (config) {
                // Aplicar Nombre
                if (config.nombre_sistema) {
                    const logoTexts = document.querySelectorAll('.sidebar-logo-text, .login-logo h1');
                    logoTexts.forEach(el => el.textContent = config.nombre_sistema);
                    document.title = config.nombre_sistema + ' | InventarioPro';
                }
                // Aplicar Logo
                if (config.logo_url) {
                    const logoImg = document.getElementById('sidebarLogoImg');
                    const logoIcon = document.getElementById('sidebarLogoIcon');
                    if (logoImg) {
                        logoImg.src = config.logo_url;
                        logoImg.style.display = 'block';
                    }
                    if (logoIcon) logoIcon.style.display = 'none';

                    // Aplicar Favicon
                    this.setFavicon(config.logo_url);
                }
                AppState.set('config', config);
            }
        } catch (err) {
            console.warn('No se pudo cargar la configuración pública:', err.message);
        }
    },

    /**
     * Helper para establecer el favicon
     */
    setFavicon(url) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        link.href = url + '?v=' + Date.now(); // Cache busting
    }
};

// ─── INICIALIZACIÓN ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Modo oscuro
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
    }

    // Botón modo oscuro
    document.getElementById('btn-dark-mode')?.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    });

    // Formulario de login
    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('login-btn');
        const errorDiv = document.getElementById('login-error');
        const usuario = document.getElementById('login-usuario').value.trim();
        const password = document.getElementById('login-password').value;

        btn.querySelector('.btn-text').style.display = 'none';
        btn.querySelector('.btn-loader').style.display = 'inline';
        btn.disabled = true;
        errorDiv.style.display = 'none';

        try {
            await Auth.handleLogin(usuario, password);
        } catch (err) {
            errorDiv.textContent = err.message || 'Error al iniciar sesión';
            errorDiv.style.display = 'block';
        } finally {
            btn.querySelector('.btn-text').style.display = 'inline';
            btn.querySelector('.btn-loader').style.display = 'none';
            btn.disabled = false;
        }
    });

    // Botón logout
    document.getElementById('btn-logout')?.addEventListener('click', () => Auth.handleLogout());

    // Dropdown Usuario
    document.getElementById('header-user-menu')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('user-dropdown').classList.toggle('active');
    });

    document.addEventListener('click', () => {
        document.getElementById('user-dropdown')?.classList.remove('active');
    });

    document.getElementById('btn-logout-dropdown')?.addEventListener('click', () => Auth.handleLogout());

    // Sidebar toggle: en móvil abre el menú, en desktop expande/colapsa
    document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            sidebar.classList.add('mobile-open');
            overlay?.classList.add('active');
        } else {
            sidebar.classList.toggle('expanded');
        }
    });

    document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('mobile-open', 'expanded');
        document.getElementById('sidebar-overlay').classList.remove('active');
    });

    // Inicializar router
    Router.init();

    // Cargar branding público inmediatamente
    Auth.loadPublicConfig();

    // Verificar sesión al cargar
    Auth.checkSession();
});

window.Auth = Auth;
