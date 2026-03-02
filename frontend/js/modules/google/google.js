/**
 * google.js — Módulo de integración con Google Sheets y Drive
 */

window.google_module = {
    _connected: false,
    _currentTab: 'sheets',
    _credentialsConfigured: false,

    async init() {
        await this.loadCredentials();
        await this.checkConnection();
        this._setupEventListeners();
        this._setupTabs();
    },

    _setupEventListeners() {
        document.getElementById('btn-connect-google')?.addEventListener('click', () => this.connectGoogle());
        document.getElementById('btn-disconnect-google')?.addEventListener('click', () => this.disconnectGoogle());
        document.getElementById('btn-check-connection')?.addEventListener('click', () => this.checkConnection());
        document.getElementById('btn-refresh-sheets')?.addEventListener('click', () => this.loadSheets());
        document.getElementById('btn-refresh-drive')?.addEventListener('click', () => this.loadDriveFiles());
        document.getElementById('drive-filter')?.addEventListener('change', (e) => this.loadDriveFiles(e.target.value));
        document.getElementById('btn-refresh-gmail')?.addEventListener('click', () => this.loadEmails());
        document.getElementById('gmail-filter')?.addEventListener('change', () => this.loadEmails());
        document.getElementById('gmail-search')?.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.loadEmails();
        });
    },

    async loadCredentials() {
        try {
            const response = await API.get('/google/credentials');
            this._credentialsConfigured = response.isConfigured;

            const statusEl = document.getElementById('credentials-status-text');
            const descEl = document.getElementById('credentials-status-desc');
            const indicatorEl = document.getElementById('credentials-indicator');

            if (response.isConfigured) {
                statusEl.textContent = 'Credenciales configuradas';
                descEl.textContent = response.google_client_id ? `Client ID: ${response.google_client_id.substring(0, 30)}...` : 'Credenciales guardadas';
                indicatorEl.className = 'connection-indicator connected';

                // Prellenar formulario (sin mostrar secret completo)
                if (response.google_client_id) {
                    document.getElementById('google-client-id').value = response.google_client_id;
                }
                if (response.google_redirect_uri) {
                    document.getElementById('google-redirect-uri').value = response.google_redirect_uri;
                }
            } else {
                statusEl.textContent = 'Credenciales no configuradas';
                descEl.textContent = 'Configura tus credenciales de Google para usar este módulo';
                indicatorEl.className = 'connection-indicator disconnected';
            }
        } catch (err) {
            console.error('Error cargando credenciales:', err);
        }
    },

    toggleCredentialsForm() {
        const form = document.getElementById('credentials-form');
        const isVisible = form.style.display !== 'none';
        form.style.display = isVisible ? 'none' : 'block';

        if (!isVisible) {
            // Cargar valores actuales
            this.loadCredentials();
        }
    },

    async saveCredentials() {
        const clientId = document.getElementById('google-client-id').value.trim();
        const clientSecret = document.getElementById('google-client-secret').value.trim();
        const redirectUri = document.getElementById('google-redirect-uri').value.trim() || 'http://localhost:3001/api/google/callback';

        if (!clientId || !clientSecret) {
            Toast.warning('Client ID y Client Secret son requeridos');
            return;
        }

        try {
            await API.post('/google/credentials', {
                google_client_id: clientId,
                google_client_secret: clientSecret,
                google_redirect_uri: redirectUri
            });
            Toast.success('Credenciales guardadas correctamente');
            this.toggleCredentialsForm();
            await this.loadCredentials();
        } catch (err) {
            Toast.error('Error guardando credenciales: ' + err.message);
        }
    },

    _setupTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
                btn.classList.add('active');
                document.getElementById(`tab-${tab}`).style.display = 'block';
                this._currentTab = tab;

                if (tab === 'sheets' && this._connected) {
                    this.loadSheets();
                } else if (tab === 'drive' && this._connected) {
                    this.loadDriveFiles();
                } else if (tab === 'gmail' && this._connected) {
                    this.loadEmails();
                }
            });
        });
    },

    async checkConnection() {
        try {
            const statusEl = document.getElementById('connection-status-text');
            const descEl = document.getElementById('connection-status-desc');
            const indicatorEl = document.getElementById('connection-indicator');
            const connectBtn = document.getElementById('btn-connect-google');
            const disconnectBtn = document.getElementById('btn-disconnect-google');

            statusEl.textContent = 'Verificando conexión...';
            descEl.textContent = 'Espera un momento';
            indicatorEl.className = 'connection-indicator checking';

            const response = await API.get('/google/check');
            this._connected = response.connected;

            if (this._connected) {
                statusEl.textContent = 'Conectado a Google';
                descEl.textContent = 'Tu cuenta está conectada correctamente';
                indicatorEl.className = 'connection-indicator connected';
                connectBtn.style.display = 'none';
                disconnectBtn.style.display = 'inline-flex';

                // Cargar datos según la pestaña activa
                if (this._currentTab === 'sheets') {
                    await this.loadSheets();
                } else if (this._currentTab === 'drive') {
                    await this.loadDriveFiles();
                } else if (this._currentTab === 'gmail') {
                    await this.loadEmails();
                }
            } else {
                statusEl.textContent = 'No conectado';
                descEl.textContent = 'Conecta tu cuenta de Google para ver tus archivos';
                indicatorEl.className = 'connection-indicator disconnected';
                connectBtn.style.display = 'inline-flex';
                disconnectBtn.style.display = 'none';
            }
        } catch (err) {
            Toast.error('Error verificando conexión: ' + err.message);
        }
    },

    async connectGoogle() {
        if (!this._credentialsConfigured) {
            Toast.warning('Primero debes configurar las credenciales de Google');
            this.toggleCredentialsForm();
            return;
        }
        try {
            const response = await API.get('/google/auth-url');
            window.location.href = response.authUrl;
        } catch (err) {
            if (err.message.includes('not configured')) {
                Toast.warning('Las credenciales de Google no están configuradas. Por favor configúralas primero.');
                this.toggleCredentialsForm();
            } else {
                Toast.error('Error iniciando conexión: ' + err.message);
            }
        }
    },

    async disconnectGoogle() {
        const result = await Swal.fire({
            title: '¿Desconectar Google?',
            text: 'Se perderá el acceso a tus archivos hasta que vuelvas a conectar.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, desconectar',
            cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) return;

        try {
            await API.post('/google/disconnect');
            Toast.success('Cuenta desconectada');
            this._connected = false;
            await this.checkConnection();
        } catch (err) {
            Toast.error('Error desconectando: ' + err.message);
        }
    },

    async loadSheets() {
        const container = document.getElementById('sheets-list-container');
        if (!container) return;

        container.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>Cargando hojas de cálculo...</p></div>';

        try {
            const response = await API.get('/google/sheets');
            const sheets = response.sheets || [];

            if (sheets.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-table" style="font-size:3rem; opacity:0.3; margin-bottom:1rem;"></i>
                        <p>No tienes hojas de cálculo en tu cuenta de Google</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = `
                <div class="files-grid">
                    ${sheets.map(sheet => `
                        <div class="file-card" onclick="google_module.viewSheet('${sheet.id}', '${escapeHtml(sheet.name)}')">
                            <div class="file-icon">
                                <i class="fab fa-google-drive" style="color:#0F9D58;"></i>
                            </div>
                            <div class="file-info">
                                <h4 class="file-name">${escapeHtml(sheet.name)}</h4>
                                <p class="file-meta">${formatDate(sheet.modifiedTime)}</p>
                            </div>
                            <div class="file-actions">
                                <a href="${sheet.webViewLink}" target="_blank" class="btn btn-sm btn-secondary" onclick="event.stopPropagation()">
                                    <i class="fas fa-external-link-alt"></i>
                                </a>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (err) {
            if (err.message.includes('401') || err.message.includes('No hay conexión')) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle" style="color:var(--warning);"></i>
                        <p>No hay conexión con Google</p>
                        <button class="btn btn-primary mt-2" onclick="google_module.connectGoogle()">
                            Conectar con Google
                        </button>
                    </div>
                `;
            } else {
                container.innerHTML = `<div class="error-state">Error: ${escapeHtml(err.message)}</div>`;
            }
        }
    },

    async loadDriveFiles(filter = 'all') {
        const container = document.getElementById('drive-files-container');
        if (!container) return;

        container.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>Cargando archivos...</p></div>';

        try {
            const response = await API.get('/google/drive/files');
            let files = response.files || [];

            // Aplicar filtro
            if (filter === 'sheets') {
                files = files.filter(f => f.isSheet);
            } else if (filter === 'docs') {
                files = files.filter(f => f.mimeType && f.mimeType.includes('document'));
            } else if (filter === 'images') {
                files = files.filter(f => f.mimeType && f.mimeType.startsWith('image/'));
            }

            if (files.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fab fa-google-drive" style="font-size:3rem; opacity:0.3; margin-bottom:1rem;"></i>
                        <p>No hay archivos para mostrar</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = `
                <div class="files-grid">
                    ${files.map(file => `
                        <div class="file-card">
                            <div class="file-icon">
                                ${file.iconLink ? `<img src="${file.iconLink}" alt="" style="width:24px; height:24px;">` : '<i class="fas fa-file"></i>'}
                            </div>
                            <div class="file-info">
                                <h4 class="file-name">${escapeHtml(file.name)}</h4>
                                <p class="file-meta">
                                    ${file.size ? formatFileSize(file.size) + ' • ' : ''}
                                    ${formatDate(file.modifiedTime)}
                                </p>
                            </div>
                            <div class="file-actions">
                                <a href="${file.webViewLink}" target="_blank" class="btn btn-sm btn-secondary">
                                    <i class="fas fa-external-link-alt"></i>
                                </a>
                            </div>
                        </div>
                    `).join('')}
                </div>
                ${response.nextPageToken ? `
                    <div style="text-align:center; margin-top:1rem;">
                        <button class="btn btn-secondary" onclick="google_module.loadMoreDriveFiles('${response.nextPageToken}')">
                            Cargar más
                        </button>
                    </div>
                ` : ''}
            `;
        } catch (err) {
            if (err.message.includes('401') || err.message.includes('No hay conexión')) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle" style="color:var(--warning);"></i>
                        <p>No hay conexión con Google</p>
                        <button class="btn btn-primary mt-2" onclick="google_module.connectGoogle()">
                            Conectar con Google
                        </button>
                    </div>
                `;
            } else {
                container.innerHTML = `<div class="error-state">Error: ${escapeHtml(err.message)}</div>`;
            }
        }
    },

    async loadMoreDriveFiles(pageToken) {
        // Implementar paginación si es necesario
        Toast.info('Funcionalidad de paginación próximamente');
    },

    async viewSheet(spreadsheetId, title) {
        const modal = document.getElementById('sheet-viewer-modal');
        const titleEl = document.getElementById('sheet-viewer-title');
        const contentEl = document.getElementById('sheet-viewer-content');

        modal.style.display = 'flex';
        titleEl.textContent = title;
        contentEl.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>Cargando datos...</p></div>';

        try {
            const data = await API.get(`/google/sheets/${spreadsheetId}/data`);

            if (!data.values || data.values.length === 0) {
                contentEl.innerHTML = '<div class="empty-state"><p>La hoja está vacía</p></div>';
                return;
            }

            // Crear tabla HTML
            let tableHtml = '<div style="overflow-x:auto;"><table class="data-table" style="min-width:100%;">';

            data.values.forEach((row, rowIndex) => {
                tableHtml += '<tr>';
                row.forEach(cell => {
                    const tag = rowIndex === 0 ? 'th' : 'td';
                    tableHtml += `<${tag}>${escapeHtml(String(cell || ''))}</${tag}>`;
                });
                // Rellenar celdas vacías si es necesario
                if (row.length < data.values[0].length) {
                    for (let i = row.length; i < data.values[0].length; i++) {
                        tableHtml += `<${rowIndex === 0 ? 'th' : 'td'}></${rowIndex === 0 ? 'th' : 'td'}>`;
                    }
                }
                tableHtml += '</tr>';
            });

            tableHtml += '</table></div>';
            contentEl.innerHTML = tableHtml;
        } catch (err) {
            contentEl.innerHTML = `<div class="error-state">Error: ${escapeHtml(err.message)}</div>`;
        }
    },

    closeSheetViewer() {
        document.getElementById('sheet-viewer-modal').style.display = 'none';
    },

    async loadEmails() {
        const container = document.getElementById('gmail-list-container');
        if (!container) return;

        container.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>Cargando correos...</p></div>';

        try {
            const filter = document.getElementById('gmail-filter')?.value || '';
            const search = document.getElementById('gmail-search')?.value || '';
            const query = filter + (search ? ` ${search}` : '');

            const response = await API.get('/google/emails', { query });
            const emails = response.emails || [];

            if (emails.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-envelope" style="font-size:3rem; opacity:0.3; margin-bottom:1rem;"></i>
                        <p>No tienes correos para mostrar</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = `
                <div class="emails-list">
                    ${emails.map(email => `
                        <div class="email-item ${!email.isRead ? 'unread' : ''}" onclick="google_module.viewEmail('${email.id}')">
                            <div class="email-icon">
                                <i class="fas fa-envelope${email.isImportant ? '-text' : ''}" style="color: ${email.isImportant ? 'var(--warning)' : 'var(--text-muted)'};"></i>
                                ${email.hasAttachments ? '<i class="fas fa-paperclip" style="color:var(--text-muted); font-size:12px; margin-left:4px;"></i>' : ''}
                            </div>
                            <div class="email-info" style="flex:1;">
                                <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:4px;">
                                    <h4 class="email-sender" style="margin:0; font-weight:${!email.isRead ? '600' : '400'};">${escapeHtml(email.from)}</h4>
                                    <span class="email-date" style="font-size:12px; color:var(--text-muted);">${formatDate(email.date)}</span>
                                </div>
                                <h5 class="email-subject" style="margin:0 0 4px 0; font-weight:${!email.isRead ? '600' : '400'};">${escapeHtml(email.subject)}</h5>
                                <p class="email-snippet" style="margin:0; font-size:13px; color:var(--text-muted);">${escapeHtml(email.snippet)}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
                ${response.nextPageToken ? `
                    <div style="text-align:center; margin-top:1rem;">
                        <button class="btn btn-secondary" onclick="google_module.loadMoreEmails('${response.nextPageToken}')">
                            Cargar más
                        </button>
                    </div>
                ` : ''}
            `;
        } catch (err) {
            if (err.message.includes('401') || err.message.includes('No hay conexión')) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle" style="color:var(--warning);"></i>
                        <p>No hay conexión con Google</p>
                        <button class="btn btn-primary mt-2" onclick="google_module.connectGoogle()">
                            Conectar con Google
                        </button>
                    </div>
                `;
            } else {
                container.innerHTML = `<div class="error-state">Error: ${escapeHtml(err.message)}</div>`;
            }
        }
    },

    async loadMoreEmails(pageToken) {
        // Implementar paginación si es necesario
        Toast.info('Funcionalidad de paginación próximamente');
    },

    async viewEmail(messageId) {
        const modal = document.getElementById('email-viewer-modal');
        const subjectEl = document.getElementById('email-viewer-subject');
        const contentEl = document.getElementById('email-viewer-content');

        modal.style.display = 'flex';
        subjectEl.textContent = 'Cargando correo...';
        contentEl.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>Cargando correo...</p></div>';

        try {
            const email = await API.get(`/google/emails/${messageId}`);

            subjectEl.textContent = email.subject || 'Sin asunto';

            contentEl.innerHTML = `
                <div class="email-header" style="border-bottom:1px solid var(--border-color); padding-bottom:1rem; margin-bottom:1rem;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                        <div>
                            <strong>De:</strong> ${escapeHtml(email.from)}<br>
                            <strong>Para:</strong> ${escapeHtml(email.to)}
                            ${email.cc ? `<br><strong>CC:</strong> ${escapeHtml(email.cc)}` : ''}
                        </div>
                        <div style="text-align:right; font-size:13px; color:var(--text-muted);">
                            ${email.dateFormatted}
                            <div style="margin-top:8px;">
                                <a href="https://mail.google.com/mail/u/0/#all/${email.id}" target="_blank" class="btn btn-sm btn-primary" style="display:inline-flex; align-items:center; gap:5px; text-decoration:none;">
                                    <i class="fas fa-external-link-alt"></i> Abrir en Gmail
                                </a>
                            </div>
                        </div>
                    </div>
                    ${email.attachments && email.attachments.length > 0 ? `
                        <div style="margin-top:8px;">
                            <strong>Adjuntos:</strong>
                            <div style="margin-top:4px;">
                                ${email.attachments.map(att => `
                                    <span class="attachment-item" style="display:inline-block; background:var(--background-secondary); padding:4px 8px; margin:2px; border-radius:4px; font-size:12px;">
                                        <i class="fas fa-paperclip"></i> ${escapeHtml(att.filename)}
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div class="email-content" style="width:100%; height:400px; background:white; border: 1px solid var(--border-color); border-radius: 4px; margin-top: 10px;">
                    ${email.content ? `<iframe srcdoc="${email.content.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" style="width:100%; height:100%; border:none;"></iframe>` : '<em>El contenido no está disponible</em>'}
                </div>
            `;
        } catch (err) {
            contentEl.innerHTML = `<div class="error-state">Error: ${escapeHtml(err.message)}</div>`;
        }
    },

    closeEmailViewer() {
        document.getElementById('email-viewer-modal').style.display = 'none';
    }
};

// Función helper para formatear tamaño de archivo
function formatFileSize(bytes) {
    if (!bytes) return '—';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

window.formatFileSize = formatFileSize;
