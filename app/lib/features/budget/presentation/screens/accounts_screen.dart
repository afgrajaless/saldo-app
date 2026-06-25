import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/injection.dart';
import '../../../../shared/hex_color.dart';
import '../../../../shared/money_format.dart';
import '../../domain/entities/account.dart';
import '../../domain/entities/account_yield.dart';
import '../../domain/repositories/budget_repository.dart';
import '../../../open_finance/presentation/screens/connect_bank_screen.dart';
import '../providers/budget_providers.dart';
import 'account_detail_screen.dart';
import 'add_account_screen.dart';
import 'add_card_screen.dart';
import 'cards_list_view.dart';

/// Pantalla de gestion de cuentas y tarjetas de credito.
/// Alterna entre la vista de cuentas y la de tarjetas mediante un [SegmentedButton].
class AccountsScreen extends ConsumerStatefulWidget {
  const AccountsScreen({super.key});

  @override
  ConsumerState<AccountsScreen> createState() => _AccountsScreenState();
}

class _AccountsScreenState extends ConsumerState<AccountsScreen> {
  /// true = mostrar tarjetas, false = mostrar cuentas.
  bool _showCards = false;

  @override
  Widget build(BuildContext context) {
    final accountsAsync = ref.watch(accountsListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Cuentas'),
        actions: [
          IconButton(
            icon: const Icon(Icons.account_balance_outlined),
            tooltip: 'Conectar banco',
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                  builder: (_) => const ConnectBankScreen()),
            ),
          ),
        ],
      ),
      floatingActionButton: _showCards
          ? FloatingActionButton.extended(
              heroTag: 'fab_card',
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(builder: (_) => const AddCardScreen()),
              ),
              icon: const Icon(Icons.add),
              label: const Text('Nueva tarjeta'),
            )
          : FloatingActionButton.extended(
              heroTag: 'fab_account',
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                    builder: (_) => const AddAccountScreen()),
              ),
              icon: const Icon(Icons.add),
              label: const Text('Cuenta'),
            ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: SegmentedButton<bool>(
              segments: const [
                ButtonSegment(
                  value: false,
                  label: Text('Cuentas'),
                  icon: Icon(Icons.account_balance_wallet_outlined),
                ),
                ButtonSegment(
                  value: true,
                  label: Text('Tarjetas'),
                  icon: Icon(Icons.credit_card_outlined),
                ),
              ],
              selected: {_showCards},
              onSelectionChanged: (selected) =>
                  setState(() => _showCards = selected.first),
            ),
          ),
          Expanded(
            child: _showCards
                ? const CardsListView()
                : accountsAsync.when(
                    loading: () =>
                        const Center(child: CircularProgressIndicator()),
                    error: (e, _) => Center(child: Text('$e')),
                    data: (accounts) {
                      // Solo cuentas de activo; las tarjetas se muestran en la sub-vista "Tarjetas".
                      final assetAccounts =
                          accounts.where((a) => !a.isCard).toList();
                      return assetAccounts.isEmpty
                          ? const _Empty()
                          : ListView(
                              padding:
                                  const EdgeInsets.only(top: 8, bottom: 96),
                              children: [
                                const _NetWorthCard(),
                                ...assetAccounts
                                    .map((a) => _AccountTile(account: a)),
                              ],
                            );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

/// Fila de una cuenta: tap para ver detalle, swipe para eliminar.
/// Las cuentas vinculadas via Open Finance no permiten eliminacion (solo lectura).
class _AccountTile extends ConsumerWidget {
  const _AccountTile({required this.account});

  final Account account;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tile = ListTile(
      leading:
          CircleAvatar(backgroundColor: hexToColor(account.color), radius: 14),
      title: Text(account.name),
      subtitle: _buildSubtitle(),
      trailing: account.isLinked
          ? _linkedBadge()
          : const Icon(Icons.chevron_right),
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute<void>(
            builder: (_) => AccountDetailScreen(account: account)),
      ),
    );

    // Las cuentas vinculadas son de solo lectura: se deshabilita el swipe-to-delete.
    if (account.isLinked) return tile;

    return Dismissible(
      key: ValueKey(account.id),
      direction: DismissDirection.endToStart,
      confirmDismiss: (_) => _confirm(context),
      onDismissed: (_) async {
        await getIt<BudgetRepository>().deleteAccount(account.id);
        ref.invalidate(accountsListProvider);
      },
      background: Container(
        alignment: Alignment.centerRight,
        color: Theme.of(context).colorScheme.errorContainer,
        padding: const EdgeInsets.only(right: 24),
        child: Icon(Icons.delete_outline,
            color: Theme.of(context).colorScheme.onErrorContainer),
      ),
      child: tile,
    );
  }

  /// Construye el subtitulo de la cuenta segun su tipo de rendimiento.
  Widget? _buildSubtitle() {
    if (account.hasYield) {
      return Text(
        '${account.isCdt ? 'CDT' : 'Remunerada'} · '
        '${formatPercent(account.effectiveAnnualRate ?? 0)} E.A.',
      );
    }
    return null;
  }

  /// Pide confirmacion antes de eliminar.
  /// @param context - Contexto de la pantalla.
  /// @return true si el usuario confirma la eliminacion.
  Future<bool> _confirm(BuildContext context) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Eliminar "${account.name}"'),
        content: const Text(
          'Los movimientos asociados se conservan, pero quedan sin cuenta.',
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancelar')),
          FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Eliminar')),
        ],
      ),
    );
    return result ?? false;
  }
}

