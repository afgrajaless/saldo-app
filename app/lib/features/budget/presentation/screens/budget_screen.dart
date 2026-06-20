import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/hex_color.dart';
import '../../../../shared/money_format.dart';
import '../../../../shared/month_format.dart';
import '../../../../core/di/injection.dart';
import '../../domain/entities/budget_summary.dart';
import '../../domain/entities/transaction.dart';
import '../../domain/repositories/budget_repository.dart';
import '../providers/budget_providers.dart';
import '../providers/selected_month_provider.dart';
import 'add_transaction_screen.dart';
import 'add_transfer_screen.dart';
import 'categories_screen.dart';
import 'import_screen.dart';

/// Pantalla de presupuesto: resumen mensual, avance de metas y movimientos.
class BudgetScreen extends ConsumerWidget {
  const BudgetScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final month = ref.watch(selectedMonthProvider);
    final summaryAsync = ref.watch(budgetSummaryProvider(month));
    final txAsync = ref.watch(monthTransactionsProvider(month));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Presupuesto'),
        actions: [
          IconButton(
            icon: const Icon(Icons.swap_horiz),
            tooltip: 'Nueva transferencia',
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => AddTransferScreen(month: month)),
            ),
          ),
          PopupMenuButton<String>(
            tooltip: 'Mas opciones',
            onSelected: (value) {
              final routes = <String, Widget>{
                'categories': const CategoriesScreen(),
                'import': const ImportScreen(),
              };
              final screen = routes[value];
              if (screen != null) {
                Navigator.of(context)
                    .push(MaterialPageRoute<void>(builder: (_) => screen));
              }
            },
            itemBuilder: (_) => const [
              PopupMenuItem(
                value: 'categories',
                child: ListTile(
                  leading: Icon(Icons.category_outlined),
                  title: Text('Categorias'),
                ),
              ),
              PopupMenuItem(
                value: 'import',
                child: ListTile(
                  leading: Icon(Icons.upload_file_outlined),
                  title: Text('Importar'),
                ),
              ),
            ],
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'fab-budget',
        onPressed: () => Navigator.of(context).push(
          MaterialPageRoute<void>(builder: (_) => AddTransactionScreen(month: month)),
        ),
        icon: const Icon(Icons.add),
        label: const Text('Movimiento'),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(budgetSummaryProvider(month));
          ref.invalidate(monthTransactionsProvider(month));
        },
        child: ListView(
          padding: const EdgeInsets.only(bottom: 96),
          children: [
            _MonthSelector(
              month: month,
              onShift: (d) => ref.read(selectedMonthProvider.notifier).shift(d),
            ),
            summaryAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.all(32),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (e, _) => Padding(
                padding: const EdgeInsets.all(24),
                child: Text('$e', textAlign: TextAlign.center),
              ),
              data: (summary) => _SummarySection(summary: summary),
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
              child: Text('Movimientos del mes',
                  style: Theme.of(context).textTheme.titleMedium),
            ),
            txAsync.when(
              loading: () => const SizedBox(
                height: 80,
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (e, _) => Padding(
                padding: const EdgeInsets.all(24),
                child: Text('$e', textAlign: TextAlign.center),
              ),
              data: (txs) => txs.isEmpty
                  ? const _EmptyTransactions()
                  : Column(
                      children: txs
                          .map((t) => _TransactionTile(
                                transaction: t,
                                onDelete: () => _deleteTransaction(ref, month, t.id),
                              ))
                          .toList(),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  /// Elimina un movimiento y refresca el resumen y la lista.
  /// @param ref - Referencia de Riverpod.
  /// @param month - Mes vigente.
  /// @param id - UUID del movimiento.
  Future<void> _deleteTransaction(WidgetRef ref, String month, String id) async {
    await getIt<BudgetRepository>().deleteTransaction(id);
    ref.invalidate(budgetSummaryProvider(month));
    ref.invalidate(monthTransactionsProvider(month));
  }
}

/// Selector de mes con flechas anterior/siguiente.
class _MonthSelector extends StatelessWidget {
  const _MonthSelector({required this.month, required this.onShift});

  final String month;
  final ValueChanged<int> onShift;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            icon: const Icon(Icons.chevron_left),
            onPressed: () => onShift(-1),
          ),
          Text(monthLabel(month),
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.w600)),
          IconButton(
            icon: const Icon(Icons.chevron_right),
            onPressed: () => onShift(1),
          ),
        ],
      ),
    );
  }
}

/// Seccion de resumen: totales, balance y avance de metas.
class _SummarySection extends StatelessWidget {
  const _SummarySection({required this.summary});

