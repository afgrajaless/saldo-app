import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/money_format.dart';
import '../../../auth/presentation/providers/auth_controller.dart';
import '../../../budget/domain/entities/upcoming_card_payment.dart';
import '../../../budget/presentation/providers/budget_providers.dart';
import '../../../budget/presentation/screens/card_detail_screen.dart';
import '../../../groups/domain/entities/group_debt_summary.dart';
import '../../../groups/presentation/providers/groups_providers.dart';
import '../../../open_finance/presentation/screens/connect_bank_screen.dart';
import '../../domain/entities/debt.dart';
import '../../domain/usecases/prioritize_debts.dart';
import '../providers/debts_controller.dart';
import '../widgets/debt_card.dart';
import '../widgets/group_debt_card.dart';
import 'create_debt_screen.dart';
import 'debt_detail_screen.dart';

/// Estrategia de pago activa en la lista de deudas (estado de sesion).
final debtStrategyProvider =
    StateProvider<PayoffStrategy>((ref) => PayoffStrategy.avalanche);

/// Pantalla principal: resumen del usuario y lista de obligaciones formales
/// mezclada con un bloque de deudas de grupos compartidos.
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
            icon: const Icon(Icons.account_balance_outlined),
            tooltip: 'Conectar banco',
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                  builder: (_) => const ConnectBankScreen()),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Cerrar sesión',
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
          child: _CombinedList(debts: debts),
        ),
      ),
    );
  }
}

/// Lista combinada: créditos formales (con estrategia) + bloque "Compartido"
/// con las deudas de grupo del usuario + bloque "Tarjetas" con recordatorios
/// de pago de tarjeta de credito. Si cualquier provider secundario falla,
/// se muestra solo la lista formal sin romper la pantalla.
class _CombinedList extends ConsumerWidget {
  const _CombinedList({required this.debts});

  final List<Debt> debts;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strategy = ref.watch(debtStrategyProvider);
    final ordered = prioritizeDebts(debts, strategy);
    final total = ordered.fold<double>(0, (sum, d) => sum + d.currentBalance);

    // Deudas de grupo: se carga en paralelo; si falla, lista vacia.
    final groupDebtsAsync = ref.watch(myGroupDebtsProvider);
    final groupDebts = groupDebtsAsync.maybeWhen(
      data: (list) => list,
      orElse: () => <GroupDebtSummary>[],
    );
    final groupDebtsLoading = groupDebtsAsync is AsyncLoading;

    // Proximos pagos de tarjetas: se carga en paralelo; si falla, lista vacia.
    // Esto evita que un error en el provider de tarjetas rompa la pantalla.
    final cardPaymentsAsync = ref.watch(upcomingCardPaymentsProvider);
    final cardPayments = cardPaymentsAsync.maybeWhen(
      data: (list) => list,
      orElse: () => <UpcomingCardPayment>[],
    );
    final cardPaymentsLoading = cardPaymentsAsync is AsyncLoading;

    // Construccion de items del ListView:
    // 0           = header (total + estrategia)
    // 1..formal   = creditos formales
    // formal+1    = (si hay grupo) encabezado "Compartido"
    // formal+2..n = items de grupo
    // m+1         = (si hay tarjetas) encabezado "Tarjetas"
    // m+2..k      = items de tarjeta
    final formalCount = ordered.length;
    final hasGroupDebts = groupDebts.isNotEmpty || groupDebtsLoading;
    final hasCardPayments = cardPayments.isNotEmpty || cardPaymentsLoading;

    final groupBlockStart = formalCount + 1;
    final groupBlockSize = hasGroupDebts ? 1 + (groupDebtsLoading ? 1 : groupDebts.length) : 0;

    final cardBlockStart = groupBlockStart + groupBlockSize;
    final cardBlockSize = hasCardPayments ? 1 + (cardPaymentsLoading ? 1 : cardPayments.length) : 0;

    final itemCount = 1 + formalCount + groupBlockSize + cardBlockSize;

