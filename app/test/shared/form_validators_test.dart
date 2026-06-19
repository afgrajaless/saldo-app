import 'package:flutter_test/flutter_test.dart';
import 'package:saldo/shared/form_validators.dart';

void main() {
  group('FormValidators.email', () {
    test('rechaza vacio y formato invalido', () {
      expect(FormValidators.email(''), isNotNull);
      expect(FormValidators.email('no-es-email'), isNotNull);
      expect(FormValidators.email('a@b'), isNotNull);
    });

    test('acepta un correo valido', () {
      expect(FormValidators.email('juan.perez@example.com'), isNull);
    });
  });

  group('FormValidators.password', () {
    test('exige minimo 8 caracteres', () {
      expect(FormValidators.password('corta'), isNotNull);
      expect(FormValidators.password('ClaveSegura123'), isNull);
    });
  });

  group('FormValidators.fullName', () {
    test('exige minimo 2 caracteres', () {
      expect(FormValidators.fullName('U'), isNotNull);
      expect(FormValidators.fullName('Juan'), isNull);
    });
  });
}