  final BudgetSummary summary;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final positive = summary.balance >= 0;
    final withTargets =
        summary.categories.where((c) => !c.isIncome && c.monthlyBudget != null).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 16),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: theme.colorScheme.primary,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _Figure(label: 'Ingresos', value: summary.totalIncome, color: theme.colorScheme.onPrimary),
                  _Figure(label: 'Egresos', value: summary.totalExpense, color: theme.colorScheme.onPrimary),
                ],
              ),
              Divider(height: 28, color: theme.colorScheme.onPrimary.withValues(alpha: 0.25)),
              Text('Balance del mes',
                  style: theme.textTheme.labelLarge
                      ?.copyWith(color: theme.colorScheme.onPrimary)),
              const SizedBox(height: 2),
              Text(
                '${positive ? '' : '-'}${formatCop(summary.balance.abs())}',
                style: theme.textTheme.headlineMedium?.copyWith(
                  color: theme.colorScheme.onPrimary,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
        if (withTargets.isNotEmpty) ...[
          const SizedBox(height: 20),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text('Metas de gasto', style: theme.textTheme.titleMedium),
          ),
          const SizedBox(height: 8),
          ...withTargets.map((c) => _BudgetProgress(summary: c)),
        ],
      ],
    );
  }
}

/// Cifra etiquetada (ingresos/egresos).
class _Figure extends StatelessWidget {
  const _Figure({required this.label, required this.value, required this.color});

  final String label;
  final double value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: [
        Text(label, style: theme.textTheme.labelMedium?.copyWith(color: color)),
        const SizedBox(height: 4),
        Text(formatCop(value),
            style: theme.textTheme.titleLarge
                ?.copyWith(color: color, fontWeight: FontWeight.bold)),
      ],
    );
  }
}

/// Barra de avance de una meta de gasto.
class _BudgetProgress extends StatelessWidget {
  const _BudgetProgress({required this.summary});

  final BudgetCategorySummary summary;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final usage = summary.budgetUsage ?? 0;
    final over = usage > 100;
    final color = over ? theme.colorScheme.error : hexToColor(summary.color);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(summary.name, style: theme.textTheme.bodyLarge),
              Text('${formatCop(summary.spent)} / ${formatCop(summary.monthlyBudget!)}',
                  style: theme.textTheme.bodySmall),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: (usage / 100).clamp(0.0, 1.0),
              minHeight: 10,
              backgroundColor: theme.colorScheme.surfaceContainerHighest,
              valueColor: AlwaysStoppedAnimation(color),
            ),
          ),
          if (over)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text('Sobre el presupuesto (${usage.toStringAsFixed(0)}%)',
                  style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.error)),
            ),
        ],
      ),
    );
  }
}

/// Fila de un movimiento, con swipe para eliminar.
class _TransactionTile extends StatelessWidget {
  const _TransactionTile({required this.transaction, required this.onDelete});

  final Transaction transaction;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final income = transaction.isIncome;
    final sign = income ? '+' : '-';
    final amountColor = income ? theme.colorScheme.primary : theme.colorScheme.error;

    return Dismissible(
      key: ValueKey(transaction.id),
      direction: DismissDirection.endToStart,
      onDismissed: (_) => onDelete(),
      background: Container(
        alignment: Alignment.centerRight,
        color: theme.colorScheme.errorContainer,
        padding: const EdgeInsets.only(right: 24),
        child: Icon(Icons.delete_outline, color: theme.colorScheme.onErrorContainer),
      ),
      child: ListTile(
        leading: CircleAvatar(
          radius: 6,
          backgroundColor: hexToColor(transaction.categoryColor),
        ),
        title: Text(transaction.categoryName),
        subtitle: Text(_subtitle()),
        trailing: Text('$sign ${formatCop(transaction.amount)}',
            style: theme.textTheme.titleSmall
                ?.copyWith(color: amountColor, fontWeight: FontWeight.w600)),
      ),
    );
  }

  /// Subtitulo del movimiento: fecha · cuenta · descripcion (lo que aplique).
  String _subtitle() {
    final parts = <String>[transaction.occurredOn];
    if (transaction.accountName != null && transaction.accountName!.isNotEmpty) {
      parts.add(transaction.accountName!);
    }
    if (transaction.description?.isNotEmpty == true) {
      parts.add(transaction.description!);
    }
    return parts.join(' · ');
  }
}

/// Estado vacio de movimientos.
class _EmptyTransactions extends StatelessWidget {
  const _EmptyTransactions();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 24),
      child: Column(
        children: [
          Icon(Icons.receipt_long_outlined, size: 56, color: theme.colorScheme.primary),
          const SizedBox(height: 12),
          Text('Sin movimientos este mes',
              textAlign: TextAlign.center, style: theme.textTheme.titleSmall),
          const SizedBox(height: 4),
          Text('Toca "Movimiento" para registrar un ingreso o egreso.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
        ],
      ),
    );
  }
}