    // Si no hay nada en ninguna seccion, estado vacio.
    if (formalCount == 0 && !hasGroupDebts && !hasCardPayments) {
      return const _EmptyState();
    }

    return ListView.builder(
      physics: const AlwaysScrollableScrollPhysics(),
      itemCount: itemCount,
      itemBuilder: (context, index) {
        // Indice 0: encabezado con total y selector de estrategia.
        if (index == 0) {
          return _ListHeader(
            total: total,
            count: formalCount,
            strategy: strategy,
          );
        }

        // Creditos formales.
        if (index <= formalCount) {
          final debt = ordered[index - 1];
          final isPriority = index == 1 && debt.currentBalance > 0;
          final card = DebtCard(
            debt: debt,
            isPriority: isPriority,
            priorityLabel: isPriority ? priorityReason(debt, strategy) : null,
            isLinked: debt.isLinked,
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => DebtDetailScreen(debtId: debt.id),
              ),
            ),
          );

          // Las deudas vinculadas son de solo lectura: no se permite swipe-to-delete.
          if (debt.isLinked) return card;

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
            child: card,
          );
        }

        // Bloque "Compartido": encabezado + items de grupo.
        if (hasGroupDebts) {
          if (index == groupBlockStart) {
            return _GroupSectionHeader(isLoading: groupDebtsLoading);
          }
          if (groupDebtsLoading && index == groupBlockStart + 1) {
            return const SizedBox.shrink();
          }
          if (!groupDebtsLoading && index < cardBlockStart) {
            final groupIndex = index - groupBlockStart - 1;
            return GroupDebtCard(summary: groupDebts[groupIndex]);
          }
        }

        // Bloque "Tarjetas": encabezado + recordatorios de pago.
        if (hasCardPayments) {
          if (index == cardBlockStart) {
            return _CardSectionHeader(isLoading: cardPaymentsLoading);
          }
          if (cardPaymentsLoading) return const SizedBox.shrink();
          final cardIndex = index - cardBlockStart - 1;
          return _CardPaymentReminderTile(
            payment: cardPayments[cardIndex],
            onTap: () => _openCardDetail(context, ref, cardPayments[cardIndex]),
          );
        }

        return const SizedBox.shrink();
      },
    );
  }

  /// Navega al detalle de la tarjeta del recordatorio.
  ///
  /// Estrategia de navegacion: se busca la tarjeta en el provider [cardsListProvider].
  /// Si ya esta en cache, la navegacion es inmediata. Si aun no cargó o falla,
  /// se hace un push con un FutureBuilder dentro de CardDetailScreen no es posible
  /// sin la entidad — en ese caso se muestra un SnackBar informativo.
  /// @param context - Contexto de la pantalla.
  /// @param ref - WidgetRef para leer providers.
  /// @param payment - Recordatorio del que se desea ver el detalle.
  Future<void> _openCardDetail(
    BuildContext context,
    WidgetRef ref,
    UpcomingCardPayment payment,
  ) async {
    final cardsAsync = ref.read(cardsListProvider);
    await cardsAsync.when(
      loading: () async {
        // Intentar cargar antes de navegar.
        try {
          final cards = await ref.read(cardsListProvider.future);
          final card = cards.where((c) => c.id == payment.cardId).firstOrNull;
          if (card != null && context.mounted) {
            await Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => CardDetailScreen(card: card)),
            );
          }
        } catch (_) {
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('No se pudo cargar el detalle de ${payment.name}.')),
            );
          }
        }
      },
      error: (_, __) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('No se pudo cargar el detalle de ${payment.name}.')),
          );
        }
      },
      data: (cards) {
        final card = cards.where((c) => c.id == payment.cardId).firstOrNull;
        if (card != null && context.mounted) {
          Navigator.of(context).push(
            MaterialPageRoute<void>(builder: (_) => CardDetailScreen(card: card)),
          );
        } else if (card == null && context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('No se encontró la tarjeta.')),
          );
        }
      },
    );
  }

  /// Pide confirmacion antes de eliminar una deuda formal.
  /// @param context - Contexto de la pantalla.
  /// @return `true` si el usuario confirma.
  Future<bool> _confirmDelete(BuildContext context) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Eliminar deuda'),
        content: const Text('Esta acción no se puede deshacer.'),
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

