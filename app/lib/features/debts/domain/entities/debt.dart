/// Obligacion (deuda) del usuario.
class Debt {
  const Debt({
    required this.id,
    required this.creditor,
    required this.debtType,
    required this.principalAmount,
    required this.nominalRate,
    required this.rateType,
    required this.effectiveAnnualRate,
    required this.amortizationSystem,
    required this.termMonths,
    required this.startDate,
    required this.insuranceMode,
    required this.insuranceValue,
    required this.status,
  });

  final String id;
  final String creditor;
  final String debtType;
  final double principalAmount;
  final double nominalRate;
  final String rateType;
  final double effectiveAnnualRate;
  final String amortizationSystem;
  final int termMonths;
  final String startDate;

  /// Modalidad del seguro: 'none', 'rate' o 'fixed'.
  final String insuranceMode;

  /// Valor del seguro (tasa o monto fijo); null si no tiene.
  final double? insuranceValue;
  final String status;
}
