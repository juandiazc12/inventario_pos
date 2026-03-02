class WhatsAppIframe {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            proxyUrl: options.proxyUrl || 'http://localhost:3003/whatsapp',
            width: options.width || '100%',
            height: options.height || '600px',
            onLoad: options.onLoad || null,
            onError: options.onError || null,
            ...options
        };

        this.iframe = null;
        this.loadingIndicator = null;
        this.errorContainer = null;

        this.init();
    }

    init() {
        if (!this.container) {
            console.error('Container not found:', containerId);
            return;
        }

        this.createLoadingIndicator();
        this.createErrorContainer();
        this.createIframe();
        this.setupEventListeners();
    }

    createLoadingIndicator() {
        this.loadingIndicator = document.createElement('div');
        this.loadingIndicator.className = 'whatsapp-loading';
        this.loadingIndicator.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Cargando WhatsApp Web...</p>
            </div>
        `;
        this.loadingIndicator.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            height: ${this.options.height};
            background: #f5f5f5;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        this.container.appendChild(this.loadingIndicator);
    }

    createErrorContainer() {
        this.errorContainer = document.createElement('div');
        this.errorContainer.className = 'whatsapp-error';
        this.errorContainer.innerHTML = `
            <div class="error-content">
                <h3>⚠️ Error al cargar WhatsApp</h3>
                <p>No se pudo conectar con WhatsApp Web. Verifica que el servidor proxy esté corriendo.</p>
                <button onclick="window.location.reload()">Reintentar</button>
            </div>
        `;
        this.errorContainer.style.cssText = `
            display: none;
            align-items: center;
            justify-content: center;
            height: ${this.options.height};
            background: #fee;
            border: 1px solid #fcc;
            border-radius: 8px;
            color: #c33;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        this.container.appendChild(this.errorContainer);
    }

    createIframe() {
        console.log('🏗️ Creando iframe...');
        console.log('📦 Container:', this.container);
        console.log('🔗 Proxy URL:', this.options.proxyUrl);

        this.iframe = document.createElement('iframe');
        this.iframe.src = this.options.proxyUrl;
        this.iframe.style.cssText = `
            width: ${this.options.width};
            height: ${this.options.height};
            border: none;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            display: block;
            visibility: visible;
            opacity: 1;
        `;
        this.iframe.setAttribute('allow', 'camera; microphone; fullscreen; web-share');
        this.iframe.setAttribute('allowfullscreen', 'true');
        this.iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');

        console.log('🎯 Iframe creado:', this.iframe);
        console.log('🔍 Iframe src:', this.iframe.src);

        this.container.appendChild(this.iframe);

        console.log('📋 Iframe agregado al DOM');
        console.log('👁️ Container children:', this.container.children.length);

        // Verificar inmediatamente
        setTimeout(() => {
            console.log('⚡ Verificación inmediata:');
            console.log('  - Iframe en DOM:', !!document.querySelector('#whatsapp-container iframe'));
            console.log('  - Iframe display:', getComputedStyle(this.iframe).display);
            console.log('  - Iframe dimensions:', {
                width: this.iframe.offsetWidth,
                height: this.iframe.offsetHeight
            });
        }, 50);
    }

    setupEventListeners() {
        // Eventos del iframe
        this.iframe.addEventListener('load', () => {
            console.log('🔄 Iframe load event triggered');
            this.hideLoading();
            this.showIframe();

            // Forzar visibilidad del iframe
            setTimeout(() => {
                this.iframe.style.display = 'block';
                this.iframe.style.visibility = 'visible';
                this.iframe.style.opacity = '1';
                this.iframe.style.width = '100%';
                this.iframe.style.height = '600px';
                this.iframe.style.minHeight = '600px';
                this.iframe.style.border = '2px solid red'; // Debug border
                this.iframe.style.background = 'white';
                this.iframe.style.position = 'relative';
                this.iframe.style.zIndex = '1000';

                console.log('👁️ Iframe visibility forced');
                console.log('📐 Iframe dimensions:', {
                    width: this.iframe.offsetWidth,
                    height: this.iframe.offsetHeight,
                    display: getComputedStyle(this.iframe).display,
                    visibility: getComputedStyle(this.iframe).visibility,
                    src: this.iframe.src
                });

                // Forzar repaint
                this.iframe.offsetHeight;
            }, 100);

            if (this.options.onLoad) {
                this.options.onLoad.call(this);
            }
            console.log('WhatsApp iframe loaded successfully');
        });

        this.iframe.addEventListener('error', (e) => {
            this.hideLoading();
            this.showError();
            if (this.options.onError) {
                this.options.onError.call(this, e);
            }
            console.error('WhatsApp iframe error:', e);
        });

        // Timeout para detectar problemas de carga
        setTimeout(() => {
            if (this.loadingIndicator.style.display !== 'none') {
                this.hideLoading();
                this.showError();
            }
        }, 15000); // 15 segundos timeout
    }

    showIframe() {
        this.iframe.style.display = 'block';
    }

    hideIframe() {
        this.iframe.style.display = 'none';
    }

    showLoading() {
        this.loadingIndicator.style.display = 'flex';
    }

    hideLoading() {
        this.loadingIndicator.style.display = 'none';
    }

    showError() {
        this.errorContainer.style.display = 'flex';
    }

    hideError() {
        this.errorContainer.style.display = 'none';
    }

    // Métodos públicos
    reload() {
        this.hideError();
        this.showLoading();
        this.iframe.src = this.options.proxyUrl;
    }

    destroy() {
        if (this.iframe) this.iframe.remove();
        if (this.loadingIndicator) this.loadingIndicator.remove();
        if (this.errorContainer) this.errorContainer.remove();
    }

    // Verificar estado del proxy
    async checkProxyStatus() {
        try {
            const response = await fetch('http://localhost:3003/status');
            const status = await response.json();
            return status;
        } catch (error) {
            console.error('Proxy status check failed:', error);
            return null;
        }
    }
}

// Estilos CSS para el loading spinner
const whatsappStyles = `
<style>
.whatsapp-loading .loading-spinner {
    text-align: center;
}

.whatsapp-loading .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #25d366;
    border-radius: 50%;
    animation: whatsapp-spin 1s linear infinite;
    margin: 0 auto 16px;
}

@keyframes whatsapp-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.whatsapp-loading p {
    margin: 0;
    color: #666;
    font-size: 14px;
}

.whatsapp-error .error-content {
    text-align: center;
    padding: 20px;
}

.whatsapp-error h3 {
    margin: 0 0 10px 0;
    color: #c33;
}

.whatsapp-error p {
    margin: 0 0 16px 0;
    color: #666;
}

.whatsapp-error button {
    background: #25d366;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
}

.whatsapp-error button:hover {
    background: #128c7e;
}
</style>
`;

// Inyectar estilos en el documento
if (!document.querySelector('#whatsapp-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'whatsapp-styles';
    styleElement.innerHTML = whatsappStyles;
    document.head.appendChild(styleElement.firstElementChild);
}

// Exportar para uso global
window.WhatsAppIframe = WhatsAppIframe;
