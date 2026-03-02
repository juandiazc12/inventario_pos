/**
 * dashboard.js — Módulo Dashboard
 */

window.dashboard_module = {
    async init() {
        try {
            const [resumen, stockBajo, masVendidos, grafVentas, grafCategorias, trasladosPendientes, devolucionesStats] = await Promise.all([
                API.get('/dashboard/resumen'),
                API.get('/dashboard/stock-bajo'),
                API.get('/productos/mas-vendidos?periodo=mes'),
                API.get('/dashboard/grafico?tipo=ventas&periodo=30'),
                API.get('/dashboard/grafico?tipo=categorias&periodo=30'),
                API.get('/traslados?estado=pendiente'),
                API.get('/devoluciones/stats/resumen')
            ]);

            // KPIs
            document.getElementById('kpi-ventas').textContent = formatCOP(resumen.total_ventas);
            document.getElementById('kpi-num-ventas').textContent = `${resumen.num_ventas} transacciones`;
            document.getElementById('kpi-compras').textContent = formatCOP(resumen.total_compras);
            const ganancia = resumen.ganancia;
            const kpiGanancia = document.getElementById('kpi-ganancia');
            kpiGanancia.textContent = formatCOP(ganancia);
            kpiGanancia.style.color = ganancia >= 0 ? 'var(--success)' : 'var(--danger)';
            document.getElementById('kpi-productos').textContent = resumen.total_productos;
            document.getElementById('kpi-stock-bajo').textContent = resumen.total_stock_bajo;
            
            // Nuevos KPIs
            document.getElementById('kpi-traslados-pendientes').textContent = trasladosPendientes.length || 0;
            document.getElementById('kpi-devoluciones-mes').textContent = devolucionesStats.total_devoluciones || 0;

            // Gráficos
            Charts.renderLineChart('chart-ventas', grafVentas, 'Ventas');
            Charts.renderPieChart('chart-categorias', grafCategorias);
            Charts.renderBarChart('chart-mas-vendidos', masVendidos);

            // Stock bajo
            const stockEl = document.getElementById('dashboard-stock-bajo');
            if (stockBajo.length === 0) {
                stockEl.innerHTML = `<div class="empty-state" style="padding:1.5rem"><i class="fas fa-check-circle" style="color:var(--success)"></i><p>¡Todo el stock está bien!</p></div>`;
            } else {
                stockEl.innerHTML = `
          <table class="data-table">
            <thead><tr><th>Producto</th><th>Stock</th><th>Estado</th></tr></thead>
            <tbody>
              ${stockBajo.slice(0, 8).map(p => `
                <tr>
                  <td>${escapeHtml(p.nombre)}</td>
                  <td>${p.stock}</td>
                  <td>${renderStockBadge(p.stock)}</td>
                </tr>`).join('')}
            </tbody>
          </table>`;
            }

            // Cambio de período del gráfico
            document.getElementById('grafico-periodo')?.addEventListener('change', async (e) => {
                const periodo = e.target.value;
                const data = await API.get(`/dashboard/grafico?tipo=ventas&periodo=${periodo}`);
                Charts.renderLineChart('chart-ventas', data, 'Ventas');
            });

        } catch (err) {
            Toast.error('Error cargando el dashboard: ' + err.message);
        }
    }
};
