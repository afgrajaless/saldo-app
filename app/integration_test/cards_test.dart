import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:saldo/core/di/injection.dart';
import 'package:saldo/features/budget/domain/entities/budget_params.dart';
import 'package:saldo/features/budget/domain/repositories/budget_repository.dart';
import 'package:saldo/features/budget/presentation/providers/budget_providers.dart';
import 'package:saldo/main.dart' as app;

/// Prueba e2e de tarjetas de crédito. Registra por UI, crea una tarjeta y le
/// carga una compra diferida via el repositorio, y verifica que la tarjeta
/// aparece en la sub-vista "Tarjetas" dentro de Cuentas. Requiere el backend.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

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

  testWidgets('tarjeta con cargo diferido aparece en la sub-vista Tarjetas',
      (tester) async {
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

    final email = 'tc_${DateTime.now().millisecondsSinceEpoch}@saldo.dev';
    await tester.enterText(find.byType(TextFormField).at(0), 'Tester Tarjeta');
    await tester.enterText(find.byType(TextFormField).at(1), email);
    await tester.enterText(find.byType(TextFormField).at(2), 'ClaveSegura123');
    await tester.pumpAndSettle();
    await tapVisible(tester, find.widgetWithText(FilledButton, 'Crear cuenta'));
    await pumpUntil(tester, find.text('Aún no tienes deudas registradas'));

    // Crear la tarjeta y cargarle una compra diferida via el repositorio.
    final repo = getIt<BudgetRepository>();
    final card = await repo.createCard(const CreateCardParams(
      name: 'Visa',
      creditLimit: 5000000,
      statementDay: 15,
      paymentDay: 5,
      rotativoRateEa: 0.28,
    ));
    final category = await repo.createCategory(
        const CreateCategoryParams(name: 'Compras', type: 'expense', color: '#C0392B'));
    await repo.createTransaction(CreateTransactionParams(
      categoryId: category.id,
      accountId: card.id,
      amount: 900000,
      occurredOn: '2026-06-12',
      installments: 3,
    ));

    // Refrescar la lista de tarjetas (el IndexedStack ya construyo Cuentas).
    final container =
        ProviderScope.containerOf(tester.element(find.text('Cuentas')));
    container.invalidate(cardsListProvider);
    await tester.pumpAndSettle();

    // Ir a Cuentas y cambiar a la sub-vista "Tarjetas".
    await tester.tap(find.text('Cuentas'));
    await tester.pumpAndSettle();
    await tapVisible(tester, find.text('Tarjetas'));
    await tester.pumpAndSettle();

    // La tarjeta debe aparecer en la sub-vista.
    await pumpUntil(tester, find.text('Visa'));

    debugPrint('CARDS_HOLD_READY');
    for (var i = 0; i < 40; i++) {
      await tester.pump(const Duration(milliseconds: 300));
    }
  });
}
