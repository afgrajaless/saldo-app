/// Parametros para crear una nueva obligacion.
class CreateDebtParams {
  const CreateDebtParams({
    required this.creditor,
    required this.debtType,
    required this.principalAmount,
    required this.nominalRate,
    required this.rateType,
    required this.amortizationSystem,
    required this.termMonths,
    required this.startDate,
    this.insuranceMode = 'none',
    this.insuranceValue,
  });

  final String creditor;
  final String debtType;
  final double principalAmount;

  /// Tasa como fraccion decimal (ej. 0.015 = 1.5 %).
  final double nominalRate;
  final String rateType;
  final String amortizationSystem;
  final int termMonths;

  /// Fecha de inicio en formato YYYY-MM-DD.
  final String startDate;

  /// Modalidad del seguro: 'none', 'rate' o 'fixed'.
  final String insuranceMode;

  /// Valor del seguro (tasa o monto fijo); null si no aplica.
  final double? insuranceValue;

  /// Convierte los parametros al cuerpo JSON que espera el backend.
  /// @return El mapa JSON para el POST /debts.
  Map<String, dynamic> toJson() => {
        'creditor': creditor,
        'debtType': debtType,
        'principalAmount': principalAmount,
        'nominalRate': nominalRate,
        'rateType': rateType,
        'amortizationSystem': amortizationSystem,
        'termMonths': termMonths,
        'startDate': startDate,
        'insuranceMode': insuranceMode,
        if (insuranceMode != 'none' && insuranceValue != null)
          'insuranceValue': insuranceValue,
      };
}
