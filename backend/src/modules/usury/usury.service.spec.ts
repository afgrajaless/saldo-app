import { NotFoundException } from '@nestjs/common';
import { DebtRow, DebtsRepository } from '../debts/debts.repository';
import { UsuryRateRow, UsuryRepository } from './usury.repository';
import { UsuryService } from './usury.service';

function makeRate(overrides: Partial<UsuryRateRow> = {}): UsuryRateRow {
  return {
    id: 'rate-uuid',
    modality: 'consumo_ordinario',
    effectiveAnnualRate: '0.267400',
    validFrom: '2026-01-01',
    validTo: '2026-03-31',
    ...overrides,
  };
}

function makeDebt(overrides: Partial<DebtRow> = {}): DebtRow {
  return {
    id: 'debt-uuid',
    userId: 'user-uuid',
    creditor: 'Bancolombia',
    debtType: 'libre_inversion',
    principalAmount: '12000000.00',
    nominalRate: '0.015000',
    rateType: 'mv',
    effectiveAnnualRate: '0.195618',
    amortizationSystem: 'frances',
    termMonths: 24,
    startDate: '2026-01-15',
    insuranceMode: 'none',
    insuranceValue: null,
    interestMode: 'monthly',
    status: 'activa',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    source: 'manual',
    connectionId: null,
    externalId: null,
    ...overrides,
  };
}

describe('UsuryService', () => {
  let service: UsuryService;
  let usuryRepo: jest.Mocked<Pick<UsuryRepository, 'findCurrent' | 'findAll'>>;
  let debtsRepo: jest.Mocked<Pick<DebtsRepository, 'findByIdForUser'>>;

  beforeEach(() => {
    usuryRepo = { findCurrent: jest.fn(), findAll: jest.fn() };
    debtsRepo = { findByIdForUser: jest.fn() };
    service = new UsuryService(
      usuryRepo as unknown as UsuryRepository,
      debtsRepo as unknown as DebtsRepository,
    );
  });

  describe('getCurrent', () => {
    it('devuelve la tasa vigente', async () => {
      usuryRepo.findCurrent.mockResolvedValue(makeRate());
      const result = await service.getCurrent('consumo_ordinario', '2026-02-01');
      expect(result.effectiveAnnualRate).toBe(0.2674);
    });

    it('lanza 404 si no hay tasa vigente', async () => {
      usuryRepo.findCurrent.mockResolvedValue(undefined);
      await expect(service.getCurrent('consumo_ordinario', '2030-01-01')).rejects.toThrow(NotFoundException);
    });
  });

  describe('evaluateDebt', () => {
    it('marca como no usuraria una tasa por debajo del tope', async () => {
      debtsRepo.findByIdForUser.mockResolvedValue(makeDebt());
      usuryRepo.findCurrent.mockResolvedValue(makeRate());

      const result = await service.evaluateDebt('user-uuid', 'debt-uuid');

      expect(result.isUsurious).toBe(false);
      expect(result.usuryCap).toBe(0.2674);
      expect(result.marginPoints).toBeGreaterThan(0);
      expect(result.modality).toBe('consumo_ordinario');
      expect(result.referenceDate).toBe('2026-01-15');
    });

    it('marca como usuraria una tasa que supera el tope', async () => {
      debtsRepo.findByIdForUser.mockResolvedValue(makeDebt({ effectiveAnnualRate: '0.350000' }));
      usuryRepo.findCurrent.mockResolvedValue(makeRate());

      const result = await service.evaluateDebt('user-uuid', 'debt-uuid');

      expect(result.isUsurious).toBe(true);
      expect(result.marginPoints).toBeLessThan(0);
    });

    it('lanza 404 si la deuda no es del usuario', async () => {
      debtsRepo.findByIdForUser.mockResolvedValue(undefined);
      await expect(service.evaluateDebt('user-uuid', 'x')).rejects.toThrow(NotFoundException);
    });

    it('lanza 404 si no hay tope para la modalidad y fecha', async () => {
      debtsRepo.findByIdForUser.mockResolvedValue(makeDebt());
      usuryRepo.findCurrent.mockResolvedValue(undefined);
      await expect(service.evaluateDebt('user-uuid', 'debt-uuid')).rejects.toThrow(NotFoundException);
    });
  });
});
