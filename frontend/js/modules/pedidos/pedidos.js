/**
 * pedidos.js — Módulo Pedidos
 */

window.pedidos_module = {
    _productos: [],
    _clientes: [],
    _pagination: null,

    async init() {
        try {
            const [pedidos, productos, clientes] = await Promise.all([
                API.get('/pedidos'),
                API.get('/productos'),
                API.get('/clientes')
            ]);
            this._productos = productos;
            this._clientes = clientes;
            this._renderTabla(pedidos);

            document.getElementById('btn-nuevo-pedido')?.addEventListener('click', () => this.abrirFormulario());
            document.getElementById('pedido-estado-filter')?.addEventListener('change', async (e) => {
                const url = e.target.value ? `/pedidos?estado=${e.target.value}` : '/pedidos';
                const data = await API.get(url);
                this._renderTabla(data);
            });
        } catch (err) { Toast.error('Error: ' + err.message); }
    },

    _renderTabla(pedidos) {
        this._pagination = new Pagination({
            containerId: 'pedidos-table-container',
            data: pedidos,
            itemsPerPage: 15,
            searchFields: ['producto_nombre', 'cliente_nombre'],
            renderFn: (p) => `
        <tr>
          <td style="font-size:0.8rem">${formatDate(p.fecha_pedido)}</td>
          <td>${escapeHtml(p.producto_nombre)}</td>
          <td>${p.cantidad}</td>
          <td>${formatCOP(p.total)}</td>
          <td>${escapeHtml(p.cliente_nombre || '—')}</td>
          <td>${renderEstadoBadge(p.estado)}</td>
          <td class="actions">
            ${p.estado === 'pendiente' || p.estado === 'en_proceso' ? `
              <button class="btn btn-sm btn-success" onclick="pedidos_module.completar(${p.id})" title="Completar"><i class="fas fa-check"></i></button>
              <button class="btn btn-sm btn-danger" onclick="pedidos_module.cancelar(${p.id})" title="Cancelar"><i class="fas fa-times"></i></button>
            ` : '—'}
          </td>
        </tr>`
        });
        this._pagination.render();
    },

    abrirFormulario() {
        const prodOptions = this._productos.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)}</option>`).join('');
        const clienteOptions = this._clientes.map(c => `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`).join('');
        Modal.open({
            title: 'Nuevo Pedido',
            body: `
        <div class="form-group"><label>Producto *</label><select class="form-control" id="pef-producto"><option value="">Seleccionar...</option>${prodOptions}</select></div>
        <div class="form-grid">
          <div class="form-group"><label>Cantidad *</label><input type="number" class="form-control" id="pef-cantidad" min="1" value="1"></div>
          <div class="form-group">
            <label>Producto a buscar/escanear</label>
            <div class="qr-input-group">
                <input type="text" class="form-control" id="ped-search" placeholder="Escribe o escanea QR/Barra..." autocomplete="off">
                <button type="button" class="btn-qr" onclick="QRScanner.open('ped-search')" title="Escanear Código">
                    <i class="fas fa-qrcode"></i>
                </button>
            </div>
            <div id="ped-search-results" class="search-results-overlay"></div>
          </div>
        </div>
        <div class="form-group"><label>Cliente</label><select class="form-control" id="pef-cliente"><option value="">Sin cliente</option>${clienteOptions}</select></div>
        <div class="form-group"><label>Notas</label><textarea class="form-control" id="pef-notas" rows="2"></textarea></div>
        <!-- Hidden input for price to avoid null reference if logic required it, though we get it from product -->
        <input type="hidden" id="pef-precio" value="0">`,
            footer: `
        <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="pedidos_module.guardar()"><i class="fas fa-save"></i> Crear Pedido</button>`
        });

        // Setup Search Listener
        const searchInput = document.getElementById('ped-search');
        const resultsDiv = document.getElementById('ped-search-results');

        searchInput.addEventListener('input', (e) => {
            const q = normalizarTexto(e.target.value);
            if (!q) { resultsDiv.style.display = 'none'; return; }

            const matches = this._productos.filter(p =>
                normalizarTexto(p.nombre).includes(q) || normalizarTexto(p.codigo).includes(q)
            ).slice(0, 5);

            if (matches.length > 0) {
                resultsDiv.innerHTML = matches.map(p => `
                 <div class="search-result-item" onclick="pedidos_module._selectProduct(${p.id})">
                   <div class="s-res-img">
                     ${p.imagen_url ? `<img src="${formatImageUrl(p.imagen_url)}" style="width:30px;height:30px;object-fit:cover;border-radius:4px;">` : '<i class="fas fa-box"></i>'}
                   </div>
                   <div class="s-res-info">
                     <div class="s-res-name">${escapeHtml(p.nombre)}</div>
                     <div class="s-res-meta">${p.codigo || 'S/C'} - $${p.precio_venta}</div>
                   </div>
                 </div>
               `).join('');
                resultsDiv.style.display = 'block';
            } else {
                resultsDiv.style.display = 'none';
            }
        });
    },

    _selectProduct(id) {
        const p = this._productos.find(x => x.id === id);
        if (p) {
            document.getElementById('pef-producto').value = p.id;
            // Update hidden price logic if needed, or just visual
            document.getElementById('ped-search').value = p.nombre;
            document.getElementById('ped-search-results').style.display = 'none';
            // Auto-fill price if we had a visible price input, but we rely on backend or hidden
            if (document.getElementById('pef-precio')) document.getElementById('pef-precio').value = p.precio_venta;
        }
    },

    async guardar() {
        const prodId = document.getElementById('pef-producto').value;
        const prod = this._productos.find(p => p.id == prodId);

        // El backend espera una estructura con 'items' (array)
        const cantidad = parseInt(document.getElementById('pef-cantidad').value);
        const precio = parseFloat(document.getElementById('pef-precio')?.value) || prod?.precio_venta || 0;

        const payload = {
            items: [{
                producto_id: prodId,
                cantidad: cantidad,
                precio_venta: precio
            }],
            cliente_id: document.getElementById('pef-cliente').value || null,
            notas: document.getElementById('pef-notas').value
        };

        if (!prodId) { Toast.warning('Selecciona un producto'); return; }

        try {
            await API.post('/pedidos', payload);
            Toast.success('Pedido creado');
            Modal.close();
            await this.init();
        } catch (err) { Toast.error(err.message); }
    },

    async completar(id) {
        try {
            // Navegar a ventas y esperar que init() termine completamente
            await Router.navigateTo('ventas');
            // Cargar pedido directamente por ID (ventas fetcha todo lo que necesita)
            await window.ventas_module.loadFromPedido(id);
        } catch (err) {
            Toast.error('Error cargando pedido: ' + err.message);
        }
    },

    async cancelar(id) {
        const result = await Swal.fire({ title: '¿Cancelar pedido?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Cancelar pedido', confirmButtonColor: '#ef4444' });
        if (!result.isConfirmed) return;
        try {
            await API.delete(`/pedidos/${id}`); // Esto cambia estado a cancelado
            Toast.success('Pedido cancelado');
            await this.init();
        } catch (err) { Toast.error(err.message); }
    }
};