/**
 * inventario.js — Módulo Inventario
 */

window.inventario_module = {
    _pagination: null,
    _productos: [],

    async init() {
        try {
            // Mostrar Skeleton Loading antes de cargar
            this._renderSkeleton();

            const [productos, categorias] = await Promise.all([
                API.get('/productos'),
                API.get('/categorias')
            ]);
            this._productos = productos;

            // Poblar select de categorías
            const catSelect = document.getElementById('inv-categoria');
            if (catSelect && catSelect.options.length <= 1) { // Evitar duplicar si ya cargó
                categorias.forEach(c => {
                    catSelect.innerHTML += `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`;
                });
            }

            // Inicializar Paginación con Render personalizado
            this._pagination = new Pagination({
                containerId: 'inventario-table-container',
                data: productos,
                itemsPerPage: 20,
                searchFields: ['nombre', 'codigo', 'categoria_nombre'],
                renderFn: (p) => {
                    // Semáforo de Stock
                    let stockBadge = '';
                    if (p.stock <= 0) stockBadge = '<span class="badge danger">AGOTADO</span>';
                    else if (p.stock < 5) stockBadge = `<span class="badge warning">Stock: ${p.stock} (Crit)</span>`;
                    else if (p.stock < 10) stockBadge = `<span class="badge info">Stock: ${p.stock} (Bajo)</span>`;
                    else stockBadge = `<span class="badge success">Stock: ${p.stock}</span>`;

                    const img = p.imagen_url
                        ? `<img src="${formatImageUrl(p.imagen_url)}" class="card-product-img" onclick="openImagePreview('${formatImageUrl(p.imagen_url)}', '${escapeHtml(p.nombre)}')" onerror="this.src='/assets/no-img.png'; this.onerror=null;">`
                        : `<div class="card-product-img-placeholder"><i class="fas fa-box"></i></div>`;

                    return `
                      <div class="product-card">
                        <div class="card-img-container">
                            ${img}
                            ${stockBadge}
                        </div>
                        <div class="card-info">
                            <h3 class="card-title" title="${escapeHtml(p.nombre)}">${escapeHtml(p.nombre)}</h3>
                            <p class="card-category">${escapeHtml(p.categoria_nombre || 'Sin Categoría')}</p>
                            <div class="card-details">
                                <span class="card-talla">Talla: ${escapeHtml(p.talla || '—')}</span>
                                <span class="card-price">${formatCOP(p.precio_venta)}</span>
                            </div>
                            <div class="card-actions">
                                <button class="btn btn-primary btn-block" onclick="productos_module.generarQR(${p.id})">
                                    <i class="fas fa-qrcode"></i> Generar QR
                                </button>
                            </div>
                        </div>
                      </div>`;
                }
            });
            this._pagination.render();

            // Configurar Listeners
            this._setupListeners();

        } catch (err) {
            const container = document.querySelector('.pagination-content');
            if (container) container.innerHTML = `<div class="text-center text-danger" style="width:100%">Error: ${err.message}</div>`;
            Toast.error('Error cargando inventario: ' + err.message);
        }
    },

    _setupListeners() {
        const debouncedSearch = debounce((q) => this._pagination.search(q), 300);

        const searchInput = document.getElementById('inv-search');
        if (searchInput) {
            // Remover listeners anteriores para evitar duplicados si se reinicia el módulo
            const newSearch = searchInput.cloneNode(true);
            searchInput.parentNode.replaceChild(newSearch, searchInput);
            newSearch.addEventListener('input', e => debouncedSearch(e.target.value));
        }

        document.getElementById('inv-categoria')?.addEventListener('change', e => {
            const catId = e.target.value;
            const stockBajo = document.getElementById('inv-stock-bajo')?.checked;
            this._applyFilters(catId, stockBajo);
        });

        document.getElementById('inv-stock-bajo')?.addEventListener('change', e => {
            const catId = document.getElementById('inv-categoria')?.value;
            this._applyFilters(catId, e.target.checked);
        });
    },

    _applyFilters(catId, stockBajo) {
        this._pagination.filter(p => {
            const matchCat = !catId || p.categoria_id == catId;
            const matchStock = !stockBajo || p.stock < 5; // Consideramos bajo stock < 5 para el filtro checkbox
            return matchCat && matchStock;
        });
    },

    _renderSkeleton() {
        const container = document.querySelector('.pagination-content');
        if (!container) return;

        const skeletonCard = `
            <div class="product-card">
                <div class="skeleton" style="width:100%; height:180px; border-radius:12px 12px 0 0;"></div>
                <div class="card-info">
                    <div class="skeleton" style="width:80%; height:20px; margin-bottom:8px;"></div>
                    <div class="skeleton" style="width:40%; height:14px; margin-bottom:12px;"></div>
                    <div class="flex justify-between" style="margin-bottom:12px;">
                        <div class="skeleton" style="width:30%; height:14px;"></div>
                        <div class="skeleton" style="width:40%; height:18px;"></div>
                    </div>
                    <div class="skeleton" style="width:100%; height:38px; border-radius:8px;"></div>
                </div>
            </div>
        `;
        container.innerHTML = skeletonCard.repeat(8);
    },

    exportarCSV() {
        if (!this._productos || this._productos.length === 0) {
            Toast.warning('No hay datos para exportar');
            return;
        }

        // Definir cabeceras
        const headers = ['ID', 'Código', 'Nombre', 'Categoría', 'Talla', 'Stock', 'Precio Compra', 'Precio Venta', 'Activo'];

        // Mapear datos
        const csvContent = this._productos.map(p => [
            p.id,
            `"${p.codigo || ''}"`, // Comillas para evitar problemas con comas en el texto
            `"${p.nombre.replace(/"/g, '""')}"`,
            `"${p.categoria_nombre || ''}"`,
            p.talla || '',
            p.stock,
            p.precio_compra,
            p.precio_venta,
            p.activo ? 'SI' : 'NO'
        ]);

        // Unir cabeceras y datos
        const csvString = [
            headers.join(','),
            ...csvContent.map(row => row.join(','))
        ].join('\n');

        // Crear blob y descargar
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `inventario_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        Toast.success('Inventario exportado correctamente');
    }
};
