import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:saldo/core/di/injection.dart';
import 'package:saldo/features/groups/domain/entities/group_params.dart';
import 'package:saldo/features/groups/domain/repositories/groups_repository.dart';
import 'package:saldo/features/groups/presentation/providers/groups_providers.dart';
import 'package:saldo/main.dart' as app;

/// Prueba e2e de grupos de gasto compartido. Registra por UI, arma un grupo con
/// un miembro fantasma y un gasto repartido en partes iguales via el repositorio,
/// abre el tab "Compartido" y verifica el detalle con los saldos. Requiere el backend.
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

  testWidgets('grupo: crear, gasto iguales y ver saldos', (tester) async {
    app.main();
    await tester.pumpAndSettle();

    // Cerrar sesion si arranca logueado, luego registro.
    final loginLink = find.text('No tienes cuenta? Registrate');
    await pumpUntilAny(tester, [loginLink, find.byIcon(Icons.logout)]);
    if (find.byIcon(Icons.logout).evaluate().isNotEmpty) {
      await tester.tap(find.byIcon(Icons.logout));
      await tester.pumpAndSettle();
    }
    await pumpUntil(tester, loginLink);
    await tester.tap(loginLink);
    await tester.pumpAndSettle();

    final email = 'grp_${DateTime.now().millisecondsSinceEpoch}@saldo.dev';
    await tester.enterText(find.byType(TextFormField).at(0), 'Tester Grupo');
    await tester.enterText(find.byType(TextFormField).at(1), email);
    await tester.enterText(find.byType(TextFormField).at(2), 'ClaveSegura123');
    await tester.pumpAndSettle();
    await tapVisible(tester, find.widgetWithText(FilledButton, 'Crear cuenta'));
    await pumpUntil(tester, find.text('Aun no tienes deudas registradas'));

    // Armar el grupo via el repositorio.
    final repo = getIt<GroupsRepository>();
    final group = await repo.createGroup(const CreateGroupParams(name: 'Apto 502'));
    final ghost = await repo.addMember(
        group.id, const AddMemberParams(displayName: 'Pedro'));
    final members = await repo.getMembers(group.id);
    final owner = members.firstWhere((m) => !m.isGhost);
    await repo.createExpense(
      group.id,
      CreateExpenseParams(
        paidByMemberId: owner.id,
        amount: 90000,
        occurredOn: '2026-06-10',
        splitMethod: 'equal',
        participantMemberIds: [owner.id, ghost.id],
        description: 'Mercado',
      ),
    );

    // Refrescar la lista (el IndexedStack ya construyo la pantalla con la lista
    // vacia antes de crear el grupo) y abrir el tab "Compartido".
    final container = ProviderScope.containerOf(tester.element(find.text('Compartido')));
    container.invalidate(groupsListProvider);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Compartido'));
    await tester.pumpAndSettle();
    await pumpUntil(tester, find.text('Apto 502'));

    // Abrir el grupo y ver el detalle (saldos).
    await tester.tap(find.text('Apto 502'));
    await tester.pumpAndSettle();
    await pumpUntilAny(tester, [find.text('Saldos'), find.text('Gastos')]);
    // El nombre del fantasma debe aparecer en los saldos del grupo.
    await pumpUntil(tester, find.text('Pedro'));

    debugPrint('GROUPS_HOLD_READY');
    for (var i = 0; i < 40; i++) {
      await tester.pump(const Duration(milliseconds: 300));
    }
  });
}
