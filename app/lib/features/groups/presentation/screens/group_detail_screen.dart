import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/injection.dart';
import '../../../../shared/money_format.dart';
import '../../domain/entities/group.dart';
import '../../domain/entities/group_balance.dart';
import '../../domain/repositories/groups_repository.dart';
import '../providers/groups_providers.dart';
import '../widgets/balance_card.dart';
import '../widgets/expense_tile.dart';
import 'add_member_screen.dart';
import 'new_expense_screen.dart';

/// Pantalla de detalle de un grupo compartido.
/// Muestra dos pestañas: Saldos (netos + deudas entre miembros)
/// y Gastos (lista de gastos con swipe-to-delete).
/// El AppBar incluye un menú ⋯ con opciones de grupo.
/// El FAB es contextual segun la pestaña activa.
/// @param group - Grupo a mostrar.
class GroupDetailScreen extends ConsumerStatefulWidget {
  const GroupDetailScreen({super.key, required this.group});

  final Group group;

  @override
  ConsumerState<GroupDetailScreen> createState() => _GroupDetailScreenState();
}

class _GroupDetailScreenState extends ConsumerState<GroupDetailScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this)
      ..addListener(() {
        // Reconstruir para cambiar el FAB segun la pestaña.
        if (!_tabController.indexIsChanging) setState(() {});
      });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  /// Invalida los providers de balance y gastos para forzar recarga.
  Future<void> _refresh() async {
    ref.invalidate(groupBalanceProvider(widget.group.id));
    ref.invalidate(groupExpensesProvider(widget.group.id));
  }

  /// Muestra un dialogo de confirmacion y ejecuta leaveGroup si el usuario acepta.
  /// Navega de regreso a la lista e invalida groupsListProvider.
  Future<void> _confirmLeaveGroup() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Salir del grupo'),
        content: Text(
          '¿Quieres salir de "${widget.group.name}"? '
          'Esta accion no se puede deshacer.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Salir'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    try {
      await getIt<GroupsRepository>().leaveGroup(widget.group.id);
      ref.invalidate(groupsListProvider);
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error al salir del grupo: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final tabIndex = _tabController.index;

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.group.name),
          bottom: TabBar(
            controller: _tabController,
            tabs: const [
              Tab(text: 'Saldos'),
              Tab(text: 'Gastos'),
            ],
          ),
          actions: [
            PopupMenuButton<String>(
              tooltip: 'Mas opciones',
              onSelected: (value) {
                if (value == 'leave') {
                  _confirmLeaveGroup();
                } else if (value == 'add_member') {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) =>
                          AddMemberScreen(groupId: widget.group.id),
                    ),
                  );
                } else if (value == 'invite') {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => AddMemberScreen(
                        groupId: widget.group.id,
                      ),
                    ),
                  );
                }
              },
              itemBuilder: (_) => const [
                PopupMenuItem(
                  value: 'add_member',
                  child: ListTile(
                    leading: Icon(Icons.person_add_outlined),
                    title: Text('Agregar miembro'),
                  ),
                ),
                PopupMenuItem(
                  value: 'invite',
                  child: ListTile(
                    leading: Icon(Icons.link),
                    title: Text('Invitar por codigo'),
                  ),
                ),
                PopupMenuDivider(),
                PopupMenuItem(
                  value: 'leave',
                  child: ListTile(
                    leading: Icon(Icons.exit_to_app),
                    title: Text('Salir del grupo'),
                  ),
                ),
              ],
            ),
          ],
        ),
        floatingActionButton: tabIndex == 0
            ? FloatingActionButton.extended(
                heroTag: 'fab-settle',
                onPressed: () {
                  // TODO(Task 8): navegar a la pantalla de saldar
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Proximamente: saldar deuda')),
                  );
                },
                icon: const Icon(Icons.handshake_outlined),
                label: const Text('Saldar'),
              )
            : FloatingActionButton.extended(
                heroTag: 'fab-new-expense',
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) =>
                          NewExpenseScreen(groupId: widget.group.id),
                    ),
                  );
                },
                icon: const Icon(Icons.add),
                label: const Text('Nuevo gasto'),
              ),
        body: RefreshIndicator(
          onRefresh: _refresh,
          child: TabBarView(
            controller: _tabController,
            children: [
              _BalancesTab(groupId: widget.group.id),
              _ExpensesTab(groupId: widget.group.id),
            ],
          ),
        ),
      ),
    );
  }
}

/// Pestaña de Saldos: muestra el neto de cada miembro y las deudas entre ellos.
class _BalancesTab extends ConsumerWidget {
  const _BalancesTab({required this.groupId});

