/**
 * proveedores.js — Módulo Proveedores
 */

window.proveedores_module = {
    _pagination: null,

    async init() {
        try {
            const proveedores = await API.get('/proveedores');
            this._pagination = new Pagination({
                containerId: 'proveedores-table-container',
                data: proveedores,
                itemsPerPage: 15,
                searchFields: ['nombre', 'contacto', 'telefono', 'email'],
                renderFn: (p) => `
          <tr>
            <td><strong>${escapeHtml(p.nombre)}</strong></td>
            <td>${escapeHtml(p.contacto || '—')}</td>
            <td>${escapeHtml(p.telefono || '—')}</td>
            <td>${escapeHtml(p.email || '—')}</td>
            <td class="actions">
              <button class="btn btn-sm btn-secondary" onclick="proveedores_module.editar(${p.id})"><i class="fas fa-edit"></i></button>
              <button class="btn btn-sm btn-danger" onclick="proveedores_module.eliminar(${p.id})"><i class="fas fa-trash"></i></button>
            </td>
          </tr>`
            });
            this._pagination.render();
            const debouncedSearch = debounce((q) => this._pagination.search(q), 300);
            document.getElementById('prov-search')?.addEventListener('input', e => debouncedSearch(e.target.value));
            document.getElementById('btn-nuevo-proveedor')?.addEventListener('click', () => this.abrirFormulario());
        } catch (err) { Toast.error('Error: ' + err.message); }
    },

    _formHtml(p = null) {
        return `
      <div class="form-group"><label>Nombre *</label><input type="text" class="form-control" id="pvf-nombre" value="${escapeHtml(p?.nombre || '')}"></div>
      <div class="form-grid">
        <div class="form-group"><label>Contacto</label><input type="text" class="form-control" id="pvf-contacto" value="${escapeHtml(p?.contacto || '')}"></div>
        <div class="form-group"><label>Teléfono</label><input type="text" class="form-control" id="pvf-telefono" value="${escapeHtml(p?.telefono || '')}"></div>
      </div>
      <div class="form-group"><label>Email</label><input type="email" class="form-control" id="pvf-email" value="${escapeHtml(p?.email || '')}"></div>
      <div class="form-group"><label>Dirección</label><textarea class="form-control" id="pvf-direccion" rows="2">${escapeHtml(p?.direccion || '')}</textarea></div>`;
    },

    abrirFormulario(prov = null) {
        Modal.open({
            title: prov ? 'Editar Proveedor' : 'Nuevo Proveedor',
            body: this._formHtml(prov),
            footer: `<button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button><button class="btn btn-primary" onclick="proveedores_module.guardar(${prov?.id || 'null'})"><i class="fas fa-save"></i> Guardar</button>`
        });
    },

    async editar(id) {
        const p = await API.get(`/proveedores/${id}`);
        this.abrirFormulario(p);
    },

    async guardar(id) {
        const data = {
            nombre: document.getElementById('pvf-nombre').value.trim(),
            contacto: document.getElementById('pvf-contacto').value.trim(),
            telefono: document.getElementById('pvf-telefono').value.trim(),
            email: document.getElementById('pvf-email').value.trim(),
            direccion: document.getElementById('pvf-direccion').value.trim()
        };
        if (!data.nombre) { Toast.warning('El nombre es requerido'); return; }
        try {
            if (id) { await API.put(`/proveedores/${id}`, data); Toast.success('Proveedor actualizado'); }
            else { await API.post('/proveedores', data); Toast.success('Proveedor creado'); }
            Modal.close();
            await this.init();
        } catch (err) { Toast.error(err.message); }
    },

    async eliminar(id) {
        const result = await Swal.fire({ title: '¿Eliminar proveedor?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Eliminar', confirmButtonColor: '#ef4444' });
        if (!result.isConfirmed) return;
        try { await API.delete(`/proveedores/${id}`); Toast.success('Proveedor eliminado'); await this.init(); }
        catch (err) { Toast.error(err.message); }
    }
};
