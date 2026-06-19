import 'package:dio/dio.dart';

import '../config/app_config.dart';

/// Fabrica del cliente HTTP (Dio) configurado para hablar con la API de Saldo.
class DioClient {
  const DioClient._();

  /// Crea una instancia de Dio con la URL base y los timeouts del proyecto.
  ///
  /// El token de acceso y la renovacion automatica se agregan mediante
  /// interceptores en la capa de autenticacion.
  /// @return Una instancia de Dio lista para usarse.
  static Dio create() {
    return Dio(
      BaseOptions(
        baseUrl: AppConfig.apiBaseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 20),
        headers: {'Content-Type': 'application/json'},
      ),
    );
  }
}
