import '../domain/entities/institution.dart';
import '../domain/entities/open_finance_connection.dart';
import '../domain/entities/sync_summary.dart';
import '../domain/entities/widget_token.dart';

/// Mapea el JSON de una institución a la entidad.
Institution institutionFromJson(Map<String, dynamic> json) =>
    Institution(id: json['id'] as String, name: json['name'] as String);

/// Mapea el JSON del token de widget a la entidad.
WidgetToken widgetTokenFromJson(Map<String, dynamic> json) => WidgetToken(
      accessToken: json['accessToken'] as String,
      expiresAt: json['expiresAt'] != null
          ? DateTime.parse(json['expiresAt'] as String)
          : null,
    );

/// Mapea el JSON de una conexión a la entidad.
OpenFinanceConnection connectionFromJson(Map<String, dynamic> json) =>
    OpenFinanceConnection(
      id: json['id'] as String,
      institutionId: json['institutionId'] as String,
      institutionName: json['institutionName'] as String,
      status: json['status'] as String,
      lastSyncedAt: json['lastSyncedAt'] != null
          ? DateTime.parse(json['lastSyncedAt'] as String)
          : null,
    );

/// Mapea el JSON del resumen de sincronización a la entidad.
SyncSummary syncSummaryFromJson(Map<String, dynamic> json) => SyncSummary(
      accountsCreated: json['accountsCreated'] as int,
      accountsUpdated: json['accountsUpdated'] as int,
      cardsCreated: json['cardsCreated'] as int,
      cardsUpdated: json['cardsUpdated'] as int,
      debtsCreated: json['debtsCreated'] as int,
      debtsUpdated: json['debtsUpdated'] as int,
      skipped: json['skipped'] as int,
    );
