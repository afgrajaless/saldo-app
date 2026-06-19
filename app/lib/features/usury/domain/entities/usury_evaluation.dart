/// Resultado de evaluar la tasa de una deuda contra el tope de usura.
class UsuryEvaluation {
  const UsuryEvaluation({
    required this.effectiveAnnualRate,
    required this.usuryCap,
    required this.isUsurious,
    required this.marginPoints,
    required this.usagePercentage,
    required this.modality,
    required this.referenceDate,
  });

  /// Tasa de la deuda en E.A.
  final double effectiveAnnualRate;

  /// Tope de usura vigente en E.A.
  final double usuryCap;

  /// `true` si la tasa supera el tope (usura).
  final bool isUsurious;

  /// Margen en puntos: tope - tasa.
  final double marginPoints;

  /// Porcentaje del tope consumido por la tasa.
  final double usagePercentage;

  /// Modalidad con la que se comparo.
  final String modality;

  /// Fecha de referencia usada (inicio de la deuda).
  final String referenceDate;
}
