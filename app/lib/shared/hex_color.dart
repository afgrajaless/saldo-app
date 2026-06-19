import 'package:flutter/material.dart';

/// Convierte un color hex (#RRGGBB) en un Color de Flutter.
/// @param hex - Color en formato #RRGGBB o RRGGBB.
/// @return El Color correspondiente (gris si el formato es invalido).
Color hexToColor(String hex) {
  final cleaned = hex.replaceAll('#', '').trim();
  if (cleaned.length != 6) return const Color(0xFF9E9E9E);
  final value = int.tryParse(cleaned, radix: 16);
  if (value == null) return const Color(0xFF9E9E9E);
  return Color(0xFF000000 | value);
}

/// Convierte un Color en su representacion hex #RRGGBB.
/// @param color - Color a convertir.
/// @return El string hex en mayusculas.
String colorToHex(Color color) {
  final r = (color.r * 255).round().toRadixString(16).padLeft(2, '0');
  final g = (color.g * 255).round().toRadixString(16).padLeft(2, '0');
  final b = (color.b * 255).round().toRadixString(16).padLeft(2, '0');
  return '#${(r + g + b).toUpperCase()}';
}
