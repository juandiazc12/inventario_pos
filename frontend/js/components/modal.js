/**
 * modal.js — Componente modal genérico
 */

const Modal = {
    /**
     * Abre un modal con contenido HTML
     */
    open({ title, body, footer = '', size = '', onClose }) {
        this.close(); // Cerrar cualquier modal abierto

        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';
        backdrop.id = 'modal-backdrop';
        backdrop.innerHTML = `
      <div class="modal ${size ? 'modal-' + size : ''}" id="modal-main" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close" id="modal-close-btn" aria-label="Cerrar">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">${body}</div>
        ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
      </div>
    `;

        document.body.appendChild(backdrop);

        // Cerrar con X
        document.getElementById('modal-close-btn').addEventListener('click', () => {
            this.close();
            if (onClose) onClose();
        });

        // Cerrar con backdrop
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                this.close();
                if (onClose) onClose();
            }
        });

        // Cerrar con Escape
        this._escHandler = (e) => {
            if (e.key === 'Escape') {
                this.close();
                if (onClose) onClose();
            }
        };
        document.addEventListener('keydown', this._escHandler);

        // Focus trap
        setTimeout(() => {
            const firstInput = backdrop.querySelector('input, select, textarea, button');
            if (firstInput) firstInput.focus();
        }, 100);

        return backdrop;
    },

    close() {
        const backdrop = document.getElementById('modal-backdrop');
        if (backdrop) backdrop.remove();
        if (this._escHandler) {
            document.removeEventListener('keydown', this._escHandler);
            this._escHandler = null;
        }
    }
};

window.Modal = Modal;