/// Badge indicador de cuenta vinculada via Open Finance (solo lectura).
Widget _linkedBadge() => Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: Colors.blueGrey.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(Icons.lock_outline, size: 12),
        SizedBox(width: 4),
        Text('Vinculado', style: TextStyle(fontSize: 11)),
      ]),
    );

/// Tarjeta con la evolucion del patrimonio (suma de saldos por fecha).
class _NetWorthCard extends ConsumerWidget {
  const _NetWorthCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final netWorthAsync = ref.watch(netWorthProvider);
    return netWorthAsync.maybeWhen(
      data: (points) {
        if (points.isEmpty) return const SizedBox.shrink();
        final latest = points.last;
        return Container(
          margin: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: theme.colorScheme.primary,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Patrimonio',
                  style: theme.textTheme.labelLarge
                      ?.copyWith(color: theme.colorScheme.onPrimary)),
              const SizedBox(height: 4),
              Text(formatCop(latest.total),
                  style: theme.textTheme.headlineMedium?.copyWith(
                      color: theme.colorScheme.onPrimary,
                      fontWeight: FontWeight.bold)),
              if (points.length >= 2) ...[
                const SizedBox(height: 16),
                SizedBox(height: 90, child: _NetWorthChart(points: points)),
              ],
            ],
          ),
        );
      },
      orElse: () => const SizedBox.shrink(),
    );
  }
}

/// Mini-grafico de linea del patrimonio en el tiempo.
class _NetWorthChart extends StatelessWidget {
  const _NetWorthChart({required this.points});

  final List<NetWorthPoint> points;

  @override
  Widget build(BuildContext context) {
    final onPrimary = Theme.of(context).colorScheme.onPrimary;
    final spots = [
      for (var i = 0; i < points.length; i++)
        FlSpot(i.toDouble(), points[i].total),
    ];
    return LineChart(
      LineChartData(
        gridData: const FlGridData(show: false),
        titlesData: const FlTitlesData(show: false),
        borderData: FlBorderData(show: false),
        lineTouchData: const LineTouchData(enabled: false),
        lineBarsData: [
          LineChartBarData(
            spots: spots,
            isCurved: true,
            color: onPrimary,
            barWidth: 2.5,
            dotData: const FlDotData(show: false),
            belowBarData: BarAreaData(
                show: true, color: onPrimary.withValues(alpha: 0.15)),
          ),
        ],
      ),
    );
  }
}

/// Estado vacio de cuentas.
class _Empty extends StatelessWidget {
  const _Empty();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.account_balance_wallet_outlined,
                size: 72, color: theme.colorScheme.primary),
            const SizedBox(height: 16),
            Text('Crea tus cuentas',
                style: theme.textTheme.titleMedium,
                textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(
                'Nequi, efectivo, banco... para clasificar tus movimientos.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium
                    ?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
          ],
        ),
      ),
    );
  }
}
