import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CardsService } from './cards.service';
import { CardsRepository, CardRow } from './cards.repository';
import { UsuryRepository } from '../usury/usury.repository';

/** Construye una fila de tarjeta de prueba. */
function makeCard(overrides: Partial<CardRow> = {}): CardRow {
  return {
    id: 'acc-1',
    userId: 'user-1',
    name: 'Visa Platinum',
    color: '#1A1A2E',
    kind: 'credit_card',
    yieldType: 'none',
    effectiveAnnualRate: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    deletedAt: null,
    creditLimit: '5000000.00',
    statementDay: 15,
    paymentDay: 25,
    rotativoRateEa: '0.280000',
    minPaymentPct: '0.0500',
    managementFee: null,
    managementFeePeriod: 'none',
    detailCreatedAt: new Date('2024-01-01T00:00:00Z'),
    detailUpdatedAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

type RepoMock = jest.Mocked<CardsRepository>;
type UsuryRepoMock = jest.Mocked<Pick<UsuryRepository, 'findCurrent'>>;

/** Crea un repositorio de tarjetas completamente mockeado. */
function makeRepo(): RepoMock {
  return {
    createCard: jest.fn(),
    updateCard: jest.fn(),
    findCardForUser: jest.fn(),
    listCards: jest.fn().mockResolvedValue([]),
    sumCardCharges: jest.fn().mockResolvedValue(0),
    sumCardPayments: jest.fn().mockResolvedValue(0),
    sumChargesInCycle: jest.fn().mockResolvedValue(0),
    sumInstallmentsDueInCycle: jest.fn().mockResolvedValue(0),
    findPreviousClosedStatement: jest.fn().mockResolvedValue(undefined),
    findStatementByCutoff: jest.fn().mockResolvedValue(undefined),
    upsertStatement: jest.fn(),
  } as unknown as RepoMock;
}

/** Crea un repositorio de usura mockeado. */
function makeUsuryRepo(): UsuryRepoMock {
  return {
    findCurrent: jest.fn(),
  };
}

describe('CardsService', () => {
  let service: CardsService;
  let repo: RepoMock;
  let usuryRepo: UsuryRepoMock;

  beforeEach(() => {
    repo = makeRepo();
    usuryRepo = makeUsuryRepo();
    service = new CardsService(repo, usuryRepo as unknown as UsuryRepository);
  });

  describe('createCard', () => {
    it('llama al repositorio con kind credit_card y los detalles correctos', async () => {
      const card = makeCard();
      repo.createCard.mockResolvedValue(card);
      // Para createCard no se necesita balance ni usura
      repo.sumCardCharges.mockResolvedValue(0);
      repo.sumCardPayments.mockResolvedValue(0);
      usuryRepo.findCurrent.mockResolvedValue(undefined);

      const dto = {
        name: 'Visa Platinum',
        creditLimit: 5_000_000,
        statementDay: 15,
        paymentDay: 25,
        rotativoRateEa: 0.28,
      };

      await service.createCard('user-1', dto);

      expect(repo.createCard).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          name: 'Visa Platinum',
          creditLimit: 5_000_000,
          statementDay: 15,
          paymentDay: 25,
          rotativoRateEa: 0.28,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('lanza NotFoundException cuando la tarjeta no pertenece al usuario', async () => {
      repo.findCardForUser.mockResolvedValue(undefined);

      await expect(service.findOne('user-1', 'acc-ajena')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('retorna el DTO cuando la tarjeta pertenece al usuario', async () => {
      const card = makeCard();
      repo.findCardForUser.mockResolvedValue(card);
      repo.sumCardCharges.mockResolvedValue(1_000_000);
      repo.sumCardPayments.mockResolvedValue(200_000);
      usuryRepo.findCurrent.mockResolvedValue({
        id: 'ur-1',
        modality: 'consumo_ordinario',
        effectiveAnnualRate: '0.260000',
        validFrom: '2025-01-01',
        validTo: '2025-12-31',
      });

      const result = await service.findOne('user-1', 'acc-1');

      expect(result.id).toBe('acc-1');
      expect(result.creditLimit).toBe(5_000_000);
      expect(result.usedAmount).toBe(800_000); // 1_000_000 - 200_000
      expect(result.available).toBe(4_200_000); // 5_000_000 - 800_000
    });
  });

  describe('updateCard', () => {
    it('lanza NotFoundException cuando la tarjeta no existe para el usuario', async () => {
      repo.findCardForUser.mockResolvedValue(undefined);

      await expect(service.updateCard('user-1', 'acc-ajena', { name: 'Otro' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('listCards — saldo y usura', () => {
    it('calcula usedAmount = Σcargos − Σpagos correctamente', async () => {
      const card = makeCard();
      repo.listCards.mockResolvedValue([card]);
      // cargos = 2_000_000, pagos = 500_000 → saldo = 1_500_000
      repo.sumCardCharges.mockResolvedValue(2_000_000);
      repo.sumCardPayments.mockResolvedValue(500_000);
      usuryRepo.findCurrent.mockResolvedValue({
        id: 'ur-1',
        modality: 'consumo_ordinario',
        effectiveAnnualRate: '0.420000',
        validFrom: '2025-01-01',
        validTo: '2025-12-31',
      });

      const [result] = await service.listCards('user-1');

      expect(result.usedAmount).toBe(1_500_000);
      expect(result.available).toBe(3_500_000); // 5_000_000 - 1_500_000
    });

    it('marca exceedsUsury=true cuando el rotativo (0.28 E.A.) supera la tasa de usura mockeada (0.26 E.A.)', async () => {
      const card = makeCard({ rotativoRateEa: '0.280000' });
      repo.listCards.mockResolvedValue([card]);
      repo.sumCardCharges.mockResolvedValue(0);
      repo.sumCardPayments.mockResolvedValue(0);
      // Usura < rotativo → debe marcar exceedsUsury=true
      usuryRepo.findCurrent.mockResolvedValue({
        id: 'ur-1',
        modality: 'consumo_ordinario',
        effectiveAnnualRate: '0.260000',
        validFrom: '2025-01-01',
        validTo: '2025-12-31',
      });

      const [result] = await service.listCards('user-1');

      expect(result.exceedsUsury).toBe(true);
    });

    it('marca exceedsUsury=false cuando el rotativo (0.20 E.A.) no supera la tasa de usura (0.26 E.A.)', async () => {
      const card = makeCard({ rotativoRateEa: '0.200000' });
      repo.listCards.mockResolvedValue([card]);
      repo.sumCardCharges.mockResolvedValue(0);
      repo.sumCardPayments.mockResolvedValue(0);
      usuryRepo.findCurrent.mockResolvedValue({
        id: 'ur-1',
        modality: 'consumo_ordinario',
        effectiveAnnualRate: '0.260000',
        validFrom: '2025-01-01',
        validTo: '2025-12-31',
      });

      const [result] = await service.listCards('user-1');

      expect(result.exceedsUsury).toBe(false);
    });

    it('marca exceedsUsury=false cuando no hay tasa de usura vigente', async () => {
      const card = makeCard();
      repo.listCards.mockResolvedValue([card]);
      repo.sumCardCharges.mockResolvedValue(0);
      repo.sumCardPayments.mockResolvedValue(0);
      usuryRepo.findCurrent.mockResolvedValue(undefined);

      const [result] = await service.listCards('user-1');

      expect(result.exceedsUsury).toBe(false);
    });

    it('incluye paymentDueDate calculada con computeCycleDates', async () => {
      // statementDay=15, paymentDay=25
      const card = makeCard({ statementDay: 15, paymentDay: 25 });
      repo.listCards.mockResolvedValue([card]);
      repo.sumCardCharges.mockResolvedValue(0);
      repo.sumCardPayments.mockResolvedValue(0);
      usuryRepo.findCurrent.mockResolvedValue(undefined);

      const [result] = await service.listCards('user-1');

      // paymentDueDate debe ser una fecha YYYY-MM-DD
      expect(result.paymentDueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('getStatement', () => {
    it('retorna cutoffDate y paymentDueDate correctos', async () => {
      const card = makeCard({ statementDay: 15, paymentDay: 25 });
      repo.findCardForUser.mockResolvedValue(card);
      repo.findStatementByCutoff.mockResolvedValue(undefined);
      repo.sumChargesInCycle.mockResolvedValue(0);
      repo.sumInstallmentsDueInCycle.mockResolvedValue(0);
      repo.findPreviousClosedStatement.mockResolvedValue(undefined);
      repo.upsertStatement.mockResolvedValue({
        id: 'st-1',
        accountId: 'acc-1',
        cutoffDate: '2025-07-15',
        paymentDueDate: '2025-07-25',
        estimatedBalance: '0.00',
        estimatedMinPayment: '0.00',
        reconciledBalance: null,
        reconciledMinPayment: null,
        reconciledTotalPayment: null,
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.getStatement('acc-1', 'user-1');

      expect(result.cutoffDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.paymentDueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.status).toBe('open');
    });

    it('retorna estimatedBalance coherente con cargos mockeados', async () => {
      const card = makeCard({ statementDay: 15, paymentDay: 25 });
      repo.findCardForUser.mockResolvedValue(card);
      repo.findStatementByCutoff.mockResolvedValue(undefined);
      repo.sumChargesInCycle.mockResolvedValue(500_000);
      repo.sumInstallmentsDueInCycle.mockResolvedValue(100_000);
      repo.findPreviousClosedStatement.mockResolvedValue(undefined);
      repo.upsertStatement.mockImplementation(
        async (data: Parameters<CardsRepository['upsertStatement']>[0]) => ({
          id: 'st-1',
          accountId: 'acc-1',
          cutoffDate: data.cutoffDate,
          paymentDueDate: data.paymentDueDate,
          estimatedBalance: data.estimatedBalance.toFixed(2),
          estimatedMinPayment: data.estimatedMinPayment.toFixed(2),
          reconciledBalance: null,
          reconciledMinPayment: null,
          reconciledTotalPayment: null,
          status: 'open' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const result = await service.getStatement('acc-1', 'user-1');

      // 500_000 cargos + 100_000 cuotas = 600_000 (sin rotativo ni cuota de manejo)
      expect(result.estimatedBalance).toBeGreaterThan(0);
      expect(result.estimatedMinPayment).toBeGreaterThan(0);
    });

    it('lanza NotFoundException si la tarjeta no es del usuario', async () => {
      repo.findCardForUser.mockResolvedValue(undefined);
      await expect(service.getStatement('acc-ajena', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('devuelve el extracto existente sin recalcular si ya existe en BD', async () => {
      const card = makeCard();
      repo.findCardForUser.mockResolvedValue(card);
      repo.findStatementByCutoff.mockResolvedValue({
        id: 'st-1',
        accountId: 'acc-1',
        cutoffDate: '2025-07-15',
        paymentDueDate: '2025-07-25',
        estimatedBalance: '350000.00',
        estimatedMinPayment: '17500.00',
        reconciledBalance: '360000.00',
        reconciledMinPayment: '18000.00',
        reconciledTotalPayment: null,
        status: 'closed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.getStatement('acc-1', 'user-1');

      expect(result.estimatedBalance).toBe(350000);
      expect(result.reconciledBalance).toBe(360000);
      expect(result.status).toBe('closed');
      expect(repo.sumChargesInCycle).not.toHaveBeenCalled();
    });
  });

  describe('reconcileStatement', () => {
    it('guarda los valores oficiales y los retorna', async () => {
      const card = makeCard();
      repo.findCardForUser.mockResolvedValue(card);
      repo.findStatementByCutoff.mockResolvedValue(undefined);
      repo.upsertStatement.mockImplementation(
        async (data: Parameters<CardsRepository['upsertStatement']>[0]) => ({
          id: 'st-1',
          accountId: 'acc-1',
          cutoffDate: data.cutoffDate,
          paymentDueDate: data.paymentDueDate,
          estimatedBalance: '0.00',
          estimatedMinPayment: '0.00',
          reconciledBalance: data.reconciledBalance != null ? data.reconciledBalance.toFixed(2) : null,
          reconciledMinPayment:
            data.reconciledMinPayment != null ? data.reconciledMinPayment.toFixed(2) : null,
          reconciledTotalPayment:
            data.reconciledTotalPayment != null ? data.reconciledTotalPayment.toFixed(2) : null,
          status: (data.status ?? 'closed') as 'open' | 'closed' | 'paid',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const result = await service.reconcileStatement('acc-1', 'user-1', {
        cutoffDate: '2025-07-15',
        reconciledBalance: 460000,
        reconciledMinPayment: 23000,
      });

      expect(result.reconciledBalance).toBe(460000);
      expect(result.reconciledMinPayment).toBe(23000);
      expect(result.status).toBe('closed');
    });

    it('lanza BadRequestException si reconciledBalance es negativo', async () => {
      const card = makeCard();
      repo.findCardForUser.mockResolvedValue(card);

      await expect(
        service.reconcileStatement('acc-1', 'user-1', {
          cutoffDate: '2025-07-15',
          reconciledBalance: -100,
          reconciledMinPayment: 0,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza NotFoundException si la tarjeta no es del usuario', async () => {
      repo.findCardForUser.mockResolvedValue(undefined);
      await expect(
        service.reconcileStatement('acc-ajena', 'user-1', {
          cutoffDate: '2025-07-15',
          reconciledBalance: 0,
          reconciledMinPayment: 0,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
