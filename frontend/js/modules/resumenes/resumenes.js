/**
 * resumenes.js — Módulo Resúmenes
 */

window.resumenes_module = {
  state: {
    ventas: {
      page: 1,
      limit: 10,
      busqueda: '',
      total: 0
    }
  },

  async init() {
    try {
      const [diario, semanal, mensual, masVendidos] = await Promise.all([
        API.get('/resumenes/diario'),
        API.get('/resumenes/semanal'),
        API.get('/resumenes/mensual'),
        API.get('/resumenes/mas-vendidos?periodo=mes')
      ]);

      this._renderResumen('res-diario-body', diario);
      this._renderResumen('res-semanal-body', semanal);
      this._renderResumen('res-mensual-body', mensual);
      this._renderMasVendidos(masVendidos);

      await this.fetchVentasRecientes();

      document.getElementById('mas-vendidos-periodo')?.addEventListener('change', async (e) => {
        const data = await API.get(`/resumenes/mas-vendidos?periodo=${e.target.value}`);
        this._renderMasVendidos(data);
      });

      // Listeners Ventas Recientes
      document.getElementById('ventas-busqueda')?.addEventListener('input', Utils.debounce(async (e) => {
        this.state.ventas.busqueda = e.target.value;
        this.state.ventas.page = 1;
        await this.fetchVentasRecientes();
      }, 500));

      document.getElementById('ventas-limite')?.addEventListener('change', async (e) => {
        this.state.ventas.limit = parseInt(e.target.value);
        this.state.ventas.page = 1;
        await this.fetchVentasRecientes();
      });

    } catch (err) { Toast.error('Error: ' + err.message); }
  },

  async fetchVentasRecientes() {
    try {
      const { page, limit, busqueda } = this.state.ventas;
      const resp = await API.get(`/resumenes/ventas-recientes?page=${page}&limit=${limit}&busqueda=${encodeURIComponent(busqueda)}`);
      this.state.ventas.total = resp.total;
      this._renderVentasRecientes(resp.data);
      this._renderPagination();
    } catch (err) { Toast.error('Error al cargar ventas: ' + err.message); }
  },

  _renderPagination() {
    const container = document.getElementById('ventas-pagination');
    if (!container) return;

    const { page, limit, total } = this.state.ventas;
    const totalPages = Math.ceil(total / limit);

    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    let html = `
      <button class="btn btn-sm btn-outline" ${page === 1 ? 'disabled' : ''} onclick="resumenes_module.changePage(${page - 1})">
        <i class="fas fa-chevron-left"></i>
      </button>
      <span style="font-size:0.85rem;margin:0 1rem">Página ${page} de ${totalPages}</span>
      <button class="btn btn-sm btn-outline" ${page === totalPages ? 'disabled' : ''} onclick="resumenes_module.changePage(${page + 1})">
        <i class="fas fa-chevron-right"></i>
      </button>
    `;
    container.innerHTML = html;
  },

  async changePage(newPage) {
    this.state.ventas.page = newPage;
    await this.fetchVentasRecientes();
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
      tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:1.5rem;color:var(--text-muted)">Sin ventas hoy</td></tr>`;
      return;
    }
    tbody.innerHTML = data.map(v => {
      let estadoBadge = '<span class="badge badge-premium badge-success">Completada</span>';
      if (v.estado_devolucion === 1) {
        estadoBadge = '<span class="badge badge-premium badge-warning">Parcial</span>';
      } else if (v.estado_devolucion === 2) {
        estadoBadge = '<span class="badge badge-premium badge-info">Devuelto/Cambio</span>';
      }

      return `
      <tr>
        <td style="font-size:0.8rem; color:var(--text-secondary)">${formatDate(v.fecha, true)}</td>
        <td><strong style="color:var(--text-primary)">${escapeHtml(v.cliente_nombre || 'Consumidor Final')}</strong></td>
        <td><code style="background:var(--bg-hover); padding:2px 6px; border-radius:4px;">${escapeHtml(v.ticket_numero || '—')}</code></td>
        <td><small style="color:var(--text-muted)">${escapeHtml(v.usuario_nombre || '—')}</small></td>
        <td>${estadoBadge}</td>
        <td style="font-weight:700; color:var(--success); font-size:1rem;">${formatCOP(v.total)}</td>
      </tr>`;
    }).join('');
  }
};
