import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

import '../../../../core/error/api_exception.dart';
import '../../domain/entities/usury_evaluation.dart';
import '../models/usury_mappers.dart';

/// Fuente de datos remota de usura: consume la API NestJS via Dio.
@lazySingleton
class UsuryRemoteDataSource {
  /// @param dio - Cliente HTTP configurado (con el interceptor de auth).
  UsuryRemoteDataSource(this._dio);

  final Dio _dio;

  /// Evalua una deuda contra el tope de usura.
  /// @param debtId - UUID de la deuda.
  /// @return La evaluacion de usura.
  /// @throws ApiException si la deuda o el tope no existen, o falla la red.
  Future<UsuryEvaluation> evaluateDebt(String debtId) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/usury/debts/$debtId/evaluate',
      );
      return usuryEvaluationFromJson(response.data!);
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  /// Evalua una tasa hipotetica contra el tope de usura, antes de crear la deuda.
  /// @param rate - Tasa como fraccion decimal (0.24 = 24 %).
  /// @param rateType - Representacion de la tasa: 'ea' | 'mv' | 'nominal_anual'.
  /// @param debtType - Tipo de obligacion (define la modalidad de usura).
  /// @return La evaluacion de usura.
  /// @throws ApiException si no hay tope vigente o falla la red.
  Future<UsuryEvaluation> evaluateRate({
    required double rate,
    required String rateType,
    required String debtType,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/usury/evaluate-rate',
        data: {'rate': rate, 'rateType': rateType, 'debtType': debtType},
      );
      return usuryEvaluationFromJson(response.data!);
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }
}
