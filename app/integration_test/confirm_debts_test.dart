import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:saldo/core/di/injection.dart';
import 'package:saldo/features/groups/domain/entities/group_params.dart';
import 'package:saldo/features/groups/domain/repositories/groups_repository.dart';
import 'package:saldo/features/groups/presentation/providers/groups_providers.dart';
import 'package:saldo/main.dart' as app;

/// Prueba e2e de confirmación de deudas. Registra por UI, arma un grupo donde un
/// gasto lo paga un miembro fantasma (la parte del usuario nace pendiente), y
/// verifica que esa deuda aparece en la pantalla de Deudas en el bloque
/// "Compartido" con la marca de sin confirmar. Requiere el backend arriba.
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

  testWidgets('deuda de grupo pendiente aparece en Deudas', (tester) async {
    app.main();
    await tester.pumpAndSettle();

    // Cerrar sesion si arranca logueado, luego registro.
    final loginLink = find.text('¿No tienes cuenta? Regístrate');
    await pumpUntilAny(tester, [loginLink, find.byIcon(Icons.logout)]);
    if (find.byIcon(Icons.logout).evaluate().isNotEmpty) {
      await tester.tap(find.byIcon(Icons.logout));
      await tester.pumpAndSettle();
    }
    await pumpUntil(tester, loginLink);
    await tester.tap(loginLink);
    await tester.pumpAndSettle();

    final email = 'cdc_${DateTime.now().millisecondsSinceEpoch}@saldo.dev';
    await tester.enterText(find.byType(TextFormField).at(0), 'Tester Deuda');
    await tester.enterText(find.byType(TextFormField).at(1), email);
    await tester.enterText(find.byType(TextFormField).at(2), 'ClaveSegura123');
    await tester.pumpAndSettle();
    await tapVisible(tester, find.widgetWithText(FilledButton, 'Crear cuenta'));
    await pumpUntil(tester, find.text('Aún no tienes deudas registradas'));

    // Armar el grupo via el repositorio: gasto pagado por el fantasma "Tienda",
    // repartido entre el usuario y el fantasma -> la parte del usuario es pendiente.
    final repo = getIt<GroupsRepository>();
    final group = await repo.createGroup(const CreateGroupParams(name: 'Viaje'));
    final ghost = await repo.addMember(
        group.id, const AddMemberParams(displayName: 'Tienda'));
    final members = await repo.getMembers(group.id);
    final me = members.firstWhere((m) => !m.isGhost);
    await repo.createExpense(
      group.id,
      CreateExpenseParams(
        paidByMemberId: ghost.id,
        amount: 60000,
        occurredOn: '2026-06-10',
        splitMethod: 'equal',
        participantMemberIds: [me.id, ghost.id],
        description: 'Compras',
      ),
    );

    // Refrescar las deudas de grupo (el IndexedStack ya construyo Deudas vacio).
    final container =
        ProviderScope.containerOf(tester.element(find.text('Deudas')));
    container.invalidate(myGroupDebtsProvider);
    await tester.pumpAndSettle();

    // La pantalla de Deudas (tab por defecto) debe mostrar la deuda con el
    // acreedor (el fantasma "Tienda") en el bloque Compartido.
    await pumpUntil(tester, find.textContaining('Tienda'));
    // Y la marca "Sin confirmar" (la parte del usuario esta pendiente).
    await pumpUntil(tester, find.textContaining('Sin confirmar'));

    debugPrint('CONFIRM_DEBTS_HOLD_READY');
    for (var i = 0; i < 40; i++) {
      await tester.pump(const Duration(milliseconds: 300));
    }
  });
}
