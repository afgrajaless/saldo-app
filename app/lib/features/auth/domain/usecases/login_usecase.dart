import 'package:injectable/injectable.dart';

import '../entities/auth_session.dart';
import '../repositories/auth_repository.dart';

/// Caso de uso: iniciar sesion.
@injectable
class LoginUseCase {
  /// @param repository - Repositorio de autenticacion.
  const LoginUseCase(this._repository);

  final AuthRepository _repository;

  /// Ejecuta el inicio de sesion.
  /// @param email - Correo del usuario.
  /// @param password - Contrasena.
  /// @return La sesion autenticada.
  Future<AuthSession> call({required String email, required String password}) {
    return _repository.login(email: email, password: password);
  }
}
