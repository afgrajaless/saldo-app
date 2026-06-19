import 'package:flutter/material.dart';

import 'app_tokens.dart';

/// Tema de Saldo. Material 3 con identidad esmeralda: tarjetas planas con borde
/// fino, fondo calido, botones tipo pildora y tipografia con peso intencional.
class AppTheme {
  const AppTheme._();

  /// Construye el esquema de color de la marca.
  /// @return El ColorScheme claro de Saldo.
  static ColorScheme _scheme() {
    final base = ColorScheme.fromSeed(
      seedColor: AppTokens.emerald,
      brightness: Brightness.light,
    );
    return base.copyWith(
      primary: AppTokens.emerald,
      onPrimary: Colors.white,
      primaryContainer: AppTokens.emeraldSoft,
      onPrimaryContainer: const Color(0xFF06281A),
      tertiary: AppTokens.gold,
      onTertiary: Colors.white,
      surface: AppTokens.surface,
      onSurface: AppTokens.ink,
      error: AppTokens.danger,
    );
  }

  /// Tema claro completo de la aplicacion.
  /// @return El ThemeData configurado.
  static ThemeData light() {
    final scheme = _scheme();
    final base = ThemeData(useMaterial3: true, colorScheme: scheme);

    return base.copyWith(
      scaffoldBackgroundColor: AppTokens.background,
      textTheme: _textTheme(base.textTheme),
      appBarTheme: AppBarTheme(
        backgroundColor: AppTokens.background,
        foregroundColor: AppTokens.ink,
        centerTitle: true,
        elevation: 0,
        scrolledUnderElevation: 0,
        titleTextStyle: base.textTheme.titleLarge?.copyWith(
          fontWeight: FontWeight.w600,
          color: AppTokens.ink,
        ),
      ),
      cardTheme: CardThemeData(
        color: AppTokens.surface,
        elevation: 0,
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusMd),
          side: BorderSide(color: scheme.outlineVariant),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppTokens.surface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusSm),
          borderSide: BorderSide(color: scheme.outlineVariant),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusSm),
          borderSide: BorderSide(color: scheme.outlineVariant),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusSm),
          borderSide: BorderSide(color: scheme.primary, width: 2),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTokens.radiusSm),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        ),
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        elevation: 2,
        backgroundColor: AppTokens.emeraldSoft,
        foregroundColor: AppTokens.ink,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: AppTokens.surface,
        indicatorColor: AppTokens.emeraldSoft,
        elevation: 0,
        labelTextStyle: WidgetStatePropertyAll(
          base.textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w600),
        ),
      ),
      dividerTheme: DividerThemeData(color: scheme.outlineVariant, thickness: 1),
    );
  }

  /// Afina la tipografia: numeros/titulos con cifras tabulares y mas peso.
  /// @param base - TextTheme base.
  /// @return El TextTheme afinado.
  static TextTheme _textTheme(TextTheme base) {
    const tabular = [FontFeature.tabularFigures()];
    return base.copyWith(
      headlineLarge: base.headlineLarge?.copyWith(
        fontWeight: FontWeight.bold,
        letterSpacing: -0.5,
        fontFeatures: tabular,
      ),
      headlineMedium: base.headlineMedium?.copyWith(
        fontWeight: FontWeight.bold,
        letterSpacing: -0.5,
        fontFeatures: tabular,
      ),
      titleLarge: base.titleLarge?.copyWith(fontWeight: FontWeight.w600),
    );
  }
}
