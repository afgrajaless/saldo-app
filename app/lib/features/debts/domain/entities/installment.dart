/// Cuota del cronograma de una deuda.
class Installment {
  const Installment({
    required this.id,
    required this.number,
    required this.dueDate,
    required this.principalPortion,
    required this.interestPortion,
    required this.totalAmount,
    required this.remainingBalance,
    required this.status,
  });

  final String id;
  final int number;
  final String dueDate;
  final double principalPortion;
  final double interestPortion;
  final double totalAmount;
  final double remainingBalance;
  final String status;
}
