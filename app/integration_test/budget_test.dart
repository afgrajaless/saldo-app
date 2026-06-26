import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:saldo/core/di/injection.dart';
import 'package:saldo/features/budget/domain/entities/budget_params.dart';
import 'package:saldo/features/budget/domain/repositories/budget_repository.dart';
import 'package:saldo/features/budget/presentation/providers/budget_providers.dart';
import 'package:saldo/main.dart' as app;

/// Prueba e2e del presupuesto. Registra por UI, crea categorias y movimientos
/// via el repositorio, y abre la pestana Presupuesto. Requiere el backend.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  const month = '2026-06';

  Future<void> pumpUntil(WidgetTester tester, Finder finder,
      {Duration timeout = const Duration(seconds: 25)}) async {
    final end = DateTime.now().add(timeout);
    while (DateTime.now().isBefore(end)) {
      await tester.pump(const Duration(milliseconds: 300));
      if (finder.evaluate().isNotEmpty) return;
    }
    fail('No aparecio el widget esperado: $finder');
  }

  Future<void> pumpUntilAny(WidgetTester tester, List<Finder> finders,
      {Duration timeout = const Duration(seconds: 25)}) async {
    final end = DateTime.now().add(timeout);
    while (DateTime.now().isBefore(end)) {
      await tester.pump(const Duration(milliseconds: 300));
      if (finders.any((f) => f.evaluate().isNotEmpty)) return;
    }
    fail('No aparecio ninguno de los widgets esperados.');
  }

  Future<void> tapVisible(WidgetTester tester, Finder finder) async {
    await tester.ensureVisible(finder);
    await tester.pumpAndSettle();
    await tester.tap(finder);
  }

  testWidgets('presupuesto con metas y movimientos', (tester) async {
    app.main();
    await tester.pumpAndSettle();

    final loginLink = find.text('¿No tienes cuenta? Regístrate');
    await pumpUntilAny(tester, [loginLink, find.byIcon(Icons.logout)]);
    if (find.byIcon(Icons.logout).evaluate().isNotEmpty) {
      await tester.tap(find.byIcon(Icons.logout));
      await tester.pumpAndSettle();
    }
    await pumpUntil(tester, loginLink);
    await tester.tap(loginLink);
    await tester.pumpAndSettle();

    final email = 'itest_${DateTime.now().millisecondsSinceEpoch}@saldo.dev';
    await tester.enterText(find.byType(TextFormField).at(0), 'Tester Budget');
    await tester.enterText(find.byType(TextFormField).at(1), email);
    await tester.enterText(find.byType(TextFormField).at(2), 'ClaveSegura123');
    await tester.pumpAndSettle();
    await tapVisible(tester, find.widgetWithText(FilledButton, 'Crear cuenta'));
    await pumpUntil(tester, find.text('Aún no tienes deudas registradas'));

    // Crear categorias y movimientos via el repositorio (junio 2026).
    final repo = getIt<BudgetRepository>();
    final salario = await repo.createCategory(
        const CreateCategoryParams(name: 'Salario', type: 'income', color: '#1F8A70'));
    final arriendo = await repo.createCategory(const CreateCategoryParams(
        name: 'Arriendo', type: 'expense', color: '#C0392B', monthlyBudget: 1500000));
    final mercado = await repo.createCategory(const CreateCategoryParams(
        name: 'Mercado', type: 'expense', color: '#E0A458', monthlyBudget: 800000));

    await repo.createTransaction(CreateTransactionParams(
        categoryId: salario.id, amount: 5000000, occurredOn: '$month-01'));
    await repo.createTransaction(CreateTransactionParams(
        categoryId: arriendo.id, amount: 1500000, occurredOn: '$month-05'));
    await repo.createTransaction(CreateTransactionParams(
        categoryId: mercado.id, amount: 650000, occurredOn: '$month-10'));
    await repo.createTransaction(CreateTransactionParams(
        categoryId: mercado.id, amount: 300000, occurredOn: '$month-20'));

    final container = ProviderScope.containerOf(tester.element(find.text('Presupuesto')));
    container.invalidate(categoriesListProvider);
    container.invalidate(budgetSummaryProvider(month));
    container.invalidate(monthTransactionsProvider(month));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Presupuesto'));
    await tester.pumpAndSettle();

    await pumpUntil(tester, find.text('Balance del mes'));
    await pumpUntil(tester, find.text('Metas de gasto'));
    expect(find.text('Salario'), findsWidgets);

    debugPrint('BUDGET_HOLD_READY');
    for (var i = 0; i < 50; i++) {
      await tester.pump(const Duration(milliseconds: 300));
    }
  });
}
