import 'package:injectable/injectable.dart';

import '../../../../core/storage/token_storage.dart';
import '../../domain/entities/auth_session.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_remote_datasource.dart';

/// Implementacion del repositorio de autenticacion. Coordina la fuente remota
/// con el almacenamiento seguro de tokens.
@LazySingleton(as: AuthRepository)
class AuthRepositoryImpl implements AuthRepository {
  /// @param remote - Fuente de datos remota.
  /// @param storage - Almacenamiento seguro de tokens.
  AuthRepositoryImpl(this._remote, this._storage);

  final AuthRemoteDataSource _remote;
  final TokenStorage _storage;

  @override
  Future<AuthSession> login({required String email, required String password}) async {
    final session = await _remote.login(email: email, password: password);
    await _persist(session);
    return session;
  }

  @override
  Future<AuthSession> register({
    required String email,
    required String password,
    required String fullName,
  }) async {
    final session = await _remote.register(
      email: email,
      password: password,
      fullName: fullName,
    );
    await _persist(session);
    return session;
  }

  @override
  Future<AuthSession?> currentSession() async {
    final accessToken = await _storage.readAccessToken();
    if (accessToken == null) return null;
    try {
      final user = await _remote.me();
      final refreshToken = await _storage.readRefreshToken();
      return AuthSession(
        accessToken: accessToken,
        refreshToken: refreshToken ?? '',
        user: user,
      );
    } on Object {
      // Token invalido/expirado y sin refresh valido: limpiar la sesion.
      await _storage.clear();
      return null;
    }
  }

  @override
  Future<void> logout() => _storage.clear();

  /// Guarda los tokens de una sesion recien obtenida.
  /// @param session - Sesion a persistir.
  Future<void> _persist(AuthSession session) {
    return _storage.saveTokens(
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    );
  }
}
