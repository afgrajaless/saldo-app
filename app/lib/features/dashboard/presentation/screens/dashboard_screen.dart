import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/chart_palette.dart';
import '../../../../shared/enum_labels.dart';
import '../../../../shared/money_format.dart';
import '../../../../shared/month_format.dart';
import '../../../budget/domain/entities/budget_summary.dart';
import '../../../budget/presentation/providers/budget_providers.dart';
import '../../../budget/presentation/providers/selected_month_provider.dart';
import '../../../debts/domain/entities/debt.dart';
import '../../../debts/presentation/providers/debts_controller.dart';

/// Una porcion de un grafico (deuda por tipo o categoria).
class _Slice {
  _Slice(this.label, this.amount, this.color);
  final String label;
  final double amount;
  final Color color;
}

/// Pantalla de resumen: distribucion de deuda por tipo y de los movimientos del
/// mes por categoria (ingresos y gastos).
class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final debtsAsync = ref.watch(debtsControllerProvider);
    final month = ref.watch(selectedMonthProvider);
    final summaryAsync = ref.watch(budgetSummaryProvider(month));

    return Scaffold(
      appBar: AppBar(title: const Text('Resumen')),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(debtsControllerProvider);
          ref.invalidate(budgetSummaryProvider(month));
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // --- Selector de mes (sincronizado con Presupuesto) ---
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  icon: const Icon(Icons.chevron_left),
                  onPressed: () => ref.read(selectedMonthProvider.notifier).shift(-1),
                ),
                Text(monthLabel(month),
                    style: Theme.of(context)
                        .textTheme
                        .titleLarge
                        ?.copyWith(fontWeight: FontWeight.w600)),
                IconButton(
                  icon: const Icon(Icons.chevron_right),
                  onPressed: () => ref.read(selectedMonthProvider.notifier).shift(1),
                ),
              ],
            ),
            const SizedBox(height: 8),
            summaryAsync.when(
              loading: () => const _LoadingBlock(),
              error: (e, _) => _ErrorText(message: '$e'),
              data: (summary) => Column(
                children: [
                  _CategoryDonut(
                    title: 'Ingresos por categoria',
                    emptyHint: 'Sin ingresos este mes.',
                    slices: _categorySlices(summary, income: true),
                  ),
                  const SizedBox(height: 24),
                  _CategoryDonut(
                    title: 'Gastos por categoria',
                    emptyHint: 'Sin gastos este mes.',
                    slices: _categorySlices(summary, income: false),
                  ),
                ],
              ),
            ),
            // --- Distribucion de deuda por tipo ---
            debtsAsync.maybeWhen(
              data: (debts) {
                if (debts.isEmpty) return const SizedBox.shrink();
                final slices = _debtSlices(debts);
                final total = slices.fold<double>(0, (s, e) => s + e.amount);
                return Column(
                  children: [
                    const SizedBox(height: 32),
                    const Divider(),
                    const SizedBox(height: 16),
                    _DonutSection(title: 'Deuda por tipo', slices: slices, total: total),
                  ],
                );
              },
              orElse: () => const SizedBox.shrink(),
            ),
          ],
        ),
      ),
    );
  }

  /// Construye las porciones de una categoria (ingreso o gasto) con gasto > 0.
  /// Usa una paleta de colores distintos por porcion para que el grafico sea
  /// legible aunque las categorias compartan color.
  List<_Slice> _categorySlices(BudgetSummary summary, {required bool income}) {
    final filtered = summary.categories
        .where((c) => c.isIncome == income && c.spent > 0)
        .toList()
      ..sort((a, b) => b.spent.compareTo(a.spent));
    return [
      for (var i = 0; i < filtered.length; i++)
        _Slice(filtered[i].name, filtered[i].spent, chartColor(i)),
    ];
  }

  /// Agrupa el capital de las deudas por tipo y asigna colores de la paleta.
  List<_Slice> _debtSlices(List<Debt> debts) {
    final byType = <String, double>{};
    for (final debt in debts) {
      byType[debt.debtType] = (byType[debt.debtType] ?? 0) + debt.principalAmount;
    }
    final entries = byType.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
    return [
      for (var i = 0; i < entries.length; i++)
        _Slice(labelOf(debtTypeLabels, entries[i].key), entries[i].value, chartColor(i)),
    ];
  }
}

/// Seccion de dona para categorias (con su propio titulo y estado vacio).
class _CategoryDonut extends StatelessWidget {
  const _CategoryDonut({required this.title, required this.emptyHint, required this.slices});

  final String title;
  final String emptyHint;
  final List<_Slice> slices;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (slices.isEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: theme.textTheme.titleMedium),
          const SizedBox(height: 8),
          Text(emptyHint,
              style: theme.textTheme.bodyMedium
                  ?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
        ],
      );
    }
    final total = slices.fold<double>(0, (s, e) => s + e.amount);
    return _DonutSection(title: title, slices: slices, total: total);
  }
}

/// Seccion generica: titulo, dona y leyenda.
class _DonutSection extends StatelessWidget {
  const _DonutSection({required this.title, required this.slices, required this.total});

  final String title;
  final List<_Slice> slices;
  final double total;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(title, style: theme.textTheme.titleMedium),
            Text(formatCop(total),
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
          ],
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: 200,
          child: PieChart(
            PieChartData(
              centerSpaceRadius: 52,
              sectionsSpace: 2,
              sections: [
                for (final slice in slices)
                  PieChartSectionData(
                    value: slice.amount,
                    color: slice.color,
                    radius: 52,
                    title: total > 0 ? '${(slice.amount / total * 100).round()}%' : '',
                    titleStyle: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        ...slices.map((slice) => _LegendRow(slice: slice, total: total)),
      ],
    );
  }
}

/// Fila de leyenda con color, etiqueta, monto y porcentaje.
class _LegendRow extends StatelessWidget {
  const _LegendRow({required this.slice, required this.total});

  final _Slice slice;
  final double total;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final percent =
        total > 0 ? (slice.amount / total * 100).toStringAsFixed(1).replaceAll('.', ',') : '0';
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
          Expanded(child: Text(slice.label, maxLines: 1, overflow: TextOverflow.ellipsis)),
          Text(formatCop(slice.amount), style: const TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(width: 8),
          Text('$percent%',
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
        ],
      ),
    );
  }
}

/// Bloque de carga compacto.
class _LoadingBlock extends StatelessWidget {
  const _LoadingBlock();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.all(32),
      child: Center(child: CircularProgressIndicator()),
    );
  }
}

/// Texto de error compacto.
class _ErrorText extends StatelessWidget {
  const _ErrorText({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Text(message, textAlign: TextAlign.center),
    );
  }
}
