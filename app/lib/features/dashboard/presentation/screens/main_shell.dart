import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../budget/presentation/screens/accounts_screen.dart';
import '../../../budget/presentation/screens/budget_screen.dart';
import '../../../debts/presentation/screens/debts_list_screen.dart';
import '../../../groups/presentation/providers/groups_providers.dart';
import '../../../groups/presentation/screens/groups_list_screen.dart';
import 'dashboard_screen.dart';

/// Contenedor principal autenticado con navegacion inferior entre deudas,
/// presupuesto, cuentas, compartido y el resumen (dashboard).
/// Muestra un badge en la pestaña "Compartido" cuando el usuario tiene
/// partes de gastos pendientes de confirmacion en algun grupo.
class MainShell extends ConsumerStatefulWidget {
  const MainShell({super.key});

  @override
  ConsumerState<MainShell> createState() => _MainShellState();
}

class _MainShellState extends ConsumerState<MainShell> {
  int _index = 0;

  static const _screens = [
    DebtsListScreen(),
    BudgetScreen(),
    AccountsScreen(),
    GroupsListScreen(),
    DashboardScreen(),
  ];

  /// Construye el icono de la pestaña "Compartido" con badge cuando hay pendientes.
  /// @param hasPending - Indica si hay partes pendientes de confirmacion.
  /// @param selected - Indica si la pestaña esta activa para elegir el icono.
  /// @return Icono con o sin badge segun el estado de pendientes.
  Widget _groupsIcon({required bool hasPending, required bool selected}) {
    final icon = Icon(selected ? Icons.groups : Icons.groups_outlined);
    if (!hasPending) return icon;
    return Badge(child: icon);
  }

  @override
  Widget build(BuildContext context) {
    // Observar las deudas del usuario para detectar pendientes en cualquier grupo.
    final hasPending = ref.watch(myGroupDebtsProvider).maybeWhen(
          data: (debts) => debts.any((d) => d.hasPending),
          orElse: () => false,
        );

    return Scaffold(
      body: IndexedStack(index: _index, children: _screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.account_balance_wallet_outlined),
            selectedIcon: Icon(Icons.account_balance_wallet),
            label: 'Deudas',
          ),
          const NavigationDestination(
            icon: Icon(Icons.savings_outlined),
            selectedIcon: Icon(Icons.savings),
            label: 'Presupuesto',
          ),
          const NavigationDestination(
            icon: Icon(Icons.account_balance_outlined),
            selectedIcon: Icon(Icons.account_balance),
            label: 'Cuentas',
          ),
          NavigationDestination(
            icon: _groupsIcon(hasPending: hasPending, selected: false),
            selectedIcon: _groupsIcon(hasPending: hasPending, selected: true),
            label: 'Compartido',
          ),
          const NavigationDestination(
            icon: Icon(Icons.pie_chart_outline),
            selectedIcon: Icon(Icons.pie_chart),
            label: 'Resumen',
          ),
        ],
      ),
    );
  }
}
