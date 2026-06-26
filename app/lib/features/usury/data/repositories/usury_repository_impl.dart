import 'package:injectable/injectable.dart';

import '../../../../core/error/api_exception.dart';
import '../../domain/entities/usury_evaluation.dart';
import '../../domain/repositories/usury_repository.dart';
import '../datasources/usury_remote_datasource.dart';

/// Implementacion del repositorio de usura sobre la fuente remota.
@LazySingleton(as: UsuryRepository)
class UsuryRepositoryImpl implements UsuryRepository {
  /// @param remote - Fuente de datos remota.
  UsuryRepositoryImpl(this._remote);

  final UsuryRemoteDataSource _remote;

  @override
  Future<UsuryEvaluation?> evaluateDebt(String debtId) async {
    try {
      return await _remote.evaluateDebt(debtId);
    } on ApiException catch (error) {
      // 404 = no hay tope vigente para la modalidad/fecha: estado neutro.
      if (error.statusCode == 404) return null;
      rethrow;
    }
  }

  @override
  Future<UsuryEvaluation?> evaluateRate({
    required double rate,
    required String rateType,
    required String debtType,
  }) async {
    try {
      return await _remote.evaluateRate(
        rate: rate,
        rateType: rateType,
        debtType: debtType,
      );
    } on ApiException catch (error) {
      // 404 = no hay tope vigente: estado neutro (no se puede evaluar).
      if (error.statusCode == 404) return null;
      rethrow;
    }
  }
}
