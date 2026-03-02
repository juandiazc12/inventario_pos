// ═══════════════════════════════════════════════════════════════════════════════
// WHATSAPP WEB MODULE - Sistema de Inventario
// ═══════════════════════════════════════════════════════════════════════════════

const whatsapp_module = {
    whatsappIframe: null,
    isInitialized: false,
    proxyUrl: 'http://localhost:3003/whatsapp',
    statusCheckInterval: null,

    async init() {
        console.log('📱 Inicializando módulo WhatsApp...');
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Verificar estado del proxy
        await this.checkProxyStatus();
        
        // Iniciar verificación periódica
        this.startStatusMonitoring();
        
        this.isInitialized = true;
        console.log('✅ Módulo WhatsApp inicializado');
    },

    setupEventListeners() {
        // Botón iniciar WhatsApp
        document.getElementById('start-whatsapp-btn').addEventListener('click', () => {
            this.startWhatsApp();
        });

        // Botón recargar
        document.getElementById('reload-whatsapp-btn').addEventListener('click', () => {
            this.reloadWhatsApp();
        });

        // Botón verificar proxy
        document.getElementById('check-proxy-btn').addEventListener('click', () => {
            this.checkProxyStatus();
        });
    },

    async checkProxyStatus() {
        const statusDiv = document.getElementById('whatsapp-status');
        const statusText = document.getElementById('status-text');
        const startBtn = document.getElementById('start-whatsapp-btn');
        const proxyStatusDiv = document.getElementById('proxy-status');
        const proxyDetails = document.getElementById('proxy-details');

        statusDiv.className = 'whatsapp-status loading';
        statusText.textContent = 'Verificando proxy...';

        try {
            const response = await fetch('http://localhost:3003/status');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const status = await response.json();

            if (status.status === 'running') {
                statusDiv.className = 'whatsapp-status online';
                statusText.textContent = 'Proxy en línea';
                startBtn.disabled = false;
                
                // Forzar habilitación del botón
                setTimeout(() => {
                    startBtn.disabled = false;
                    console.log('🔓 Botón Iniciar WhatsApp forzado a habilitar');
                }, 100);

                // Mostrar detalles del proxy
                proxyStatusDiv.style.display = 'block';
                proxyDetails.textContent = `Activo en puerto ${status.port} - ${status.timestamp}`;
                proxyDetails.style.color = '';
                
                console.log('✅ Proxy status:', status);
                console.log('🔘 Estado del botón Iniciar:', startBtn.disabled);
                return true;
            } else {
                throw new Error('Proxy not running');
            }

        } catch (error) {
            console.error('❌ Proxy check failed:', error);
            
            statusDiv.className = 'whatsapp-status offline';
            statusText.textContent = 'Proxy desconectado';
            startBtn.disabled = true;

            // Mostrar error en detalles
            proxyStatusDiv.style.display = 'block';
            proxyDetails.textContent = `Error: ${error.message}`;
            proxyDetails.style.color = '#dc3545';

            // Mostrar notificación
            if (window.Toast) {
                Toast.show('El servidor proxy no está corriendo. Inicia el proxy con: npm run proxy:whatsapp', 'error');
            } else if (window.Swal) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Proxy no disponible',
                    text: 'El servidor proxy no está corriendo. Inicia el proxy con: npm run proxy:whatsapp',
                    confirmButtonColor: '#25d366'
                });
            }

            return false;
        }
    },

    startWhatsApp() {
        if (this.whatsappIframe) {
            this.whatsappIframe.destroy();
        }

        const container = document.getElementById('whatsapp-container');
        const reloadBtn = document.getElementById('reload-whatsapp-btn');

        // Mostrar loading
        container.innerHTML = `
            <div class="whatsapp-loading">
                <div class="spinner"></div>
                <p>Cargando WhatsApp Web...</p>
            </div>
        `;

        // Crear instancia del iframe
        this.whatsappIframe = new WhatsAppIframe('whatsapp-container', {
            proxyUrl: this.proxyUrl,
            height: '600px',
            onLoad: () => {
                console.log('✅ WhatsApp cargado exitosamente');
                reloadBtn.disabled = false;
                
                if (window.Toast) {
                    Toast.show('WhatsApp Web cargado correctamente', 'success');
                }
            },
            onError: (error) => {
                console.error('❌ Error cargando WhatsApp:', error);
                reloadBtn.disabled = false;
                
                if (window.Toast) {
                    Toast.show('Error al cargar WhatsApp Web', 'error');
                }
            }
        });

        // Deshabilitar botón de inicio temporalmente
        document.getElementById('start-whatsapp-btn').disabled = true;
        setTimeout(() => {
            document.getElementById('start-whatsapp-btn').disabled = false;
        }, 2000);
    },

    reloadWhatsApp() {
        if (this.whatsappIframe) {
            this.whatsappIframe.reload();
            
            if (window.Toast) {
                Toast.show('Recargando WhatsApp...', 'info');
            }
        }
    },

    startStatusMonitoring() {
        // Verificar estado cada 30 segundos
        this.statusCheckInterval = setInterval(() => {
            this.checkProxyStatus();
        }, 30000);
    },

    stopStatusMonitoring() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }
    },

    destroy() {
        console.log('🗑️ Destruyendo módulo WhatsApp...');
        
        // Detener monitoreo
        this.stopStatusMonitoring();
        
        // Destruir iframe
        if (this.whatsappIframe) {
            this.whatsappIframe.destroy();
            this.whatsappIframe = null;
        }
        
        this.isInitialized = false;
        console.log('✅ Módulo WhatsApp destruido');
    }
};

// Exportar para uso global
window.whatsapp_module = whatsapp_module;
