import 'package:flutter_test/flutter_test.dart';

import 'package:saldo/main.dart';

void main() {
  testWidgets('La pantalla de arranque muestra el nombre Saldo', (tester) async {
    await tester.pumpWidget(const SaldoApp());

    expect(find.text('Saldo'), findsOneWidget);
    expect(find.text('Gestor de deuda y credito'), findsOneWidget);
  });
}
