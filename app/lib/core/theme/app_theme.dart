import 'package:flutter/material.dart';

/// Tema y tokens de diseno de la app. Base Material 3 con la identidad de Saldo.
class AppTheme {
  const AppTheme._();

  /// Color semilla de la marca (verde "saldo en orden").
  static const Color seed = Color(0xFF1F8A70);

  /// Tema claro de la aplicacion.
  /// @return El ThemeData claro configurado.
  static ThemeData light() {
    final scheme = ColorScheme.fromSeed(seedColor: seed);
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: scheme.surface,
      appBarTheme: const AppBarTheme(centerTitle: true),
    );
  }
}
