import 'package:dio/dio.dart';

/// Excepcion de dominio con un mensaje en espanol apto para mostrar al usuario.
///
/// Traduce los errores del backend (estructura `{ message, error, statusCode }`)
/// y los problemas de red a un mensaje legible.
class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});

  /// Mensaje amigable para el usuario.
  final String message;

  /// Codigo HTTP asociado, si aplica.
  final int? statusCode;

  /// Construye una ApiException a partir de un error de Dio.
  /// @param error - Excepcion lanzada por Dio.
  /// @return La excepcion traducida.
  factory ApiException.fromDio(DioException error) {
    final response = error.response;
    final data = response?.data;
    if (data is Map && data['message'] != null) {
      final message = data['message'];
      final text = message is List ? message.join('\n') : message.toString();
      return ApiException(text, statusCode: response?.statusCode);
    }
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.connectionError:
        return ApiException('No se pudo conectar con el servidor.');
      default:
        return ApiException('Ocurrio un error inesperado. Intenta de nuevo.');
    }
  }

  @override
  String toString() => message;
}
