/**
 * clientes.js — Módulo Clientes
 */

window.clientes_module = {
    _pagination: null,

    async init() {
        try {
            const clientes = await API.get('/clientes');
            this._pagination = new Pagination({
                containerId: 'clientes-table-container',
                data: clientes,
                itemsPerPage: 15,
                searchFields: ['nombre', 'documento', 'telefono', 'email'],
                renderFn: (c) => `
          <tr>
            <td><strong>${escapeHtml(c.nombre)}</strong></td>
            <td>${escapeHtml(c.documento || '—')}</td>
            <td>${escapeHtml(c.telefono || '—')}</td>
            <td>${escapeHtml(c.email || '—')}</td>
            <td class="actions">
              <button class="btn btn-sm btn-secondary" onclick="clientes_module.editar(${c.id})" title="Editar"><i class="fas fa-edit"></i></button>
              <button class="btn btn-sm btn-danger" onclick="clientes_module.eliminar(${c.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
            </td>
          </tr>`
            });
            this._pagination.render();
            const debouncedSearch = debounce((q) => this._pagination.search(q), 300);
            document.getElementById('cliente-search')?.addEventListener('input', e => debouncedSearch(e.target.value));
            document.getElementById('btn-nuevo-cliente')?.addEventListener('click', () => this.abrirFormulario());
        } catch (err) { Toast.error('Error: ' + err.message); }
    },

    _formHtml(c = null) {
        return `
      <div class="form-group"><label>Nombre *</label><input type="text" class="form-control" id="clf-nombre" value="${escapeHtml(c?.nombre || '')}"></div>
      <div class="form-grid">
        <div class="form-group"><label>Documento</label><input type="text" class="form-control" id="clf-documento" value="${escapeHtml(c?.documento || '')}"></div>
        <div class="form-group"><label>Teléfono</label><input type="text" class="form-control" id="clf-telefono" value="${escapeHtml(c?.telefono || '')}"></div>
      </div>
      <div class="form-group"><label>Email</label><input type="email" class="form-control" id="clf-email" value="${escapeHtml(c?.email || '')}"></div>
      <div class="form-group"><label>Dirección</label><textarea class="form-control" id="clf-direccion" rows="2">${escapeHtml(c?.direccion || '')}</textarea></div>`;
    },

    abrirFormulario(cliente = null) {
        Modal.open({
            title: cliente ? 'Editar Cliente' : 'Nuevo Cliente',
            body: this._formHtml(cliente),
            footer: `<button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button><button class="btn btn-primary" onclick="clientes_module.guardar(${cliente?.id || 'null'})"><i class="fas fa-save"></i> Guardar</button>`
        });
    },

    async editar(id) {
        const c = await API.get(`/clientes/${id}`);
        this.abrirFormulario(c);
    },

    async guardar(id) {
        const data = {
            nombre: document.getElementById('clf-nombre').value.trim(),
            documento: document.getElementById('clf-documento').value.trim(),
            telefono: document.getElementById('clf-telefono').value.trim(),
            email: document.getElementById('clf-email').value.trim(),
            direccion: document.getElementById('clf-direccion').value.trim()
        };
        if (!data.nombre) { Toast.warning('El nombre es requerido'); return; }
        try {
            if (id) { await API.put(`/clientes/${id}`, data); Toast.success('Cliente actualizado'); }
            else { await API.post('/clientes', data); Toast.success('Cliente creado'); }
            Modal.close();
            await this.init();
        } catch (err) { Toast.error(err.message); }
    },

    async eliminar(id) {
        const result = await Swal.fire({ title: '¿Eliminar cliente?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Eliminar', confirmButtonColor: '#ef4444' });
        if (!result.isConfirmed) return;
        try { await API.delete(`/clientes/${id}`); Toast.success('Cliente eliminado'); await this.init(); }
        catch (err) { Toast.error(err.message); }
    }
};
