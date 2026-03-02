window.configuracion_module = {
    async init() {
        try {
            const config = await API.get('/configuracion');
            this.render(config);
            this.setupEvents();
        } catch (err) {
            Toast.error('Error al cargar configuración: ' + err.message);
        }
    },

    render(config) {
        document.getElementById('cfg-app-name').value = config.nombre_sistema || '';
        document.getElementById('cfg-moneda').value = config.moneda || '';

        // Tema
        const isDark = document.body.classList.contains('dark-mode');
        document.getElementById(isDark ? 'tema-dark' : 'tema-light').checked = true;

        // Logo upload
        new ImageUpload({
            containerId: 'cfg-logo-container',
            currentUrl: config.logo_url,
            uploadEndpoint: '/configuracion/logo',
            fieldName: 'logo',
            onUpload: (url) => {
                this.updateLogoUI(url);
                // Actualizar Favicon inmediatamente
                if (window.Auth) Auth.setFavicon(url);

                const configState = AppState.get('config') || {};
                AppState.set('config', { ...configState, logo_url: url });
            }
        });
    },

    updateLogoUI(url) {
        const logoImg = document.getElementById('sidebarLogoImg');
        const logoIcon = document.getElementById('sidebarLogoIcon');
        if (url) {
            if (logoImg) {
                logoImg.src = url;
                logoImg.style.display = 'block';
            }
            if (logoIcon) logoIcon.style.display = 'none';
        } else {
            if (logoImg) logoImg.style.display = 'none';
            if (logoIcon) logoIcon.style.display = 'flex';
        }
    },

    setupEvents() {
        document.getElementById('btn-save-branding')?.addEventListener('click', () => this.saveBranding());
        document.getElementById('btn-save-general')?.addEventListener('click', () => this.saveGeneral());

        // Cambio de tema inmediato
        document.querySelectorAll('input[name="tema"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const isDark = e.target.value === 'dark';
                document.body.classList.toggle('dark-mode', isDark);
                localStorage.setItem('darkMode', isDark);
            });
        });
    },

    async saveBranding() {
        const nombre = document.getElementById('cfg-app-name').value.trim();
        const moneda = document.getElementById('cfg-moneda').value.trim();
        try {
            // El backend usa 'nombre_sistema' en el servicio unificado
            await API.put('/configuracion', { nombre_sistema: nombre, moneda: moneda });
            Toast.success('Branding actualizado');
            const sidebarLogoText = document.getElementById('sidebarLogoText');
            if (sidebarLogoText) sidebarLogoText.textContent = nombre;
            document.title = nombre + ' | InventarioPro';

            const config = AppState.get('config') || {};
            AppState.set('config', { ...config, nombre_sistema: nombre, moneda: moneda });
        } catch (err) { Toast.error(err.message); }
    },

    async saveGeneral() {
        const nombre = document.getElementById('cfg-app-name').value.trim();
        const moneda = document.getElementById('cfg-moneda').value.trim();
        try {
            await API.put('/configuracion', { nombre_sistema: nombre, moneda: moneda });
            Toast.success('Parámetros generales guardados');
            AppState.set('moneda', moneda);

            const config = AppState.get('config') || {};
            AppState.set('config', { ...config, nombre_sistema: nombre, moneda: moneda });
        } catch (err) { Toast.error(err.message); }
    }
};
