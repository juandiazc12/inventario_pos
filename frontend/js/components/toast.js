/**
 * toast.js — Notificaciones toast
 */

const Toast = {
    _container: null,

    _getContainer() {
        if (!this._container) {
            this._container = document.createElement('div');
            this._container.id = 'toast-container';
            this._container.style.cssText = `
        position: fixed; top: 1rem; right: 1rem; z-index: 9999;
        display: flex; flex-direction: column; gap: 0.5rem;
        max-width: 360px; pointer-events: none;
      `;
            document.body.appendChild(this._container);
        }
        return this._container;
    },

    /**
     * Muestra un toast
     * @param {string} message - Mensaje
     * @param {string} type - 'success' | 'error' | 'warning' | 'info'
     * @param {number} duration - ms
     */
    show(message, type = 'info', duration = 3500) {
        const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
        const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };

        const toast = document.createElement('div');
        toast.style.cssText = `
      background: white;
      border-left: 4px solid ${colors[type] || colors.info};
      border-radius: 8px;
      padding: 0.875rem 1rem;
      box-shadow: 0 10px 25px rgba(0,0,0,0.15);
      display: flex; align-items: flex-start; gap: 0.75rem;
      pointer-events: all;
      animation: toastIn 0.3s ease;
      font-size: 0.875rem;
      color: #1e293b;
      max-width: 100%;
    `;
        toast.innerHTML = `
      <i class="fas ${icons[type] || icons.info}" style="color:${colors[type]};margin-top:2px;flex-shrink:0"></i>
      <span style="flex:1;line-height:1.4">${escapeHtml(message)}</span>
      <button onclick="this.parentElement.remove()" style="background:none;border:none;color:#94a3b8;cursor:pointer;padding:0;font-size:1rem;flex-shrink:0">×</button>
    `;

        const style = document.createElement('style');
        style.textContent = `@keyframes toastIn { from { opacity:0; transform:translateX(100%); } to { opacity:1; transform:translateX(0); } }`;
        if (!document.getElementById('toast-style')) { style.id = 'toast-style'; document.head.appendChild(style); }

        const container = this._getContainer();
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    success(msg) { this.show(msg, 'success'); },
    error(msg) { this.show(msg, 'error', 5000); },
    warning(msg) { this.show(msg, 'warning'); },
    info(msg) { this.show(msg, 'info'); }
};

window.Toast = Toast;
