import 'package:flutter_test/flutter_test.dart';
import 'package:saldo/features/auth/data/models/auth_mappers.dart';

void main() {
  group('authSessionFromJson', () {
    test('parsea la respuesta de auth del backend', () {
      final json = {
        'accessToken': 'access.jwt',
        'refreshToken': 'refresh.jwt',
        'user': {
          'id': 'uuid-123',
          'email': 'juan@example.com',
          'fullName': 'Juan Perez',
        },
      };

      final session = authSessionFromJson(json);

      expect(session.accessToken, 'access.jwt');
      expect(session.refreshToken, 'refresh.jwt');
      expect(session.user.id, 'uuid-123');
      expect(session.user.email, 'juan@example.com');
      expect(session.user.fullName, 'Juan Perez');
    });
  });

  group('userFromJson', () {
    test('parsea /auth/me que no trae fullName', () {
      final user = userFromJson({'id': 'uuid-9', 'email': 'a@b.com'});
      expect(user.id, 'uuid-9');
      expect(user.email, 'a@b.com');
      expect(user.fullName, isNull);
    });
  });
}
