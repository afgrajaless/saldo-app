import 'package:flutter/material.dart';

/// Tokens de diseno de Saldo: colores de marca, radios y espaciados.
/// Centralizar estos valores mantiene la coherencia visual en toda la app.
class AppTokens {
  const AppTokens._();

  // ---- Color de marca ----
  /// Verde esmeralda principal (dinero, confianza).
  static const Color emerald = Color(0xFF0B5D3B);

  /// Verde claro para contenedores/realces suaves.
  static const Color emeraldSoft = Color(0xFFCFE8DB);

  /// Acento oro (interes, detalles calidos; uso moderado).
  static const Color gold = Color(0xFFB07D2B);

  /// Azul de apoyo para graficos.
  static const Color slateBlue = Color(0xFF3D7EA6);

  /// Fondo blanco-calido con tinte verde.
  static const Color background = Color(0xFFF5F7F4);

  /// Superficie de tarjetas.
  static const Color surface = Color(0xFFFFFFFF);

  /// Texto/tinta principal (verde casi negro).
  static const Color ink = Color(0xFF12211B);

  /// Rojo de alerta (usura).
  static const Color danger = Color(0xFFC0392B);

  // ---- Radios ----
  static const double radiusSm = 12;
  static const double radiusMd = 16;
  static const double radiusLg = 24;

  // ---- Espaciado ----
  static const double gap = 16;
  static const double gapLg = 24;
}
