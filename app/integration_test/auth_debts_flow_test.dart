import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:saldo/main.dart' as app;

/// Prueba e2e en el dispositivo: registro -> crear deuda -> verla en la lista.
/// Requiere el backend corriendo en http://localhost:3000.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  /// Bombea frames hasta que el finder aparezca o se agote el tiempo.
  Future<void> pumpUntil(
    WidgetTester tester,
    Finder finder, {
    Duration timeout = const Duration(seconds: 25),
  }) async {
    final end = DateTime.now().add(timeout);
    while (DateTime.now().isBefore(end)) {
      await tester.pump(const Duration(milliseconds: 300));
      if (finder.evaluate().isNotEmpty) return;
    }
    fail('No aparecio el widget esperado: $finder');
  }

  /// Asegura que el widget sea visible y lo toca.
  Future<void> tapVisible(WidgetTester tester, Finder finder) async {
    await tester.ensureVisible(finder);
    await tester.pumpAndSettle();
    await tester.tap(finder);
  }

  /// Bombea hasta que aparezca cualquiera de los finders.
  Future<void> pumpUntilAny(
    WidgetTester tester,
    List<Finder> finders, {
    Duration timeout = const Duration(seconds: 25),
  }) async {
    final end = DateTime.now().add(timeout);
    while (DateTime.now().isBefore(end)) {
      await tester.pump(const Duration(milliseconds: 300));
      if (finders.any((f) => f.evaluate().isNotEmpty)) return;
    }
    fail('No aparecio ninguno de los widgets esperados.');
  }

  testWidgets('registro y creacion de deuda', (tester) async {
    final email = 'itest_${DateTime.now().millisecondsSinceEpoch}@saldo.dev';

    app.main();
    await tester.pumpAndSettle();

    // Si una corrida anterior dejo sesion guardada, cerrarla primero.
    final loginLink = find.text('No tienes cuenta? Registrate');
    await pumpUntilAny(tester, [loginLink, find.byIcon(Icons.logout)]);
    if (find.byIcon(Icons.logout).evaluate().isNotEmpty) {
      await tester.tap(find.byIcon(Icons.logout));
      await tester.pumpAndSettle();
    }

    // Ir a registro.
    await pumpUntil(tester, loginLink);
    await tester.tap(loginLink);
    await tester.pumpAndSettle();

    // Llenar el formulario de registro.
    await tester.enterText(find.byType(TextFormField).at(0), 'Tester E2E');
    await tester.enterText(find.byType(TextFormField).at(1), email);
    await tester.enterText(find.byType(TextFormField).at(2), 'ClaveSegura123');
    await tester.pumpAndSettle();
    await tapVisible(tester, find.widgetWithText(FilledButton, 'Crear cuenta'));

    // Tras registrarse, debe llegar a la lista de deudas (vacia al inicio).
    await pumpUntil(tester, find.text('Mis deudas'));
    await pumpUntil(tester, find.text('Aun no tienes deudas registradas'));

    // Crear una deuda.
    await tester.tap(find.text('Nueva deuda'));
    await tester.pumpAndSettle();
    await pumpUntil(tester, find.widgetWithText(AppBar, 'Nueva deuda'));

    await tester.enterText(find.byType(TextFormField).at(0), 'BBVA');
    await tester.enterText(find.byType(TextFormField).at(1), '12000000'); // capital
    await tester.enterText(find.byType(TextFormField).at(2), '1.5'); // tasa %
    await tester.enterText(find.byType(TextFormField).at(3), '24'); // plazo
    await tester.pumpAndSettle();
    await tapVisible(tester, find.widgetWithText(FilledButton, 'Crear deuda'));

    // De vuelta en la lista, debe aparecer la deuda creada.
    await pumpUntil(tester, find.text('BBVA'));
    expect(find.text('BBVA'), findsOneWidget);

    // Abrir el detalle y aplicar un abono a capital.
    await tester.pumpAndSettle(const Duration(seconds: 1));
    await tester.tap(find.byType(ListTile).first);
    await tester.pumpAndSettle();
    await pumpUntil(tester, find.text('Detalle de la deuda'));
    await pumpUntil(tester, find.text('Abono a capital'));
    await tapVisible(tester, find.text('Abono a capital'));
    await tester.pumpAndSettle();

    await pumpUntil(tester, find.text('Aplicar abono'));
    await tester.enterText(find.byType(TextFormField).first, '3000000');
    await tester.pumpAndSettle();
    await tapVisible(tester, find.text('Aplicar abono'));

    // El dialogo de resultado debe mostrar el ahorro de intereses.
    await pumpUntil(tester, find.text('Abono aplicado'));
    expect(find.text('Intereses ahorrados'), findsOneWidget);
    await tester.tap(find.text('Entendido'));
    await tester.pumpAndSettle();
  });
}
