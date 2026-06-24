/// Grupo de gasto compartido entre varios miembros.
class Group {
  const Group({
    required this.id,
    required this.name,
    required this.createdAt,
    this.archivedAt,
  });

  final String id;
  final String name;

  /// Fecha de creacion del grupo (ISO 8601).
  final String createdAt;

  /// Fecha de archivado; null si el grupo sigue activo.
  final String? archivedAt;

  /// Indica si el grupo esta archivado.
  bool get isArchived => archivedAt != null;
}
