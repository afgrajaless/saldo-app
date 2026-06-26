import '../entities/institution.dart';
import '../entities/open_finance_connection.dart';
import '../entities/sync_summary.dart';
import '../entities/widget_token.dart';

/// Contrato de acceso a Open Finance desde la capa de presentación.
abstract class OpenFinanceRepository {
  /// Lista las instituciones disponibles.
  Future<List<Institution>> listInstitutions();

  /// Lista las conexiones del usuario.
  Future<List<OpenFinanceConnection>> listConnections();

  /// Crea una conexión para una institución (proveedores sin widget, p. ej. mock).
  Future<OpenFinanceConnection> createConnection(String institutionId);

  /// Genera un token para abrir el widget de consentimiento (proveedores con
  /// widget, p. ej. Belvo). El usuario se autentica en su banco dentro del widget.
  Future<WidgetToken> createWidgetToken();

  /// Finaliza una conexión iniciada por widget: persiste el identificador
  /// externo (link_id) obtenido tras autenticar al usuario en su banco.
  Future<OpenFinanceConnection> finalizeConnection(
    String institutionId,
    String externalConnectionId,
  );

  /// Sincroniza una conexión y devuelve el resumen.
  Future<SyncSummary> sync(String connectionId);

  /// Revoca una conexión.
  Future<void> revoke(String connectionId);
}
