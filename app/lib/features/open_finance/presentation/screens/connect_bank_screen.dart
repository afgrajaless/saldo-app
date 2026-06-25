import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../budget/presentation/providers/budget_providers.dart';
import '../../../debts/presentation/providers/debts_controller.dart';
import '../providers/open_finance_providers.dart';
import 'connections_screen.dart';

/// Pantalla para conectar un banco vía Open Finance.
/// Lista las instituciones disponibles y, al seleccionar una, crea la conexión,
/// sincroniza los productos y refresca las listas de cuentas, tarjetas y deudas.
class ConnectBankScreen extends ConsumerWidget {
  const ConnectBankScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final institutions = ref.watch(institutionsProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Conectar banco'),
        actions: [
          /// Navega a la pantalla de conexiones activas para gestionar o revocar.
          IconButton(
            icon: const Icon(Icons.link),
            tooltip: 'Bancos conectados',
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => const ConnectionsScreen()),
            ),
          ),
        ],
      ),
      body: institutions.when(
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
                  'No se pudieron cargar los bancos.',
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
                      ?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant),
                ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: () => ref.invalidate(institutionsProvider),
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
                      Icon(Icons.account_balance_outlined,
                          size: 72,
                          color: Theme.of(context).colorScheme.primary),
                      const SizedBox(height: 16),
                      Text(
                        'Sin instituciones disponibles',
                        style: Theme.of(context).textTheme.titleMedium,
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Por ahora no hay bancos disponibles para conectar.',
                        textAlign: TextAlign.center,
                        style: Theme.of(context)
                            .textTheme
                            .bodyMedium
                            ?.copyWith(
                                color: Theme.of(context)
                                    .colorScheme
                                    .onSurfaceVariant),
                      ),
                    ],
                  ),
                ),
              )
            : ListView.separated(
                itemCount: list.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (context, i) {
                  final inst = list[i];
                  return ListTile(
                    leading: CircleAvatar(
                      backgroundColor:
                          Theme.of(context).colorScheme.secondaryContainer,
                      child: Icon(
                        Icons.account_balance,
                        color: Theme.of(context)
                            .colorScheme
                            .onSecondaryContainer,
                        size: 20,
                      ),
                    ),
                    title: Text(inst.name),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => _connectAndSync(context, ref, inst.id),
                  );
                },
              ),
      ),
    );
  }

  /// Crea la conexion con la institucion, sincroniza los productos, refresca
  /// los providers de datos (cuentas, tarjetas, deudas y conexiones) y muestra
  /// un resumen al usuario.
  /// @param context - Contexto de la pantalla.
  /// @param ref - WidgetRef para leer providers y refrescar datos.
  /// @param institutionId - ID de la institucion seleccionada.
  Future<void> _connectAndSync(
    BuildContext context,
    WidgetRef ref,
    String institutionId,
  ) async {
    final repo = ref.read(openFinanceRepositoryProvider);
    final messenger = ScaffoldMessenger.of(context);

    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => const PopScope(
        canPop: false,
        child: Center(child: CircularProgressIndicator()),
      ),
    );

    try {
      final conn = await repo.createConnection(institutionId);
      final summary = await repo.sync(conn.id);

      // Refrescar todas las listas que pudieron cambiar tras la sincronizacion.
      ref.invalidate(accountsListProvider);
      ref.invalidate(cardsListProvider);
      ref.invalidate(connectionsListProvider);
      ref.invalidate(debtsControllerProvider);

      if (context.mounted) Navigator.of(context).pop(); // cierra el loader

      if (context.mounted) {
        messenger.showSnackBar(SnackBar(
          content: Text(
            'Integrados ${summary.totalIntegrated} productos'
            '${summary.skipped > 0 ? ' · ${summary.skipped} omitidos' : ''}',
          ),
        ));
        Navigator.of(context).pop(); // vuelve a la pantalla anterior
      }
    } catch (e) {
      if (context.mounted) Navigator.of(context).pop(); // cierra el loader
      messenger.showSnackBar(
        SnackBar(content: Text('No se pudo sincronizar: $e')),
      );
    }
  }
}
