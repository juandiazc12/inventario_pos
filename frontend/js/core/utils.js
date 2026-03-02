/**
 * utils.js — Funciones compartidas
 */

/**
 * Formatea un número como moneda colombiana (COP)
 */
function formatCOP(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '$0';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

/**
 * Debounce: retrasa la ejecución de una función
 */
function debounce(func, wait = 300) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/**
 * Normaliza texto: quita tildes y pasa a minúsculas
 */
function normalizarTexto(texto) {
    if (!texto) return '';
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/**
 * Formatea cantidad: sin decimales innecesarios (12 en vez de 12.00)
 */
function formatCantidad(num) {
    if (num === null || num === undefined || num === '') return '—';
    const n = parseFloat(num);
    if (isNaN(n)) return '—';
    return n % 1 === 0 ? String(Math.round(n)) : String(Number(n.toFixed(4)));
}

/**
 * Formatea una fecha a formato legible
 */
function formatDate(date, includeTime = false) {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    const opts = { day: '2-digit', month: '2-digit', year: 'numeric' };
    if (includeTime) { opts.hour = '2-digit'; opts.minute = '2-digit'; }
    return d.toLocaleDateString('es-CO', opts);
}

/**
 * Genera el HTML del badge de stock según el nivel
 */
function renderStockBadge(stock) {
    stock = parseInt(stock) || 0;
    if (stock === 0) return `<span class="badge badge-sin-stock"><i class="fas fa-times-circle"></i> Sin Stock</span>`;
    if (stock < 5) return `<span class="badge badge-critico"><i class="fas fa-exclamation-triangle"></i> Crítico (${stock})</span>`;
    if (stock < 10) return `<span class="badge badge-bajo"><i class="fas fa-exclamation-circle"></i> Bajo (${stock})</span>`;
    return `<span class="badge badge-ok"><i class="fas fa-check-circle"></i> ${stock}</span>`;
}

/**
 * Genera el HTML del badge de estado de pedido
 */
function renderEstadoBadge(estado) {
    const map = {
        pendiente: { cls: 'badge-pendiente', icon: 'fa-clock', label: 'Pendiente' },
        en_proceso: { cls: 'badge-en_proceso', icon: 'fa-spinner', label: 'En Proceso' },
        completado: { cls: 'badge-completado', icon: 'fa-check-circle', label: 'Completado' },
        cancelado: { cls: 'badge-cancelado', icon: 'fa-times-circle', label: 'Cancelado' }
    };
    const e = map[estado] || { cls: 'badge-secondary', icon: 'fa-question', label: estado };
    return `<span class="badge ${e.cls}"><i class="fas ${e.icon}"></i> ${e.label}</span>`;
}

/**
 * Escapa HTML para prevenir XSS
 */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Descarga un string como archivo CSV
 */
function downloadCSV(content, filename) {
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Genera un ID único simple
 */
function uid() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Formatea la URL de una imagen resolviendo la ruta base
 */
function formatImageUrl(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    // Si empieza con 'uploads/', le anteponemos la base del backend
    if (url.startsWith('uploads/') || url.startsWith('/uploads/')) {
        // Asegurar que no haya doble slash
        const path = url.startsWith('/') ? url.slice(1) : url;
        return `${API_BASE.replace('/api', '')}/${path}`;
    }
    return url;
}

/**
 * Abre un modal con una imagen en tamaño grande
 */
function openImagePreview(url, title = 'Vista Previa') {
    if (!url) return;
    Modal.open({
        title: title,
        size: 'lg',
        body: `
            <div style="display:flex; justify-content:center; align-items:center; min-height:300px;">
                <img src="${url}" style="max-width:100%; max-height:80vh; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.15);">
            </div>
        `,
        footer: `<button class="btn btn-secondary" onclick="Modal.close()">Cerrar</button>`
    });
}

const Utils = {
    formatCOP,
    formatCurrency: formatCOP, // Alias para consistencia
    formatCantidad,
    debounce,
    normalizarTexto,
    formatDate,
    renderStockBadge,
    renderEstadoBadge,
    escapeHtml,
    downloadCSV,
    uid,
    formatImageUrl,
    openImagePreview
};

// Exponer globalmente
window.Utils = Utils;

// También exponer funciones individuales por compatibilidad legacy
Object.keys(Utils).forEach(key => {
    window[key] = Utils[key];
});
