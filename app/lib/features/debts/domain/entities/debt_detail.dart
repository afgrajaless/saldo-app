import 'debt.dart';
import 'installment.dart';

/// Detalle de una deuda: la obligacion, su cronograma y los totales.
class DebtDetail {
  const DebtDetail({
    required this.debt,
    required this.installments,
    required this.totalInterest,
    required this.totalPaid,
  });

  final Debt debt;
  final List<Installment> installments;
  final double totalInterest;
  final double totalPaid;
}
