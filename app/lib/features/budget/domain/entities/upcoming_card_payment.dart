/// Proximo pago estimado de una tarjeta de credito.
class UpcomingCardPayment {
  const UpcomingCardPayment({
    required this.cardId,
    required this.name,
    required this.paymentDueDate,
    required this.estimatedMinPayment,
    required this.estimatedBalance,
  });

  /// UUID de la tarjeta.
  final String cardId;

  /// Nombre de la tarjeta.
  final String name;

  /// Fecha limite de pago del ciclo actual (YYYY-MM-DD).
  final String paymentDueDate;

  /// Pago minimo estimado en pesos.
  final double estimatedMinPayment;

  /// Saldo estimado del ciclo actual en pesos.
  final double estimatedBalance;
}
