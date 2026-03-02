/**
 * compras.js — Módulo Compras / Ingreso de Stock
 */

window.compras_module = {
    _productos: [],
    _proveedores: [],
    _selectedProduct: null,
    _pagination: null,

    async init() {
        try {
            const [compras, productos, proveedores] = await Promise.all([
                this._fetchComprasRecientes(),
                API.get('/productos'),
                API.get('/proveedores')
            ]);
            this._productos = productos;
            this._proveedores = proveedores;
            this._renderTabla(compras);

            // Poblar select de proveedores
            const provSelect = document.getElementById('c-proveedor');
            if (provSelect) {
                provSelect.innerHTML = `<option value="">Sin proveedor / Inventario Inicial</option>` +
                    proveedores.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)}</option>`).join('');
            }

            // Configurar búsqueda de producto
            const searchInput = document.getElementById('c-search');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => this._handleSearchInput(e.target.value));
                searchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this._trySelectFromInput(e.target.value);
                });
                searchInput.focus();
            }

            // Botón Filtros
            document.getElementById('btn-filtrar-compras')?.addEventListener('click', () => {
                const f = document.getElementById('c-filtros');
                const isHidden = getComputedStyle(f).display === 'none';
                f.style.display = isHidden ? 'block' : 'none';
            });

        } catch (err) { Toast.error('Error cargando compras: ' + err.message); }
    },

    async _fetchComprasRecientes() {
        // Traer últimos 50 registros por defecto
        return await API.get('/compras?limit=50');
    },

    // --- MANEJO DE BÚSQUEDA Y VISTA PREVIA ---

    _handleSearchInput(query) {
        const resultsDiv = document.getElementById('c-search-results');
        if (!query.trim()) {
            resultsDiv.style.display = 'none';
            return;
        }

        const q = normalizarTexto(query);
        const matches = this._productos.filter(p =>
            p.activo && (
                normalizarTexto(p.nombre).includes(q) ||
                (p.codigo && normalizarTexto(p.codigo).includes(q))
            )
        ).slice(0, 5);

        if (matches.length > 0) {
            resultsDiv.innerHTML = matches.map(p => `
                <div class="search-result-item" onclick="compras_module._selectProduct(${p.id})">
                    <div style="font-weight:bold;">${escapeHtml(p.nombre)}</div>
                    <div style="font-size:0.8rem; color:var(--text-muted); display:flex; justify-content:space-between;">
                        <span>${p.codigo || 'S/C'}</span>
                        <span>Stock: ${p.stock}</span>
                    </div>
                </div>
            `).join('');
            resultsDiv.style.display = 'block';
        } else {
            resultsDiv.style.display = 'none';
        }
    },

    _trySelectFromInput(val) {
        const exactMatch = this._productos.find(p => p.codigo && p.codigo.trim() === val.trim());
        if (exactMatch) {
            this._selectProduct(exactMatch.id);
        }
    },

    _selectProduct(id) {
        const p = this._productos.find(x => x.id === id);
        if (!p) return;

        this._selectedProduct = p;
        document.getElementById('c-search-results').style.display = 'none';
        document.getElementById('c-search').value = '';

        // Renderizar vista previa
        document.getElementById('c-producto-preview').style.display = 'block';
        document.getElementById('c-prod-nombre').textContent = p.nombre;
        document.getElementById('c-prod-stock').textContent = p.stock;

        // Imagen
        const img = document.getElementById('c-prod-img');
        if (p.imagen_url) {
            img.src = formatImageUrl(p.imagen_url);
            img.style.display = 'inline-block';
        } else {
            img.style.display = 'none';
        }

        // Resetear campos de ingreso
        document.getElementById('c-cantidad').value = 1;
        document.getElementById('c-costo').value = p.precio_compra || 0;
        document.getElementById('c-cantidad').focus();
    },

    // --- ACCIONES ---

    async registrarIngreso() {
        if (!this._selectedProduct) return;

        const cantidad = parseInt(document.getElementById('c-cantidad').value);
        const costo = parseFloat(document.getElementById('c-costo').value);
        const proveedorId = document.getElementById('c-proveedor').value;

        if (isNaN(cantidad) || cantidad < 1) {
            Toast.warning('Cantidad inválida');
            return;
        }
        if (isNaN(costo) || costo < 0) {
            Toast.warning('Costo inválido');
            return;
        }

        try {
            await API.post('/compras', {
                producto_id: this._selectedProduct.id,
                cantidad: cantidad,
                precio_compra: costo,
                proveedor_id: proveedorId || null
            });

            Toast.success(`Stock actualizado (+${cantidad})`);

            // Actualizar stock localmente para reflejar cambio inmediato
            this._selectedProduct.stock += cantidad;
            this._selectedProduct.precio_compra = costo; // Actualizar último costo

            // Limpiar vista
            this._selectedProduct = null;
            document.getElementById('c-producto-preview').style.display = 'none';
            document.getElementById('c-search').focus();

            // Recargar tabla
            const compras = await this._fetchComprasRecientes();
            this._renderTabla(compras);

        } catch (err) {
            Toast.error(err.message);
        }
    },

    // --- TABLA E HISTORIAL ---

    _renderTabla(compras) {
        this._pagination = new Pagination({
            containerId: 'compras-table-container',
            data: compras,
            itemsPerPage: 10,
            searchFields: ['producto_nombre', 'proveedor_nombre'],
            renderFn: (c) => `
                <tr>
                    <td style="font-size:0.8rem">${formatDate(c.fecha, true)}</td>
                    <td>${escapeHtml(c.producto_nombre)}</td>
                    <td><span class="badge success">+${c.cantidad}</span></td>
                    <td>${formatCOP(c.precio_compra)}</td>
                    <td>${formatCOP(c.total)}</td>
                    <td>${escapeHtml(c.proveedor_nombre || '—')}</td>
                </tr>`
        });
        this._pagination.render();
    },

    async filtrar() {
        const fi = document.getElementById('compra-fecha-inicio').value;
        const ff = document.getElementById('compra-fecha-fin').value;
        let url = '/compras?';
        if (fi) url += `fecha_inicio=${fi}&`;
        if (ff) url += `fecha_fin=${ff}`;

        try {
            const compras = await API.get(url);
            this._renderTabla(compras);
        } catch (err) {
            Toast.error(err.message);
        }
    }
};
