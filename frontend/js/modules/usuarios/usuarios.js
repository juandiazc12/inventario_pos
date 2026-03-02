/**
 * usuarios.js — Módulo Usuarios (solo admin)
 */

window.usuarios_module = {
    _pagination: null,
    _MODULOS: ['dashboard', 'inventario', 'productos', 'categorias', 'ventas', 'compras', 'pedidos', 'clientes', 'proveedores', 'insumos', 'usuarios', 'resumenes', 'auditoria', 'configuracion', 'google', 'whatsapp', 'traslados', 'devoluciones'],

    async init() {
        try {
            const usuarios = await API.get('/usuarios');
            this._pagination = new Pagination({
                containerId: 'usuarios-table-container',
                data: usuarios,
                itemsPerPage: 15,
                searchFields: ['usuario', 'nombre'],
                renderFn: (u) => `
          <tr>
            <td><code>${escapeHtml(u.usuario)}</code></td>
            <td>${escapeHtml(u.nombre || '—')}</td>
            <td><span class="badge ${u.rol === 'admin' ? 'badge-info' : 'badge-secondary'}">${u.rol}</span></td>
            <td style="font-size:0.8rem">${formatDate(u.ultimo_login, true)}</td>
            <td><span class="badge ${u.activo ? 'badge-ok' : 'badge-sin-stock'}">${u.activo ? 'Activo' : 'Inactivo'}</span></td>
            <td class="actions">
              <button class="btn btn-sm btn-secondary" onclick="usuarios_module.editar(${u.id})"><i class="fas fa-edit"></i></button>
              <button class="btn btn-sm btn-danger" onclick="usuarios_module.eliminar(${u.id})"><i class="fas fa-trash"></i></button>
            </td>
          </tr>`
            });
            this._pagination.render();
            document.getElementById('btn-nuevo-usuario')?.addEventListener('click', () => this.abrirFormulario());
        } catch (err) { Toast.error('Error: ' + err.message); }
    },

    _formHtml(u = null) {
        const permisos = u?.permisos ? (typeof u.permisos === 'string' ? JSON.parse(u.permisos) : u.permisos) : this._MODULOS;
        const permisosHtml = this._MODULOS.map(m => `
      <label class="form-check">
        <input type="checkbox" name="permiso" value="${m}" ${permisos.includes(m) ? 'checked' : ''}>
        <span>${m}</span>
      </label>`).join('');
        return `
      <div class="form-grid">
        <div class="form-group"><label>Usuario *</label><input type="text" class="form-control" id="uf-usuario" value="${escapeHtml(u?.usuario || '')}"></div>
        <div class="form-group"><label>Nombre</label><input type="text" class="form-control" id="uf-nombre" value="${escapeHtml(u?.nombre || '')}"></div>
        <div class="form-group"><label>Contraseña ${u ? '(vacío = no cambiar)' : '*'}</label><input type="password" class="form-control" id="uf-password" autocomplete="new-password"></div>
        <div class="form-group"><label>Rol</label><select class="form-control" id="uf-rol"><option value="operador" ${u?.rol === 'operador' ? 'selected' : ''}>Operador</option><option value="admin" ${u?.rol === 'admin' ? 'selected' : ''}>Admin</option></select></div>
      </div>
      <div class="form-group"><label>Permisos</label><div class="permisos-grid">${permisosHtml}</div></div>`;
    },

    abrirFormulario(usuario = null) {
        Modal.open({
            title: usuario ? 'Editar Usuario' : 'Nuevo Usuario',
            size: 'lg',
            body: this._formHtml(usuario),
            footer: `<button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button><button class="btn btn-primary" onclick="usuarios_module.guardar(${usuario?.id || 'null'})"><i class="fas fa-save"></i> Guardar</button>`
        });
    },

    async editar(id) {
        const usuarios = await API.get('/usuarios');
        const u = usuarios.find(x => x.id === id);
        if (u) this.abrirFormulario(u);
    },

    async guardar(id) {
        const permisos = [...document.querySelectorAll('input[name="permiso"]:checked')].map(el => el.value);
        const data = {
            usuario: document.getElementById('uf-usuario').value.trim(),
            nombre: document.getElementById('uf-nombre').value.trim(),
            password: document.getElementById('uf-password').value,
            rol: document.getElementById('uf-rol').value,
            permisos
        };
        if (!data.usuario) { Toast.warning('El usuario es requerido'); return; }
        if (!id && !data.password) { Toast.warning('La contraseña es requerida para nuevos usuarios'); return; }
        try {
            if (id) { await API.put(`/usuarios/${id}`, data); Toast.success('Usuario actualizado'); }
            else { await API.post('/usuarios', data); Toast.success('Usuario creado'); }
            Modal.close();
            await this.init();
        } catch (err) { Toast.error(err.message); }
    },

    async eliminar(id) {
        const currentUser = AppState.get('user');
        if (currentUser?.id === id) { Toast.warning('No puedes eliminar tu propio usuario'); return; }
        const result = await Swal.fire({ title: '¿Eliminar usuario?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Eliminar', confirmButtonColor: '#ef4444' });
        if (!result.isConfirmed) return;
        try { await API.delete(`/usuarios/${id}`); Toast.success('Usuario eliminado'); await this.init(); }
        catch (err) { Toast.error(err.message); }
    }
};
