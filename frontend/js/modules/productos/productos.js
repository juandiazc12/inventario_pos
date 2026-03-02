/**
 * productos.js — Módulo Productos (CRUD)
 */

window.productos_module = {
  _productos: [],
  _categorias: [],
  _pagination: null,

  async init() {
    try {
      const [productos, categorias] = await Promise.all([API.get('/productos'), API.get('/categorias')]);
      this._productos = productos;
      this._categorias = categorias;

      this._pagination = new Pagination({
        containerId: 'productos-table-container',
        data: productos,
        itemsPerPage: 15,
        searchFields: ['nombre', 'codigo', 'categoria_nombre'],
        renderFn: (p) => `
          <tr>
            <td>${p.imagen_url ? `<img src="${formatImageUrl(p.imagen_url)}" class="product-img img-clickable" onclick="openImagePreview('${formatImageUrl(p.imagen_url)}', '${escapeHtml(p.nombre)}')" onerror="this.style.display='none'">` : `<div class="product-img-placeholder"><i class="fas fa-box"></i></div>`}</td>
            <td><code style="font-size:0.75rem">${escapeHtml(p.codigo || '—')}</code></td>
            <td><strong>${escapeHtml(p.nombre)}</strong></td>
            <td>${escapeHtml(p.categoria_nombre || '—')}</td>
            <td>${escapeHtml(p.talla || '—')}</td>
            <td>${formatCOP(p.precio_compra)}</td>
            <td>${formatCOP(p.precio_venta)}</td>
            <td>${renderStockBadge(p.stock)}</td>
            <td class="actions">
              <button class="btn btn-sm btn-info" onclick="productos_module.generarQR(${p.id})" title="Ver QR"><i class="fas fa-qrcode"></i></button>
              <button class="btn btn-sm btn-secondary" onclick="productos_module.editar(${p.id})" title="Editar"><i class="fas fa-edit"></i></button>
              <button class="btn btn-sm btn-danger" onclick="productos_module.eliminar(${p.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
            </td>
          </tr>`
      });
      this._pagination.render();

      const debouncedSearch = debounce((q) => this._pagination.search(q), 300);
      document.getElementById('prod-search')?.addEventListener('input', e => debouncedSearch(e.target.value));
      document.getElementById('btn-nuevo-producto')?.addEventListener('click', () => this.abrirFormulario());
    } catch (err) { Toast.error('Error: ' + err.message); }
  },

  async editar(id) {
    try {
      // Intentar obtener datos frescos del backend para asegurar stock/precios actuales
      const producto = await API.get(`/productos/${id}`);
      if (!producto) return Toast.error('Producto no encontrado');
      this.abrirFormulario(producto);
    } catch (err) {
      // Fallback a los datos locales si falla la red
      const p = this._productos.find(x => x.id === id);
      if (p) this.abrirFormulario(p);
      else Toast.error('No se pudo cargar el producto');
    }
  },

  abrirFormulario(producto = null) {
    const isEdit = !!producto;
    const catOptions = this._categorias.map(c => `<option value="${c.id}" ${producto?.categoria_id == c.id ? 'selected' : ''}>${escapeHtml(c.nombre)}</option>`).join('');

    Modal.open({
      title: isEdit ? 'Editar Producto' : 'Nuevo Producto',
      size: 'lg',
      body: `
        <div class="form-grid">
          <div class="form-group form-full">
            <label>Nombre *</label>
            <input type="text" class="form-control" id="pf-nombre" value="${escapeHtml(producto?.nombre || '')}" required>
          </div>
          <div class="form-group">
            <label>Código / SKU</label>
            <div class="qr-input-group">
              <input type="text" class="form-control" id="pf-codigo" value="${escapeHtml(producto?.codigo || '')}" placeholder="EAN13, SKU...">
              <button type="button" class="btn-qr" onclick="QRScanner.open('pf-codigo')" title="Escanear Código">
                <i class="fas fa-qrcode"></i>
              </button>
            </div>
          </div>
          <div class="form-group">
            <label>Categoría</label>
            <select class="form-control" id="pf-categoria"><option value="">Sin categoría</option>${catOptions}</select>
          </div>
          <div class="form-group">
            <label>Precio Compra</label>
            <input type="number" class="form-control" id="pf-precio-compra" value="${producto?.precio_compra || 0}" min="0" step="0.01">
          </div>
          <div class="form-group">
            <label>Precio Venta</label>
            <input type="number" class="form-control" id="pf-precio-venta" value="${producto?.precio_venta || 0}" min="0" step="0.01">
          </div>
          <div class="form-group">
            <label>Stock</label>
            <input type="number" class="form-control" id="pf-stock" value="${producto?.stock || 0}" min="0">
          </div>
          <div class="form-group">
            <label>Talla / Tamaño</label>
            <input type="text" class="form-control" id="pf-talla" value="${escapeHtml(producto?.talla || '')}" placeholder="S, M, L, 32, 40...">
          </div>
          <div class="form-group form-full">
            <label>Subir Imagen</label>
            <div id="producto-imagen-container"></div>
          </div>
          <div class="form-group form-full">
            <label>O pegar URL de Imagen</label>
            <input type="text" class="form-control" id="pf-imagen-url" value="${escapeHtml(producto?.imagen_url || '')}" placeholder="https://example.com/imagen.jpg">
          </div>
        </div>`,
      footer: `
        <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
        <button class="btn btn-primary" id="btn-guardar-producto">
          <i class="fas fa-save"></i> Guardar
        </button>`
    });

    // Inicializar subida de imagen
    this.initImageUpload(producto?.id, producto?.imagen_url);

    document.getElementById('btn-guardar-producto')?.addEventListener('click', () => this.guardar(producto?.id));
  },

  initImageUpload(productoId = null, currentUrl = null) {
    this._pendingImageFile = null;
    this._uploadedImageUrl = currentUrl;

    new ImageUpload({
      containerId: 'producto-imagen-container',
      currentUrl: currentUrl,
      uploadEndpoint: productoId ? `/productos/${productoId}/imagen` : null,
      onUpload: (urlOrFile) => {
        if (typeof urlOrFile === 'string') {
          this._uploadedImageUrl = urlOrFile;
        } else {
          this._pendingImageFile = urlOrFile;
        }
      }
    });
  },

  async guardar(id) {
    const data = {
      nombre: document.getElementById('pf-nombre').value.trim(),
      codigo: document.getElementById('pf-codigo').value.trim(),
      categoria_id: document.getElementById('pf-categoria').value || null,
      precio_compra: parseFloat(document.getElementById('pf-precio-compra').value) || 0,
      precio_venta: parseFloat(document.getElementById('pf-precio-venta').value) || 0,
      stock: parseInt(document.getElementById('pf-stock').value) || 0,
      talla: document.getElementById('pf-talla').value.trim(),
      imagen_url: document.getElementById('pf-imagen-url').value.trim() || this._uploadedImageUrl
    };
    if (!data.nombre) { Toast.warning('El nombre es requerido'); return; }

    // Generar código si no tiene después de crear/actualizar
    if (!data.codigo) {
      data.codigo = `PROD-${Date.now().toString().slice(-6)}`;
    }

    try {
      if (id) {
        await API.put(`/productos/${id}`, data);
        Toast.success('Producto actualizado');
      } else {
        const newProd = await API.post('/productos', data);

        // Si hay un archivo pendiente, subirlo ahora que tenemos el ID
        if (this._pendingImageFile) {
          const formData = new FormData();
          formData.append('imagen', this._pendingImageFile);
          await fetch(`${API_BASE}/productos/${newProd.id}/imagen`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: formData
          });
        }
        Toast.success('Producto creado');

        // Abrir QR automáticamente tras crear
        setTimeout(() => {
          this.generarQR(newProd.id);
        }, 800);
      }
      Modal.close();
      AppState.clearCache('productos');
      await this.init();
    } catch (err) { Toast.error(err.message); }
  },

  async eliminar(id) {
    const result = await Swal.fire({ title: '¿Eliminar producto?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Eliminar', confirmButtonColor: '#ef4444' });
    if (!result.isConfirmed) return;
    try {
      await API.delete(`/productos/${id}`);
      Toast.success('Producto eliminado');
      await this.init();
    } catch (err) { Toast.error(err.message); }
  },

  async generarQR(id) {
    let producto = this._productos.find(p => p.id === id);

    // Si no está en caché local, intentar obtenerlo del servidor
    if (!producto) {
      try {
        producto = await API.get(`/productos/${id}`);
      } catch (err) {
        return Toast.error('No se pudo encontrar la información del producto');
      }
    }

    if (!producto) return Toast.error('Producto no encontrado');

    // Si el producto no tiene código, generarlo y guardarlo ahora
    if (!producto.codigo) {
      try {
        const nuevoCodigo = `PROD-${Date.now().toString().slice(-6)}`;
        Toast.info('Generando código automático...');
        const actualizadp = await API.put(`/productos/${id}`, { ...producto, codigo: nuevoCodigo });
        producto = actualizadp;
        // Refrescar lista local en segundo plano
        this.init();
      } catch (err) {
        return Toast.error('Error al asignar código automático: ' + err.message);
      }
    }

    Modal.open({
      title: 'Identificador de Producto',
      size: 'lg',
      body: `
        <div style="text-align:center; padding: 30px; background: var(--bg-surface); color: var(--text-primary); border-radius: 12px; border: 1px solid var(--border-default);">
          <h2 style="margin-bottom: 5px; color: var(--primary); font-family: var(--font-display);">${escapeHtml(producto.nombre)}</h2>
          <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 20px;">SKU: ${escapeHtml(producto.codigo)}</p>
          
          <div style="display: flex; flex-direction: column; align-items: center; gap: 20px; margin: 25px 0;">
            <div style="display: flex; gap: 20px; align-items: stretch; justify-content: center; flex-wrap: wrap;">
                <div id="qrcode-canvas" style="display: flex; align-items: center; justify-content: center; padding: 15px; background: #fff; border: 1px solid var(--border-default); border-radius: 8px;"></div>
                <div style="display: flex; align-items: center; justify-content: center; padding: 15px; background: #fff; border: 1px solid var(--border-default); border-radius: 8px;">
                    <svg id="barcode-canvas"></svg>
                </div>
            </div>
          </div>
          
          <div style="margin-top: 20px;">
            <div style="font-size: 1.8rem; font-weight: 800; color: var(--success); margin-bottom: 5px; font-family: var(--font-display);">
              $${Number(producto.precio_venta).toLocaleString('es-CO')}
            </div>
            <p style="font-size: 0.8rem; color: var(--text-muted);"><i class="fas fa-shield-alt"></i> Etiqueta Auténtica del Sistema</p>
          </div>
        </div>`,
      footer: `
        <button class="btn btn-secondary" onclick="Modal.close()"><i class="fas fa-times"></i> Cerrar</button>
        <button class="btn btn-primary" onclick="productos_module.imprimirEtiqueta()">
          <i class="fas fa-print"></i> Imprimir Etiqueta
        </button>`
    });

    setTimeout(() => {
      document.getElementById("qrcode-canvas").innerHTML = "";
      new QRCode(document.getElementById("qrcode-canvas"), {
        text: producto.codigo,
        width: 150,
        height: 150,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });

      try {
        JsBarcode("#barcode-canvas", producto.codigo, {
          format: "CODE128",
          lineColor: "#000",
          width: 2,
          height: 80,
          displayValue: false
        });
      } catch (err) {
        console.warn("No se pudo generar el código de barras:", err);
      }
    }, 150);
  },

  descargarQR() {
    const canvas = document.querySelector('#qrcode-canvas canvas');
    if (!canvas) {
      const img = document.querySelector('#qrcode-canvas img');
      if (img) {
        const link = document.createElement('a');
        link.download = `QR-${document.querySelector('#modal-main p')?.innerText.replace('SKU: ', '') || 'producto'}.png`;
        link.href = img.src;
        link.click();
        return;
      }
      Toast.warning('No se ha generado el QR aún');
      return;
    }

    const link = document.createElement('a');
    link.download = `QR-${document.querySelector('#modal-main p')?.innerText.replace('SKU: ', '') || 'producto'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  },

  imprimirEtiqueta() {
    const qrCanvas = document.querySelector('#qrcode-canvas img') || document.querySelector('#qrcode-canvas canvas');
    const qrContent = qrCanvas ? (qrCanvas.src || qrCanvas.toDataURL?.()) : null;

    // El barcode SVG a DataURI
    let barcodeContent = null;
    const barcodeSvg = document.querySelector('#barcode-canvas');
    if (barcodeSvg) {
      const svgData = new XMLSerializer().serializeToString(barcodeSvg);
      barcodeContent = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    }

    const name = document.querySelector('#modal-main h2')?.innerText || "Producto";
    const code = document.querySelector('#modal-main p')?.innerText.replace('SKU: ', '') || "";
    const price = document.querySelector('#modal-main div[style*="font-size: 1.8rem"]')?.innerText || "";

    if (!qrContent && !barcodeContent) return Toast.warning("Faltan códigos para imprimir");

    const win = window.open('', '_blank', 'width=450,height=600');
    win.document.write(`
      <html>
        <head>
          <title>Etiqueta - ${name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; text-align: center; padding: 20px; color: #111; margin: 0; }
            .sticker { border: 2px solid #000; padding: 15px; border-radius: 12px; display: inline-block; width: 320px; max-width: 100%; box-sizing: border-box; }
            .header { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 8px; }
            .name { font-size: 18px; font-weight: 800; margin: 5px 0; color: #000; line-height: 1.2; word-wrap: break-word; }
            .codes-container { display: flex; align-items: center; justify-content: space-around; margin: 15px 0; }
            .qr-wrapper img { width: 100px; height: 100px; }
            .barcode-wrapper img { height: 75px; width: 100%; max-width: 170px; object-fit: contain; }
            .price { font-size: 22px; font-weight: 800; margin: 8px 0; color: #000; }
            .code { font-family: monospace; font-size: 12px; color: #333; font-weight: bold; letter-spacing: 1px; }
            @media print { 
              .no-print { display: none; } 
              body { padding: 0; display: flex; justify-content: center; align-items: flex-start; } 
              .sticker { border: 1px dashed #ccc; margin: 0; page-break-inside: avoid; } 
            }
          </style>
        </head>
        <body onload="setTimeout(() => { window.print(); window.close(); }, 800);">
          <div class="sticker">
            <div class="header">Etiqueta de Inventario</div>
            <div class="name">${name}</div>
            <div class="codes-container">
              ${qrContent ? `<div class="qr-wrapper"><img src="${qrContent}" alt="QR"></div>` : ''}
              ${barcodeContent ? `<div class="barcode-wrapper"><img src="${barcodeContent}" alt="Barcode"></div>` : ''}
            </div>
            <div class="code">${code}</div>
            <div class="price">${price}</div>
          </div>
        </body>
      </html>
    `);
    win.document.close();
  }
};
