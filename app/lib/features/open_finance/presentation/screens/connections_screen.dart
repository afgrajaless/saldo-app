import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../budget/presentation/providers/budget_providers.dart';
import '../../../debts/presentation/providers/debts_controller.dart';
import '../providers/open_finance_providers.dart';

/// Lista las conexiones de Open Finance activas del usuario y permite
/// re-sincronizar o revocar cada una.
class ConnectionsScreen extends ConsumerWidget {
  const ConnectionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final connections = ref.watch(connectionsListProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Bancos conectados')),
      body: connections.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, size: 48),
                const SizedBox(height: 12),
                Text(
                  'No se pudieron cargar las conexiones.',
                  style: Theme.of(context).textTheme.titleMedium,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  '$e',
                  textAlign: TextAlign.center,
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant),
                ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: () => ref.invalidate(connectionsListProvider),
                  icon: const Icon(Icons.refresh),
                  label: const Text('Reintentar'),
                ),
              ],
            ),
          ),
        ),
        data: (list) => list.isEmpty
            ? Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.link_off,
                        size: 72,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Aún no has conectado bancos.',
                        style: Theme.of(context).textTheme.titleMedium,
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Conecta tu banco para sincronizar cuentas y deudas automáticamente.',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                      ),
                    ],
                  ),
                ),
              )
            : ListView(
                children: [
                  for (final c in list)
                    ListTile(
                      leading: CircleAvatar(
                        backgroundColor:
                            Theme.of(context).colorScheme.primaryContainer,
                        child: Icon(
                          Icons.link,
                          color:
                              Theme.of(context).colorScheme.onPrimaryContainer,
                          size: 20,
                        ),
                      ),
                      title: Text(c.institutionName),
                      subtitle: Text(
                        'Estado: ${_statusLabel(c.status)}'
                        '${c.lastSyncedAt != null ? ' · Sync ${_formatDate(c.lastSyncedAt!)}' : ''}',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: _statusColor(context, c.status),
                            ),
                      ),
                      trailing: PopupMenuButton<String>(
                        tooltip: 'Opciones',
                        onSelected: (v) =>
                            _handleAction(context, ref, v, c.id),
                        itemBuilder: (_) => const [
                          PopupMenuItem(
                            value: 'sync',
                            child: ListTile(
                              leading: Icon(Icons.sync),
                              title: Text('Sincronizar'),
                              contentPadding: EdgeInsets.zero,
                            ),
                          ),
                          PopupMenuItem(
                            value: 'revoke',
                            child: ListTile(
                              leading: Icon(Icons.link_off),
                              title: Text('Revocar'),
                              contentPadding: EdgeInsets.zero,
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
      ),
    );
  }

  /// Ejecuta la accion seleccionada en el menu de una conexion.
  /// @param context - Contexto de la pantalla.
  /// @param ref - WidgetRef para operaciones y refresco de providers.
  /// @param action - 'sync' o 'revoke'.
  /// @param connectionId - ID de la conexion afectada.
  Future<void> _handleAction(
    BuildContext context,
    WidgetRef ref,
    String action,
    String connectionId,
  ) async {
    final repo = ref.read(openFinanceRepositoryProvider);
    final messenger = ScaffoldMessenger.of(context);

    try {
      if (action == 'sync') {
        final summary = await repo.sync(connectionId);
        // Refrescar todas las listas que pudieron cambiar tras la sincronizacion.
        ref.invalidate(accountsListProvider);
        ref.invalidate(cardsListProvider);
        ref.invalidate(connectionsListProvider);
        ref.invalidate(debtsControllerProvider);
        if (context.mounted) {
          messenger.showSnackBar(
            SnackBar(
              content: Text(
                'Sincronizados ${summary.totalIntegrated} productos'
                '${summary.skipped > 0 ? ' · ${summary.skipped} omitidos' : ''}',
              ),
            ),
          );
        }
      } else if (action == 'revoke') {
        final confirmed = await _confirmRevoke(context);
        if (!confirmed) return;
        await repo.revoke(connectionId);
        // Al revocar, la conexion se elimina pero las cuentas/deudas vinculadas
        // permanecen; se refresca de todas formas para reflejar el cambio de estado.
        ref.invalidate(connectionsListProvider);
        ref.invalidate(accountsListProvider);
        ref.invalidate(cardsListProvider);
        if (context.mounted) {
          messenger.showSnackBar(
            const SnackBar(content: Text('Conexión revocada.')),
          );
        }
      }
    } catch (e) {
      if (context.mounted) {
        messenger.showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  /// Pide confirmacion antes de revocar una conexion.
  /// @param context - Contexto de la pantalla.
  /// @return true si el usuario confirma.
  Future<bool> _confirmRevoke(BuildContext context) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('¿Revocar conexión?'),
        content: const Text(
          'Los productos ya sincronizados se conservan, pero no se actualizarán automáticamente.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Revocar'),
          ),
        ],
      ),
    );
    return result ?? false;
  }

  /// Convierte el estado interno a una etiqueta legible para el usuario.
  /// @param status - Estado de la conexion.
  /// @return Etiqueta en español.
  String _statusLabel(String status) {
    return switch (status) {
      'active' => 'Activa',
      'pending' => 'Pendiente',
      'expired' => 'Expirada',
      'revoked' => 'Revocada',
      'error' => 'Error',
      _ => status,
    };
  }

  /// Color indicativo del estado de la conexion.
  /// @param context - Contexto para acceder al tema.
  /// @param status - Estado de la conexion.
  /// @return Color asociado al estado.
  Color _statusColor(BuildContext context, String status) {
    final cs = Theme.of(context).colorScheme;
    return switch (status) {
      'active' => cs.primary,
      'pending' => cs.tertiary,
      'expired' || 'error' => cs.error,
      'revoked' => cs.onSurfaceVariant,
      _ => cs.onSurfaceVariant,
    };
  }

  /// Formatea una fecha de sincronizacion de forma concisa.
  /// @param dt - Fecha a formatear.
  /// @return Cadena con fecha en formato dd/MM/yyyy.
  String _formatDate(DateTime dt) =>
      '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
}
