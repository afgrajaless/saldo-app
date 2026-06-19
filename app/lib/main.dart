import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/di/injection.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/presentation/screens/auth_gate.dart';

/// Punto de entrada de la app. Inicializa la inyeccion de dependencias y monta
/// el arbol de Riverpod.
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  configureDependencies();
  runApp(const ProviderScope(child: SaldoApp()));
}

/// Widget raiz de la aplicacion Saldo.
class SaldoApp extends StatelessWidget {
  const SaldoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Saldo',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      home: const AuthGate(),
    );
  }
}
