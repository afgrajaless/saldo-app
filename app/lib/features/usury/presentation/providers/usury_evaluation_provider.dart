import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/di/injection.dart';
import '../../domain/entities/usury_evaluation.dart';
import '../../domain/repositories/usury_repository.dart';

part 'usury_evaluation_provider.g.dart';

/// Provee la evaluacion de usura de una deuda (null si no hay tope vigente).
/// @param ref - Referencia del provider.
/// @param debtId - UUID de la deuda.
/// @return La evaluacion de usura, o null.
@riverpod
Future<UsuryEvaluation?> usuryEvaluation(Ref ref, String debtId) {
  return getIt<UsuryRepository>().evaluateDebt(debtId);
}
