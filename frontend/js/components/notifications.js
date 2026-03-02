/**
 * notifications.js — Campana de notificaciones en el header
 * Muestra pedidos pendientes y productos con stock bajo
 */

const Notifications = {
    _dropdown: null,
    _badge: null,
    _refreshInterval: null,
    REFRESH_MS: 60000, // 1 minuto

    async init() {
        this._dropdown = document.getElementById('notifications-dropdown');
        this._badge = document.getElementById('notification-badge');
        const btn = document.getElementById('btn-notifications');
        const wrapper = document.getElementById('notifications-wrapper');

        if (!btn || !this._dropdown) return;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = this._dropdown.classList.contains('active');
            if (isOpen) {
                this.close();
            } else {
                this.open();
                this.refresh(); // Refrescar al abrir
            }
        });

        // Cerrar al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (wrapper && !wrapper.contains(e.target)) {
                this.close();
            }
        });

        // Cargar notificaciones iniciales y mostrar badge
        await this.refresh();
        this._startAutoRefresh();
    },

    open() {
        this._dropdown?.classList.add('active');
    },

    close() {
        this._dropdown?.classList.remove('active');
    },

    _startAutoRefresh() {
        this._stopAutoRefresh();
        this._refreshInterval = setInterval(() => this.refresh(), this.REFRESH_MS);
    },

    _stopAutoRefresh() {
        if (this._refreshInterval) {
            clearInterval(this._refreshInterval);
            this._refreshInterval = null;
        }
    },

    async refresh() {
        const content = document.getElementById('notifications-content');
        if (!content) return;

        try {
            content.innerHTML = '<div class="notifications-loading"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';

            const [pedidos, stockBajo] = await Promise.all([
                API.get('/pedidos'),
                API.get('/dashboard/stock-bajo')
            ]);

            const pedidosPendientes = (pedidos || []).filter(p => 
                p.estado === 'pendiente' || p.estado === 'en_proceso'
            );
            const productosBajoStock = stockBajo || [];

            this._render(content, pedidosPendientes, productosBajoStock);
            this._updateBadge(pedidosPendientes.length + productosBajoStock.length);
        } catch (err) {
            content.innerHTML = `<div class="notifications-error"><i class="fas fa-exclamation-triangle"></i> Error al cargar: ${escapeHtml(err.message)}</div>`;
            this._updateBadge(0);
        }
    },

    _render(content, pedidos, productos) {
        const items = [];

        // Sección Pedidos pendientes
        if (pedidos.length > 0) {
            items.push(`<div class="notifications-section">
                <div class="notifications-section-title"><i class="fas fa-clipboard-list"></i> Pedidos pendientes (${pedidos.length})</div>
                <div class="notifications-list">
                    ${pedidos.slice(0, 5).map(p => `
                        <a href="#pedidos" class="notification-item notification-item-pedido" onclick="Notifications.close()">
                            <div class="notification-item-body">
                                <span class="notification-item-title">${escapeHtml(p.producto_nombre)}</span>
                                <span class="notification-item-meta">${p.cantidad} und · ${formatCOP(p.total)}${p.cliente_nombre ? ' · ' + escapeHtml(p.cliente_nombre) : ''}</span>
                            </div>
                            <span class="notification-item-date">${formatDate(p.fecha_pedido)}</span>
                        </a>
                    `).join('')}
                </div>
                ${pedidos.length > 5 ? `<a href="#pedidos" class="notification-more" onclick="Notifications.close()">Ver ${pedidos.length - 5} más...</a>` : ''}
            </div>`);
        }

        // Sección Stock bajo
        if (productos.length > 0) {
            items.push(`<div class="notifications-section">
                <div class="notifications-section-title"><i class="fas fa-boxes-stacked"></i> Stock bajo (${productos.length})</div>
                <div class="notifications-list">
                    ${productos.slice(0, 5).map(p => `
                        <a href="#inventario" class="notification-item notification-item-stock" onclick="Notifications.close()">
                            <div class="notification-item-body">
                                <span class="notification-item-title">${escapeHtml(p.nombre)}</span>
                                <span class="notification-item-meta">${p.codigo || 'S/C'} · Stock: ${p.stock} ${p.nivel === 'CRITICO' ? '⚠️ Crítico' : ''}</span>
                            </div>
                            <span class="notification-stock-badge ${p.stock === 0 ? 'critico' : 'bajo'}">${p.stock}</span>
                        </a>
                    `).join('')}
                </div>
                ${productos.length > 5 ? `<a href="#inventario" class="notification-more" onclick="Notifications.close()">Ver ${productos.length - 5} más...</a>` : ''}
            </div>`);
        }

        if (items.length === 0) {
            content.innerHTML = `
                <div class="notifications-empty">
                    <i class="fas fa-check-circle"></i>
                    <p>Sin notificaciones pendientes</p>
                    <span>Todos los pedidos están al día y el stock está bien</span>
                </div>`;
        } else {
            content.innerHTML = items.join('<div class="notifications-divider"></div>');
        }
    },

    _updateBadge(count) {
        if (!this._badge) return;
        if (count > 0) {
            this._badge.textContent = count > 99 ? '99+' : count;
            this._badge.style.display = 'flex';
        } else {
            this._badge.style.display = 'none';
        }
    }
};

window.Notifications = Notifications;
