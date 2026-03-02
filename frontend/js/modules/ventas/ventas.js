/**
 * ventas.js — Módulo POS con Carrito y Visualización
 */

window.ventas_module = {
    _productos: [],
    _clientes: [],
    _cart: [], // Estado del carrito
    _selectedProduct: null, // Producto actual en vista previa
    _currentPedidoId: null, // ID del pedido que originó esta venta (si aplica)

    async init() {
        try {
            const [productos, clientes] = await Promise.all([
                API.get('/productos'),
                API.get('/clientes')
            ]);
            this._productos = productos;
            this._clientes = clientes;
            // init siempre resetea el carrito y el pedido activo
            this._cart = [];
            this._currentPedidoId = null;
            this._renderCart();

            // Configurar búsqueda de producto (Scanner/Manual)
            const searchInput = document.getElementById('v-search');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => this._handleSearchInput(e.target.value));
                searchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this._tryAddFromInput(e.target.value);
                });
                searchInput.focus(); // Foco inicial
            }

            // Configurar botones y eventos
            document.getElementById('btn-add-cart')?.addEventListener('click', () => this._addToCartFromPreview());
            document.getElementById('v-cantidad')?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this._addToCartFromPreview();
            });

            // Configurar búsqueda de cliente
            this._setupClientSearch();

            // Sincronizar UI de cliente inicial
            this._updateClienteUI();

        } catch (err) {
            Toast.error('Error inicializando ventas: ' + err.message);
        }
    },

    // --- MANEJO DE BÚSQUEDA Y VISTA PREVIA ---

    _handleSearchInput(query) {
        const resultsDiv = document.getElementById('v-search-results');
        if (!query.trim()) {
            resultsDiv.style.display = 'none';
            return;
        }

        const q = normalizarTexto(query);
        const matches = (this._productos || []).filter(p => {
            if (!p || !p.nombre) return false;
            const matchesName = normalizarTexto(p.nombre).includes(q);
            const matchesCode = p.codigo && normalizarTexto(p.codigo).includes(q);
            return (p.activo !== false) && (matchesName || matchesCode);
        }).slice(0, 5);

        if (matches.length > 0) {
            resultsDiv.innerHTML = matches.map(p => `
                <div class="search-result-item" data-id="${p.id}">
                    <div class="s-res-img">
                        ${p.imagen_url ? `<img src="${formatImageUrl(p.imagen_url)}" alt="${p.nombre}">` : '<i class="fas fa-image"></i>'}
                    </div>
                    <div class="s-res-info">
                        <div class="s-res-name">${escapeHtml(p.nombre)}</div>
                        <div class="s-res-meta">
                            <span>${p.codigo || 'S/C'}</span> • <span>Stock: ${p.stock}</span>
                        </div>
                    </div>
                    <button class="btn-check-add" data-id="${p.id}" title="Agregar al carrito">
                        <i class="fas fa-plus-circle"></i>
                    </button>
                </div>
            `).join('');
            resultsDiv.style.display = 'block';

            // Configurar eventos por delegación
            resultsDiv.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    const id = parseInt(item.dataset.id);
                    const isAddBtn = e.target.closest('.btn-check-add');

                    if (isAddBtn) {
                        e.stopPropagation();
                        this._directAddToCart(id);
                    } else {
                        this._selectProduct(id);
                    }
                });
            });
        } else {
            resultsDiv.innerHTML = '<div style="padding:1rem; text-align:center; color:var(--text-muted);">Sin resultados</div>';
            resultsDiv.style.display = 'block';
        }
    },

    _directAddToCart(id) {
        const p = this._productos.find(x => x.id === id);
        if (!p) return;

        // Validar cliente obligatorio
        const clienteIdInput = document.getElementById('v-cliente-id');
        const clienteNombreInput = document.getElementById('v-cliente-search');

        const clienteId = clienteIdInput ? clienteIdInput.value : '';
        const clienteNombre = clienteNombreInput ? clienteNombreInput.value : '';

        if (!clienteId && !clienteNombre.trim()) {
            this._promptForClient(() => this._directAddToCart(id));
            return;
        }

        if (p.stock < 1) return Toast.error('Producto sin stock');

        this._selectedProduct = p;
        this._addToCartFromPreview(1);
        document.getElementById('v-search-results').style.display = 'none';
        document.getElementById('v-search').value = '';
        Toast.success(`${p.nombre} añadido`);
    },

    _tryAddFromInput(val) {
        // Intenta encontrar una coincidencia exacta por código
        const exactMatch = this._productos.find(p => p.codigo && p.codigo.trim() === val.trim());
        if (exactMatch) {
            this._selectProduct(exactMatch.id);
        }
    },

    async _promptForClient(callback) {
        const { value: nombre } = await Swal.fire({
            title: 'Cliente Requerido',
            text: 'Por favor, ingrese el nombre del cliente para continuar con la venta.',
            input: 'text',
            inputPlaceholder: 'Nombre del Cliente...',
            showCancelButton: true,
            confirmButtonText: 'Guardar y Continuar',
            cancelButtonText: 'Cancelar',
            inputValidator: (value) => {
                if (!value) return '¡El nombre es obligatorio!';
            }
        });

        if (nombre) {
            document.getElementById('v-cliente-search').value = nombre;
            this._updateClienteUI();
            // No seteamos ID para que el backend lo cree dinámicamente
            if (callback) callback();
        }
    },

    _updateClienteUI() {
        const input = document.getElementById('v-cliente-search');
        const display = document.getElementById('v-selected-cliente-name');

        const clienteNombre = input ? input.value : '';

        if (display) {
            display.textContent = clienteNombre || 'No seleccionado';
        }
    },

    _selectProduct(id) {
        const p = this._productos.find(x => x.id === id);
        if (!p) return;

        // Validar cliente obligatorio
        const clienteIdInput = document.getElementById('v-cliente-id');
        const clienteNombreInput = document.getElementById('v-cliente-search');

        const clienteId = clienteIdInput ? clienteIdInput.value : '';
        const clienteNombre = clienteNombreInput ? clienteNombreInput.value : '';

        if (!clienteId && !clienteNombre.trim()) {
            this._promptForClient(() => this._selectProduct(id));
            return;
        }

        this._selectedProduct = p;
        document.getElementById('v-search-results').style.display = 'none';
        document.getElementById('v-search').value = ''; // Limpiar para siguiente escaneo

        // Renderizar vista previa
        const preview = document.getElementById('v-producto-preview');
        preview.style.display = 'block';

        document.getElementById('v-prod-nombre').textContent = p.nombre;
        document.getElementById('v-prod-stock').textContent = p.stock;
        document.getElementById('v-prod-precio').textContent = formatCOP(p.precio_venta);
        document.getElementById('v-cantidad').value = 1;
        document.getElementById('v-cantidad').focus();

        const img = document.getElementById('v-prod-img');
        if (p.imagen_url) {
            img.src = formatImageUrl(p.imagen_url);
            img.style.display = 'inline-block';
        } else {
            img.style.display = 'none';
        }
    },

    // --- LÓGICA DEL CARRITO ---

    _addToCartFromPreview(forcedQty) {
        if (!this._selectedProduct) return;

        // Validar cliente obligatorio (doble check)
        const clienteIdInput = document.getElementById('v-cliente-id');
        const clienteNombreInput = document.getElementById('v-cliente-search');

        const clienteId = clienteIdInput ? clienteIdInput.value : '';
        const clienteNombre = clienteNombreInput ? clienteNombreInput.value : '';

        if (!clienteId && !clienteNombre.trim()) {
            this._promptForClient(() => this._addToCartFromPreview(forcedQty));
            return;
        }

        const cantidad = forcedQty || parseInt(document.getElementById('v-cantidad').value);
        if (isNaN(cantidad) || cantidad < 1) {
            Toast.warning('Cantidad inválida');
            return;
        }

        if (cantidad > this._selectedProduct.stock) {
            Toast.error(`Stock insuficiente. Máximo: ${this._selectedProduct.stock}`);
            return;
        }

        // Buscar si ya está en el carrito
        const existingItem = this._cart.find(item => item.producto_id === this._selectedProduct.id);

        if (existingItem) {
            if (existingItem.cantidad + cantidad > this._selectedProduct.stock) {
                Toast.error('No hay suficiente stock para agregar más.');
                return;
            }
            existingItem.cantidad += cantidad;
        } else {
            this._cart.push({
                producto_id: this._selectedProduct.id,
                producto: this._selectedProduct,
                cantidad: cantidad,
                precio_venta: this._selectedProduct.precio_venta
            });
        }

        this._renderCart();

        // Resetear vista previa y volver el foco al buscador
        this._selectedProduct = null;
        document.getElementById('v-producto-preview').style.display = 'none';
        document.getElementById('v-search').focus();
    },

    _removeFromCart(index) {
        this._cart.splice(index, 1);
        this._renderCart();
    },

    _renderCart() {
        const tbody = document.getElementById('cart-tbody');
        const totalEl = document.getElementById('cart-total');
        const countEl = document.getElementById('cart-count');
        const btnFinalizar = document.getElementById('btn-finalizar-venta');

        if (!tbody || !totalEl || !countEl || !btnFinalizar) {
            console.warn('Elementos del carrito no encontrados en el DOM');
            return;
        }

        if (this._cart.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center" style="padding:2rem; color:var(--text-muted)">El carrito está vacío</td></tr>`;
            totalEl.textContent = formatCOP(0);
            countEl.textContent = '0 items';
            btnFinalizar.disabled = true;
            return;
        }

        let total = 0;
        let itemsCount = 0;

        tbody.innerHTML = this._cart.map((item, index) => {
            const subtotal = item.cantidad * item.precio_venta;
            total += subtotal;
            itemsCount += item.cantidad;
            return `
                <tr>
                    <td>
                        <div style="font-weight:600; font-size:0.9rem;">${escapeHtml(item.producto.nombre)}</div>
                        <div style="font-size:0.75rem; color:var(--text-muted);">${formatCOP(item.precio_venta)} c/u</div>
                    </td>
                    <td class="text-center">
                        <span class="badge" style="background:var(--bg-tertiary); color:var(--text-primary); font-size:0.9rem;">${item.cantidad}</span>
                    </td>
                    <td class="text-right" style="font-weight:600;">${formatCOP(subtotal)}</td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="ventas_module._removeFromCart(${index})" title="Quitar">
                            <i class="fas fa-times"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        totalEl.textContent = formatCOP(total);
        countEl.textContent = `${itemsCount} items`;
        btnFinalizar.disabled = false;
    },

    // --- PROCESAMIENTO ---

    async finalizarVenta() {
        if (this._cart.length === 0) return;

        const clienteIdInput = document.getElementById('v-cliente-id');
        const clienteNombreInput = document.getElementById('v-cliente-search');

        const clienteId = clienteIdInput ? clienteIdInput.value : '';
        const clienteNombre = clienteNombreInput ? clienteNombreInput.value : '';

        const total = this._cart.reduce((acc, item) => acc + (item.cantidad * item.precio_venta), 0);

        const confirm = await Swal.fire({
            title: 'Confirmar Venta',
            html: `Total a cobrar: <b>${formatCOP(total)}</b><br>Items: ${this._cart.length}`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, cobrar',
            confirmButtonColor: '#10b981'
        });

        if (!confirm.isConfirmed) return;

        try {
            // Preparar payload para registrarVentaMultiple
            const payload = {
                items: this._cart.map(i => ({
                    producto_id: i.producto_id,
                    cantidad: i.cantidad,
                    precio_venta: i.precio_venta
                })),
                cliente_id: clienteId || null,
                cliente_nombre: !clienteId && clienteNombre ? clienteNombre : null
            };

            const response = await API.post('/ventas', payload);

            Toast.success('¡Venta registrada exitosamente!');

            // Si esta venta viene de un pedido, marcarlo como completado
            if (this._currentPedidoId) {
                try {
                    await API.put(`/pedidos/${this._currentPedidoId}/estado`, { estado: 'completado' });
                    Toast.success('Pedido marcado como completado');
                } catch (e) {
                    console.warn('No se pudo marcar el pedido como completado:', e.message);
                }
                this._currentPedidoId = null;
            }

            // Obtener datos completos del ticket para mostrar
            // La respuesta trae el primer ID de venta en ventas_ids
            if (response.ventas_ids && response.ventas_ids.length > 0) {
                const ticketData = await API.get(`/ventas/ticket/${response.ventas_ids[0]}`);
                // Añadimos los items manualmente si el endpoint solo devuelve uno (por seguridad lo haremos así ahora)
                // Idealmente el endpoint de ticket debería devolver la venta agrupada.
                // Como queremos un recibo detallado, TicketComponent debe saber que es una venta múltiple.
                TicketComponent.mostrar({
                    ...ticketData,
                    items: this._cart // Pasamos el carrito actual para el detalle del ticket
                });
            }

            // Limpiar y recargar
            this._cart = [];
            this._renderCart();
            document.getElementById('v-cliente-search').value = '';
            document.getElementById('v-cliente-id').value = '';
            this._updateClienteUI();
            await this.init();

        } catch (err) {
            Toast.error(err.message);
        }
    },

    async guardarPedido() {
        if (this._cart.length === 0) {
            Toast.warning('El carrito está vacío');
            return;
        }

        const { value: notas } = await Swal.fire({
            title: 'Guardar como Pedido',
            input: 'textarea',
            inputLabel: 'Notas del pedido',
            inputPlaceholder: 'Opcional...',
            showCancelButton: true
        });

        if (notas === undefined) return; // Cancelado

        try {
            const payload = {
                items: this._cart.map(i => ({
                    producto_id: i.producto_id,
                    cantidad: i.cantidad,
                    precio_venta: i.precio_venta
                })),
                cliente_id: document.getElementById('v-cliente-id').value || null,
                notas: notas
            };

            await API.post('/pedidos', payload); // Llama al Create modificado del controller
            Toast.success('Pedido guardado correctamente');

            this._cart = [];
            this._renderCart();
            document.getElementById('v-cliente-search').value = '';
            document.getElementById('v-cliente-id').value = '';

        } catch (err) {
            Toast.error(err.message);
        }
    },

    // --- UTILIDADES ---

    _setupClientSearch() {
        const input = document.getElementById('v-cliente-search');
        const results = document.getElementById('v-cliente-results');
        const hiddenId = document.getElementById('v-cliente-id');

        input.addEventListener('input', (e) => {
            const q = normalizarTexto(e.target.value);
            if (!q) {
                results.style.display = 'none';
                return;
            }
            const matches = this._clientes.filter(c =>
                normalizarTexto(c.nombre).includes(q) || normalizarTexto(c.documento).includes(q)
            ).slice(0, 5);

            if (matches.length > 0) {
                results.innerHTML = matches.map(c => `
                    <div class="search-result-item" onclick="ventas_module._selectClient(${c.id}, '${escapeHtml(c.nombre)}')">
                        ${escapeHtml(c.nombre)} <small>(${c.documento})</small>
                    </div>
                `).join('');
                results.style.display = 'block';
            } else {
                results.style.display = 'none';
            }
        });
    },

    _selectClient(id, nombre) {
        const idInput = document.getElementById('v-cliente-id');
        const nameInput = document.getElementById('v-cliente-search');
        const results = document.getElementById('v-cliente-results');

        if (idInput) idInput.value = id;
        if (nameInput) nameInput.value = nombre;
        if (results) results.style.display = 'none';

        this._updateClienteUI();
    },

    // Carga un pedido al carrito fetchando directamente del backend
    async loadFromPedido(pedidoId) {
        try {
            // 1. Traer el pedido y el producto directamente del backend
            const pedido = await API.get(`/pedidos/${pedidoId}`);
            if (!pedido) {
                Toast.error('Pedido no encontrado');
                return;
            }

            // 2. Traer el objeto completo del producto
            const prod = await API.get(`/productos/${pedido.producto_id}`);
            if (!prod) {
                Toast.error('Producto del pedido no encontrado');
                return;
            }

            // 3. Llenar el carrito
            this._cart = [{
                producto_id: prod.id,
                producto: prod,
                cantidad: Number(pedido.cantidad),
                precio_venta: Number(pedido.precio_venta)
            }];
            this._currentPedidoId = pedidoId;

            // 4. Asignar cliente si tiene
            if (pedido.cliente_id) {
                // Asegurar clientes cargados
                if (!this._clientes || this._clientes.length === 0) {
                    this._clientes = await API.get('/clientes');
                }
                const cliente = this._clientes.find(c => c.id == pedido.cliente_id);
                if (cliente) this._selectClient(cliente.id, cliente.nombre);
            }

            // 5. Renderizar carrito
            this._renderCart();
            Toast.success(`Pedido cargado: ${prod.nombre} x${pedido.cantidad}`);

        } catch (err) {
            Toast.error('Error cargando pedido al carrito: ' + err.message);
            console.error('loadFromPedido error:', err);
        }
    }
};