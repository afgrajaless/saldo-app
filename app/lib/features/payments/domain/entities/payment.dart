/// Pago registrado sobre una deuda (regular o abono a capital).
class Payment {
  const Payment({
    required this.id,
    required this.debtId,
    required this.installmentId,
    required this.amount,
    required this.paymentDate,
    required this.type,
  });

  final String id;
  final String debtId;
  final String? installmentId;
  final double amount;
  final String paymentDate;
  final String type;
}
