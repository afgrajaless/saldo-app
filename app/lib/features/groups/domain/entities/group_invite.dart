/// Invitacion para unirse a un grupo via codigo de enlace.
class GroupInvite {
  const GroupInvite({
    required this.code,
    required this.expiresAt,
  });

  /// Codigo unico de invitacion.
  final String code;

  /// Fecha de expiracion de la invitacion (ISO 8601).
  final String expiresAt;
}
