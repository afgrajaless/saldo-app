import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

import '../../../../core/error/api_exception.dart';
import '../../domain/entities/payment.dart';
import '../../domain/entities/payment_result.dart';
import '../../domain/entities/register_payment_params.dart';
import '../models/payment_mappers.dart';

/// Fuente de datos remota de pagos: consume la API NestJS via Dio.
@lazySingleton
class PaymentsRemoteDataSource {
  /// @param dio - Cliente HTTP configurado (con el interceptor de auth).
  PaymentsRemoteDataSource(this._dio);

  final Dio _dio;

  /// Registra un pago sobre una deuda.
  /// @param debtId - UUID de la deuda.
  /// @param params - Datos del pago.
  /// @return El resultado del pago.
  Future<PaymentResult> registerPayment(
    String debtId,
    RegisterPaymentParams params,
  ) async {
    return _send(() async {
      final response = await _dio.post<Map<String, dynamic>>(
        '/debts/$debtId/payments',
        data: params.toJson(),
      );
      return paymentResultFromJson(response.data!);
    });
  }

  /// Lista los pagos de una deuda.
  /// @param debtId - UUID de la deuda.
  /// @return Los pagos registrados.
  Future<List<Payment>> getPayments(String debtId) async {
    return _send(() async {
      final response = await _dio.get<List<dynamic>>('/debts/$debtId/payments');
      return response.data!
          .map((e) => paymentFromJson(e as Map<String, dynamic>))
          .toList();
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
