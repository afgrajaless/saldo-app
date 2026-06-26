import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:saldo/core/di/injection.dart';
import 'package:saldo/features/debts/domain/entities/create_debt_params.dart';
import 'package:saldo/features/debts/domain/repositories/debts_repository.dart';
import 'package:saldo/features/debts/presentation/providers/debts_controller.dart';
import 'package:saldo/main.dart' as app;

/// e2e del seguro: crea el Credito Libre Destino real y muestra el detalle con
/// el seguro en la cuota. Requiere el backend.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  Future<void> pumpUntil(WidgetTester tester, Finder finder,
      {Duration timeout = const Duration(seconds: 25)}) async {
    final end = DateTime.now().add(timeout);
    while (DateTime.now().isBefore(end)) {
      await tester.pump(const Duration(milliseconds: 300));
      if (finder.evaluate().isNotEmpty) return;
    }
    fail('No aparecio: $finder');
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

  testWidgets('detalle con seguro', (tester) async {
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
    await tester.enterText(find.byType(TextFormField).at(0), 'Tester Seguro');
    await tester.enterText(find.byType(TextFormField).at(1), email);
    await tester.enterText(find.byType(TextFormField).at(2), 'ClaveSegura123');
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.widgetWithText(FilledButton, 'Crear cuenta'));
    await tester.tap(find.widgetWithText(FilledButton, 'Crear cuenta'));
    await pumpUntil(tester, find.text('Aún no tienes deudas registradas'));

    // Credito Libre Destino real con seguro fijo $1.811.
    await getIt<DebtsRepository>().createDebt(const CreateDebtParams(
      creditor: 'Banco de Bogota',
      debtType: 'libre_inversion',
      principalAmount: 2594271,
      nominalRate: 0.2412,
      rateType: 'ea',
      amortizationSystem: 'frances',
      termMonths: 36,
      startDate: '2025-09-01',
      insuranceMode: 'fixed',
      insuranceValue: 1811,
    ));

    final container = ProviderScope.containerOf(tester.element(find.text('Deudas')));
    container.invalidate(debtsControllerProvider);
    await tester.pumpAndSettle();

    await pumpUntil(tester, find.text('Banco de Bogota'));
    await tester.pumpAndSettle(const Duration(seconds: 1));
    await tester.tap(find.byType(ListTile).first);
    await tester.pumpAndSettle();
    await pumpUntil(tester, find.text('Total seguro'));
    expect(find.text('Total seguro'), findsOneWidget);

    debugPrint('INSURANCE_HOLD_READY');
    for (var i = 0; i < 50; i++) {
      await tester.pump(const Duration(milliseconds: 300));
    }
  });
}
