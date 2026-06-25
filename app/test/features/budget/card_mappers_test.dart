import 'package:flutter_test/flutter_test.dart';
import 'package:saldo/features/budget/data/budget_mappers.dart';

void main() {
  group('creditCardFromJson', () {
    test('parsea todos los campos de la tarjeta correctamente', () {
      final json = {
        'id': 'card-uuid-1',
        'name': 'Visa Platinum',
        'color': '#1A1A2E',
        'creditLimit': 5000000,
        'statementDay': 15,
        'paymentDay': 25,
        'rotativoRateEa': 0.28,
        'minPaymentPct': 0.05,
        'managementFee': 12500,
        'managementFeePeriod': 'monthly',
        'usedAmount': 1500000,
        'available': 3500000,
        'paymentDueDate': '2025-07-25',
        'exceedsUsury': false,
      };

      final card = creditCardFromJson(json);

      expect(card.id, 'card-uuid-1');
      expect(card.name, 'Visa Platinum');
      expect(card.color, '#1A1A2E');
      expect(card.creditLimit, 5000000.0);
      expect(card.statementDay, 15);
      expect(card.paymentDay, 25);
      expect(card.rotativoRateEa, 0.28);
      expect(card.minPaymentPct, 0.05);
      expect(card.managementFee, 12500.0);
      expect(card.managementFeePeriod, 'monthly');
      expect(card.usedAmount, 1500000.0);
      expect(card.available, 3500000.0);
      expect(card.paymentDueDate, '2025-07-25');
      expect(card.exceedsUsury, false);
    });

    test('parsea tarjeta sin cuota de manejo (managementFee null)', () {
      final json = {
        'id': 'card-uuid-2',
        'name': 'MC Oro',
        'color': '#B8860B',
        'creditLimit': 3000000,
        'statementDay': 10,
        'paymentDay': 20,
        'rotativoRateEa': 0.25,
        'minPaymentPct': 0.05,
        'managementFee': null,
        'managementFeePeriod': 'none',
        'usedAmount': 0,
        'available': 3000000,
        'paymentDueDate': '2025-07-20',
        'exceedsUsury': false,
      };

      final card = creditCardFromJson(json);

      expect(card.managementFee, isNull);
      expect(card.managementFeePeriod, 'none');
    });
  });

  group('upcomingCardPaymentFromJson', () {
    test('parsea el proximo pago de tarjeta correctamente', () {
      final json = {
        'cardId': 'card-uuid-1',
        'name': 'Visa Platinum',
        'paymentDueDate': '2026-07-25',
        'estimatedMinPayment': 30000,
        'estimatedBalance': 600000,
      };

      final payment = upcomingCardPaymentFromJson(json);

      expect(payment.cardId, 'card-uuid-1');
      expect(payment.name, 'Visa Platinum');
      expect(payment.paymentDueDate, '2026-07-25');
      expect(payment.estimatedMinPayment, 30000.0);
      expect(payment.estimatedBalance, 600000.0);
    });
  });

  group('accountFromJson con kind', () {
    test('parsea kind asset correctamente', () {
      final json = {
        'id': 'acc-uuid-1',
        'name': 'Nequi',
        'color': '#00D4AA',
        'yieldType': 'none',
        'kind': 'asset',
      };

      final account = accountFromJson(json);

      expect(account.id, 'acc-uuid-1');
      expect(account.kind, 'asset');
      expect(account.isCard, false);
    });

    test('parsea kind credit_card correctamente', () {
      final json = {
        'id': 'acc-uuid-2',
        'name': 'Visa Platinum',
        'color': '#1A1A2E',
        'yieldType': 'none',
        'kind': 'credit_card',
      };

      final account = accountFromJson(json);

      expect(account.kind, 'credit_card');
      expect(account.isCard, true);
    });

    test('kind por defecto es asset cuando no viene en el JSON', () {
      final json = {
        'id': 'acc-uuid-3',
        'name': 'Efectivo',
        'color': '#00CC44',
        'yieldType': 'none',
      };

      final account = accountFromJson(json);

      expect(account.kind, 'asset');
      expect(account.isCard, false);
    });
  });
}
