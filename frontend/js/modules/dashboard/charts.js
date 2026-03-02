/**
 * charts.js — Gráficos con Chart.js
 */

const Charts = {
    _instances: {},

    _destroy(id) {
        if (this._instances[id]) {
            this._instances[id].destroy();
            delete this._instances[id];
        }
    },

    renderLineChart(canvasId, data, label = 'Total') {
        this._destroy(canvasId);
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const labels = data.map(d => formatDate(d.fecha));
        const values = data.map(d => parseFloat(d.total) || 0);

        this._instances[canvasId] = new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label,
                    data: values,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99,102,241,0.1)',
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#6366f1',
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { callback: v => formatCOP(v) },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    },
                    x: { grid: { display: false } }
                }
            }
        });
    },

    renderPieChart(canvasId, data) {
        this._destroy(canvasId);
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const colors = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];

        this._instances[canvasId] = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: data.map(d => d.label),
                datasets: [{
                    data: data.map(d => parseFloat(d.value) || 0),
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 15, font: { size: 12 } } }
                }
            }
        });
    },

    renderBarChart(canvasId, data) {
        this._destroy(canvasId);
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        this._instances[canvasId] = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: data.map(d => d.nombre || d.label),
                datasets: [{
                    label: 'Unidades vendidas',
                    data: data.map(d => d.total_vendido || d.value || 0),
                    backgroundColor: 'rgba(99,102,241,0.8)',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }
};

window.Charts = Charts;
