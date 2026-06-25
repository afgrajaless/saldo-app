import { NotFoundException } from '@nestjs/common';
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
});
