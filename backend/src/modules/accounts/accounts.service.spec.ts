import { BadRequestException, ConflictException } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { AccountsRepository } from './accounts.repository';
import { AccountRow } from './accounts.repository';

/** Construye una fila de cuenta de prueba. */
function makeAccountRow(overrides: Partial<AccountRow> = {}): AccountRow {
  return {
    id: 'acc-1',
    userId: 'user-1',
    name: 'Nequi',
    color: '#2D6FB0',
    kind: 'asset',
    yieldType: 'none',
    effectiveAnnualRate: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    deletedAt: null,
    source: 'manual',
    connectionId: null,
    externalId: null,
    ...overrides,
  };
}

type RepoMock = jest.Mocked<
  Pick<
    AccountsRepository,
    | 'netWorthSeries'
    | 'sumCreditCardLiabilities'
    | 'findByIdForUser'
    | 'upsertSnapshot'
    | 'findAllByUser'
    | 'findByName'
    | 'update'
    | 'softDelete'
  >
>;

/** Crea un repositorio de cuentas parcialmente mockeado para pruebas de servicio. */
function makeRepo(): RepoMock {
  return {
    netWorthSeries: jest.fn(),
    sumCreditCardLiabilities: jest.fn().mockResolvedValue('0'),
    findByIdForUser: jest.fn(),
    upsertSnapshot: jest.fn(),
    findAllByUser: jest.fn(),
    findByName: jest.fn().mockResolvedValue(null),
    update: jest.fn(),
    softDelete: jest.fn(),
  };
}

describe('AccountsService — netWorthSeries', () => {
  let service: AccountsService;
  let repo: RepoMock;

  beforeEach(() => {
    repo = makeRepo();
    service = new AccountsService(repo as unknown as AccountsRepository);
  });

  it('resta el saldo de tarjetas de credito del patrimonio cuando hay una tarjeta con deuda', async () => {
    repo.netWorthSeries.mockResolvedValue([
      { asOfDate: '2026-06-01', total: '5000000' },
      { asOfDate: '2026-06-15', total: '5200000' },
    ]);
    repo.sumCreditCardLiabilities.mockResolvedValue('800000.00');

    const result = await service.netWorthSeries('user-1');

    // Patrimonio debe ser saldo_activos - deuda_tarjetas
    expect(result[0].total).toBe(4_200_000);
    expect(result[1].total).toBe(4_400_000);
  });

  it('no resta nada cuando no hay tarjetas de credito (liability = 0)', async () => {
    repo.netWorthSeries.mockResolvedValue([{ asOfDate: '2026-06-01', total: '3000000' }]);
    repo.sumCreditCardLiabilities.mockResolvedValue('0');

    const result = await service.netWorthSeries('user-1');

    expect(result[0].total).toBe(3_000_000);
  });
});

describe('AccountsService — findAll expone kind en la respuesta', () => {
  let service: AccountsService;
  let repo: RepoMock;

  beforeEach(() => {
    repo = makeRepo();
    service = new AccountsService(repo as unknown as AccountsRepository);
  });

  it('incluye kind=asset en la respuesta de una cuenta de activo', async () => {
    repo.findAllByUser.mockResolvedValue([makeAccountRow({ kind: 'asset' })]);

    const [result] = await service.findAll('user-1');

    expect(result.kind).toBe('asset');
  });

  it('incluye kind=credit_card en la respuesta de una tarjeta de credito', async () => {
    repo.findAllByUser.mockResolvedValue([makeAccountRow({ kind: 'credit_card' })]);

    const [result] = await service.findAll('user-1');

    expect(result.kind).toBe('credit_card');
  });
});

describe('AccountsService — addSnapshot rechaza tarjetas de credito', () => {
  let service: AccountsService;
  let repo: RepoMock;

  beforeEach(() => {
    repo = makeRepo();
    service = new AccountsService(repo as unknown as AccountsRepository);
  });

  it('lanza BadRequestException al registrar snapshot en una tarjeta de credito', async () => {
    repo.findByIdForUser.mockResolvedValue(makeAccountRow({ kind: 'credit_card' }));

    await expect(
      service.addSnapshot('user-1', 'acc-1', { balance: 1_000_000, asOfDate: '2026-06-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    // El repositorio NO debe intentar guardar el snapshot
    expect(repo.upsertSnapshot).not.toHaveBeenCalled();
  });

  it('permite registrar snapshot en una cuenta de activo (kind=asset)', async () => {
    repo.findByIdForUser.mockResolvedValue(makeAccountRow({ kind: 'asset' }));
    repo.upsertSnapshot.mockResolvedValue({
      id: 'snap-1',
      userId: 'user-1',
      accountId: 'acc-1',
      balance: '1000000.00',
      asOfDate: '2026-06-01',
      source: 'manual',
      createdAt: new Date(),
    });

    const result = await service.addSnapshot('user-1', 'acc-1', {
      balance: 1_000_000,
      asOfDate: '2026-06-01',
    });

    expect(result.balance).toBe(1_000_000);
    expect(repo.upsertSnapshot).toHaveBeenCalledTimes(1);
  });
});

describe('AccountsService — guard Open Finance', () => {
  let service: AccountsService;
  let repo: RepoMock;

  beforeEach(() => {
    repo = makeRepo();
    service = new AccountsService(repo as unknown as AccountsRepository);
  });

  it('rechaza editar una cuenta vinculada a Open Finance (409)', async () => {
    repo.findByIdForUser.mockResolvedValue(makeAccountRow({ source: 'open_finance' }));

    await expect(
      service.update('user-1', 'acc-1', { name: 'Nuevo' }),
    ).rejects.toBeInstanceOf(ConflictException);

    // No debe llegar a mutar la cuenta en el repositorio
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('rechaza eliminar una cuenta vinculada a Open Finance (409)', async () => {
    repo.findByIdForUser.mockResolvedValue(makeAccountRow({ source: 'open_finance' }));

    await expect(
      service.remove('user-1', 'acc-1'),
    ).rejects.toBeInstanceOf(ConflictException);

    // No debe llegar a hacer soft delete en el repositorio
    expect(repo.softDelete).not.toHaveBeenCalled();
  });
});
