import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/money_format.dart';
import '../../../auth/presentation/providers/auth_controller.dart';
import '../../domain/entities/debt.dart';
import '../../domain/usecases/prioritize_debts.dart';
import '../providers/debts_controller.dart';
import '../widgets/debt_card.dart';
import 'create_debt_screen.dart';
import 'debt_detail_screen.dart';

/// Estrategia de pago activa en la lista de deudas (estado de sesion).
final debtStrategyProvider =
    StateProvider<PayoffStrategy>((ref) => PayoffStrategy.avalanche);

/// Pantalla principal: resumen del usuario y lista de obligaciones.
class DebtsListScreen extends ConsumerWidget {
  const DebtsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final debtsAsync = ref.watch(debtsControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mis deudas'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Cerrar sesion',
            onPressed: () => ref.read(authControllerProvider.notifier).logout(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'fab-debts',
        onPressed: () => Navigator.of(context).push(
          MaterialPageRoute<void>(builder: (_) => const CreateDebtScreen()),
        ),
        icon: const Icon(Icons.add),
        label: const Text('Nueva deuda'),
      ),
      body: debtsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => _ErrorView(
          message: '$error',
          onRetry: () => ref.read(debtsControllerProvider.notifier).refresh(),
        ),
        data: (debts) => RefreshIndicator(
          onRefresh: () => ref.read(debtsControllerProvider.notifier).refresh(),
          child: debts.isEmpty
              ? const _EmptyState()
              : _DebtsList(debts: debts),
        ),
      ),
    );
  }
}

/// Lista con encabezado de resumen (total y cantidad).
class _DebtsList extends ConsumerWidget {
  const _DebtsList({required this.debts});

  final List<Debt> debts;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strategy = ref.watch(debtStrategyProvider);
    final ordered = prioritizeDebts(debts, strategy);
    final total = ordered.fold<double>(0, (sum, d) => sum + d.currentBalance);
    return ListView.builder(
      physics: const AlwaysScrollableScrollPhysics(),
      itemCount: ordered.length + 1,
      itemBuilder: (context, index) {
        if (index == 0) {
          return _ListHeader(
            total: total,
            count: ordered.length,
            strategy: strategy,
          );
        }
        final debt = ordered[index - 1];
        // La primera deuda con saldo es la prioridad bajo la estrategia activa.
        final isPriority = index == 1 && debt.currentBalance > 0;
        return Dismissible(
          key: ValueKey(debt.id),
          direction: DismissDirection.endToStart,
          confirmDismiss: (_) => _confirmDelete(context),
          onDismissed: (_) =>
              ref.read(debtsControllerProvider.notifier).deleteDebt(debt.id),
          background: Container(
            alignment: Alignment.centerRight,
            color: Theme.of(context).colorScheme.errorContainer,
            padding: const EdgeInsets.only(right: 24),
            child: Icon(Icons.delete_outline,
                color: Theme.of(context).colorScheme.onErrorContainer),
          ),
          child: DebtCard(
            debt: debt,
            isPriority: isPriority,
            priorityLabel: isPriority ? priorityReason(debt, strategy) : null,
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => DebtDetailScreen(debtId: debt.id),
              ),
            ),
          ),
        );
      },
    );
  }

  /// Pide confirmacion antes de eliminar una deuda.
  /// @param context - Contexto de la pantalla.
  /// @return `true` si el usuario confirma.
  Future<bool> _confirmDelete(BuildContext context) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Eliminar deuda'),
        content: const Text('Esta accion no se puede deshacer.'),
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

/// Encabezado con la deuda total, la cantidad de obligaciones y el selector
/// de estrategia de pago que ordena la lista.
class _ListHeader extends ConsumerWidget {
  const _ListHeader({
    required this.total,
    required this.count,
    required this.strategy,
  });

  final double total;
  final int count;
  final PayoffStrategy strategy;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          margin: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: theme.colorScheme.primary,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Saldo total a hoy',
                  style: theme.textTheme.labelLarge
                      ?.copyWith(color: theme.colorScheme.onPrimary)),
              const SizedBox(height: 4),
              Text(formatCop(total),
                  style: theme.textTheme.headlineMedium?.copyWith(
                      color: theme.colorScheme.onPrimary,
                      fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text('$count ${count == 1 ? 'obligacion' : 'obligaciones'}',
                  style: theme.textTheme.bodyMedium
                      ?.copyWith(color: theme.colorScheme.onPrimary)),
            ],
          ),
        ),
        if (count > 1) _StrategySelector(strategy: strategy),
      ],
    );
  }
}

/// Selector del orden de pago (avalancha / costo mensual) con explicacion.
class _StrategySelector extends ConsumerWidget {
  const _StrategySelector({required this.strategy});

  final PayoffStrategy strategy;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.sort, size: 18, color: theme.colorScheme.primary),
              const SizedBox(width: 6),
              Text('Orden de pago',
                  style: theme.textTheme.labelLarge
                      ?.copyWith(fontWeight: FontWeight.w600)),
            ],
          ),
          const SizedBox(height: 8),
          SegmentedButton<PayoffStrategy>(
            showSelectedIcon: false,
            segments: [
              for (final s in PayoffStrategy.values)
                ButtonSegment(value: s, label: Text(payoffStrategyLabel(s))),
            ],
            selected: {strategy},
            onSelectionChanged: (selection) => ref
                .read(debtStrategyProvider.notifier)
                .state = selection.first,
          ),
          const SizedBox(height: 6),
          Text(payoffStrategyHint(strategy),
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
        ],
      ),
    );
  }
}

/// Estado vacio cuando el usuario no tiene deudas.
class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListView(
      children: [
        const SizedBox(height: 120),
        Icon(Icons.savings_outlined,
            size: 80, color: theme.colorScheme.primary),
        const SizedBox(height: 16),
        Text('Aun no tienes deudas registradas',
            textAlign: TextAlign.center, style: theme.textTheme.titleMedium),
        const SizedBox(height: 8),
        Text('Toca "Nueva deuda" para empezar',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium
                ?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
      ],
    );
  }
}

/// Vista de error con boton de reintento.
class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton(onPressed: onRetry, child: const Text('Reintentar')),
          ],
        ),
      ),
    );
  }
}
