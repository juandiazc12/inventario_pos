/**
 * ticket.js — Generador de tickets de venta
 */

const TicketComponent = {
  /**
   * Muestra el modal del ticket de venta
   */
  mostrar(venta) {
    const fecha = formatDate(venta.fecha || new Date(), true);
    const total = formatCOP(venta.total);

    // Renderizar items del carrito en el ticket
    const itemsHtml = (venta.items || []).map(item => `
            <div style="margin-bottom: 0.5rem;">
                <div style="font-size: 0.8rem; font-weight: bold;">${escapeHtml((item.producto ? item.producto.nombre : item.producto_nombre) || 'Producto')}</div>
                <div style="display:flex; justify-content:space-between; font-size:0.8rem;">
                    <span>${item.cantidad} × ${formatCOP(item.precio_venta)}</span>
                    <span>${formatCOP(item.cantidad * item.precio_venta)}</span>
                </div>
            </div>
        `).join('');

    const html = `
      <div id="ticket-print-area" style="font-family: 'Courier New', monospace; max-width: 300px; margin: 0 auto; color: #000; background: #fff; padding: 10px;">
        <div style="text-align:center; border-bottom: 1px dashed #000; padding-bottom: 1rem; margin-bottom: 1rem;">
          <h2 style="font-size: 1.2rem; margin: 0; font-weight: bold; text-transform: uppercase;">INVENTARIO PRO</h2>
          <p style="font-size: 0.75rem; margin: 0.25rem 0 0;">NIT: 123.456.789-0</p>
          <p style="font-size: 0.75rem; margin: 0;">Tel: 555-0123</p>
        </div>

        <div style="font-size: 0.8rem; margin-bottom: 1rem;">
          <div style="display:flex; justify-content:space-between;">
            <span>Ticket:</span>
            <strong>${escapeHtml(venta.ticket_numero || venta.ticket || 'N/A')}</strong>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span>Fecha:</span>
            <span>${fecha}</span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span>Cliente:</span>
            <span>${escapeHtml(venta.cliente_nombre || 'Consumidor Final')}</span>
          </div>
        </div>

        <div style="border-bottom: 1px dashed #000; padding-bottom: 0.5rem; margin-bottom: 0.5rem; font-size: 0.75rem; font-weight: bold; display: flex; justify-content: space-between;">
            <span>DESCRIPCIÓN</span>
            <span>SUBTOTAL</span>
        </div>

        <div style="border-bottom: 1px dashed #000; padding-bottom: 0.5rem; margin-bottom: 0.75rem;">
          ${itemsHtml}
        </div>

        <div style="display:flex; justify-content:space-between; font-size:1.1rem; font-weight:bold; margin-bottom:1rem;">
          <span>TOTAL:</span>
          <span>${total}</span>
        </div>

        <div style="text-align:center; font-size:0.75rem; border-top: 1px dashed #000; padding-top: 0.75rem; margin-top: 0.5rem;">
          ¡GRACIAS POR SU PREFERENCIA!<br>
          Visite nuestro sitio web
        </div>

        <!-- Política de Devoluciones Colombia -->
        <div style="margin-top: 1rem; padding-top: 0.5rem; border-top: 1px solid #000; font-size: 0.65rem; line-height: 1.2;">
          <strong style="display:block; text-align:center; margin-bottom: 0.25rem;">POLÍTICA DE CAMBIOS Y DEVOLUCIONES (COLOMBIA)</strong>
          <ul style="margin: 0; padding-left: 10px;">
            <li><strong>Plazo para cambios:</strong> 30 días calendario con ticket original.</li>
            <li><strong>Estado del producto:</strong> Sin uso, etiquetas y empaque original.</li>
            <li><strong>Garantía Legal:</strong> Defectos de fábrica según fabricante o 1 año (Ley 1480).</li>
            <li><strong>Derecho de Retracto:</strong> 5 días hábiles para compras no presenciales/financiadas.</li>
            <li><strong>Saldos:</strong> No devolución de efectivo por cambio de opinión; se genera saldo a favor o cambio directo pagando excedente.</li>
          </ul>
        </div>
      </div>
    `;

    Modal.open({
      title: `<i class="fas fa-receipt"></i> Ticket de Venta`,
      body: html,
      footer: `
        <button class="btn btn-secondary" onclick="Modal.close()">
          <i class="fas fa-times"></i> Cerrar
        </button>
        <button class="btn btn-primary" onclick="TicketComponent.imprimir()">
          <i class="fas fa-print"></i> Imprimir
        </button>
      `,
      size: 'sm'
    });
  },

  /**
   * Imprime el ticket
   */
  imprimir() {
    const content = document.getElementById('ticket-print-area')?.innerHTML;
    if (!content) return;

    const win = window.open('', '_blank', 'width=400,height=600');
    win.document.write(`
      <!DOCTYPE html><html><head>
        <title>Ticket de Venta</title>
        <style>
          body { font-family: 'Courier New', monospace; padding: 1rem; }
          @media print { body { margin: 0; } }
        </style>
      </head><body>${content}</body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  }
};

window.TicketComponent = TicketComponent;
