import 'package:flutter/material.dart';

/// Paleta de colores para los segmentos de los graficos (estable por indice).
const List<Color> chartPalette = [
  Color(0xFF1F8A70),
  Color(0xFF2D9CDB),
  Color(0xFFF2994A),
  Color(0xFF9B51E0),
  Color(0xFFEB5757),
  Color(0xFF27AE60),
  Color(0xFFF2C94C),
];

/// Devuelve un color de la paleta segun el indice (ciclico).
/// @param index - Indice del segmento.
/// @return El color asignado.
Color chartColor(int index) => chartPalette[index % chartPalette.length];
