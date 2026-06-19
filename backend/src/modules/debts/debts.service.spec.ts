import { NotFoundException } from '@nestjs/common';
import { DebtRow, DebtsRepository, InstallmentRow } from './debts.repository';
import { DebtsService } from './debts.service';
import { CreateDebtDto } from './dto/create-debt.dto';

/** Construye una fila de deuda de prueba. */
function makeDebt(overrides: Partial<DebtRow> = {}): DebtRow {
  return {
    id: 'debt-uuid',
    userId: 'user-uuid',
    creditor: 'Bancolombia',
    debtType: 'libre_inversion',
    principalAmount: '1000000.00',
    nominalRate: '0.020000',
    rateType: 'mv',
    effectiveAnnualRate: '0.268242',
    amortizationSystem: 'frances',
    termMonths: 12,
    startDate: '2026-01-15',
    insuranceMode: 'none',
    insuranceValue: null,
    status: 'activa',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

const baseDto: CreateDebtDto = {
  creditor: 'Bancolombia',
  debtType: 'libre_inversion',
  principalAmount: 1_000_000,
  nominalRate: 0.02,
  rateType: 'mv',
  amortizationSystem: 'frances',
  termMonths: 12,
  startDate: '2026-01-15',
};

describe('DebtsService', () => {
  let service: DebtsService;
  let repo: jest.Mocked<
    Pick<
      DebtsRepository,
      'createWithSchedule' | 'findAllByUser' | 'findByIdForUser' | 'findInstallments' | 'update' | 'softDelete'
    >
  >;

  beforeEach(() => {
    repo = {
      createWithSchedule: jest.fn(),
      findAllByUser: jest.fn(),
      findByIdForUser: jest.fn(),
      findInstallments: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    service = new DebtsService(repo as unknown as DebtsRepository);
  });

  describe('create', () => {
    it('normaliza la tasa a E.A. y genera el cronograma completo', async () => {
      repo.createWithSchedule.mockResolvedValue(makeDebt());

      await service.create('user-uuid', baseDto);

      const [userId, values, rows] = repo.createWithSchedule.mock.calls[0];
      expect(userId).toBe('user-uuid');
      // 2% M.V. -> ~26.8242% E.A.
      expect(values.effectiveAnnualRate).toBe('0.268242');
      expect(values.principalAmount).toBe('1000000.00');
      // Una cuota por mes del plazo.
      expect(rows).toHaveLength(12);
      // Primera cuota un mes despues del inicio.
      expect(rows[0].dueDate).toBe('2026-02-15');
      // El cronograma frances cierra el saldo en cero.
      expect(rows[11].remainingBalance).toBe('0.00');
    });

    it('usa frances por defecto cuando no se especifica sistema', async () => {
      repo.createWithSchedule.mockResolvedValue(makeDebt());
      const { amortizationSystem, ...dtoSinSistema } = baseDto;
      void amortizationSystem;

      await service.create('user-uuid', dtoSinSistema as CreateDebtDto);

      const [, values] = repo.createWithSchedule.mock.calls[0];
      expect(values.amortizationSystem).toBe('frances');
    });
  });

  describe('findOne', () => {
    it('devuelve la deuda con cronograma y totales', async () => {
      repo.findByIdForUser.mockResolvedValue(makeDebt());
      const installments: InstallmentRow[] = [
        {
          id: 'i1',
          debtId: 'debt-uuid',
          number: 1,
          dueDate: '2026-02-15',
          principalPortion: '80000.00',
          interestPortion: '20000.00',
          insurancePortion: '0.00',
          totalAmount: '100000.00',
          remainingBalance: '920000.00',
          status: 'pendiente',
        },
      ];
      repo.findInstallments.mockResolvedValue(installments);

      const result = await service.findOne('user-uuid', 'debt-uuid');

      expect(result.installments).toHaveLength(1);
      expect(result.totalInterest).toBe(20000);
      expect(result.totalPaid).toBe(100000);
    });

    it('lanza 404 si la deuda no es del usuario', async () => {
      repo.findByIdForUser.mockResolvedValue(undefined);
      await expect(service.findOne('user-uuid', 'otra')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('lanza 404 si la deuda no existe', async () => {
      repo.update.mockResolvedValue(undefined);
      await expect(
        service.update('user-uuid', 'x', { status: 'pagada' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('elimina cuando existe', async () => {
      repo.softDelete.mockResolvedValue('debt-uuid');
      await expect(service.remove('user-uuid', 'debt-uuid')).resolves.toBeUndefined();
    });

    it('lanza 404 cuando no existe', async () => {
      repo.softDelete.mockResolvedValue(undefined);
      await expect(service.remove('user-uuid', 'x')).rejects.toThrow(NotFoundException);
    });
  });
});
