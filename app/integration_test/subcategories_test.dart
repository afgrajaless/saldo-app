import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:saldo/core/di/injection.dart';
import 'package:saldo/features/budget/domain/entities/budget_params.dart';
import 'package:saldo/features/budget/domain/repositories/budget_repository.dart';
import 'package:saldo/features/budget/presentation/providers/budget_providers.dart';
import 'package:saldo/main.dart' as app;

/// Prueba e2e de subcategorias. Registra por UI, arma una jerarquia
/// padre/hijo via el repositorio, valida el auto-mover a "General" y el
/// rollup en la pantalla de Presupuesto. Requiere el backend arriba.
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

  testWidgets('subcategorias: jerarquia, auto-mover y rollup', (tester) async {
    app.main();
    await tester.pumpAndSettle();

    // Cerrar sesion si arranca logueado, luego ir a registro.
    final loginLink = find.text('¿No tienes cuenta? Regístrate');
    await pumpUntilAny(tester, [loginLink, find.byIcon(Icons.logout)]);
    if (find.byIcon(Icons.logout).evaluate().isNotEmpty) {
      await tester.tap(find.byIcon(Icons.logout));
      await tester.pumpAndSettle();
    }
    await pumpUntil(tester, loginLink);
    await tester.tap(loginLink);
    await tester.pumpAndSettle();

    final email = 'subcat_${DateTime.now().millisecondsSinceEpoch}@saldo.dev';
    await tester.enterText(find.byType(TextFormField).at(0), 'Tester Subcat');
    await tester.enterText(find.byType(TextFormField).at(1), email);
    await tester.enterText(find.byType(TextFormField).at(2), 'ClaveSegura123');
    await tester.pumpAndSettle();
    await tapVisible(tester, find.widgetWithText(FilledButton, 'Crear cuenta'));
    await pumpUntil(tester, find.text('Aún no tienes deudas registradas'));

    final repo = getIt<BudgetRepository>();

    // Ingreso para el balance.
    final salario = await repo.createCategory(
        const CreateCategoryParams(name: 'Salario', type: 'income', color: '#1F8A70'));
    await repo.createTransaction(CreateTransactionParams(
        categoryId: salario.id, amount: 5000000, occurredOn: '$month-01'));

    // Padre con meta y dos subcategorias; movimientos solo en las hojas.
    final alimentacion = await repo.createCategory(const CreateCategoryParams(
        name: 'Alimentacion', type: 'expense', color: '#C0392B', monthlyBudget: 1000000));
    final mercado = await repo.createCategory(CreateCategoryParams(
        name: 'Mercado', type: 'expense', color: '#E0A458',
        monthlyBudget: 600000, parentId: alimentacion.id));
    final restaurantes = await repo.createCategory(CreateCategoryParams(
        name: 'Restaurantes', type: 'expense', color: '#8B5CF6', parentId: alimentacion.id));
    await repo.createTransaction(CreateTransactionParams(
        categoryId: mercado.id, amount: 400000, occurredOn: '$month-10'));
    await repo.createTransaction(CreateTransactionParams(
        categoryId: restaurantes.id, amount: 200000, occurredOn: '$month-15'));

    // Auto-mover: un padre que ya tenia gasto directo recibe un hijo -> el gasto
    // pasa a una subcategoria "General".
    final transporte = await repo.createCategory(const CreateCategoryParams(
        name: 'Transporte', type: 'expense', color: '#06B6D4'));
    await repo.createTransaction(CreateTransactionParams(
        categoryId: transporte.id, amount: 90000, occurredOn: '$month-12'));
    await repo.createCategory(CreateCategoryParams(
        name: 'Taxi', type: 'expense', parentId: transporte.id, color: '#10B981'));

    // El backend debe haber creado la subcategoria "General" bajo Transporte.
    final categories = await repo.getCategories();
    final general = categories.firstWhere(
      (c) => c.name == 'General' && c.parentId == transporte.id,
      orElse: () => throw StateError('No se creo la subcategoria General (auto-mover).'),
    );
    expect(general.parentId, transporte.id);

    // Refrescar y abrir Presupuesto.
    final container = ProviderScope.containerOf(tester.element(find.text('Presupuesto')));
    container.invalidate(categoriesListProvider);
    container.invalidate(budgetSummaryProvider(month));
    container.invalidate(monthTransactionsProvider(month));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Presupuesto'));
    await tester.pumpAndSettle();
    await pumpUntil(tester, find.text('Balance del mes'));
    await pumpUntil(tester, find.text('Metas de gasto'));

    // El padre (rollup 600k vs 1M) y la subcategoria con meta deben verse.
    expect(find.text('Alimentacion'), findsWidgets);
    expect(find.text('Mercado'), findsWidgets);

    debugPrint('SUBCAT_HOLD_READY');
    for (var i = 0; i < 50; i++) {
      await tester.pump(const Duration(milliseconds: 300));
    }
  });
}
