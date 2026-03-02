/**
 * pagination.js — Componente de paginación reutilizable
 */

class Pagination {
    constructor({ containerId, data = [], itemsPerPage = 15, renderFn, searchFields = [] }) {
        this.containerId = containerId;
        this.allData = data;
        this.filteredData = data;
        this.itemsPerPage = itemsPerPage;
        this.renderFn = renderFn;
        this.searchFields = searchFields;
        this.currentPage = 1;
    }

    setData(data) {
        this.allData = data;
        this.filteredData = data;
        this.currentPage = 1;
        this.render();
    }

    search(query) {
        if (!query || !query.trim()) {
            this.filteredData = this.allData;
        } else {
            const q = normalizarTexto(query);
            this.filteredData = this.allData.filter(item => {
                return this.searchFields.some(field => {
                    const val = item[field];
                    return val && normalizarTexto(String(val)).includes(q);
                });
            });
        }
        this.currentPage = 1;
        this.render();
    }

    filter(filterFn) {
        this.filteredData = this.allData.filter(filterFn);
        this.currentPage = 1;
        this.render();
    }

    goToPage(page) {
        const totalPages = this._totalPages();
        if (page < 1 || page > totalPages) return;
        this.currentPage = page;
        this.render();
    }

    _totalPages() {
        return Math.max(1, Math.ceil(this.filteredData.length / this.itemsPerPage));
    }

    _currentPageData() {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        return this.filteredData.slice(start, start + this.itemsPerPage);
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const pageData = this._currentPageData();
        const total = this.filteredData.length;
        const totalPages = this._totalPages();
        const start = total === 0 ? 0 : (this.currentPage - 1) * this.itemsPerPage + 1;
        const end = Math.min(this.currentPage * this.itemsPerPage, total);

        // Renderizar datos (Tabla o Grid)
        const tableBody = container.querySelector('tbody');
        const contentContainer = container.querySelector('.pagination-content');

        const target = tableBody || contentContainer;

        if (target) {
            if (pageData.length === 0) {
                const colspan = tableBody ? 'colspan="99"' : '';
                const emptyHTML = tableBody
                    ? `<tr><td ${colspan} class="text-center" style="padding:2rem;color:var(--text-muted)"><i class="fas fa-inbox" style="font-size:2rem;display:block;margin-bottom:0.5rem;opacity:0.4"></i>Sin resultados</td></tr>`
                    : `<div class="text-center" style="padding:2rem;color:var(--text-muted);width:100%"><i class="fas fa-inbox" style="font-size:2rem;display:block;margin-bottom:0.5rem;opacity:0.4"></i>Sin resultados</div>`;
                target.innerHTML = emptyHTML;
            } else {
                target.innerHTML = pageData.map(item => this.renderFn(item)).join('');
            }
        }

        // Renderizar paginación
        const paginationEl = container.querySelector('.pagination-wrapper');
        if (paginationEl) {
            paginationEl.innerHTML = `
        <span class="pagination-info">Mostrando ${start}–${end} de ${total} registros</span>
        <div class="pagination-controls">
          <button class="page-btn" onclick="this.closest('[id]').pagination?.goToPage(1)" ${this.currentPage === 1 ? 'disabled' : ''} title="Primera">«</button>
          <button class="page-btn" onclick="this.closest('[id]').pagination?.goToPage(${this.currentPage - 1})" ${this.currentPage === 1 ? 'disabled' : ''} title="Anterior">‹</button>
          ${this._renderPageNumbers(totalPages)}
          <button class="page-btn" onclick="this.closest('[id]').pagination?.goToPage(${this.currentPage + 1})" ${this.currentPage === totalPages ? 'disabled' : ''} title="Siguiente">›</button>
          <button class="page-btn" onclick="this.closest('[id]').pagination?.goToPage(${totalPages})" ${this.currentPage === totalPages ? 'disabled' : ''} title="Última">»</button>
        </div>
      `;
            // Guardar referencia
            container.pagination = this;
        }
    }

    _renderPageNumbers(totalPages) {
        const pages = [];
        const range = 2;
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - range && i <= this.currentPage + range)) {
                pages.push(i);
            } else if (pages[pages.length - 1] !== '...') {
                pages.push('...');
            }
        }
        return pages.map(p => p === '...'
            ? `<span class="page-btn" style="cursor:default">…</span>`
            : `<button class="page-btn ${p === this.currentPage ? 'active' : ''}" onclick="this.closest('[id]').pagination?.goToPage(${p})">${p}</button>`
        ).join('');
    }
}

window.Pagination = Pagination;
