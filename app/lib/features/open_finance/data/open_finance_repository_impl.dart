import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

import '../../../core/error/api_exception.dart';
import '../domain/entities/institution.dart';
import '../domain/entities/open_finance_connection.dart';
import '../domain/entities/sync_summary.dart';
import '../domain/entities/widget_token.dart';
import '../domain/repositories/open_finance_repository.dart';
import 'open_finance_models.dart';

/// Implementación de [OpenFinanceRepository] sobre la API REST (Dio).
@LazySingleton(as: OpenFinanceRepository)
class OpenFinanceRepositoryImpl implements OpenFinanceRepository {
  /// @param dio - Cliente HTTP configurado (con el interceptor de auth).
  OpenFinanceRepositoryImpl(this._dio);

  final Dio _dio;

  @override
  Future<List<Institution>> listInstitutions() {
    return _send(() async {
      final res = await _dio.get<List<dynamic>>('/open-finance/institutions');
      return (res.data ?? [])
          .map((e) => institutionFromJson(e as Map<String, dynamic>))
          .toList();
    });
  }

  @override
  Future<List<OpenFinanceConnection>> listConnections() {
    return _send(() async {
      final res = await _dio.get<List<dynamic>>('/open-finance/connections');
      return (res.data ?? [])
          .map((e) => connectionFromJson(e as Map<String, dynamic>))
          .toList();
    });
  }

  @override
  Future<OpenFinanceConnection> createConnection(String institutionId) {
    return _send(() async {
      final res = await _dio.post<Map<String, dynamic>>(
        '/open-finance/connections',
        data: {'institutionId': institutionId},
      );
      return connectionFromJson(res.data!);
    });
  }

  @override
  Future<WidgetToken> createWidgetToken() {
    return _send(() async {
      final res = await _dio.post<Map<String, dynamic>>(
        '/open-finance/widget-token',
      );
      return widgetTokenFromJson(res.data!);
    });
  }

  @override
  Future<OpenFinanceConnection> finalizeConnection(
    String institutionId,
    String externalConnectionId,
  ) {
    return _send(() async {
      final res = await _dio.post<Map<String, dynamic>>(
        '/open-finance/connections/finalize',
        data: {
          'institutionId': institutionId,
          'externalConnectionId': externalConnectionId,
        },
      );
      return connectionFromJson(res.data!);
    });
  }

  @override
  Future<SyncSummary> sync(String connectionId) {
    return _send(() async {
      final res = await _dio.post<Map<String, dynamic>>(
        '/open-finance/connections/$connectionId/sync',
      );
      return syncSummaryFromJson(res.data!);
    });
  }

  @override
  Future<void> revoke(String connectionId) {
    return _send(() => _dio.delete<void>('/open-finance/connections/$connectionId'));
  }

  /// Ejecuta una llamada traduciendo los DioException a ApiException.
  /// @param request - Operación HTTP a ejecutar.
  /// @return El resultado de la operación.
  Future<T> _send<T>(Future<T> Function() request) async {
    try {
      return await request();
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }
}
