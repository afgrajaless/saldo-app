import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:injectable/injectable.dart';

import '../network/dio_client.dart';

/// Modulo de dependencias externas (las que no se pueden anotar con @injectable
/// porque vienen de paquetes de terceros).
@module
abstract class RegisterModule {
  /// Almacenamiento seguro del sistema.
  @lazySingleton
  FlutterSecureStorage get secureStorage => const FlutterSecureStorage();

  /// Cliente HTTP configurado para la API de Saldo.
  @lazySingleton
  Dio get dio => DioClient.create();
}
