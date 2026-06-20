import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/injection.dart';
import '../../../../core/error/api_exception.dart';
import '../../../../shared/hex_color.dart';
import '../../../../shared/money_format.dart';
import '../../domain/entities/account.dart';
import '../../domain/entities/account_yield.dart';
import '../../domain/entities/budget_params.dart';
import '../../domain/repositories/budget_repository.dart';
import '../providers/budget_providers.dart';
import 'add_account_screen.dart';
import 'set_yield_screen.dart';

/// Detalle de una cuenta: rendimiento, proyeccion de crecimiento, estado del
/// CDT y saldos registrados (snapshots).
class AccountDetailScreen extends ConsumerWidget {
  const AccountDetailScreen({super.key, required this.account});

  final Account account;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(account.name),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            tooltip: 'Editar cuenta',
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => AddAccountScreen(account: account)),
            ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              CircleAvatar(backgroundColor: hexToColor(account.color), radius: 14),
              const SizedBox(width: 12),
              Expanded(
                child: Text(_yieldLabel(), style: theme.textTheme.titleMedium),
              ),
            ],
          ),
          const SizedBox(height: 16),
          FilledButton.tonalIcon(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => SetYieldScreen(account: account)),
            ),
            icon: const Icon(Icons.trending_up),
            label: Text(account.hasYield ? 'Editar rendimiento' : 'Configurar rendimiento'),
          ),
          if (account.hasYield) ...[
            const SizedBox(height: 24),
            _ProjectionSection(accountId: account.id),
          ],
          const SizedBox(height: 24),
          _SnapshotsSection(account: account),
        ],
      ),
    );
  }

  /// Etiqueta legible del rendimiento de la cuenta.
  String _yieldLabel() {
    if (!account.hasYield) return 'Sin rendimiento';
    final rate = account.effectiveAnnualRate ?? 0;
    final tipo = account.isCdt ? 'CDT' : 'Cuenta remunerada';
    return '$tipo · ${formatPercent(rate)} E.A.';
  }
}

/// Seccion de proyeccion: grafico de crecimiento y, si es CDT, su estado.
class _ProjectionSection extends ConsumerWidget {
  const _ProjectionSection({required this.accountId});

  final String accountId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final projectionAsync = ref.watch(accountProjectionProvider(accountId));
    return projectionAsync.when(
      loading: () => const SizedBox(height: 120, child: Center(child: CircularProgressIndicator())),
      error: (e, _) => Text('$e'),
      data: (projection) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Proyeccion de crecimiento', style: theme.textTheme.titleMedium),
            const SizedBox(height: 4),
            Text(
              projection.cdt != null
                  ? 'Hasta el vencimiento'
                  : 'Proximos ${projection.points.length} meses',
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 16),
            if (projection.points.length >= 2)
              SizedBox(height: 180, child: _GrowthChart(projection: projection))
            else
              Text('Registra un saldo para ver la proyeccion.',
                  style: theme.textTheme.bodyMedium),
            if (projection.cdt != null) ...[
              const SizedBox(height: 20),
              _CdtStatusCard(cdt: projection.cdt!),
            ],
          ],
        );
      },
    );
  }
}

/// Grafico de linea con la curva de crecimiento proyectado.
class _GrowthChart extends StatelessWidget {
  const _GrowthChart({required this.projection});

