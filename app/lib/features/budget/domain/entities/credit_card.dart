/// Tarjeta de credito con sus parametros de configuracion y saldo actual.
class CreditCard {
  const CreditCard({
    required this.id,
    required this.name,
    required this.color,
    required this.creditLimit,
    required this.statementDay,
    required this.paymentDay,
    required this.rotativoRateEa,
    required this.minPaymentPct,
    required this.managementFeePeriod,
    required this.usedAmount,
    required this.available,
    required this.paymentDueDate,
    required this.exceedsUsury,
    this.managementFee,
  });

  /// UUID de la tarjeta.
  final String id;

  /// Nombre de la tarjeta.
  final String name;

  /// Color hex para la UI (#RRGGBB).
  final String color;

  /// Cupo total autorizado en pesos.
  final double creditLimit;

  /// Dia de cierre del periodo de facturacion (1-31).
  final int statementDay;

  /// Dia de vencimiento del pago (1-31).
  final int paymentDay;

  /// Tasa de interes corriente E.A. del diferido rotativo (fraccion decimal).
  final double rotativoRateEa;

  /// Pago minimo como fraccion decimal del saldo (ej. 0.05 = 5%).
  final double minPaymentPct;

  /// Cuota de manejo en pesos; null si no cobra.
  final double? managementFee;

  /// Periodicidad de la cuota de manejo: 'none', 'monthly' o 'annual'.
  final String managementFeePeriod;

  /// Saldo adeudado actual en pesos.
  final double usedAmount;

  /// Cupo disponible en pesos.
  final double available;

  /// Fecha limite de pago del ciclo actual (YYYY-MM-DD).
  final String paymentDueDate;

  /// Indica si la tasa supera la tasa de usura vigente.
  final bool exceedsUsury;

  /// Porcentaje de utilizacion del cupo (0.0 a 1.0).
  double get utilizationRate => creditLimit > 0 ? usedAmount / creditLimit : 0;
}
