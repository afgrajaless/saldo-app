import 'package:injectable/injectable.dart';

import '../entities/auth_session.dart';
import '../repositories/auth_repository.dart';

/// Caso de uso: registrar un nuevo usuario.
@injectable
class RegisterUseCase {
  /// @param repository - Repositorio de autenticacion.
  const RegisterUseCase(this._repository);

  final AuthRepository _repository;

  /// Ejecuta el registro.
  /// @param email - Correo del usuario.
  /// @param password - Contrasena.
  /// @param fullName - Nombre completo.
  /// @return La sesion autenticada del usuario creado.
  Future<AuthSession> call({
    required String email,
    required String password,
    required String fullName,
  }) {
    return _repository.register(
      email: email,
      password: password,
      fullName: fullName,
    );
  }
}
