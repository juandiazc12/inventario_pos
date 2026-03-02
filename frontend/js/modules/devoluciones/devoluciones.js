// devoluciones.js  — Usa Modal.open({title, body, footer}) del sistema correcto
window.devoluciones_module = {
    devolucionActual: null,
    ventaActual: null,
    compraActual: null,
    productosDevolucion: [],

    async init() {
        this.setupEventListeners();
        await this.cargarDevoluciones();
        await this.cargarStats();
    },

    setupEventListeners() {
        document.getElementById('filtro-tipo')?.addEventListener('change', () => this.aplicarFiltros());
        document.getElementById('filtro-estado')?.addEventListener('change', () => this.aplicarFiltros());
        document.getElementById('filtro-motivo')?.addEventListener('change', () => this.aplicarFiltros());
        document.getElementById('filtro-busqueda')?.addEventListener('input', () => this.aplicarFiltros());
    },

    // ─── ESTADÍSTICAS ────────────────────────────────────────────────
    async cargarStats() {
        try {
            const stats = await API.get('/devoluciones/stats/resumen');
            document.getElementById('total-devuelto-mes').textContent = Utils.formatCurrency(stats.monto_total || 0);
            document.getElementById('total-devoluciones').textContent = stats.total_devoluciones || 0;
            document.getElementById('producto-mas-devuelto').textContent =
                stats.producto_mas_devuelto?.nombre || '-';
        } catch (err) {
            console.error('Error stats:', err);
        }
    },

    // ─── TABLA PRINCIPAL ─────────────────────────────────────────────
    async cargarDevoluciones(filtros = {}) {
        try {
            const params = new URLSearchParams(filtros);
            const devoluciones = await API.get(`/devoluciones?${params}`);
            this.renderTablaDevoluciones(devoluciones);
        } catch (err) {
            console.error('Error cargando devoluciones:', err);
            Toast.show('Error cargando devoluciones', 'error');
        }
    },

    renderTablaDevoluciones(devoluciones) {
        const tbody = document.querySelector('#tabla-devoluciones tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!devoluciones || devoluciones.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-muted);">
                <i class="fas fa-inbox" style="font-size:1.5rem;margin-bottom:0.5rem;display:block;opacity:0.4;"></i>
                No hay devoluciones registradas
            </td></tr>`;
            return;
        }

        devoluciones.forEach(d => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${d.codigo}</strong></td>
                <td>${this.getTipoBadge(d.tipo)}</td>
                <td>${d.referencia_nombre || 'N/A'}</td>
                <td>${Utils.formatDate(d.created_at)}</td>
                <td>${this.getMotivoBadge(d.motivo)}</td>
                <td><strong>${Utils.formatCurrency(d.total_devuelto)}</strong></td>
                <td>${this.getEstadoBadge(d.estado)}</td>
                <td>
                    <button class="btn btn-info btn-sm" title="Ver detalle"
                        onclick="window.devoluciones_module.verDetalle(${d.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${d.estado === 'pendiente' ? `
                    <button class="btn btn-secondary btn-sm" title="Revisar y aprobar/rechazar"
                        onclick="window.devoluciones_module.verDetalle(${d.id})">
                        <i class="fas fa-check-circle"></i> Revisar
                    </button>` : ''}
                </td>`;
            tbody.appendChild(tr);
        });
    },

    // ─── BADGES ──────────────────────────────────────────────────────
    getTipoBadge(tipo) {
        const m = { venta: ['primary-dim', 'primary', 'fa-shopping-cart', 'Venta'], compra: ['success-dim', 'success', 'fa-box', 'Compra'] };
        const t = m[tipo] || ['bg-hover', 'text-muted', 'fa-tag', tipo];
        return `<span style="background:var(--${t[0]});color:var(--${t[1]});padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;">
            <i class="fas ${t[2]}" style="margin-right:4px;"></i>${t[3]}</span>`;
    },

    getEstadoBadge(estado) {
        const m = {
            pendiente: 'badge badge-warning',
            aprobada: 'badge badge-success',
            rechazada: 'badge badge-danger'
        };
        const labels = { pendiente: '🔎 Revisión Pendiente', aprobada: '✅ Aprobada', rechazada: '❌ Rechazada' };
        return `<span class="${m[estado] || 'badge'}">${labels[estado] || estado}</span>`;
    },

    getMotivoBadge(motivo) {
        const m = {
            producto_defectuoso: 'Defectuoso', producto_equivocado: 'Equivocado',
            no_deseado: 'No deseado', exceso_de_pedido: 'Exceso', mal_estado: 'Mal estado', otro: 'Otro'
        };
        return m[motivo] || motivo;
    },

    // ─── FILTROS ─────────────────────────────────────────────────────
    aplicarFiltros() {
        const filtros = {};
        const tipo = document.getElementById('filtro-tipo').value;
        const estado = document.getElementById('filtro-estado').value;
        const motivo = document.getElementById('filtro-motivo').value;
        const busqueda = document.getElementById('filtro-busqueda').value;
        if (tipo) filtros.tipo = tipo;
        if (estado) filtros.estado = estado;
        if (motivo) filtros.motivo = motivo;
        if (busqueda) filtros.busqueda = busqueda;
        this.cargarDevoluciones(filtros);
    },

    limpiarFiltros() {
        ['filtro-tipo', 'filtro-estado', 'filtro-motivo', 'filtro-busqueda'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        this.cargarDevoluciones();
    },

    // ─── MODAL DEVOLUCIÓN DE VENTA ───────────────────────────────────
    mostrarModalDevolucionVenta() {
        this.ventaActual = null;
        this.productosDevolucion = [];

        Modal.open({
            title: '<i class="fas fa-shopping-cart" style="margin-right:8px;color:var(--primary);"></i> Nueva Devolución de Venta',
            size: 'lg',
            body: `
                <div class="form-group">
                    <label>Buscar Venta Original <span style="color:var(--danger);">*</span></label>
                    <div style="position:relative;">
                        <input type="text" class="form-control" id="dv-venta-search"
                            placeholder="Número de ticket, código de producto o nombre del cliente..."
                            oninput="window.devoluciones_module.buscarVentasModal(this.value)">
                        <div id="dv-venta-results" style="
                            position:absolute; left:0; right:0; top:calc(100% + 4px);
                            background:var(--bg-card); border:1px solid var(--border);
                            border-radius:var(--radius-sm); z-index:9999; max-height:200px; overflow-y:auto;
                        "></div>
                    </div>
                </div>
                <div id="dv-venta-info" style="display:none; background:var(--bg-root); border-radius:var(--radius-sm); padding:1rem; margin-top:0.5rem;">
                    <div id="dv-venta-detalles"></div>
                    <div id="dv-venta-productos" style="margin-top:0.75rem;"></div>
                </div>
                <div id="dv-venta-form" style="display:none; margin-top:1rem;">
                    <div class="grid-2" style="gap:0.75rem; margin-bottom:0.75rem;">
                        <div class="form-group" style="margin-bottom:0;">
                            <label>Motivo <span style="color:var(--danger);">*</span></label>
                            <select class="form-control" id="dv-motivo">
                                <option value="">Seleccionar...</option>
                                <option value="producto_defectuoso">Producto Defectuoso</option>
                                <option value="producto_equivocado">Producto Equivocado</option>
                                <option value="no_deseado">No Deseado</option>
                                <option value="exceso_de_pedido">Exceso de Pedido</option>
                                <option value="mal_estado">Mal Estado</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin-bottom:0;">
                            <label>Tipo de Reembolso</label>
                            <select class="form-control" id="dv-reembolso">
                                <option value="efectivo">Efectivo</option>
                                <option value="credito">Crédito</option>
                                <option value="cambio">Cambio por Producto</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Detalle adicional</label>
                        <textarea class="form-control" id="dv-detalle" rows="2"
                            placeholder="Describa el motivo detalladamente..."></textarea>
                    </div>
                    <div class="form-group" style="display:flex; align-items:center; gap:0.5rem;">
                        <input type="checkbox" id="dv-afecta-inventario" checked style="width:16px;height:16px;">
                        <label for="dv-afecta-inventario" style="margin:0;cursor:pointer;">Devolver stock al inventario</label>
                    </div>
                    <div class="form-group">
                        <label>Notas</label>
                        <textarea class="form-control" id="dv-notas" rows="2" placeholder="Notas adicionales..."></textarea>
                    </div>
                    <div style="background:var(--bg-root); border-radius:var(--radius-sm); padding:0.75rem; text-align:right;">
                        <strong>Total a devolver: </strong>
                        <span id="dv-total" style="color:var(--primary); font-size:1.1rem; font-weight:700;">$0</span>
                    </div>
                </div>`,
            footer: `
                <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
                <button class="btn btn-primary" onclick="window.devoluciones_module.crearDevolucionVenta()">
                    <i class="fas fa-save"></i> Crear Devolución
                </button>`
        });
    },

    async buscarVentasModal(q) {
        const results = document.getElementById('dv-venta-results');
        if (!results) return;
        if (!q || q.length < 1) { results.innerHTML = ''; return; }
        try {
            const ventas = await API.get(`/devoluciones/buscar-venta?q=${encodeURIComponent(q)}`);
            if (!ventas || ventas.length === 0) {
                results.innerHTML = `<div style="padding:0.75rem; color:var(--text-muted); font-size:13px;">No se encontraron ventas</div>`;
                return;
            }
            results.innerHTML = ventas.map(v => `
                <div onclick="window.devoluciones_module.seleccionarVentaModal('${v.ticket_numero}')"
                    style="padding:0.75rem 1rem; cursor:pointer; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;"
                    onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
                    <div>
                        <strong style="font-size:13px;">Ticket: ${v.ticket_numero}</strong>
                        <div style="font-size:11px; color:var(--text-muted);">
                            Cliente: ${v.cliente_nombre} · ${Utils.formatDate(v.fecha)}
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:11px; color:var(--text-muted);">${v.total_productos} producto(s)</div>
                        <strong style="font-size:13px;">${Utils.formatCurrency(v.total)}</strong>
                    </div>
                </div>`).join('');
        } catch (err) {
            console.error('Error buscando ventas:', err);
        }
    },

    async seleccionarVentaModal(ticket) {
        try {
            const productos = await API.get(`/devoluciones/detalle-ticket/${ticket}`);
            if (!productos || productos.length === 0) {
                Toast.show('No se encontraron productos para ese ticket', 'error');
                return;
            }
            this.ventaActual = { ticket, productos };
            const results = document.getElementById('dv-venta-results');
            if (results) results.innerHTML = '';
            const search = document.getElementById('dv-venta-search');
            if (search) search.value = ticket;

            const info = document.getElementById('dv-venta-info');
            const detalles = document.getElementById('dv-venta-detalles');
            const productosDiv = document.getElementById('dv-venta-productos');
            const form = document.getElementById('dv-venta-form');

            if (info) info.style.display = 'block';
            if (form) form.style.display = 'block';

            detalles.innerHTML = `
                <div style="display:flex; gap:1.5rem; flex-wrap:wrap; font-size:13px;">
                    <div><strong>Ticket:</strong> ${ticket}</div>
                    <div><strong>Cliente:</strong> ${productos[0].cliente_nombre || 'Sin cliente'}</div>
                    <div><strong>Fecha:</strong> ${Utils.formatDate(productos[0].fecha)}</div>
                </div>`;

            this.productosDevolucion = [];
            productosDiv.innerHTML = `<label style="font-size:13px; font-weight:600; margin-bottom:0.5rem; display:block;">Productos a devolver:</label>` +
                productos.map((p, i) => {
                    this.productosDevolucion.push({
                        producto_id: p.producto_id,
                        precio_unitario: p.precio_venta,
                        cantidad_maxima: p.cantidad,
                        cantidad_devolver: 0
                    });
                    return `
                    <div style="display:flex; align-items:center; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid var(--border);">
                        <div>
                            <strong style="font-size:13px;">${p.producto_nombre}</strong>
                            <div style="font-size:11px;color:var(--text-muted);">Vendido: ${p.cantidad} uds · $${p.precio_venta}</div>
                        </div>
                        <div style="display:flex; align-items:center; gap:0.5rem;">
                            <label style="font-size:12px; margin:0;">Devolver:</label>
                            <input type="number" class="form-control" style="width:70px;" min="0" max="${p.cantidad}" value="0"
                                oninput="window.devoluciones_module.actualizarCantidadVenta(${i}, this.value)">
                        </div>
                    </div>`;
                }).join('');
        } catch (err) {
            Toast.show('Error cargando la venta', 'error');
        }
    },

    actualizarCantidadVenta(index, val) {
        const cant = Math.min(parseInt(val) || 0, this.productosDevolucion[index].cantidad_maxima);
        this.productosDevolucion[index].cantidad_devolver = cant;
        const total = this.productosDevolucion.reduce((s, p) => s + p.cantidad_devolver * p.precio_unitario, 0);
        const el = document.getElementById('dv-total');
        if (el) el.textContent = Utils.formatCurrency(total);
    },

    async crearDevolucionVenta() {
        if (!this.ventaActual) { Toast.show('Seleccione una venta primero', 'error'); return; }
        const motivo = document.getElementById('dv-motivo')?.value;
        if (!motivo) { Toast.show('Seleccione un motivo', 'error'); return; }
        const productos = this.productosDevolucion.filter(p => p.cantidad_devolver > 0)
            .map(p => ({ producto_id: p.producto_id, cantidad: p.cantidad_devolver }));
        if (productos.length === 0) { Toast.show('Seleccione al menos un producto para devolver', 'error'); return; }

        try {
            await API.post('/devoluciones/venta', {
                ticket_numero: this.ventaActual.ticket,
                productos,
                motivo,
                motivo_detalle: document.getElementById('dv-detalle')?.value,
                tipo_reembolso: document.getElementById('dv-reembolso')?.value || 'efectivo',
                afecta_inventario: document.getElementById('dv-afecta-inventario')?.checked,
                notas: document.getElementById('dv-notas')?.value
            });
            Toast.show('Devolución de venta creada correctamente', 'success');
            Modal.close();
            this.cargarDevoluciones();
            this.cargarStats();
        } catch (err) {
            Toast.show(err.message || 'Error creando devolución', 'error');
        }
    },

    // ─── MODAL DEVOLUCIÓN DE COMPRA ──────────────────────────────────
    mostrarModalDevolucionCompra() {
        this.compraActual = null;
        this.productosDevolucion = [];

        Modal.open({
            title: '<i class="fas fa-box" style="margin-right:8px;color:var(--success);"></i> Nueva Devolución de Compra',
            size: 'lg',
            body: `
                <div class="form-group">
                    <label>Buscar Compra Original <span style="color:var(--danger);">*</span></label>
                    <div style="position:relative;">
                        <input type="text" class="form-control" id="dc-compra-search"
                            placeholder="ID de compra, código de producto o proveedor..."
                            oninput="window.devoluciones_module.buscarComprasModal(this.value)">
                        <div id="dc-compra-results" style="
                            position:absolute; left:0; right:0; top:calc(100% + 4px);
                            background:var(--bg-card); border:1px solid var(--border);
                            border-radius:var(--radius-sm); z-index:9999; max-height:200px; overflow-y:auto;
                        "></div>
                    </div>
                </div>
                <div id="dc-compra-info" style="display:none; background:var(--bg-root); border-radius:var(--radius-sm); padding:1rem; margin-top:0.5rem;">
                    <div id="dc-compra-detalles"></div>
                    <div id="dc-compra-productos" style="margin-top:0.75rem;"></div>
                </div>
                <div id="dc-compra-form" style="display:none; margin-top:1rem;">
                    <div class="grid-2" style="gap:0.75rem; margin-bottom:0.75rem;">
                        <div class="form-group" style="margin-bottom:0;">
                            <label>Motivo <span style="color:var(--danger);">*</span></label>
                            <select class="form-control" id="dc-motivo">
                                <option value="">Seleccionar...</option>
                                <option value="producto_defectuoso">Producto Defectuoso</option>
                                <option value="producto_equivocado">Producto Equivocado</option>
                                <option value="exceso_de_pedido">Exceso de Pedido</option>
                                <option value="mal_estado">Mal Estado</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin-bottom:0;">
                            <label>Tipo de Reembolso</label>
                            <select class="form-control" id="dc-reembolso">
                                <option value="efectivo">Efectivo</option>
                                <option value="credito">Crédito con Proveedor</option>
                                <option value="cambio">Cambio por Producto</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Detalle adicional</label>
                        <textarea class="form-control" id="dc-detalle" rows="2"
                            placeholder="Describa el motivo detalladamente..."></textarea>
                    </div>
                    <div class="form-group" style="display:flex; align-items:center; gap:0.5rem;">
                        <input type="checkbox" id="dc-afecta-inventario" checked style="width:16px;height:16px;">
                        <label for="dc-afecta-inventario" style="margin:0;cursor:pointer;">Descontar del inventario</label>
                    </div>
                    <div class="form-group">
                        <label>Notas</label>
                        <textarea class="form-control" id="dc-notas" rows="2" placeholder="Notas adicionales..."></textarea>
                    </div>
                    <div style="background:var(--bg-root); border-radius:var(--radius-sm); padding:0.75rem; text-align:right;">
                        <strong>Total a devolver: </strong>
                        <span id="dc-total" style="color:var(--success); font-size:1.1rem; font-weight:700;">$0</span>
                    </div>
                </div>`,
            footer: `
                <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
                <button class="btn btn-primary" onclick="window.devoluciones_module.crearDevolucionCompra()">
                    <i class="fas fa-save"></i> Crear Devolución
                </button>`
        });
    },

    async buscarComprasModal(q) {
        const results = document.getElementById('dc-compra-results');
        if (!results) return;
        if (!q || q.length < 1) { results.innerHTML = ''; return; }
        try {
            const compras = await API.get(`/devoluciones/buscar-compra?q=${encodeURIComponent(q)}`);
            if (!compras || compras.length === 0) {
                results.innerHTML = `<div style="padding:0.75rem; color:var(--text-muted); font-size:13px;">No se encontraron compras</div>`;
                return;
            }
            results.innerHTML = compras.map(c => `
                <div onclick="window.devoluciones_module.seleccionarCompraModal(${c.id})"
                    style="padding:0.75rem 1rem; cursor:pointer; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;"
                    onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
                    <div>
                        <strong style="font-size:13px;">Compra #${c.id} — ${c.producto_nombre}</strong>
                        <div style="font-size:11px; color:var(--text-muted);">
                            Proveedor: ${c.proveedor_nombre} · ${Utils.formatDate(c.fecha)}
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:11px; color:var(--text-muted);">${c.cantidad} uds.</div>
                        <strong style="font-size:13px;">${Utils.formatCurrency(c.total)}</strong>
                    </div>
                </div>`).join('');
        } catch (err) {
            console.error('Error buscando compras:', err);
        }
    },

    async seleccionarCompraModal(id) {
        try {
            const compra = await API.get(`/compras/${id}`);
            this.compraActual = compra;
            const results = document.getElementById('dc-compra-results');
            if (results) results.innerHTML = '';
            const search = document.getElementById('dc-compra-search');
            if (search) search.value = `ID: ${id}`;

            document.getElementById('dc-compra-info').style.display = 'block';
            document.getElementById('dc-compra-form').style.display = 'block';

            document.getElementById('dc-compra-detalles').innerHTML = `
                <div style="display:flex; gap:1.5rem; flex-wrap:wrap; font-size:13px;">
                    <div><strong>ID:</strong> ${compra.id}</div>
                    <div><strong>Proveedor:</strong> ${compra.proveedor_nombre || 'Sin proveedor'}</div>
                    <div><strong>Fecha:</strong> ${Utils.formatDate(compra.fecha)}</div>
                </div>`;

            this.productosDevolucion = [{
                producto_id: compra.producto_id,
                precio_unitario: compra.precio_compra,
                cantidad_maxima: compra.cantidad,
                cantidad_devolver: 0
            }];

            document.getElementById('dc-compra-productos').innerHTML = `
                <label style="font-size:13px; font-weight:600; margin-bottom:0.5rem; display:block;">Producto a devolver:</label>
                <div style="display:flex; align-items:center; justify-content:space-between; padding:0.5rem 0;">
                    <div>
                        <strong style="font-size:13px;">${compra.producto_nombre}</strong>
                        <div style="font-size:11px;color:var(--text-muted);">Comprado: ${compra.cantidad} uds · $${compra.precio_compra}</div>
                    </div>
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        <label style="font-size:12px; margin:0;">Devolver:</label>
                        <input type="number" class="form-control" style="width:70px;" min="0" max="${compra.cantidad}" value="0"
                            oninput="window.devoluciones_module.actualizarCantidadCompra(this.value)">
                    </div>
                </div>`;
        } catch (err) {
            Toast.show('Error cargando información de la compra', 'error');
        }
    },

    actualizarCantidadCompra(val) {
        if (!this.productosDevolucion[0]) return;
        const cant = Math.min(parseInt(val) || 0, this.productosDevolucion[0].cantidad_maxima);
        this.productosDevolucion[0].cantidad_devolver = cant;
        const total = cant * this.productosDevolucion[0].precio_unitario;
        const el = document.getElementById('dc-total');
        if (el) el.textContent = Utils.formatCurrency(total);
    },

    async crearDevolucionCompra() {
        if (!this.compraActual) { Toast.show('Seleccione una compra primero', 'error'); return; }
        const motivo = document.getElementById('dc-motivo')?.value;
        if (!motivo) { Toast.show('Seleccione un motivo', 'error'); return; }
        const productos = this.productosDevolucion.filter(p => p.cantidad_devolver > 0)
            .map(p => ({ producto_id: p.producto_id, cantidad: p.cantidad_devolver }));
        if (productos.length === 0) { Toast.show('Seleccione al menos un producto para devolver', 'error'); return; }

        try {
            await API.post('/devoluciones/compra', {
                referencia_id: this.compraActual.id,
                productos,
                motivo,
                motivo_detalle: document.getElementById('dc-detalle')?.value,
                tipo_reembolso: document.getElementById('dc-reembolso')?.value || 'efectivo',
                afecta_inventario: document.getElementById('dc-afecta-inventario')?.checked,
                notas: document.getElementById('dc-notas')?.value
            });
            Toast.show('Devolución de compra creada correctamente', 'success');
            Modal.close();
            this.cargarDevoluciones();
            this.cargarStats();
        } catch (err) {
            Toast.show(err.message || 'Error creando devolución', 'error');
        }
    },

    // ─── MODAL DETALLE / APROBAR / RECHAZAR ──────────────────────────
    async verDetalle(id) {
        try {
            const dev = await API.get(`/devoluciones/${id}`);
            this.devolucionActual = dev;

            const productosHtml = dev.detalle.map(item => `
                <tr>
                    <td>${item.producto_nombre}</td>
                    <td style="text-align:center;">${item.cantidad}</td>
                    <td style="text-align:right;">${Utils.formatCurrency(item.precio_unitario)}</td>
                    <td style="text-align:right;"><strong>${Utils.formatCurrency(item.subtotal)}</strong></td>
                </tr>`).join('');

            const botonesAccion = dev.estado === 'pendiente' ? `
                <button class="btn btn-success" onclick="window.devoluciones_module.aprobarDevolucion()">
                    <i class="fas fa-check"></i> Aprobar
                </button>
                <button class="btn btn-danger" onclick="window.devoluciones_module.rechazarDevolucion()">
                    <i class="fas fa-times"></i> Rechazar
                </button>` : '';

            Modal.open({
                title: `<i class="fas fa-undo-alt" style="margin-right:8px;"></i> Detalle: ${dev.codigo}`,
                size: 'lg',
                body: `
                    <div class="grid-2" style="gap:0.75rem; margin-bottom:1rem;">
                        <div style="background:var(--bg-root);padding:0.75rem;border-radius:var(--radius-sm);">
                            <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px;">Tipo</div>
                            <div>${this.getTipoBadge(dev.tipo)}</div>
                        </div>
                        <div style="background:var(--bg-root);padding:0.75rem;border-radius:var(--radius-sm);">
                            <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px;">Estado</div>
                            <div>${this.getEstadoBadge(dev.estado)}</div>
                        </div>
                        <div style="background:var(--bg-root);padding:0.75rem;border-radius:var(--radius-sm);">
                            <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px;">Referencia</div>
                            <strong>${dev.referencia?.cliente_nombre || dev.referencia?.proveedor_nombre || 'N/A'}</strong>
                        </div>
                        <div style="background:var(--bg-root);padding:0.75rem;border-radius:var(--radius-sm);">
                            <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px;">Motivo</div>
                            <strong>${this.getMotivoBadge(dev.motivo)}</strong>
                        </div>
                    </div>
                    <h4 style="font-size:13px;font-weight:700;margin-bottom:0.5rem;">Productos</h4>
                    <table class="data-table" style="margin-bottom:1rem;">
                        <thead><tr><th>Producto</th><th style="text-align:center;">Cant.</th>
                        <th style="text-align:right;">Precio</th><th style="text-align:right;">Subtotal</th></tr></thead>
                        <tbody>${productosHtml}</tbody>
                    </table>
                    <div style="text-align:right; background:var(--bg-root); padding:0.75rem; border-radius:var(--radius-sm);">
                        <strong>Total Devuelto: </strong>
                        <span style="font-size:1.2rem; font-weight:700; color:var(--primary);">
                            ${Utils.formatCurrency(dev.total_devuelto)}
                        </span>
                    </div>
                    ${dev.notas ? `<p style="margin-top:0.75rem;font-size:13px;color:var(--text-muted);">
                        <strong>Notas:</strong> ${dev.notas}</p>` : ''}`,
                footer: `
                    <button class="btn btn-secondary" onclick="Modal.close()">Cerrar</button>
                    ${botonesAccion}`
            });
        } catch (err) {
            Toast.show('Error obteniendo detalle', 'error');
        }
    },

    async aprobarDevolucion() {
        console.log('Intentando aprobar devolución:', this.devolucionActual);
        if (!this.devolucionActual) {
            Toast.show('Error: No hay una devolución seleccionada', 'error');
            return;
        }

        Swal.fire({
            title: '¿Aprobar devolución?',
            text: 'Esta acción afectará el inventario sumando o prestando el stock correspondientemente.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, aprobar',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await API.put(`/devoluciones/${this.devolucionActual.id}/aprobar`);
                    Toast.show('Devolución aprobada correctamente', 'success');
                    Modal.close();
                    await this.cargarDevoluciones();
                    await this.cargarStats();
                } catch (err) {
                    console.error('Error al aprobar:', err);
                    Toast.show(err.message || 'Error aprobando devolución', 'error');
                }
            }
        });
    },

    async rechazarDevolucion() {
        if (!this.devolucionActual) return;

        Swal.fire({
            title: 'Rechazar devolución',
            input: 'text',
            inputLabel: 'Motivo del rechazo',
            inputPlaceholder: 'Escriba el motivo...',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Rechazar',
            cancelButtonText: 'Cancelar',
            inputValidator: (value) => {
                if (!value) {
                    return 'Debe ingresar un motivo para rechazar';
                }
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await API.put(`/devoluciones/${this.devolucionActual.id}/rechazar`, { motivo: result.value });
                    Toast.show('Devolución rechazada', 'success');
                    Modal.close();
                    this.cargarDevoluciones();
                    this.cargarStats();
                } catch (err) {
                    Toast.show(err.message || 'Error rechazando devolución', 'error');
                }
            }
        });
    }
};
