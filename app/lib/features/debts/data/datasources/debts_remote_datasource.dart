import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

import '../../../../core/error/api_exception.dart';
import '../../domain/entities/create_debt_params.dart';
import '../../domain/entities/debt.dart';
import '../../domain/entities/debt_detail.dart';
import '../models/debt_mappers.dart';

/// Fuente de datos remota de obligaciones: consume la API NestJS via Dio.
@lazySingleton
class DebtsRemoteDataSource {
  /// @param dio - Cliente HTTP configurado (con el interceptor de auth).
  DebtsRemoteDataSource(this._dio);

  final Dio _dio;

  /// Lista las deudas del usuario.
  /// @return Las obligaciones del usuario.
  Future<List<Debt>> getDebts() async {
    return _send(() async {
      final response = await _dio.get<List<dynamic>>('/debts');
      return response.data!
          .map((e) => debtFromJson(e as Map<String, dynamic>))
          .toList();
    });
  }

  /// Obtiene el detalle de una deuda.
  /// @param id - UUID de la deuda.
  /// @return El detalle con cronograma y totales.
  Future<DebtDetail> getDebt(String id) async {
    return _send(() async {
      final response = await _dio.get<Map<String, dynamic>>('/debts/$id');
      return debtDetailFromJson(response.data!);
    });
  }

  /// Crea una nueva obligacion.
  /// @param params - Datos de la deuda.
  /// @return La deuda creada.
  Future<Debt> createDebt(CreateDebtParams params) async {
    return _send(() async {
      final response =
          await _dio.post<Map<String, dynamic>>('/debts', data: params.toJson());
      return debtFromJson(response.data!);
    });
  }

  /// Elimina (soft delete) una deuda.
  /// @param id - UUID de la deuda.
  Future<void> deleteDebt(String id) async {
    return _send(() async {
      await _dio.delete<void>('/debts/$id');
    });
  }

  /// Ejecuta una llamada traduciendo los DioException a ApiException.
  /// @param request - Operacion HTTP a ejecutar.
  /// @return El resultado de la operacion.
  Future<T> _send<T>(Future<T> Function() request) async {
    try {
      return await request();
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }
}
