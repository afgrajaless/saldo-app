/// Extracto estimado y/o reconciliado de una tarjeta de credito.
class CardStatement {
  const CardStatement({
    required this.cutoffDate,
    required this.paymentDueDate,
    required this.estimatedBalance,
    required this.estimatedMinPayment,
    required this.status,
    this.reconciledBalance,
    this.reconciledMinPayment,
    this.reconciledTotalPayment,
  });

  /// Fecha de corte del ciclo (YYYY-MM-DD).
  final String cutoffDate;

  /// Fecha limite de pago (YYYY-MM-DD).
  final String paymentDueDate;

  /// Saldo estimado del ciclo en pesos.
  final double estimatedBalance;

  /// Pago minimo estimado en pesos.
  final double estimatedMinPayment;

  /// Saldo real segun el extracto del banco; null hasta que se reconcilia.
  final double? reconciledBalance;

  /// Pago minimo real segun el extracto; null hasta que se reconcilia.
  final double? reconciledMinPayment;

  /// Pago total realizado; null hasta que se registra.
  final double? reconciledTotalPayment;

  /// Estado del extracto: 'open', 'closed' o 'paid'.
  final String status;

  /// Indica si el extracto ya fue reconciliado con los datos reales del banco.
  bool get isReconciled => reconciledBalance != null;
}
