import '../entities/institution.dart';
import '../entities/open_finance_connection.dart';
import '../entities/sync_summary.dart';

/// Contrato de acceso a Open Finance desde la capa de presentación.
abstract class OpenFinanceRepository {
  /// Lista las instituciones disponibles.
  Future<List<Institution>> listInstitutions();

  /// Lista las conexiones del usuario.
  Future<List<OpenFinanceConnection>> listConnections();

  /// Crea una conexión para una institución.
  Future<OpenFinanceConnection> createConnection(String institutionId);

  /// Sincroniza una conexión y devuelve el resumen.
  Future<SyncSummary> sync(String connectionId);

  /// Revoca una conexión.
  Future<void> revoke(String connectionId);
}
