/**
 * auditoria.js — Módulo Auditoría
 */

window.auditoria_module = {
    _pagination: null,

    async init() {
        try {
            const data = await API.get('/auditoria');
            this._renderTabla(data.logs || data);

            document.getElementById('btn-filtrar-audit')?.addEventListener('click', () => this.filtrar());
            document.getElementById('btn-limpiar-auditoria')?.addEventListener('click', () => this.limpiar());

            const debouncedSearch = debounce((q) => {
                if (this._pagination) this._pagination.search(q);
            }, 300);
            document.getElementById('audit-search')?.addEventListener('input', e => debouncedSearch(e.target.value));
        } catch (err) { Toast.error('Error: ' + err.message); }
    },

    _renderTabla(logs) {
        this._pagination = new Pagination({
            containerId: 'auditoria-table-container',
            data: logs,
            itemsPerPage: 25,
            searchFields: ['usuario_nombre', 'accion', 'modulo', 'detalle'],
            renderFn: (l) => `
        <tr>
          <td style="font-size:0.75rem;white-space:nowrap">${formatDate(l.fecha, true)}</td>
          <td>${escapeHtml(l.usuario_nombre || '—')}</td>
          <td><code style="font-size:0.75rem">${escapeHtml(l.accion || '—')}</code></td>
          <td>${escapeHtml(l.modulo || '—')}</td>
          <td style="font-size:0.8rem;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(l.detalle || '')}">${escapeHtml(l.detalle || '—')}</td>
          <td><span class="badge ${l.estado === 'exito' ? 'badge-ok' : 'badge-sin-stock'}">${l.estado || '—'}</span></td>
          <td style="font-size:0.75rem;color:var(--text-muted)">${escapeHtml(l.ip || '—')}</td>
        </tr>`
        });
        this._pagination.render();
    },

    async filtrar() {
        const fi = document.getElementById('audit-fecha-inicio').value;
        const ff = document.getElementById('audit-fecha-fin').value;
        let url = '/auditoria?';
        if (fi) url += `fecha_inicio=${fi}&`;
        if (ff) url += `fecha_fin=${ff}`;
        const data = await API.get(url);
        this._renderTabla(data.logs || data);
    },

    async limpiar() {
        const result = await Swal.fire({
            title: '¿Limpiar logs antiguos?',
            text: 'Se eliminarán todos los registros de auditoría con más de 90 días.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Limpiar',
            confirmButtonColor: '#ef4444'
        });
        if (!result.isConfirmed) return;
        try {
            const res = await API.delete('/auditoria/limpiar');
            Toast.success(`${res.eliminados} registros eliminados`);
            await this.init();
        } catch (err) { Toast.error(err.message); }
    }
};
