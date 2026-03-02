/**
 * insumos.js — Módulo Insumos
 */

window.insumos_module = {
    _proveedores: [],
    _pagination: null,

    async init() {
        try {
            const [data, proveedores] = await Promise.all([API.get('/insumos'), API.get('/proveedores')]);
            this._proveedores = proveedores;
            document.getElementById('insumos-total').textContent = formatCOP(data.total_invertido);

            this._pagination = new Pagination({
                containerId: 'insumos-table-container',
                data: data.insumos,
                itemsPerPage: 25,
                searchFields: ['nombre', 'categoria', 'usuario_nombre'],
                renderFn: (i) => {
                    const bajo = parseFloat(i.cantidad) < parseFloat(i.stock_minimo);
                    return `
            <tr style="${bajo ? 'background:rgba(239,68,68,0.05)' : ''}">
              <td><strong>${escapeHtml(i.nombre)}</strong></td>
              <td>${escapeHtml(i.categoria || '—')}</td>
              <td>${formatCantidad(i.cantidad)}</td>
              <td>${escapeHtml(i.unidad || '—')}</td>
              <td>${formatCOP(i.precio_unitario)}</td>
              <td>${formatCantidad(i.stock_minimo)}</td>
              <td>${formatDate(i.created_at)}</td>
              <td>${escapeHtml(i.usuario_nombre || '—')}</td>
              <td>${bajo ? '<span class="badge badge-critico"><i class="fas fa-exclamation-triangle"></i> Bajo</span>' : '<span class="badge badge-ok"><i class="fas fa-check"></i> OK</span>'}</td>
              <td class="actions">
                <button class="btn btn-sm btn-secondary" onclick="insumos_module.editar(${i.id})"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-danger" onclick="insumos_module.eliminar(${i.id})"><i class="fas fa-trash"></i></button>
              </td>
            </tr>`;
                }
            });
            this._pagination.render();
            document.getElementById('btn-nuevo-insumo')?.addEventListener('click', () => this.abrirFormulario());
            
            // Selector de elementos por página
            const perPageSelect = document.getElementById('insumos-per-page');
            if (perPageSelect) {
                perPageSelect.value = '25'; // Valor por defecto
                perPageSelect.addEventListener('change', (e) => {
                    const itemsPerPage = parseInt(e.target.value) || 25;
                    this._pagination.itemsPerPage = itemsPerPage;
                    this._pagination.currentPage = 1;
                    this._pagination.render();
                });
            }
        } catch (err) { Toast.error('Error: ' + err.message); }
    },

    _formHtml(i = null) {
        const provOptions = this._proveedores.map(p => `<option value="${p.id}" ${i?.proveedor_id == p.id ? 'selected' : ''}>${escapeHtml(p.nombre)}</option>`).join('');
        return `
      <div class="form-grid">
        <div class="form-group"><label>Nombre *</label><input type="text" class="form-control" id="if-nombre" value="${escapeHtml(i?.nombre || '')}"></div>
        <div class="form-group"><label>Categoría</label><input type="text" class="form-control" id="if-categoria" value="${escapeHtml(i?.categoria || '')}"></div>
        <div class="form-group"><label>Cantidad</label><input type="number" class="form-control" id="if-cantidad" value="${i?.cantidad || 0}" step="0.01"></div>
        <div class="form-group"><label>Unidad</label><input type="text" class="form-control" id="if-unidad" value="${escapeHtml(i?.unidad || '')}" placeholder="kg, lt, und..."></div>
        <div class="form-group"><label>Precio Unitario</label><input type="number" class="form-control" id="if-precio" value="${i?.precio_unitario || 0}" step="0.01"></div>
        <div class="form-group"><label>Stock Mínimo</label><input type="number" class="form-control" id="if-stock-min" value="${i?.stock_minimo || 0}" step="0.01"></div>
        <div class="form-group form-full"><label>Proveedor</label><select class="form-control" id="if-proveedor"><option value="">Sin proveedor</option>${provOptions}</select></div>
      </div>`;
    },

    abrirFormulario(insumo = null) {
        Modal.open({
            title: insumo ? 'Editar Insumo' : 'Nuevo Insumo',
            body: this._formHtml(insumo),
            footer: `<button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button><button class="btn btn-primary" onclick="insumos_module.guardar(${insumo?.id || 'null'})"><i class="fas fa-save"></i> Guardar</button>`
        });
    },

    async editar(id) {
        const data = await API.get('/insumos');
        const i = data.insumos.find(x => x.id === id);
        if (i) this.abrirFormulario(i);
    },

    async guardar(id) {
        const data = {
            nombre: document.getElementById('if-nombre').value.trim(),
            categoria: document.getElementById('if-categoria').value.trim(),
            cantidad: parseFloat(document.getElementById('if-cantidad').value) || 0,
            unidad: document.getElementById('if-unidad').value.trim(),
            precio_unitario: parseFloat(document.getElementById('if-precio').value) || 0,
            stock_minimo: parseFloat(document.getElementById('if-stock-min').value) || 0,
            proveedor_id: document.getElementById('if-proveedor').value || null
        };
        if (!data.nombre) { Toast.warning('El nombre es requerido'); return; }
        try {
            if (id) { await API.put(`/insumos/${id}`, data); Toast.success('Insumo actualizado'); }
            else { await API.post('/insumos', data); Toast.success('Insumo creado'); }
            Modal.close();
            await this.init();
        } catch (err) { Toast.error(err.message); }
    },

    async eliminar(id) {
        const result = await Swal.fire({ title: '¿Eliminar insumo?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Eliminar', confirmButtonColor: '#ef4444' });
        if (!result.isConfirmed) return;
        try { await API.delete(`/insumos/${id}`); Toast.success('Insumo eliminado'); await this.init(); }
        catch (err) { Toast.error(err.message); }
    }
};
