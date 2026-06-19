import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:injectable/injectable.dart';

/// Almacenamiento seguro de los tokens de sesion (JWT) usando el llavero del
/// sistema (Keychain en iOS, KeyStore en Android).
@lazySingleton
class TokenStorage {
  /// @param storage - Implementacion de almacenamiento seguro inyectada.
  TokenStorage(this._storage);

  final FlutterSecureStorage _storage;

  static const _accessKey = 'access_token';
  static const _refreshKey = 'refresh_token';

  /// Guarda el par de tokens de la sesion.
  /// @param accessToken - JWT de acceso.
  /// @param refreshToken - JWT de refresco.
  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _storage.write(key: _accessKey, value: accessToken);
    await _storage.write(key: _refreshKey, value: refreshToken);
  }

  /// Lee el token de acceso almacenado.
  /// @return El token de acceso, o `null` si no hay sesion.
  Future<String?> readAccessToken() => _storage.read(key: _accessKey);

  /// Lee el token de refresco almacenado.
  /// @return El token de refresco, o `null` si no hay sesion.
  Future<String?> readRefreshToken() => _storage.read(key: _refreshKey);

  /// Borra los tokens (cierre de sesion).
  Future<void> clear() async {
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
  }
}