  final String groupId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final balanceAsync = ref.watch(groupBalanceProvider(groupId));
    return balanceAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text('$e', textAlign: TextAlign.center),
        ),
      ),
      data: (balance) => _BalancesContent(balance: balance),
    );
  }
}

/// Contenido de la pestaña de Saldos una vez que el dato esta disponible.
class _BalancesContent extends StatelessWidget {
  const _BalancesContent({required this.balance});

  final GroupBalance balance;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasMembers = balance.members.isNotEmpty;
    final hasDebts = balance.debts.isNotEmpty;

    if (!hasMembers) {
      return const _EmptyBalances();
    }

    return ListView(
      padding: const EdgeInsets.only(bottom: 96),
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
          child: Text('Neto por miembro', style: theme.textTheme.titleMedium),
        ),
        ...balance.members.map((m) => BalanceCard(member: m)),
        if (hasDebts) ...[
          const Divider(height: 32),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: Text('Deudas pendientes', style: theme.textTheme.titleMedium),
          ),
          ...balance.debts.map((d) => _DebtRow(debt: d)),
        ],
        if (!hasDebts) ...[
          const Divider(height: 32),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.check_circle_outline,
                    color: theme.colorScheme.primary, size: 20),
                const SizedBox(width: 8),
                Text(
                  'Sin deudas pendientes',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

/// Fila de una deuda simplificada entre dos miembros.
/// Muestra "‹fromName› le debe a ‹toName› ‹monto›".
class _DebtRow extends StatelessWidget {
  const _DebtRow({required this.debt});

  final Debt debt;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          CircleAvatar(
            radius: 16,
            backgroundColor: theme.colorScheme.errorContainer,
            child: Icon(
              Icons.arrow_forward,
              size: 16,
              color: theme.colorScheme.onErrorContainer,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: RichText(
              text: TextSpan(
                style: theme.textTheme.bodyMedium,
                children: [
                  TextSpan(
                    text: debt.fromName,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  const TextSpan(text: ' le debe a '),
                  TextSpan(
                    text: debt.toName,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            formatCop(debt.amount),
            style: theme.textTheme.titleSmall?.copyWith(
              color: theme.colorScheme.error,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

/// Estado vacio de la pestaña de Saldos.
class _EmptyBalances extends StatelessWidget {
  const _EmptyBalances();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.balance_outlined, size: 56, color: theme.colorScheme.primary),
            const SizedBox(height: 12),
            Text(
              'Sin saldos aun',
              style: theme.textTheme.titleSmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),
            Text(
              'Agrega un gasto para calcular los balances.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
          ],
        ),
      ),
    );
  }
}

/// Pestaña de Gastos: lista los gastos del grupo con swipe-to-delete.
class _ExpensesTab extends ConsumerWidget {
  const _ExpensesTab({required this.groupId});

  final String groupId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final expensesAsync = ref.watch(groupExpensesProvider(groupId));
    return expensesAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text('$e', textAlign: TextAlign.center),
        ),
      ),
      data: (expenses) => expenses.isEmpty
          ? const _EmptyExpenses()
          : ListView.builder(
              padding: const EdgeInsets.only(bottom: 96),
              itemCount: expenses.length,
              itemBuilder: (context, i) {
                final expense = expenses[i];
                return ExpenseTile(
                  expense: expense,
                  onDelete: () => _deleteExpense(context, ref, expense.id),
                );
              },
            ),
    );
  }

  /// Elimina un gasto e invalida los providers de gastos y balance.
  /// @param context - Contexto del widget para mostrar el SnackBar.
  /// @param ref - Referencia de Riverpod.
  /// @param expenseId - UUID del gasto a eliminar.
  Future<void> _deleteExpense(
    BuildContext context,
    WidgetRef ref,
    String expenseId,
  ) async {
    try {
      await getIt<GroupsRepository>().deleteExpense(groupId, expenseId);
      ref.invalidate(groupExpensesProvider(groupId));
      ref.invalidate(groupBalanceProvider(groupId));
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error al eliminar el gasto: $e')),
      );
    }
  }
}

/// Estado vacio de la pestaña de Gastos.
class _EmptyExpenses extends StatelessWidget {
  const _EmptyExpenses();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.receipt_long_outlined,
                size: 56, color: theme.colorScheme.primary),
            const SizedBox(height: 12),
            Text(
              'Sin gastos aun',
              style: theme.textTheme.titleSmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),
            Text(
              'Toca "Nuevo gasto" para registrar el primer gasto del grupo.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
          ],
        ),
      ),
    );
  }
}
