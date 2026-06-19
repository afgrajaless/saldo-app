import '../../domain/entities/usury_evaluation.dart';

double _toDouble(Object? value) => (value as num).toDouble();

/// Construye una UsuryEvaluation a partir del JSON del backend.
/// @param json - Objeto JSON de la evaluacion.
/// @return La entidad UsuryEvaluation.
UsuryEvaluation usuryEvaluationFromJson(Map<String, dynamic> json) {
  return UsuryEvaluation(
    effectiveAnnualRate: _toDouble(json['effectiveAnnualRate']),
    usuryCap: _toDouble(json['usuryCap']),
    isUsurious: json['isUsurious'] as bool,
    marginPoints: _toDouble(json['marginPoints']),
    usagePercentage: _toDouble(json['usagePercentage']),
    modality: json['modality'] as String,
    referenceDate: json['referenceDate'] as String,
  );
}
