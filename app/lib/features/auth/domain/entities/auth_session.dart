import 'user.dart';

/// Sesion autenticada: par de tokens y el usuario asociado.
class AuthSession {
  const AuthSession({
    required this.accessToken,
    required this.refreshToken,
    required this.user,
  });

  /// JWT de acceso (vida corta).
  final String accessToken;

  /// JWT de refresco (vida larga).
  final String refreshToken;

  /// Usuario en sesion.
  final User user;
}