  final AccountProjection projection;

  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme.primary;
    final spots = <FlSpot>[
      FlSpot(0, projection.baseValue),
      for (var i = 0; i < projection.points.length; i++)
        FlSpot((i + 1).toDouble(), projection.points[i].value),
    ];
    final last = projection.points.last;
    return Column(
      children: [
        Expanded(
          child: LineChart(
            LineChartData(
              gridData: const FlGridData(show: false),
              titlesData: const FlTitlesData(show: false),
              borderData: FlBorderData(show: false),
              lineTouchData: const LineTouchData(enabled: false),
              lineBarsData: [
                LineChartBarData(
                  spots: spots,
                  isCurved: true,
                  color: color,
                  barWidth: 3,
                  dotData: const FlDotData(show: false),
                  belowBarData: BarAreaData(
                    show: true,
                    color: color.withValues(alpha: 0.12),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Hoy: ${formatCop(projection.baseValue)}',
                style: Theme.of(context).textTheme.bodySmall),
            Text('Proyectado: ${formatCop(last.value)}',
                style: Theme.of(context)
                    .textTheme
                    .bodySmall
                    ?.copyWith(fontWeight: FontWeight.w700, color: color)),
          ],
        ),
      ],
    );
  }
}

/// Tarjeta con el estado de un CDT.
class _CdtStatusCard extends StatelessWidget {
  const _CdtStatusCard({required this.cdt});

  final CdtStatus cdt;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.secondaryContainer,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Estado del CDT', style: theme.textTheme.titleSmall),
          const SizedBox(height: 12),
          _row(context, 'Vence', '${cdt.maturesOn}  (${cdt.daysRemaining} dias)'),
          _row(context, 'Interes bruto', formatCop(cdt.grossInterest)),
          _row(context, 'Retencion en la fuente', '- ${formatCop(cdt.withholding)}'),
          _row(context, 'Interes neto', formatCop(cdt.netInterest)),
          const Divider(height: 20),
          _row(context, 'Recibes al vencimiento', formatCop(cdt.maturityValue), bold: true),
        ],
      ),
    );
  }

  /// Fila etiqueta/valor de la tarjeta del CDT.
  Widget _row(BuildContext context, String label, String value, {bool bold = false}) {
    final style = bold
        ? Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)
        : Theme.of(context).textTheme.bodyMedium;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [Text(label, style: style), Text(value, style: style)],
      ),
    );
  }
}

/// Seccion de saldos registrados (snapshots) con opcion de agregar.
class _SnapshotsSection extends ConsumerWidget {
  const _SnapshotsSection({required this.account});

  final Account account;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final snapshotsAsync = ref.watch(accountSnapshotsProvider(account.id));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Saldos registrados', style: theme.textTheme.titleMedium),
            TextButton.icon(
              onPressed: () => _addSnapshot(context, ref),
              icon: const Icon(Icons.add, size: 18),
              label: const Text('Registrar'),
            ),
          ],
        ),
        snapshotsAsync.when(
          loading: () => const Padding(
            padding: EdgeInsets.all(16),
            child: Center(child: CircularProgressIndicator()),
          ),
          error: (e, _) => Text('$e'),
          data: (snapshots) => snapshots.isEmpty
              ? Text('Aun no registras saldos de esta cuenta.',
                  style: theme.textTheme.bodyMedium
                      ?.copyWith(color: theme.colorScheme.onSurfaceVariant))
              : Column(
                  children: [
                    for (final s in snapshots.reversed)
                      ListTile(
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                        leading: const Icon(Icons.savings_outlined),
                        title: Text(formatCop(s.balance)),
                        subtitle: Text(s.asOfDate),
                        trailing: IconButton(
                          icon: const Icon(Icons.delete_outline, size: 20),
                          onPressed: () async {
                            await getIt<BudgetRepository>().deleteSnapshot(s.id);
                            ref.invalidate(accountSnapshotsProvider(account.id));
                            ref.invalidate(accountProjectionProvider(account.id));
                            ref.invalidate(netWorthProvider);
                          },
                        ),
                      ),
                  ],
                ),
        ),
      ],
    );
  }

  /// Abre un dialogo para registrar el saldo real en una fecha.
  Future<void> _addSnapshot(BuildContext context, WidgetRef ref) async {
    final balanceController = TextEditingController();
    var date = DateTime.now();
    String fmt(DateTime d) =>
        '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          title: const Text('Registrar saldo'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: balanceController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'))],
                decoration: const InputDecoration(labelText: 'Saldo', prefixText: '\$ '),
              ),
              const SizedBox(height: 12),
              InkWell(
                onTap: () async {
                  final picked = await showDatePicker(
                    context: ctx,
                    initialDate: date,
                    firstDate: DateTime(2000),
                    lastDate: DateTime(2100),
                  );
                  if (picked != null) setLocal(() => date = picked);
                },
                child: InputDecorator(
                  decoration: const InputDecoration(
                    labelText: 'Fecha',
                    suffixIcon: Icon(Icons.calendar_today_outlined),
                  ),
                  child: Text(fmt(date)),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Guardar')),
          ],
        ),
      ),
    );
    if (saved != true) return;
    final balance = double.tryParse(balanceController.text.replaceAll(',', '.'));
    if (balance == null) return;
    try {
      await getIt<BudgetRepository>().addSnapshot(
        account.id,
        CreateSnapshotParams(balance: balance, asOfDate: fmt(date)),
      );
      ref.invalidate(accountSnapshotsProvider(account.id));
      ref.invalidate(accountProjectionProvider(account.id));
      ref.invalidate(netWorthProvider);
    } on ApiException catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }
}
