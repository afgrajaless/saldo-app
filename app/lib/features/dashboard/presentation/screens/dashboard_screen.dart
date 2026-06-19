import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/chart_palette.dart';
import '../../../../shared/enum_labels.dart';
import '../../../../shared/money_format.dart';
import '../../../debts/domain/entities/debt.dart';
import '../../../debts/presentation/providers/debts_controller.dart';

/// Una porcion de la distribucion de deuda por tipo.
class _TypeSlice {
  _TypeSlice(this.type, this.amount, this.color);
  final String type;
  final double amount;
  final Color color;
}

/// Pantalla de resumen: deuda total y distribucion por tipo de obligacion.
class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final debtsAsync = ref.watch(debtsControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Resumen')),
      body: debtsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text('$error', textAlign: TextAlign.center),
          ),
        ),
        data: (debts) => debts.isEmpty
            ? const _EmptyDashboard()
            : _DashboardBody(slices: _buildSlices(debts), total: _total(debts)),
      ),
    );
  }

  /// Suma el capital de todas las deudas.
  double _total(List<Debt> debts) =>
      debts.fold<double>(0, (sum, d) => sum + d.principalAmount);

  /// Agrupa el capital por tipo de deuda y asigna colores.
  /// @param debts - Lista de deudas.
  /// @return Las porciones ordenadas de mayor a menor.
  List<_TypeSlice> _buildSlices(List<Debt> debts) {
    final byType = <String, double>{};
    for (final debt in debts) {
      byType[debt.debtType] = (byType[debt.debtType] ?? 0) + debt.principalAmount;
    }
    final entries = byType.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    return [
      for (var i = 0; i < entries.length; i++)
        _TypeSlice(entries[i].key, entries[i].value, chartColor(i)),
    ];
  }
}

/// Cuerpo del dashboard con total, donut y leyenda.
class _DashboardBody extends StatelessWidget {
  const _DashboardBody({required this.slices, required this.total});

  final List<_TypeSlice> slices;
  final double total;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _TotalCard(total: total, count: slices.length),
        const SizedBox(height: 24),
        Text('Distribucion por tipo', style: theme.textTheme.titleMedium),
        const SizedBox(height: 16),
        SizedBox(
          height: 220,
          child: PieChart(
            PieChartData(
              centerSpaceRadius: 56,
              sectionsSpace: 2,
              sections: [
                for (final slice in slices)
                  PieChartSectionData(
                    value: slice.amount,
                    color: slice.color,
                    radius: 56,
                    title: '${(slice.amount / total * 100).round()}%',
                    titleStyle: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),
        ...slices.map((slice) => _LegendRow(slice: slice, total: total)),
      ],
    );
  }
}

/// Tarjeta destacada con la deuda total.
class _TotalCard extends StatelessWidget {
  const _TotalCard({required this.total, required this.count});

  final double total;
  final int count;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: theme.colorScheme.primary,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Deuda total',
              style: theme.textTheme.labelLarge
                  ?.copyWith(color: theme.colorScheme.onPrimary)),
          const SizedBox(height: 6),
          Text(formatCop(total),
              style: theme.textTheme.headlineLarge?.copyWith(
                  color: theme.colorScheme.onPrimary, fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          Text('$count ${count == 1 ? 'tipo de deuda' : 'tipos de deuda'}',
              style: theme.textTheme.bodyMedium
                  ?.copyWith(color: theme.colorScheme.onPrimary)),
        ],
      ),
    );
  }
}

/// Fila de leyenda con color, tipo, monto y porcentaje.
class _LegendRow extends StatelessWidget {
  const _LegendRow({required this.slice, required this.total});

  final _TypeSlice slice;
  final double total;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final percent = (slice.amount / total * 100).toStringAsFixed(1).replaceAll('.', ',');
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Container(
            width: 14,
            height: 14,
            decoration: BoxDecoration(color: slice.color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 12),
          Expanded(child: Text(labelOf(debtTypeLabels, slice.type))),
          Text(formatCop(slice.amount),
              style: const TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(width: 8),
          Text('$percent%',
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
        ],
      ),
    );
  }
}

/// Estado vacio del dashboard.
class _EmptyDashboard extends StatelessWidget {
  const _EmptyDashboard();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.pie_chart_outline,
                size: 72, color: theme.colorScheme.primary),
            const SizedBox(height: 16),
            Text('Sin datos para el resumen',
                style: theme.textTheme.titleMedium, textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text('Registra una deuda para ver tu distribucion.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium
                    ?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
          ],
        ),
      ),
    );
  }
}
