window.traslados_module = {
    trasladoActual: null,
    ubicaciones: [],
    productosTraslado: [],
    rolActual: null,

    reproducirTono(tipo) {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            if (tipo === 'solicitud') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.2);
                gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
                osc.start();
                osc.stop(ctx.currentTime + 0.2);
            } else if (tipo === 'aprobacion') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, ctx.currentTime);
                osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
                osc.frequency.setValueAtTime(800, ctx.currentTime + 0.2);
                gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.2);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
                osc.start();
                osc.stop(ctx.currentTime + 0.4);
            }
        } catch (e) { console.error('Error reproduciendo tono:', e); }
    },

    async init() {
        await this.detectarRolYMostrarVista();
    },

    // ─── ROL Y VISTAS ────────────────────────────────────────────────
    async detectarRolYMostrarVista() {
        const user = AppState.get('user');
        const esAdmin = user?.rol === 'admin' || user?.rol === 'supervisor' || user?.rol === 'operador';

        // Cargar ubicaciones para los selects
        try {
            this.ubicaciones = await API.get('/traslados/ubicaciones');
        } catch (e) {
            this.ubicaciones = [];
        }

        // Mostrar botón de nueva solicitud SOLO AL ADMIN y la vista local (Mis solicitudes) a todos.
        if (user?.rol === 'admin') {
            document.getElementById('btn-nuevo-traslado').style.display = 'inline-flex';
        } else {
            document.getElementById('btn-nuevo-traslado').style.display = 'none';
        }
        document.getElementById('vista-local').style.display = 'block';
        await this.cargarTrasladosLocal();

        if (esAdmin) {
            this.rolActual = 'bodega';
            document.getElementById('vista-bodega').style.display = 'block';
            await this.cargarTrasladosBodega();
        } else {
            this.rolActual = 'local';
        }
    },

    // ─── CARGA DE DATOS ──────────────────────────────────────────────
    async cargarTrasladosLocal() {
        try {
            const traslados = await API.get('/traslados');
            this.renderTablaLocal(traslados);
        } catch (err) {
            Toast.show('Error cargando traslados', 'error');
        }
    },

    async cargarTrasladosBodega() {
        try {
            const todos = await API.get('/traslados');
            const pendientes = todos.filter(t => t.estado === 'pendiente');
            const historial = todos.filter(t => t.estado !== 'pendiente');
            this.renderTablaBodegaPendiente(pendientes);
            this.renderTablaBodegaHistorial(historial);
            // Contador badge
            const contador = document.getElementById('contador-pendientes');
            if (contador) {
                contador.textContent = pendientes.length;
                contador.style.display = pendientes.length > 0 ? 'inline-flex' : 'none';
            }
        } catch (err) {
            Toast.show('Error cargando traslados', 'error');
        }
    },

    // ─── TABLAS ──────────────────────────────────────────────────────
    renderTablaLocal(traslados) {
        const tbody = document.querySelector('#tabla-traslados-local tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!traslados || traslados.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);">
                <i class="fas fa-inbox" style="font-size:1.5rem;opacity:0.4;display:block;margin-bottom:0.5rem;"></i>
                No tienes solicitudes de traslado
            </td></tr>`;
            return;
        }
        traslados.forEach(t => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${t.codigo}</strong></td>
                <td>${t.ubicacion_origen_nombre}</td>
                <td>${t.ubicacion_destino_nombre}</td>
                <td>${Utils.formatDate(t.fecha_solicitud)}</td>
                <td>${this.getEstadoBadge(t.estado)}</td>
                <td>
                    <button class="btn btn-info btn-sm" title="Ver detalle"
                        onclick="window.traslados_module.verDetalle(${t.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${t.estado === 'pendiente' ? `
                    <button class="btn btn-danger btn-sm" title="Cancelar"
                        onclick="window.traslados_module.cancelarTraslado(${t.id})">
                        <i class="fas fa-times"></i>
                    </button>` : ''}
                    ${t.estado === 'despachado' ? `
                    <button class="btn btn-success btn-sm" title="Recibir pedido"
                        onclick="window.traslados_module.verDetalle(${t.id})">
                        <i class="fas fa-download"></i> Recibir
                    </button>` : ''}
                </td>`;
            tbody.appendChild(tr);
        });
    },

    renderTablaBodegaPendiente(traslados) {
        const tbody = document.querySelector('#tabla-traslados-bodega tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!traslados || traslados.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);">
                No hay solicitudes pendientes
            </td></tr>`;
            return;
        }
        traslados.forEach(t => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${t.codigo}</strong></td>
                <td>${t.solicitado_por_nombre || 'N/A'}</td>
                <td>${t.ubicacion_origen_nombre}</td>
                <td>${t.ubicacion_destino_nombre}</td>
                <td>${this.tiempoTranscurrido(t.fecha_solicitud)}</td>
                <td>
                    <button class="btn btn-info btn-sm" title="Ver detalle"
                        onclick="window.traslados_module.verDetalle(${t.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-primary btn-sm" title="Despachar"
                        onclick="window.traslados_module.mostrarModalDespacho(${t.id})">
                        <i class="fas fa-truck"></i> Despachar
                    </button>
                </td>`;
            tbody.appendChild(tr);
        });
    },

    renderTablaBodegaHistorial(traslados) {
        const tbody = document.querySelector('#tabla-historial-bodega tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!traslados || traslados.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:var(--text-muted);">
                No hay historial
            </td></tr>`;
            return;
        }
        traslados.forEach(t => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${t.codigo}</strong></td>
                <td>${t.solicitado_por_nombre || 'N/A'}</td>
                <td>${t.ubicacion_origen_nombre}</td>
                <td>${t.ubicacion_destino_nombre}</td>
                <td>${this.getEstadoBadge(t.estado)}</td>
                <td>${Utils.formatDate(t.fecha_solicitud)}</td>`;
            tbody.appendChild(tr);
        });
    },

    // ─── HELPERS ─────────────────────────────────────────────────────
    getEstadoBadge(estado) {
        const m = {
            pendiente: 'badge badge-warning',
            despachado: 'badge badge-info',
            recibido: 'badge badge-success',
            cancelado: 'badge badge-danger'
        };
        const labels = { pendiente: '🔎 Revisión Pendiente', aprobada: '✅ Aprobada', rechazada: '❌ Rechazada', despachado: '🚚 En Camino (Despachado)', recibido: '✅ Recibido', cancelado: '❌ Cancelado' };
        return `<span class="${m[estado] || 'badge'}">${labels[estado] || estado}</span>`;
    },

    tiempoTranscurrido(fecha) {
        const diff = Date.now() - new Date(fecha).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}min`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h`;
        return `${Math.floor(hrs / 24)}d`;
    },

    getUbicacionesOptions(excluirId = null) {
        return this.ubicaciones
            .filter(u => String(u.id) !== String(excluirId))
            .map(u => `<option value="${u.id}">${u.nombre}</option>`)
            .join('');
    },

    // ─── MODAL NUEVA SOLICITUD ───────────────────────────────────────
    mostrarModalNuevoTraslado() {
        if (AppState.get('user')?.rol !== 'admin') {
            Toast.show('Solo el administrador puede hacer solicitudes a bodega', 'error');
            return;
        }
        this.productosTraslado = [];
        const optsOrigen = this.ubicaciones.map(u => `<option value="${u.id}">${u.nombre}</option>`).join('');

        Modal.open({
            title: '<i class="fas fa-exchange-alt" style="margin-right:8px;color:var(--primary);"></i> Nueva Solicitud de Traslado',
            size: 'lg',
            body: `
                <div class="grid-2" style="gap:0.75rem; margin-bottom:0.75rem;">
                    <div class="form-group" style="margin-bottom:0;">
                        <label>Ubicación Origen <span style="color:var(--danger);">*</span></label>
                        <select class="form-control" id="tr-origen" onchange="window.traslados_module.actualizarOpcionesDestino()">
                            <option value="">Seleccionar...</option>
                            ${optsOrigen}
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom:0;">
                        <label>Ubicación Destino <span style="color:var(--danger);">*</span></label>
                        <select class="form-control" id="tr-destino">
                            <option value="">Seleccionar...</option>
                            ${optsOrigen}
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Notas</label>
                    <textarea class="form-control" id="tr-notas" rows="2"
                        placeholder="Notas adicionales sobre el traslado..."></textarea>
                </div>
                <div class="form-group">
                    <label>Productos a Solicitar <span style="color:var(--danger);">*</span></label>
                    <div style="position:relative; margin-bottom:0.5rem;">
                        <input type="text" class="form-control" id="tr-producto-search"
                            placeholder="Buscar producto por nombre o código..."
                            oninput="window.traslados_module.buscarProductosModal(this.value)">
                        <div id="tr-producto-results" style="
                            position:absolute; left:0; right:0; top:calc(100% + 4px);
                            background:var(--bg-card); border:1px solid var(--border);
                            border-radius:var(--radius-sm); z-index:9999; max-height:180px; overflow-y:auto;
                        "></div>
                    </div>
                    <div id="tr-productos-lista" style="margin-top:0.5rem;"></div>
                </div>`,
            footer: `
                <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
                <button class="btn btn-primary" onclick="window.traslados_module.crearSolicitud()">
                    <i class="fas fa-paper-plane"></i> Enviar Solicitud
                </button>`
        });
    },

    actualizarOpcionesDestino() {
        const origenId = document.getElementById('tr-origen')?.value;
        const destino = document.getElementById('tr-destino');
        if (!destino) return;
        destino.innerHTML = `<option value="">Seleccionar...</option>` + this.getUbicacionesOptions(origenId);
    },

    async buscarProductosModal(q) {
        const results = document.getElementById('tr-producto-results');
        if (!results) return;
        if (!q || q.length < 1) { results.innerHTML = ''; return; }
        try {
            const prods = await API.get(`/traslados/buscar-productos?q=${encodeURIComponent(q)}`);
            if (!prods || prods.length === 0) {
                results.innerHTML = `<div style="padding:0.75rem;color:var(--text-muted);font-size:13px;">No se encontraron productos</div>`;
                return;
            }
            results.innerHTML = prods.map(p => `
                <div onclick="window.traslados_module.agregarProductoTraslado(${JSON.stringify(p).replace(/"/g, '&quot;')})"
                    style="padding:0.75rem 1rem; cursor:pointer; border-bottom:1px solid var(--border); display:flex; justify-content:space-between;"
                    onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
                    <div>
                        <strong style="font-size:13px;">${p.nombre}</strong>
                        <div style="font-size:11px;color:var(--text-muted);">Código: ${p.codigo}</div>
                    </div>
                    <div style="font-size:12px;color:var(--text-muted);">Stock: ${p.stock}</div>
                </div>`).join('');
        } catch (err) {
            console.error(err);
        }
    },

    agregarProductoTraslado(producto) {
        const results = document.getElementById('tr-producto-results');
        const search = document.getElementById('tr-producto-search');
        if (results) results.innerHTML = '';
        if (search) search.value = '';

        const existe = this.productosTraslado.find(p => p.id === producto.id);
        if (existe) { Toast.show('Este producto ya está en la lista', 'warning'); return; }

        this.productosTraslado.push({ ...producto, cantidad_solicitada: 1 });
        this.renderProductosTraslado();
    },

    renderProductosTraslado() {
        const lista = document.getElementById('tr-productos-lista');
        if (!lista) return;
        if (this.productosTraslado.length === 0) {
            lista.innerHTML = '';
            return;
        }
        lista.innerHTML = this.productosTraslado.map((p, i) => `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:0.5rem; background:var(--bg-root); border-radius:var(--radius-sm); margin-bottom:0.4rem;">
                <div>
                    <strong style="font-size:13px;">${p.nombre}</strong>
                    <div style="font-size:11px;color:var(--text-muted);">Stock disponible: ${p.stock}</div>
                </div>
                <div style="display:flex; align-items:center; gap:0.5rem;">
                    <input type="number" class="form-control" style="width:80px;" min="1" max="${p.stock}"
                        value="${p.cantidad_solicitada}"
                        oninput="window.traslados_module.actualizarCantidadTraslado(${i}, this.value)">
                    <button class="btn btn-danger btn-sm" onclick="window.traslados_module.quitarProductoTraslado(${i})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>`).join('');
    },

    actualizarCantidadTraslado(i, val) {
        const cant = Math.max(1, Math.min(parseInt(val) || 1, this.productosTraslado[i].stock));
        this.productosTraslado[i].cantidad_solicitada = cant;
    },

    quitarProductoTraslado(i) {
        this.productosTraslado.splice(i, 1);
        this.renderProductosTraslado();
    },

    async crearSolicitud() {
        const origen = document.getElementById('tr-origen')?.value;
        const destino = document.getElementById('tr-destino')?.value;
        if (!origen) { Toast.show('Seleccione la ubicación de origen', 'error'); return; }
        if (!destino) { Toast.show('Seleccione la ubicación de destino', 'error'); return; }
        if (origen === destino) { Toast.show('Origen y destino deben ser diferentes', 'error'); return; }
        if (this.productosTraslado.length === 0) { Toast.show('Agregue al menos un producto', 'error'); return; }

        const productos = this.productosTraslado.map(p => ({
            producto_id: p.id,
            cantidad_solicitada: p.cantidad_solicitada
        }));

        try {
            await API.post('/traslados', {
                ubicacion_origen_id: parseInt(origen),
                ubicacion_destino_id: parseInt(destino),
                notas: document.getElementById('tr-notas')?.value,
                productos
            });
            Toast.show('Solicitud de traslado creada', 'success');
            this.reproducirTono('solicitud');
            Modal.close();
            this.cargarTrasladosLocal();
        } catch (err) {
            Toast.show(err.message || 'Error creando solicitud', 'error');
        }
    },

    // ─── MODAL DESPACHO ──────────────────────────────────────────────
    async mostrarModalDespacho(id) {
        try {
            const traslado = await API.get(`/traslados/${id}`);
            this.trasladoActual = traslado;

            const productosHtml = traslado.detalle.map(item => `
                <div style="display:flex; align-items:center; justify-content:space-between; padding:0.5rem; background:var(--bg-root); border-radius:var(--radius-sm); margin-bottom:0.4rem;">
                    <div>
                        <strong style="font-size:13px;">${item.producto_nombre}</strong>
                        <div style="font-size:11px;color:var(--text-muted);">Solicitado: ${item.cantidad_solicitada} uds.</div>
                    </div>
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        <label style="font-size:12px;margin:0;">Enviar:</label>
                        <input type="number" class="form-control" style="width:80px;" min="0"
                            max="${item.cantidad_solicitada}" value="${item.cantidad_solicitada}"
                            id="despachar-cant-${item.producto_id}">
                    </div>
                </div>`).join('');

            Modal.open({
                title: `<i class="fas fa-truck" style="margin-right:8px;color:var(--primary);"></i> Despachar: ${traslado.codigo}`,
                size: 'lg',
                body: `
                    <div class="grid-2" style="gap:0.5rem; margin-bottom:1rem; font-size:13px;">
                        <div style="background:var(--bg-root); padding:0.5rem; border-radius:var(--radius-sm);">
                            <div style="font-size:11px;color:var(--text-muted);">Origen</div>
                            <strong>${traslado.ubicacion_origen_nombre}</strong>
                        </div>
                        <div style="background:var(--bg-root); padding:0.5rem; border-radius:var(--radius-sm);">
                            <div style="font-size:11px;color:var(--text-muted);">Destino</div>
                            <strong>${traslado.ubicacion_destino_nombre}</strong>
                        </div>
                    </div>
                    <label style="font-size:13px;font-weight:700;margin-bottom:0.5rem;display:block;">
                        Confirmar cantidades a enviar:
                    </label>
                    ${productosHtml}`,
                footer: `
                    <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
                    <button class="btn btn-primary" onclick="window.traslados_module.despachar()">
                        <i class="fas fa-truck"></i> Despachar
                    </button>`
            });
        } catch (err) {
            Toast.show('Error cargando traslado', 'error');
        }
    },

    async despachar() {
        if (!this.trasladoActual) return;
        const productos = this.trasladoActual.detalle.map(item => ({
            producto_id: item.producto_id,
            cantidad_enviada: parseInt(document.getElementById(`despachar-cant-${item.producto_id}`)?.value) || 0
        }));

        try {
            await API.put(`/traslados/${this.trasladoActual.id}/despachar`, { productos });
            Toast.show('Traslado despachado correctamente', 'success');
            this.reproducirTono('aprobacion');
            Modal.close();
            this.cargarTrasladosBodega();
        } catch (err) {
            Toast.show(err.message || 'Error despachando', 'error');
        }
    },

    // ─── MODAL DETALLE ───────────────────────────────────────────────
    async verDetalle(id) {
        try {
            const t = await API.get(`/traslados/${id}`);
            this.trasladoActual = t;
            const productosHtml = t.detalle.map(item => `
                <tr>
                    <td>${item.producto_nombre}</td>
                    <td style="text-align:center;">${item.cantidad_solicitada}</td>
                    <td style="text-align:center;">${item.cantidad_enviada ?? '—'}</td>
                    <td style="text-align:center;">${item.cantidad_recibida ?? '—'}</td>
                </tr>`).join('');

            const btnRecibir = (t.estado === 'despachado') ? `
                <button class="btn btn-success" onclick="window.traslados_module.recibirTraslado()">
                    <i class="fas fa-check-double"></i> Marcar como Recibido
                </button>` : '';

            Modal.open({
                title: `<i class="fas fa-exchange-alt" style="margin-right:8px;"></i> Traslado: ${t.codigo}`,
                size: 'lg',
                body: `
                    <div class="grid-2" style="gap:0.5rem; margin-bottom:1rem; font-size:13px;">
                        <div style="background:var(--bg-root);padding:0.75rem;border-radius:var(--radius-sm);">
                            <div style="font-size:11px;color:var(--text-muted);">Origen</div>
                            <strong>${t.ubicacion_origen_nombre}</strong>
                        </div>
                        <div style="background:var(--bg-root);padding:0.75rem;border-radius:var(--radius-sm);">
                            <div style="font-size:11px;color:var(--text-muted);">Destino</div>
                            <strong>${t.ubicacion_destino_nombre}</strong>
                        </div>
                        <div style="background:var(--bg-root);padding:0.75rem;border-radius:var(--radius-sm);">
                            <div style="font-size:11px;color:var(--text-muted);">Estado</div>
                            ${this.getEstadoBadge(t.estado)}
                        </div>
                        <div style="background:var(--bg-root);padding:0.75rem;border-radius:var(--radius-sm);">
                            <div style="font-size:11px;color:var(--text-muted);">Fecha</div>
                            <strong>${Utils.formatDate(t.fecha_solicitud)}</strong>
                        </div>
                    </div>
                    <table class="data-table">
                        <thead><tr>
                            <th>Producto</th>
                            <th style="text-align:center;">Solicitado</th>
                            <th style="text-align:center;">Enviado</th>
                            <th style="text-align:center;">Recibido</th>
                        </tr></thead>
                        <tbody>${productosHtml}</tbody>
                    </table>
                    ${t.notas ? `<p style="margin-top:0.75rem;font-size:13px;color:var(--text-muted);">
                        <strong>Notas:</strong> ${t.notas}</p>` : ''}`,
                footer: `
                    <button class="btn btn-secondary" onclick="Modal.close()">Cerrar</button>
                    ${btnRecibir}`
            });
        } catch (err) {
            Toast.show('Error cargando detalle', 'error');
        }
    },

    async recibirTraslado() {
        if (!this.trasladoActual) return;

        Swal.fire({
            title: '¿Confirmar recepción?',
            text: 'Esta acción sumará el stock de los productos recibidos en tu inventario local.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, recibir',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await API.put(`/traslados/${this.trasladoActual.id}/recibir`);
                    Toast.show('Traslado recibido correctamente. Stock actualizado.', 'success');
                    Modal.close();
                    this.rolActual === 'bodega' ? this.cargarTrasladosBodega() : this.cargarTrasladosLocal();
                } catch (err) {
                    Toast.show(err.message || 'Error recibiendo traslado', 'error');
                }
            }
        });
    },

    async cancelarTraslado(id) {
        Swal.fire({
            title: '¿Cancelar traslado?',
            text: 'La solicitud será cancelada y no podrá procesarse.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, cancelar',
            cancelButtonText: 'No'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await API.put(`/traslados/${id}/cancelar`);
                    Toast.show('Traslado cancelado', 'success');
                    this.cargarTrasladosLocal();
                } catch (err) {
                    Toast.show(err.message || 'Error cancelando traslado', 'error');
                }
            }
        });
    }
};
