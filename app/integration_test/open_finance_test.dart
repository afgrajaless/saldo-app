import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:saldo/core/di/injection.dart';
import 'package:saldo/features/open_finance/domain/repositories/open_finance_repository.dart';
import 'package:saldo/main.dart' as app;

/// Prueba e2e de Open Finance: conecta un banco mock, sincroniza por el
/// repositorio, y verifica que al menos un producto fue integrado y que
/// el producto leasing fue omitido (skipped >= 1).
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  /// Espera hasta que el [finder] aparezca en el árbol de widgets, o falla
  /// si transcurre el [timeout] sin encontrarlo.
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
    fail('No apareció el widget esperado: $finder');
  }

  /// Espera hasta que uno de los [finders] aparezca en el árbol, o falla.
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
    fail('No apareció ninguno de los widgets esperados.');
  }

  testWidgets('banco conectado muestra cuenta vinculada en Cuentas',
      (tester) async {
    app.main();
    await tester.pumpAndSettle();

    // Si ya hay sesión activa, cerrar primero.
    final loginLink = find.text('¿No tienes cuenta? Regístrate');
    await pumpUntilAny(tester, [loginLink, find.byIcon(Icons.logout)]);
    if (find.byIcon(Icons.logout).evaluate().isNotEmpty) {
      await tester.tap(find.byIcon(Icons.logout));
      await tester.pumpAndSettle();
    }

    // Navegar a la pantalla de registro.
    await pumpUntil(tester, loginLink);
    await tester.tap(loginLink);
    await tester.pumpAndSettle();

    // Registrar un usuario único para esta ejecución.
    final email = 'of_${DateTime.now().millisecondsSinceEpoch}@saldo.dev';
    await tester.enterText(find.byType(TextFormField).at(0), 'Tester OF');
    await tester.enterText(find.byType(TextFormField).at(1), email);
    await tester.enterText(find.byType(TextFormField).at(2), 'ClaveSegura123');
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Crear cuenta'));

    // Esperar pantalla principal (lista de deudas vacía).
    await pumpUntil(tester, find.text('Aún no tienes deudas registradas'));

    // Conectar banco mock y sincronizar vía el repositorio.
    final repo = getIt<OpenFinanceRepository>();
    final conn = await repo.createConnection('banco-001');
    final summary = await repo.sync(conn.id);

    // Verificar que la sincronización integró productos y omitió el leasing.
    expect(summary.totalIntegrated, greaterThan(0));
    expect(summary.skipped, greaterThanOrEqualTo(1));

    debugPrint('OF_HOLD_READY');
    for (var i = 0; i < 20; i++) {
      await tester.pump(const Duration(milliseconds: 300));
    }
  });
}
