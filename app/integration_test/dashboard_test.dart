import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:saldo/core/di/injection.dart';
import 'package:saldo/features/debts/domain/entities/create_debt_params.dart';
import 'package:saldo/features/debts/domain/repositories/debts_repository.dart';
import 'package:saldo/features/debts/presentation/providers/debts_controller.dart';
import 'package:saldo/main.dart' as app;

/// Prueba e2e del dashboard. Registra por UI, crea deudas de varios tipos via
/// el repositorio (mas robusto que conducir el formulario) y abre el Resumen.
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

  CreateDebtParams debt(String creditor, String type, double principal, int term) {
    return CreateDebtParams(
      creditor: creditor,
      debtType: type,
      principalAmount: principal,
      nominalRate: 0.012,
      rateType: 'mv',
      amortizationSystem: 'frances',
      termMonths: term,
      startDate: '2026-06-01',
    );
  }

  testWidgets('dashboard con distribucion por tipo', (tester) async {
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
    await tester.enterText(find.byType(TextFormField).at(0), 'Tester Dash');
    await tester.enterText(find.byType(TextFormField).at(1), email);
    await tester.enterText(find.byType(TextFormField).at(2), 'ClaveSegura123');
    await tester.pumpAndSettle();
    await tapVisible(tester, find.widgetWithText(FilledButton, 'Crear cuenta'));
    await pumpUntil(tester, find.text('Aún no tienes deudas registradas'));

    // Crear deudas de varios tipos via el repositorio (usa el token de sesion).
    final repo = getIt<DebtsRepository>();
    await repo.createDebt(debt('Hipoteca Casa', 'hipotecario', 90000000, 180));
    await repo.createDebt(debt('Credito Carro', 'vehiculo', 45000000, 60));
    await repo.createDebt(debt('Tarjeta Visa', 'tarjeta_credito', 6000000, 24));

    // Refrescar la lista y abrir el Resumen.
    final container = ProviderScope.containerOf(tester.element(find.text('Resumen')));
    container.invalidate(debtsControllerProvider);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Resumen'));
    await tester.pumpAndSettle();

    await pumpUntil(tester, find.text('Distribucion por tipo'));
    expect(find.text('Distribucion por tipo'), findsOneWidget);
    expect(find.text('Hipotecario'), findsOneWidget);

    // Ventana para el screenshot del dashboard.
    debugPrint('DASHBOARD_HOLD_READY');
    for (var i = 0; i < 50; i++) {
      await tester.pump(const Duration(milliseconds: 300));
    }
  });
}
