// qr-scanner.js
const QRScanner = {
    scanner: null,
    targetInputId: null,
    isScanning: false,

    async open(targetInputId) {
        if (typeof Html5Qrcode === 'undefined') {
            Toast.error('La librería de escaneo no se cargó correctamente. Por favor, recarga la página.');
            return;
        }
        this.targetInputId = targetInputId;
        this.isScanning = true;
        this._renderModal();
        this._startScanner();
    },

    _renderModal() {
        // Eliminar modal previo si existe
        document.getElementById('qr-scanner-modal')?.remove();

        const modalHtml = `
      <div id="qr-scanner-modal" class="qr-scanner-modal">
        <div class="qr-scanner-container">
          <h3 style="color:white; margin-bottom:15px; font-family:var(--font-display)">Escanear código (QR/Barra)</h3>
          <div id="qr-scanner-view">
            <div class="qr-scan-line"></div>
          </div>
          <p style="color:#aaa; font-size:12px; margin-top:15px; text-align:center;">
            Apunta la cámara al código QR o de barras
          </p>
          <button class="btn btn-secondary" onclick="QRScanner.close()" style="margin-top:20px; width:100%">
            Cancelar
          </button>
        </div>
      </div>
    `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    async _startScanner() {
        try {
            this.scanner = new Html5Qrcode("qr-scanner-view");
            const config = { fps: 10, qrbox: { width: 250, height: 250 } };

            await this.scanner.start(
                { facingMode: "environment" },
                config,
                (decodedText) => this.onSuccess(decodedText)
            );
        } catch (err) {
            Toast.error("Error al iniciar cámara: " + err.message);
            this.close();
        }
    },

    onSuccess(decodedText) {
        const input = document.getElementById(this.targetInputId);
        if (input) {
            input.value = decodedText;
            // Disparar evento input para que los filtros reaccionen
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }

        if (navigator.vibrate) navigator.vibrate(100);

        Toast.success(`Código escaneado: ${decodedText}`);
        this.close();
    },

    async close() {
        if (this.scanner) {
            try {
                await this.scanner.stop();
            } catch (e) { /* ignore */ }
            this.scanner = null;
        }
        document.getElementById('qr-scanner-modal')?.remove();
        this.isScanning = false;
    }
};

window.QRScanner = QRScanner;
