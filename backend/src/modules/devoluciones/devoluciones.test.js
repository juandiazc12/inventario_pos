/**
 * Tests unitarios para devoluciones.service.js
 * Para correr: npm test
 * 
 * Mocks de MySQL2 para simular la base de datos sin conexión real.
 */

// ── Mock de la base de datos ─────────────────────────────────────────────────
const mockQuery = jest.fn();
const mockConn = {
    execute: jest.fn(),
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn(),
};

jest.mock('../../config/database', () => ({
    query: (...args) => mockQuery(...args),
    getConnection: jest.fn(() => Promise.resolve(mockConn)),
}));

const devolucionesService = require('./devoluciones.service');

// ── Helpers ──────────────────────────────────────────────────────────────────
const resetMocks = () => {
    mockQuery.mockReset();
    mockConn.execute.mockReset();
    mockConn.beginTransaction.mockResolvedValue();
    mockConn.commit.mockResolvedValue();
    mockConn.rollback.mockResolvedValue();
    mockConn.release.mockReturnValue();
};

// ─────────────────────────────────────────────────────────────────────────────
describe('devolucionesService.generarCodigo()', () => {
    beforeEach(resetMocks);

    test('genera código DEV-0001 cuando no hay devoluciones', async () => {
        mockQuery.mockResolvedValue([{ ultimo: 0 }]);
        const codigo = await devolucionesService.generarCodigo();
        expect(codigo).toBe('DEV-0001');
    });

    test('genera código DEV-0005 cuando el último es DEV-0004', async () => {
        mockQuery.mockResolvedValue([{ ultimo: 4 }]);
        const codigo = await devolucionesService.generarCodigo();
        expect(codigo).toBe('DEV-0005');
    });

    test('formatea correctamente a 4 dígitos', async () => {
        mockQuery.mockResolvedValue([{ ultimo: 99 }]);
        const codigo = await devolucionesService.generarCodigo();
        expect(codigo).toBe('DEV-0100');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('devolucionesService.createDevolucionVenta()', () => {
    beforeEach(resetMocks);

    test('lanza error si ticket_numero no se proporciona', async () => {
        await expect(
            devolucionesService.createDevolucionVenta(
                { ticket_numero: '', productos: [{ producto_id: 1, cantidad: 1 }] },
                1
            )
        ).rejects.toThrow('Debe especificar el número de ticket');
    });

    test('lanza error si el ticket no existe en ventas', async () => {
        // Primera llamada: generarCodigo (MAX) → no se llama antes de la validación
        // Primera execute: buscar lineas del ticket → vacío
        mockConn.execute.mockResolvedValueOnce([[]]); // lineasVenta vacío

        await expect(
            devolucionesService.createDevolucionVenta(
                { ticket_numero: 'TK-9999', productos: [{ producto_id: 1, cantidad: 1 }] },
                1
            )
        ).rejects.toThrow('El ticket "TK-9999" no existe');
    });

    test('lanza error si la cantidad a devolver excede la vendida', async () => {
        // lineasVenta: producto 1, cantidad 2
        mockConn.execute.mockResolvedValueOnce([[  // SELECT lineas del ticket
            { id: 10, ticket_numero: 'TK-001', producto_id: 1, cantidad: 2, precio_venta: 100, producto_nombre: 'Prod A', cliente_nombre: 'Cliente X' }
        ]]);
        // generarCodigo usa mockQuery (pool directo)
        mockQuery.mockResolvedValueOnce([{ ultimo: 0 }]);
        // INSERT devoluciones
        mockConn.execute.mockResolvedValueOnce([{ insertId: 99 }]);
        // Ya devuelto (detalles previos) → 0
        mockConn.execute.mockResolvedValueOnce([[{ total_devuelto: 0 }]]);

        await expect(
            devolucionesService.createDevolucionVenta(
                {
                    ticket_numero: 'TK-001',
                    productos: [{ producto_id: 1, cantidad: 5 }], // excede 2
                    motivo: 'defectuoso',
                    tipo_reembolso: 'efectivo',
                    afecta_inventario: true
                },
                1
            )
        ).rejects.toThrow('excede la cantidad vendida (2)');
    });

    test('lanza error si el producto no pertenece al ticket', async () => {
        // lineasVenta: solo producto 1, no hay producto 99
        mockConn.execute.mockResolvedValueOnce([[  // SELECT lineas del ticket
            { id: 10, ticket_numero: 'TK-001', producto_id: 1, cantidad: 2, precio_venta: 100, producto_nombre: 'Prod A', cliente_nombre: 'Cliente X' }
        ]]);
        // generarCodigo
        mockQuery.mockResolvedValueOnce([{ ultimo: 0 }]);
        // INSERT devoluciones
        mockConn.execute.mockResolvedValueOnce([{ insertId: 99 }]);
        // No se llega al SELECT de yaDevuelto porque el error se lanza antes (producto no en mapa)

        await expect(
            devolucionesService.createDevolucionVenta(
                {
                    ticket_numero: 'TK-001',
                    productos: [{ producto_id: 99, cantidad: 1 }], // producto ajeno al ticket
                    motivo: 'defectuoso',
                    tipo_reembolso: 'efectivo',
                    afecta_inventario: true
                },
                1
            )
        ).rejects.toThrow('no pertenece al ticket "TK-001"');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('devolucionesService.aprobar()', () => {
    beforeEach(resetMocks);

    test('lanza error si la devolución no está en estado pendiente', async () => {
        mockConn.execute.mockResolvedValueOnce([[]]); // SELECT FOR UPDATE → no encontrado
        await expect(devolucionesService.aprobar(1, 1)).rejects.toThrow('no está en estado pendiente');
    });

    test('suma stock al aprobar devolución de venta', async () => {
        // SELECT FOR UPDATE devolución → encontrada, tipo venta
        mockConn.execute.mockResolvedValueOnce([[
            { id: 1, tipo: 'venta', afecta_inventario: 1, estado: 'pendiente' }
        ]]);
        // SELECT detalles
        mockConn.execute.mockResolvedValueOnce([[
            { producto_id: 5, cantidad: 3 }
        ]]);
        // UPDATE productos stock +3 → affectedRows 1
        mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
        // UPDATE estado aprobada
        mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
        // getById (usa query del pool)
        mockQuery.mockResolvedValueOnce([{ id: 1, tipo: 'venta', estado: 'aprobada', referencia_ticket: 'TK-001' }]);
        mockQuery.mockResolvedValueOnce([]); // detalle
        mockQuery.mockResolvedValueOnce([{ ticket_numero: 'TK-001', cliente_nombre: 'Test' }]); // referencia

        const result = await devolucionesService.aprobar(1, 1);

        // Verificar que se llamó el UPDATE de stock
        const stockCall = mockConn.execute.mock.calls.find(c =>
            typeof c[0] === 'string' && c[0].includes('stock = stock +')
        );
        expect(stockCall).toBeDefined();
        expect(stockCall[1]).toEqual([3, 5]); // cantidad=3, producto_id=5
    });

    test('descuenta stock al aprobar devolución de compra', async () => {
        mockConn.execute.mockResolvedValueOnce([[
            { id: 2, tipo: 'compra', afecta_inventario: 1, estado: 'pendiente' }
        ]]);
        mockConn.execute.mockResolvedValueOnce([[
            { producto_id: 7, cantidad: 2 }
        ]]);
        // SELECT stock actual FOR UPDATE
        mockConn.execute.mockResolvedValueOnce([[{ stock: 10 }]]);
        // UPDATE stock -2
        mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
        // UPDATE estado
        mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
        // getById
        mockQuery.mockResolvedValueOnce([{ id: 2, tipo: 'compra', estado: 'aprobada', referencia_id: 1 }]);
        mockQuery.mockResolvedValueOnce([]);
        mockQuery.mockResolvedValueOnce([{ proveedor_nombre: 'Proveedor X' }]);

        await devolucionesService.aprobar(2, 1);

        const stockCall = mockConn.execute.mock.calls.find(c =>
            typeof c[0] === 'string' && c[0].includes('stock = stock -')
        );
        expect(stockCall).toBeDefined();
        expect(stockCall[1]).toEqual([2, 7, 2]); // cantidad, producto_id, guard
    });

    test('lanza error si stock insuficiente al aprobar devolución de compra', async () => {
        mockConn.execute.mockResolvedValueOnce([[
            { id: 3, tipo: 'compra', afecta_inventario: 1, estado: 'pendiente' }
        ]]);
        mockConn.execute.mockResolvedValueOnce([[
            { producto_id: 8, cantidad: 5 }
        ]]);
        // Stock actual = 2, pero requiere 5
        mockConn.execute.mockResolvedValueOnce([[{ stock: 2 }]]);

        await expect(devolucionesService.aprobar(3, 1)).rejects.toThrow('Stock insuficiente');
    });
});
