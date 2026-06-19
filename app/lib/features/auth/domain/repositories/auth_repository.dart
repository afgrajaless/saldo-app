import '../entities/auth_session.dart';

/// Contrato del repositorio de autenticacion (capa de dominio).
abstract class AuthRepository {
  /// Inicia sesion con correo y contrasena.
  /// @param email - Correo del usuario.
  /// @param password - Contrasena.
  /// @return La sesion autenticada.
  Future<AuthSession> login({required String email, required String password});

  /// Registra un nuevo usuario.
  /// @param email - Correo del usuario.
  /// @param password - Contrasena.
  /// @param fullName - Nombre completo.
  /// @return La sesion autenticada del usuario creado.
  Future<AuthSession> register({
    required String email,
    required String password,
    required String fullName,
  });

  /// Restaura la sesion guardada validando el token contra el backend.
  /// @return La sesion vigente, o `null` si no hay sesion valida.
  Future<AuthSession?> currentSession();

  /// Cierra la sesion y borra los tokens.
  Future<void> logout();
}
