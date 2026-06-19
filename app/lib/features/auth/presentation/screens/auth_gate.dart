import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../dashboard/presentation/screens/main_shell.dart';
import '../providers/auth_controller.dart';
import 'login_screen.dart';

/// Punto de entrada de la navegacion: muestra el home si hay sesion o el login
/// en caso contrario. Mientras restaura la sesion inicial, muestra un splash.
class AuthGate extends ConsumerWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);

    // Carga inicial (aun sin valor resuelto): splash.
    if (auth.isLoading && !auth.hasValue) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final session = auth.valueOrNull;
    return session == null ? const LoginScreen() : const MainShell();
  }
}
