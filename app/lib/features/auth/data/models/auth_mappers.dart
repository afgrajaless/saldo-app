import '../../domain/entities/auth_session.dart';
import '../../domain/entities/user.dart';

/// Construye un User a partir del JSON del backend.
/// @param json - Objeto JSON con id, email y fullName (opcional).
/// @return La entidad User.
User userFromJson(Map<String, dynamic> json) {
  return User(
    id: json['id'] as String,
    email: json['email'] as String,
    fullName: json['fullName'] as String?,
  );
}

/// Construye una AuthSession a partir del JSON de respuesta de auth.
/// @param json - Objeto JSON con accessToken, refreshToken y user.
/// @return La entidad AuthSession.
AuthSession authSessionFromJson(Map<String, dynamic> json) {
  return AuthSession(
    accessToken: json['accessToken'] as String,
    refreshToken: json['refreshToken'] as String,
    user: userFromJson(json['user'] as Map<String, dynamic>),
  );
}
