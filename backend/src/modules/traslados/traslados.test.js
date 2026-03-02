/**
 * Tests unitarios para traslados.service.js
 * Para correr: npm test
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

const trasladosService = require('./traslados.service');

const resetMocks = () => {
    mockQuery.mockReset();
    mockConn.execute.mockReset();
    mockConn.beginTransaction.mockResolvedValue();
    mockConn.commit.mockResolvedValue();
    mockConn.rollback.mockResolvedValue();
    mockConn.release.mockReturnValue();
};

// ─────────────────────────────────────────────────────────────────────────────
describe('trasladosService.generarCodigo()', () => {
    beforeEach(resetMocks);

    test('genera código TRA-0001 cuando no hay traslados', async () => {
        mockQuery.mockResolvedValue([{ ultimo: 0 }]);
        const codigo = await trasladosService.generarCodigo();
        expect(codigo).toBe('TRA-0001');
    });

    test('incrementa correctamente desde el último código', async () => {
        mockQuery.mockResolvedValue([{ ultimo: 42 }]);
        const codigo = await trasladosService.generarCodigo();
        expect(codigo).toBe('TRA-0043');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('trasladosService.create()', () => {
    beforeEach(resetMocks);

    test('lanza error si origen y destino son la misma ubicación', async () => {
        await expect(
            trasladosService.create({ ubicacion_origen_id: 1, ubicacion_destino_id: 1, productos: [] }, 1)
        ).rejects.toThrow('deben ser diferentes');
    });

    test('lanza error si no se incluyen productos', async () => {
        // Ubicaciones válidas
        mockConn.execute.mockResolvedValueOnce([[{ id: 1, nombre: 'Bodega' }]]); // origen
        mockConn.execute.mockResolvedValueOnce([[{ id: 2, nombre: 'Local' }]]); // destino

        await expect(
            trasladosService.create({ ubicacion_origen_id: 1, ubicacion_destino_id: 2, productos: [] }, 1)
        ).rejects.toThrow('al menos un producto');
    });

    test('lanza error si stock insuficiente en origen (con inventario_por_ubicacion)', async () => {
        mockConn.execute.mockResolvedValueOnce([[{ id: 1, nombre: 'Bodega' }]]); // origen
        mockConn.execute.mockResolvedValueOnce([[{ id: 2, nombre: 'Local' }]]); // destino
        mockQuery.mockResolvedValue([{ ultimo: 0 }]); // generarCodigo
        // INSERT traslado
        mockConn.execute.mockResolvedValueOnce([{ insertId: 1 }]);
        // Stock origen: solo 2, pero se piden 5
        mockConn.execute.mockResolvedValueOnce([[{ stock: 2 }]]);

        await expect(
            trasladosService.create(
                { ubicacion_origen_id: 1, ubicacion_destino_id: 2, productos: [{ producto_id: 1, cantidad_solicitada: 5 }] },
                1
            )
        ).rejects.toThrow('Stock insuficiente');
    });

    test('rollback al lanzar error en loop de productos', async () => {
        mockConn.execute.mockResolvedValueOnce([[{ id: 1, nombre: 'Bodega' }]]);
        mockConn.execute.mockResolvedValueOnce([[{ id: 2, nombre: 'Local' }]]);
        mockQuery.mockResolvedValue([{ ultimo: 0 }]);
        mockConn.execute.mockResolvedValueOnce([{ insertId: 1 }]);
        mockConn.execute.mockResolvedValueOnce([[{ stock: 0 }]]); // Stock insuficiente

        await expect(
            trasladosService.create(
                { ubicacion_origen_id: 1, ubicacion_destino_id: 2, productos: [{ producto_id: 1, cantidad_solicitada: 1 }] },
                1
            )
        ).rejects.toThrow();

        expect(mockConn.rollback).toHaveBeenCalled();
        expect(mockConn.commit).not.toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('trasladosService.recibir()', () => {
    beforeEach(resetMocks);

    test('lanza error si el traslado no está despachado', async () => {
        mockConn.execute.mockResolvedValueOnce([[]]); // FOR UPDATE → no encontrado
        await expect(trasladosService.recibir(1, 1)).rejects.toThrow('no está en estado despachado');
    });

    test('mueve stock: descuenta de origen, suma en destino', async () => {
        // Traslado despachado
        mockConn.execute.mockResolvedValueOnce([[
            { id: 1, estado: 'despachado', ubicacion_origen_id: 10, ubicacion_destino_id: 20 }
        ]]);
        // Detalles
        mockConn.execute.mockResolvedValueOnce([[
            { producto_id: 5, cantidad_enviada: 3 }
        ]]);
        // Stock origen FOR UPDATE → 10 disponibles
        mockConn.execute.mockResolvedValueOnce([[{ stock: 10 }]]);
        // UPDATE origen stock -3 → affectedRows 1
        mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
        // INSERT ON DUPLICATE KEY destino
        mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
        // UPDATE productos stock global
        mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
        // UPDATE traslado estado recibido
        mockConn.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
        // getById (usa query pool)
        mockQuery.mockResolvedValue([{ id: 1, estado: 'recibido' }]);
        mockQuery.mockResolvedValue([]);

        await trasladosService.recibir(1, 1);

        // Verificar descuento de origen
        const descontar = mockConn.execute.mock.calls.find(c =>
            typeof c[0] === 'string' && c[0].includes('stock = stock -')
        );
        expect(descontar).toBeDefined();
        expect(descontar[1][0]).toBe(3); // cantidad

        // Verificar suma en destino
        const sumar = mockConn.execute.mock.calls.find(c =>
            typeof c[0] === 'string' && c[0].includes('ON DUPLICATE KEY UPDATE stock = stock +')
        );
        expect(sumar).toBeDefined();
    });

    test('FIX T-3: lanza error si stock en origen es insuficiente (previene negativos)', async () => {
        mockConn.execute.mockResolvedValueOnce([[
            { id: 2, estado: 'despachado', ubicacion_origen_id: 10, ubicacion_destino_id: 20 }
        ]]);
        mockConn.execute.mockResolvedValueOnce([[
            { producto_id: 7, cantidad_enviada: 10 }
        ]]);
        // Stock origen solo 3, pero se intenta mover 10
        mockConn.execute.mockResolvedValueOnce([[{ stock: 3 }]]);

        await expect(trasladosService.recibir(2, 1)).rejects.toThrow('Stock insuficiente en origen');
        expect(mockConn.rollback).toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('trasladosService.createUbicacion()', () => {
    beforeEach(resetMocks);

    test('FIX T-1: crea ubicación sin error de destructuring', async () => {
        // mockQuery retorna objeto directo con insertId (MySQL2 con query directo)
        mockQuery.mockResolvedValue({ insertId: 42 });

        const result = await trasladosService.createUbicacion({ nombre: 'Depósito Sur', descripcion: 'Zona sur' });
        expect(result.id).toBe(42);
        expect(result.nombre).toBe('Depósito Sur');
    });

    test('lanza error si nombre está vacío', async () => {
        await expect(
            trasladosService.createUbicacion({ nombre: '', descripcion: '' })
        ).rejects.toThrow('nombre de la ubicación es requerido');
    });
});
