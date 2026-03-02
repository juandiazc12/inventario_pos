/**
 * categorias.js — Módulo Categorías
 */

window.categorias_module = {
    _pagination: null,

    async init() {
        try {
            const categorias = await API.get('/categorias');
            this._pagination = new Pagination({
                containerId: 'categorias-table-container',
                data: categorias,
                itemsPerPage: 15,
                searchFields: ['nombre', 'descripcion'],
                renderFn: (c) => `
          <tr>
            <td><strong>${escapeHtml(c.nombre)}</strong></td>
            <td>${escapeHtml(c.descripcion || '—')}</td>
            <td><span class="badge badge-info">${c.total_productos || 0} productos</span></td>
            <td class="actions">
              <button class="btn btn-sm btn-secondary" onclick="categorias_module.editar(${c.id})"><i class="fas fa-edit"></i></button>
              <button class="btn btn-sm btn-danger" onclick="categorias_module.eliminar(${c.id}, ${c.total_productos || 0})"><i class="fas fa-trash"></i></button>
            </td>
          </tr>`
            });
            this._pagination.render();
            document.getElementById('btn-nueva-categoria')?.addEventListener('click', () => this.abrirFormulario());
        } catch (err) { Toast.error('Error: ' + err.message); }
    },

    abrirFormulario(cat = null) {
        Modal.open({
            title: cat ? 'Editar Categoría' : 'Nueva Categoría',
            size: 'sm',
            body: `
        <div class="form-group"><label>Nombre *</label><input type="text" class="form-control" id="catf-nombre" value="${escapeHtml(cat?.nombre || '')}"></div>
        <div class="form-group"><label>Descripción</label><textarea class="form-control" id="catf-desc" rows="3">${escapeHtml(cat?.descripcion || '')}</textarea></div>`,
            footer: `<button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button><button class="btn btn-primary" onclick="categorias_module.guardar(${cat?.id || 'null'})"><i class="fas fa-save"></i> Guardar</button>`
        });
    },

    async editar(id) {
        const cats = await API.get('/categorias');
        const c = cats.find(x => x.id === id);
        if (c) this.abrirFormulario(c);
    },

    async guardar(id) {
        const data = { nombre: document.getElementById('catf-nombre').value.trim(), descripcion: document.getElementById('catf-desc').value.trim() };
        if (!data.nombre) { Toast.warning('El nombre es requerido'); return; }
        try {
            if (id) { await API.put(`/categorias/${id}`, data); Toast.success('Categoría actualizada'); }
            else { await API.post('/categorias', data); Toast.success('Categoría creada'); }
            Modal.close();
            await this.init();
        } catch (err) { Toast.error(err.message); }
    },

    async eliminar(id, totalProductos) {
        if (totalProductos > 0) {
            Toast.warning(`Esta categoría tiene ${totalProductos} productos. Reasígnalos antes de eliminar.`);
            return;
        }
        const result = await Swal.fire({ title: '¿Eliminar categoría?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Eliminar', confirmButtonColor: '#ef4444' });
        if (!result.isConfirmed) return;
        try { await API.delete(`/categorias/${id}`); Toast.success('Categoría eliminada'); await this.init(); }
        catch (err) { Toast.error(err.message); }
    }
};
