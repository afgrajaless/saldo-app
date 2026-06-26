import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:saldo/main.dart' as app;

/// Prueba e2e del badge de usura: una deuda legal (verde) y una usuraria (rojo).
/// Requiere el backend corriendo y el catalogo de usura cargado (db:seed).
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

  /// Crea una deuda con la tasa dada y abre su detalle (toca la primera tarjeta).
  Future<void> createDebtAndOpen(WidgetTester tester, String creditor, String rate, String term) async {
    await tester.tap(find.text('Nueva deuda'));
    await tester.pumpAndSettle();
    await pumpUntil(tester, find.widgetWithText(AppBar, 'Nueva deuda'));
    await tester.enterText(find.byType(TextFormField).at(0), creditor);
    await tester.enterText(find.byType(TextFormField).at(1), '5000000');
    await tester.enterText(find.byType(TextFormField).at(2), rate);
    await tester.enterText(find.byType(TextFormField).at(3), term);
    await tester.pumpAndSettle();
    await tapVisible(tester, find.text('Crear deuda'));
    await pumpUntil(tester, find.text(creditor));
    await tester.pumpAndSettle(const Duration(seconds: 1));
    await tester.tap(find.byType(ListTile).first);
    await tester.pumpAndSettle();
    await pumpUntil(tester, find.text('Detalle de la deuda'));
  }

  testWidgets('badge de usura legal y usuraria', (tester) async {
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
    await tester.enterText(find.byType(TextFormField).at(0), 'Tester Usura');
    await tester.enterText(find.byType(TextFormField).at(1), email);
    await tester.enterText(find.byType(TextFormField).at(2), 'ClaveSegura123');
    await tester.pumpAndSettle();
    await tapVisible(tester, find.widgetWithText(FilledButton, 'Crear cuenta'));
    await pumpUntil(tester, find.text('Aún no tienes deudas registradas'));

    // Deuda legal: 1% M.V. (~12,7% E.A.) por debajo del tope.
    await createDebtAndOpen(tester, 'Banco Legal', '1', '12');
    await pumpUntil(tester, find.text('Dentro del límite legal'));
    await tester.pageBack();
    await tester.pumpAndSettle();

    // Deuda usuraria: 2.5% M.V. (~34,5% E.A.) supera el tope.
    await createDebtAndOpen(tester, 'Prestamo Caro', '2.5', '6');
    await pumpUntil(tester, find.text('Tasa usuraria'));
    expect(find.text('Tasa usuraria'), findsOneWidget);

    // Ventana para capturar el screenshot del badge rojo desde fuera.
    debugPrint('USURY_HOLD_READY');
    for (var i = 0; i < 50; i++) {
      await tester.pump(const Duration(milliseconds: 300));
    }
  });
}
