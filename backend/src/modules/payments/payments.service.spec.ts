import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrepaymentMode } from '../../domain/amortization/prepayment.types';
import { DebtRow, DebtsRepository, InstallmentRow } from '../debts/debts.repository';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentRow, PaymentsRepository } from './payments.repository';
import { PaymentsService } from './payments.service';

/** Deuda de prueba: 1.000.000 al ~2% M.V. (E.A. 0.268242), 12 cuotas. */
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
    interestMode: 'monthly',
    status: 'activa',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

/** Cronograma de 12 cuotas pendientes (saldo decreciente lineal de prueba). */
function pendingInstallments(): InstallmentRow[] {
  return Array.from({ length: 12 }, (_, i) => ({
    id: `inst-${i + 1}`,
    debtId: 'debt-uuid',
    number: i + 1,
    dueDate: '2026-02-15',
    principalPortion: '80000.00',
    interestPortion: '20000.00',
    insurancePortion: '0.00',
    totalAmount: '100000.00',
    remainingBalance: (1_000_000 - (i + 1) * 80_000).toFixed(2),
    status: 'pendiente' as const,
  }));
}

function makePayment(overrides: Partial<PaymentRow> = {}): PaymentRow {
  return {
    id: 'pay-uuid',
    debtId: 'debt-uuid',
    installmentId: null,
    amount: '200000.00',
    paymentDate: '2026-03-15',
    type: 'abono_capital',
    createdAt: new Date(),
    ...overrides,
  };
}

describe('PaymentsService', () => {
  let service: PaymentsService;
  let debtsRepo: jest.Mocked<Pick<DebtsRepository, 'findByIdForUser' | 'findInstallments'>>;
  let paymentsRepo: jest.Mocked<
    Pick<PaymentsRepository, 'registerRegular' | 'registerPrepayment' | 'findByDebt'>
  >;

  beforeEach(() => {
    debtsRepo = { findByIdForUser: jest.fn(), findInstallments: jest.fn() };
    paymentsRepo = {
      registerRegular: jest.fn(),
      registerPrepayment: jest.fn(),
      findByDebt: jest.fn(),
    };
    service = new PaymentsService(
      debtsRepo as unknown as DebtsRepository,
      paymentsRepo as unknown as PaymentsRepository,
    );
  });

  it('lanza 404 si la deuda no es del usuario', async () => {
    debtsRepo.findByIdForUser.mockResolvedValue(undefined);
    await expect(
      service.register('user-uuid', 'x', { type: 'regular', amount: 1, paymentDate: '2026-01-01' }),
    ).rejects.toThrow(NotFoundException);
  });

  describe('pago regular', () => {
    it('marca la cuota como pagada si el monto cubre el total', async () => {
      debtsRepo.findByIdForUser.mockResolvedValue(makeDebt());
      debtsRepo.findInstallments.mockResolvedValue(pendingInstallments());
      paymentsRepo.registerRegular.mockResolvedValue(makePayment({ type: 'regular', installmentId: 'inst-1' }));

      const dto: CreatePaymentDto = {
        type: 'regular',
        amount: 100_000,
        paymentDate: '2026-02-15',
        installmentId: 'inst-1',
      };
      await service.register('user-uuid', 'debt-uuid', dto);

      const [, , installmentId, status] = paymentsRepo.registerRegular.mock.calls[0];
      expect(installmentId).toBe('inst-1');
      expect(status).toBe('pagada');
    });

    it('marca la cuota como parcial si el monto no cubre el total', async () => {
      debtsRepo.findByIdForUser.mockResolvedValue(makeDebt());
      debtsRepo.findInstallments.mockResolvedValue(pendingInstallments());
      paymentsRepo.registerRegular.mockResolvedValue(makePayment({ type: 'regular' }));

      await service.register('user-uuid', 'debt-uuid', {
        type: 'regular',
        amount: 50_000,
        paymentDate: '2026-02-15',
        installmentId: 'inst-1',
      });

      const [, , , status] = paymentsRepo.registerRegular.mock.calls[0];
      expect(status).toBe('parcial');
    });
  });

  describe('abono a capital', () => {
    it('exige la modalidad', async () => {
      debtsRepo.findByIdForUser.mockResolvedValue(makeDebt());
      await expect(
        service.register('user-uuid', 'debt-uuid', {
          type: 'abono_capital',
          amount: 200_000,
          paymentDate: '2026-03-15',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('reduce el plazo: persiste menos cuotas y reporta ahorro', async () => {
      debtsRepo.findByIdForUser.mockResolvedValue(makeDebt());
      debtsRepo.findInstallments.mockResolvedValue(pendingInstallments());
      paymentsRepo.registerPrepayment.mockResolvedValue(makePayment());

      const result = await service.register('user-uuid', 'debt-uuid', {
        type: 'abono_capital',
        amount: 200_000,
        paymentDate: '2026-03-15',
        mode: PrepaymentMode.REDUCE_TERM,
      });

      const [args] = paymentsRepo.registerPrepayment.mock.calls[0];
      expect(args.deleteAboveNumber).toBe(0); // ninguna cuota pagada aun
      expect(args.newInstallments.length).toBeLessThan(12); // reducir plazo
      expect(args.markDebtPaid).toBe(false);
      expect(result.prepayment?.interestSaved).toBeGreaterThan(0);
      expect(result.prepayment?.newBalance).toBe(800_000);
    });

    it('cancela la deuda si el abono cubre el saldo', async () => {
      debtsRepo.findByIdForUser.mockResolvedValue(makeDebt());
      debtsRepo.findInstallments.mockResolvedValue(pendingInstallments());
      paymentsRepo.registerPrepayment.mockResolvedValue(makePayment({ amount: '1000000.00' }));

      const result = await service.register('user-uuid', 'debt-uuid', {
        type: 'abono_capital',
        amount: 1_000_000,
        paymentDate: '2026-03-15',
        mode: PrepaymentMode.REDUCE_TERM,
      });

      const [args] = paymentsRepo.registerPrepayment.mock.calls[0];
      expect(args.markDebtPaid).toBe(true);
      expect(args.newInstallments).toHaveLength(0);
      expect(result.prepayment?.isPaidOff).toBe(true);
    });

    it('arranca el recalculo desde la ultima cuota pagada', async () => {
      const installments = pendingInstallments().map((i) =>
        i.number <= 3 ? { ...i, status: 'pagada' as const } : i,
      );
      debtsRepo.findByIdForUser.mockResolvedValue(makeDebt());
      debtsRepo.findInstallments.mockResolvedValue(installments);
      paymentsRepo.registerPrepayment.mockResolvedValue(makePayment());

      await service.register('user-uuid', 'debt-uuid', {
        type: 'abono_capital',
        amount: 100_000,
        paymentDate: '2026-05-15',
        mode: PrepaymentMode.REDUCE_INSTALLMENT,
      });

      const [args] = paymentsRepo.registerPrepayment.mock.calls[0];
      // Se conservan las 3 pagadas; el recalculo reemplaza de la 4 en adelante.
      expect(args.deleteAboveNumber).toBe(3);
      expect(args.newInstallments[0].number).toBe(4);
      expect(args.newInstallments).toHaveLength(9); // reducir cuota conserva el plazo restante
    });
  });
});
