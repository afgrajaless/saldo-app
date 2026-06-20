/// Transferencia de dinero entre dos cuentas.
class Transfer {
  const Transfer({
    required this.id,
    required this.fromAccountId,
    required this.toAccountId,
    required this.fromAccountName,
    required this.toAccountName,
    required this.amount,
    required this.occurredOn,
    this.description,
  });

  final String id;
  final String fromAccountId;
  final String toAccountId;
  final String fromAccountName;
  final String toAccountName;
  final double amount;
  final String occurredOn;
  final String? description;
}
