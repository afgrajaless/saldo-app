import { BadRequestException, ConflictException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesRepository, CategoryRow } from './categories.repository';

/** Construye una fila de categoria de prueba. */
function makeCategory(overrides: Partial<CategoryRow>): CategoryRow {
  return {
    id: 'cat',
    userId: 'user',
    name: 'Cat',
    type: 'expense',
    parentId: null,
    color: '#000000',
    monthlyBudget: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

type RepoMock = jest.Mocked<CategoriesRepository>;

/** Crea un repositorio totalmente mockeado con valores por defecto vacios. */
function makeRepo(): RepoMock {
  return {
    create: jest.fn(),
    findAllByUser: jest.fn().mockResolvedValue([]),
    findByNameInScope: jest.fn().mockResolvedValue(undefined),
    findChildren: jest.fn().mockResolvedValue([]),
    hasLiveChildren: jest.fn().mockResolvedValue(false),
    findByIdForUser: jest.fn(),
    update: jest.fn(),
    countTransactionsByUser: jest.fn().mockResolvedValue([]),
    hasTransactions: jest.fn().mockResolvedValue(false),
    moveTransactions: jest.fn(),
    reassignTransactions: jest.fn(),
    softDelete: jest.fn().mockResolvedValue('cat'),
  } as unknown as RepoMock;
}

describe('CategoriesService — jerarquia', () => {
  let service: CategoriesService;
  let repo: RepoMock;

  beforeEach(() => {
    repo = makeRepo();
    service = new CategoriesService(repo);
  });

  it('crea una subcategoria valida bajo un padre del mismo tipo', async () => {
    const parent = makeCategory({ id: 'food', type: 'expense', parentId: null });
    repo.findByIdForUser.mockResolvedValue(parent);
    repo.create.mockResolvedValue(makeCategory({ id: 'market', name: 'Mercado', parentId: 'food' }));

    const result = await service.create('user', {
      name: 'Mercado',
      type: 'expense',
      parentId: 'food',
    });

    expect(result.parentId).toBe('food');
    expect(repo.create).toHaveBeenCalledWith(
      'user',
      expect.objectContaining({ name: 'Mercado', parentId: 'food', type: 'expense' }),
    );
  });

  it('rechaza una subcategoria de tipo distinto al padre', async () => {
    repo.findByIdForUser.mockResolvedValue(makeCategory({ id: 'food', type: 'expense' }));

    await expect(
      service.create('user', { name: 'Bono', type: 'income', parentId: 'food' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza colgar una subcategoria de otra subcategoria (max un nivel)', async () => {
    repo.findByIdForUser.mockResolvedValue(
      makeCategory({ id: 'market', parentId: 'food' }),
    );

    await expect(
      service.create('user', { name: 'Frutas', type: 'expense', parentId: 'market' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('al crear el primer hijo, mueve los movimientos directos del padre a "General"', async () => {
    const parent = makeCategory({ id: 'food', type: 'expense' });
    repo.findByIdForUser.mockResolvedValue(parent);
    repo.hasLiveChildren.mockResolvedValue(false); // aun no es padre
    repo.hasTransactions.mockResolvedValue(true); // tiene gasto directo
    repo.findByNameInScope.mockResolvedValue(undefined);
    repo.create
      .mockResolvedValueOnce(makeCategory({ id: 'general', name: 'General', parentId: 'food' }))
      .mockResolvedValueOnce(makeCategory({ id: 'market', name: 'Mercado', parentId: 'food' }));

    await service.create('user', { name: 'Mercado', type: 'expense', parentId: 'food' });

    expect(repo.moveTransactions).toHaveBeenCalledWith('user', 'food', 'general');
  });

  it('permite el mismo nombre bajo padres distintos pero no entre hermanas', async () => {
    repo.findByIdForUser.mockResolvedValue(makeCategory({ id: 'food', type: 'expense' }));
    // Ya existe una hermana "Mercado" bajo el mismo padre.
    repo.findByNameInScope.mockResolvedValue(makeCategory({ id: 'dup', parentId: 'food' }));

    await expect(
      service.create('user', { name: 'Mercado', type: 'expense', parentId: 'food' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('elimina un padre y sus subcategorias en cascada', async () => {
    const parent = makeCategory({ id: 'food', name: 'Alimentacion' });
    const child = makeCategory({ id: 'market', name: 'Mercado', parentId: 'food' });
    repo.findByIdForUser.mockResolvedValue(parent);
    repo.findChildren.mockResolvedValue([child]);

    await service.remove('user', 'food');

    expect(repo.softDelete).toHaveBeenCalledWith('market', 'user');
    expect(repo.softDelete).toHaveBeenCalledWith('food', 'user');
  });

  it('no deja convertir en subcategoria a una categoria que ya tiene hijos', async () => {
    repo.findByIdForUser
      .mockResolvedValueOnce(makeCategory({ id: 'food' })) // la que se edita
      .mockResolvedValueOnce(makeCategory({ id: 'other' })); // padre destino
    repo.hasLiveChildren.mockResolvedValue(true); // food ya es padre

    await expect(
      service.update('user', 'food', { parentId: 'other' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
