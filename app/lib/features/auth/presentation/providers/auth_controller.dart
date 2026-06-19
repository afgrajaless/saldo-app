import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/di/injection.dart';
import '../../domain/entities/auth_session.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../domain/usecases/login_usecase.dart';
import '../../domain/usecases/register_usecase.dart';

part 'auth_controller.g.dart';

/// Controlador de autenticacion. El estado es la sesion actual:
/// - `AsyncData(null)`  -> sin sesion (mostrar login).
/// - `AsyncData(session)` -> autenticado.
/// - `AsyncLoading`     -> operacion en curso.
/// - `AsyncError`       -> fallo (credenciales, red, etc.).
@riverpod
class AuthController extends _$AuthController {
  @override
  Future<AuthSession?> build() {
    // Al arrancar, intenta restaurar la sesion guardada.
    return getIt<AuthRepository>().currentSession();
  }

  /// Inicia sesion con correo y contrasena.
  /// @param email - Correo del usuario.
  /// @param password - Contrasena.
  Future<void> login({required String email, required String password}) async {
    state = AsyncLoading<AuthSession?>().copyWithPrevious(state);
    state = await AsyncValue.guard(
      () => getIt<LoginUseCase>()(email: email, password: password),
    );
  }

  /// Registra un nuevo usuario e inicia su sesion.
  /// @param email - Correo del usuario.
  /// @param password - Contrasena.
  /// @param fullName - Nombre completo.
  Future<void> register({
    required String email,
    required String password,
    required String fullName,
  }) async {
    state = AsyncLoading<AuthSession?>().copyWithPrevious(state);
    state = await AsyncValue.guard(
      () => getIt<RegisterUseCase>()(
        email: email,
        password: password,
        fullName: fullName,
      ),
    );
  }

  /// Cierra la sesion actual.
  Future<void> logout() async {
    await getIt<AuthRepository>().logout();
    state = const AsyncData(null);
  }
}
