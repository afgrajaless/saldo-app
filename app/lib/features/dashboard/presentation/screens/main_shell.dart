import 'package:flutter/material.dart';

import '../../../budget/presentation/screens/accounts_screen.dart';
import '../../../budget/presentation/screens/budget_screen.dart';
import '../../../debts/presentation/screens/debts_list_screen.dart';
import '../../../groups/presentation/screens/groups_list_screen.dart';
import 'dashboard_screen.dart';

/// Contenedor principal autenticado con navegacion inferior entre deudas,
/// presupuesto, cuentas, compartido y el resumen (dashboard).
class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _index = 0;

  static const _screens = [
    DebtsListScreen(),
    BudgetScreen(),
    AccountsScreen(),
    GroupsListScreen(),
    DashboardScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _index, children: _screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.account_balance_wallet_outlined),
            selectedIcon: Icon(Icons.account_balance_wallet),
            label: 'Deudas',
          ),
          NavigationDestination(
            icon: Icon(Icons.savings_outlined),
            selectedIcon: Icon(Icons.savings),
            label: 'Presupuesto',
          ),
          NavigationDestination(
            icon: Icon(Icons.account_balance_outlined),
            selectedIcon: Icon(Icons.account_balance),
            label: 'Cuentas',
          ),
          NavigationDestination(
            icon: Icon(Icons.groups_outlined),
            selectedIcon: Icon(Icons.groups),
            label: 'Compartido',
          ),
          NavigationDestination(
            icon: Icon(Icons.pie_chart_outline),
            selectedIcon: Icon(Icons.pie_chart),
            label: 'Resumen',
          ),
        ],
      ),
    );
  }
}
