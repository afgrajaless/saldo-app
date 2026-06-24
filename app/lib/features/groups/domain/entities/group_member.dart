/// Miembro de un grupo de gasto compartido (real o fantasma).
class GroupMember {
  const GroupMember({
    required this.id,
    required this.groupId,
    required this.displayName,
    required this.isGhost,
    this.userId,
  });

  final String id;
  final String groupId;

  /// UUID del usuario real; null si es fantasma.
  final String? userId;

  final String displayName;

  /// True si el miembro no tiene cuenta propia en la app.
  final bool isGhost;
}
