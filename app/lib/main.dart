import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/di/injection.dart';
import 'core/theme/app_theme.dart';

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
      home: const _BootstrapScreen(),
    );
  }
}

/// Pantalla provisional de arranque (se reemplazara por el flujo de auth).
class _BootstrapScreen extends StatelessWidget {
  const _BootstrapScreen();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.account_balance_wallet_outlined,
                size: 72, color: theme.colorScheme.primary),
            const SizedBox(height: 16),
            Text('Saldo', style: theme.textTheme.headlineMedium),
            const SizedBox(height: 8),
            Text(
              'Gestor de deuda y credito',
              style: theme.textTheme.bodyMedium
                  ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
          ],
        ),
      ),
    );
  }
}
