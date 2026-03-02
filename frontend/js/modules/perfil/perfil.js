// perfil.js
window.perfil_module = {
    async init() {
        try {
            const user = await API.get('/perfil');
            this.render(user);
            this.setupEvents();
        } catch (err) {
            Toast.error('Error al cargar perfil: ' + err.message);
        }
    },

    render(user) {
        if (!user) return;

        const safeSetText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text || '—';
        };

        safeSetText('perfilUsuario', user.usuario);
        safeSetText('perfilRol', user.rol);
        safeSetText('perfilFecha', user.created_at ? new Date(user.created_at).toLocaleDateString() : '—');
        safeSetText('perfilUltimoLogin', user.ultimo_login ? new Date(user.ultimo_login).toLocaleString() : 'Nunca');

        const nombreInput = document.getElementById('pi-nombre');
        const emailInput = document.getElementById('pi-email');
        const telefonoInput = document.getElementById('pi-telefono');

        if (nombreInput) nombreInput.value = user.nombre || '';
        if (emailInput) emailInput.value = user.email || '';
        if (telefonoInput) telefonoInput.value = user.telefono || '';

        // Inicializar subida de avatar
        const container = document.getElementById('avatarZone');
        if (container) {
            new ImageUpload({
                containerId: 'avatarZone',
                currentUrl: user.avatar_url,
                uploadEndpoint: '/perfil/avatar',
                fieldName: 'avatar',
                isAvatar: true,
                onUpload: (response) => {
                    // La respuesta del backend trae { status, avatar_url, message }
                    // Si el componente ImageUpload devuelve solo la respuesta parseada o el XHR, ajustamos.
                    // Asumimos que ImageUpload (revisar componente) devuelve la respuesta JSON o la URL directa.
                    // Veremos el componente ImageUpload a continuación para estar seguros.
                    // Por ahora, asumimos que devuelve el objeto respuesta o la url.

                    const url = response.avatar_url || response;
                    const headerAvatar = document.getElementById('header-avatar');
                    if (headerAvatar) {
                        headerAvatar.innerHTML = `<img src="${url}" alt="Avatar" style="border-radius: 50%; width: 100%; height: 100%; object-fit: cover;">`;
                    }
                    const currentUser = AppState.get('user');
                    AppState.set('user', { ...currentUser, avatar_url: url });
                }
            });
        }
    },

    setupEvents() {
        document.getElementById('btnGuardarPerfil')?.addEventListener('click', () => this.guardarPerfil());
        document.getElementById('btnCambiarPassword')?.addEventListener('click', () => this.cambiarPassword());
        document.getElementById('ps-nuevo')?.addEventListener('input', (e) => this.checkPasswordStrength(e.target.value));
    },

    async guardarPerfil() {
        const data = {
            nombre: document.getElementById('pi-nombre').value.trim(),
            email: document.getElementById('pi-email').value.trim(),
            telefono: document.getElementById('pi-telefono').value.trim()
        };

        try {
            const res = await API.put('/perfil', data);
            Toast.success('Perfil actualizado correctamente');
            // Actualizar el estado global del usuario
            const currentUser = AppState.get('user');
            AppState.set('user', { ...currentUser, ...res.data });
            this.render(res.data);

            // Actualizar nombre en el header
            document.getElementById('header-user-name').textContent = res.data.nombre || res.data.usuario;
        } catch (err) {
            Toast.error(err.message);
        }
    },

    async cambiarPassword() {
        const newPassword = document.getElementById('ps-nuevo').value;
        const confirm = document.getElementById('ps-confirmar').value;

        if (!newPassword) {
            return Toast.warning('Debes completar el campo de nueva contraseña');
        }

        if (newPassword !== confirm) {
            return Toast.warning('La nueva contraseña no coincide con la confirmación');
        }

        if (newPassword.length < 8) {
            return Toast.warning('La contraseña debe tener al menos 8 caracteres');
        }

        try {
            await API.put('/perfil/password', { newPassword });
            Toast.success('Contraseña actualizada con éxito');
            document.getElementById('ps-nuevo').value = '';
            document.getElementById('ps-confirmar').value = '';
            this.checkPasswordStrength('');
        } catch (err) {
            Toast.error(err.message);
        }
    },

    checkPasswordStrength(pw) {
        const fill = document.getElementById('strengthFill');
        const label = document.getElementById('strengthLabel');
        const rules = {
            length: pw.length >= 8,
            number: /[0-9]/.test(pw),
            upper: /[A-Z]/.test(pw)
        };

        // Update UI rules
        document.getElementById('rule-length').classList.toggle('valid', rules.length);
        document.getElementById('rule-number').classList.toggle('valid', rules.number);
        document.getElementById('rule-upper').classList.toggle('valid', rules.upper);

        let score = 0;
        if (pw.length > 0) score += 1;
        if (rules.length) score += 1;
        if (rules.number) score += 1;
        if (rules.upper) score += 1;

        const maps = [
            { width: '0%', color: '#4d5468', text: 'Sin contraseña' },
            { width: '25%', color: '#ff5c7a', text: 'Muy débil' },
            { width: '50%', color: '#ffb84d', text: 'Débil' },
            { width: '75%', color: '#6c8fff', text: 'Media' },
            { width: '100%', color: '#00e5a0', text: 'Fuerte' }
        ];

        const res = maps[score];
        fill.style.width = res.width;
        fill.style.backgroundColor = res.color;
        label.textContent = res.text;
    }
};
