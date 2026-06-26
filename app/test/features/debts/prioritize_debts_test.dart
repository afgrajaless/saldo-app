import 'package:flutter_test/flutter_test.dart';
import 'package:saldo/features/debts/domain/entities/debt.dart';
import 'package:saldo/features/debts/domain/usecases/prioritize_debts.dart';

/// Construye una deuda de prueba con valores por defecto razonables.
Debt buildDebt({
  required String creditor,
  double effectiveAnnualRate = 0.20,
  double currentBalance = 1000000,
  double monthlyInterestCost = 10000,
  String status = 'activa',
}) {
  return Debt(
    id: creditor,
    creditor: creditor,
    debtType: 'libre_inversion',
    principalAmount: currentBalance,
    nominalRate: 0.0179,
    rateType: 'mv',
    effectiveAnnualRate: effectiveAnnualRate,
    amortizationSystem: 'frances',
    termMonths: 36,
    startDate: '2025-01-01',
    insuranceMode: 'none',
    insuranceValue: null,
    interestMode: 'monthly',
    status: status,
    currentBalance: currentBalance,
    monthlyPayment: 100000,
    monthlyInterestCost: monthlyInterestCost,
    paidInstallments: 0,
    remainingInstallments: 36,
  );
}

void main() {
  group('prioritizeDebts', () {
    test('avalancha ordena por mayor tasa efectiva anual', () {
      final debts = [
        buildDebt(creditor: 'A', effectiveAnnualRate: 0.18),
        buildDebt(creditor: 'B', effectiveAnnualRate: 0.30),
        buildDebt(creditor: 'C', effectiveAnnualRate: 0.24),
      ];

      final ordered = prioritizeDebts(debts, PayoffStrategy.avalanche);

      expect(ordered.map((d) => d.creditor), ['B', 'C', 'A']);
    });

    test('costo mensual ordena por mayor interes al mes', () {
      final debts = [
        buildDebt(creditor: 'A', monthlyInterestCost: 47000),
        buildDebt(creditor: 'B', monthlyInterestCost: 89000),
      ];

      final ordered = prioritizeDebts(debts, PayoffStrategy.monthlyCost);

      expect(ordered.first.creditor, 'B');
    });

    test('las deudas en mora van primero, sin importar la estrategia', () {
      final debts = [
        buildDebt(creditor: 'Alta', effectiveAnnualRate: 0.40),
        buildDebt(creditor: 'Mora', effectiveAnnualRate: 0.10, status: 'en_mora'),
      ];

      final ordered = prioritizeDebts(debts, PayoffStrategy.avalanche);

      expect(ordered.first.creditor, 'Mora');
    });

    test('las deudas sin saldo (pagadas) quedan al final', () {
      final debts = [
        buildDebt(creditor: 'Pagada', currentBalance: 0, effectiveAnnualRate: 0.50),
        buildDebt(creditor: 'Viva', currentBalance: 500000, effectiveAnnualRate: 0.20),
      ];

      final ordered = prioritizeDebts(debts, PayoffStrategy.avalanche);

      expect(ordered.first.creditor, 'Viva');
      expect(ordered.last.creditor, 'Pagada');
    });

    test('no muta la lista original', () {
      final debts = [
        buildDebt(creditor: 'A', effectiveAnnualRate: 0.10),
        buildDebt(creditor: 'B', effectiveAnnualRate: 0.30),
      ];

      prioritizeDebts(debts, PayoffStrategy.avalanche);

      expect(debts.map((d) => d.creditor), ['A', 'B']);
    });

    test('priorityReason refleja mora y estrategia', () {
      final mora = buildDebt(creditor: 'M', status: 'en_mora');
      final normal = buildDebt(creditor: 'N');

      expect(priorityReason(mora, PayoffStrategy.avalanche), 'En mora');
      expect(priorityReason(normal, PayoffStrategy.avalanche), 'Tasa más alta');
      expect(priorityReason(normal, PayoffStrategy.monthlyCost), 'Más interés al mes');
    });
  });
}
