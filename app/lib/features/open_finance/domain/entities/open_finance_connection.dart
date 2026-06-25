/// Conexión a un banco vía Open Finance.
class OpenFinanceConnection {
  const OpenFinanceConnection({
    required this.id,
    required this.institutionId,
    required this.institutionName,
    required this.status,
    this.lastSyncedAt,
  });

  final String id;
  final String institutionId;
  final String institutionName;
  final String status; // pending | active | expired | revoked | error
  final DateTime? lastSyncedAt;
}
