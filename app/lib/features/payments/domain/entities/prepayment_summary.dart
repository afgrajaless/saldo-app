/// Resumen del efecto de un abono a capital sobre el credito.
class PrepaymentSummary {
  const PrepaymentSummary({
    required this.appliedExtraPayment,
    required this.newBalance,
    required this.isPaidOff,
    required this.interestSaved,
    required this.remainingInstallments,
  });

  /// Abono efectivamente aplicado (acotado al saldo).
  final double appliedExtraPayment;

  /// Saldo de capital tras el abono.
  final double newBalance;

  /// Indica si el abono cancela la deuda.
  final bool isPaidOff;

  /// Intereses ahorrados frente a no abonar.
  final double interestSaved;

  /// Cuotas restantes tras el recalculo.
  final int remainingInstallments;
}