/// Encabezado del bloque de recordatorios de tarjeta.
/// Muestra el titulo "Tarjetas" y, mientras carga, un indicador de progreso inline.
/// @param isLoading - true mientras upcomingCardPaymentsProvider aun esta cargando.
class _CardSectionHeader extends StatelessWidget {
  const _CardSectionHeader({required this.isLoading});

  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
      child: Row(
        children: [
          Icon(Icons.credit_card_outlined,
              size: 18, color: theme.colorScheme.tertiary),
          const SizedBox(width: 6),
          Text(
            'Tarjetas',
            style: theme.textTheme.labelLarge?.copyWith(
              fontWeight: FontWeight.w600,
              color: theme.colorScheme.tertiary,
            ),
          ),
          if (isLoading) ...[
            const SizedBox(width: 10),
            SizedBox(
              width: 14,
              height: 14,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: theme.colorScheme.tertiary,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Tarjeta de recordatorio de pago de tarjeta de credito (solo lectura).
/// Muestra el nombre de la tarjeta, la fecha de vencimiento y el minimo estimado.
/// @param payment - Proximo pago estimado de la tarjeta.
/// @param onTap - Callback al tocar la tarjeta (navega al detalle).
class _CardPaymentReminderTile extends StatelessWidget {
  const _CardPaymentReminderTile({
    required this.payment,
    required this.onTap,
  });

  final UpcomingCardPayment payment;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: theme.colorScheme.tertiaryContainer,
          child: Icon(
            Icons.credit_card_outlined,
            color: theme.colorScheme.onTertiaryContainer,
            size: 20,
          ),
        ),
        title: Text(
          'Pago tarjeta ${payment.name}',
          style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
        ),
        subtitle: Text(
          'Vence ${payment.paymentDueDate}',
          style: theme.textTheme.bodySmall
              ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
        ),
        trailing: Text(
          formatCop(payment.estimatedMinPayment),
          style: theme.textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.bold,
            color: theme.colorScheme.tertiary,
          ),
        ),
        onTap: onTap,
      ),
    );
  }
}

/// Encabezado del bloque de deudas compartidas.
/// Muestra el titulo "Compartido" y, mientras carga, un indicador de progreso inline.
/// @param isLoading - true mientras myGroupDebtsProvider aun esta cargando.
class _GroupSectionHeader extends StatelessWidget {
  const _GroupSectionHeader({required this.isLoading});

  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
      child: Row(
        children: [
          Icon(Icons.group_outlined,
              size: 18, color: theme.colorScheme.secondary),
          const SizedBox(width: 6),
          Text(
            'Compartido',
            style: theme.textTheme.labelLarge?.copyWith(
              fontWeight: FontWeight.w600,
              color: theme.colorScheme.secondary,
            ),
          ),
          if (isLoading) ...[
            const SizedBox(width: 10),
            SizedBox(
              width: 14,
              height: 14,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: theme.colorScheme.secondary,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Encabezado con la deuda total formal, la cantidad de obligaciones y el selector
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
              Text('$count ${count == 1 ? 'obligación' : 'obligaciones'}',
                  style: theme.textTheme.bodyMedium
                      ?.copyWith(color: theme.colorScheme.onPrimary)),
            ],
          ),
        ),
        if (count > 1) _StrategySelector(strategy: strategy),
        if (count > 0)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Text(
              'Créditos formales',
              style: theme.textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w600,
                color: theme.colorScheme.primary,
              ),
            ),
          ),
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

/// Estado vacio cuando el usuario no tiene deudas formales ni de grupo.
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
        Text('Aún no tienes deudas registradas',
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
