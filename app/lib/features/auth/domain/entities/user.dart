/// Usuario autenticado (entidad de dominio).
class User {
  const User({required this.id, required this.email, this.fullName});

  /// UUID del usuario.
  final String id;

  /// Correo electronico.
  final String email;

  /// Nombre completo (puede no estar disponible al restaurar la sesion).
  final String? fullName;
}
