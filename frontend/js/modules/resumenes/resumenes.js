/**
 * resumenes.js — Módulo Resúmenes
 */

window.resumenes_module = {
  async init() {
    try {
      const [diario, semanal, mensual, masVendidos, ventasRecientes] = await Promise.all([
        API.get('/resumenes/diario'),
        API.get('/resumenes/semanal'),
        API.get('/resumenes/mensual'),
        API.get('/resumenes/mas-vendidos?periodo=mes'),
        API.get('/resumenes/ventas-recientes')
      ]);

      this._renderResumen('res-diario-body', diario);
      this._renderResumen('res-semanal-body', semanal);
      this._renderResumen('res-mensual-body', mensual);
      this._renderMasVendidos(masVendidos);
      this._renderVentasRecientes(ventasRecientes);

      document.getElementById('mas-vendidos-periodo')?.addEventListener('change', async (e) => {
        const data = await API.get(`/resumenes/mas-vendidos?periodo=${e.target.value}`);
        this._renderMasVendidos(data);
      });
    } catch (err) { Toast.error('Error: ' + err.message); }
  },

  _renderResumen(containerId, data) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const ganancia = data.ganancia;
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:0.5rem">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:0.8rem;color:var(--text-muted)">Ventas</span>
          <strong style="color:var(--success)">${formatCOP(data.total_ventas)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:0.8rem;color:var(--text-muted)">Compras</span>
          <strong style="color:var(--danger)">${formatCOP(data.total_compras)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border);padding-top:0.5rem">
          <span style="font-size:0.8rem;font-weight:600">Ganancia</span>
          <strong style="color:${ganancia >= 0 ? 'var(--success)' : 'var(--danger)'};font-size:1.1rem">${formatCOP(ganancia)}</strong>
        </div>
        <div style="font-size:0.75rem;color:var(--text-muted);text-align:right">${data.num_ventas} transacciones</div>
      </div>`;
  },

  _renderMasVendidos(data) {
    const tbody = document.getElementById('mas-vendidos-tbody');
    if (!tbody) return;
    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:1.5rem;color:var(--text-muted)">Sin datos</td></tr>`;
      return;
    }
    tbody.innerHTML = data.map((p, i) => `
      <tr>
        <td><strong style="color:${i < 3 ? 'var(--warning)' : 'var(--text-muted)'}">${i + 1}</strong></td>
        <td>${escapeHtml(p.nombre)}</td>
        <td><code style="font-size:0.75rem">${escapeHtml(p.codigo || '—')}</code></td>
        <td>${p.total_vendido}</td>
        <td>${formatCOP(p.total_ingresos)}</td>
      </tr>`).join('');
  },

  _renderVentasRecientes(data) {
    const tbody = document.getElementById('ventas-recientes-tbody');
    if (!tbody) return;
    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:1.5rem;color:var(--text-muted)">Sin ventas hoy</td></tr>`;
      return;
    }
    tbody.innerHTML = data.map(v => `
      <tr>
        <td style="font-size:0.8rem">${formatDate(v.fecha, true)}</td>
        <td><strong>${escapeHtml(v.cliente_nombre || 'Consumidor Final')}</strong></td>
        <td><code>${escapeHtml(v.ticket_numero || '—')}</code></td>
        <td><small>${escapeHtml(v.usuario_nombre || '—')}</small></td>
        <td style="font-weight:600; color:var(--success)">${formatCOP(v.total)}</td>
      </tr>`).join('');
  }
};
