// Etiquetas en espanol para los enumerados del dominio (valores de la BD).

/// Tipos de obligacion.
const Map<String, String> debtTypeLabels = {
  'libre_inversion': 'Libre inversion',
  'tarjeta_credito': 'Tarjeta de credito',
  'libranza': 'Libranza',
  'hipotecario': 'Hipotecario',
  'vehiculo': 'Vehiculo',
  'educativo': 'Educativo',
  'gota_gota': 'Gota a gota',
};

/// Como se expresa la tasa ingresada.
const Map<String, String> rateTypeLabels = {
  'ea': 'Efectiva Anual (E.A.)',
  'mv': 'Mensual Vencida (M.V.)',
  'nominal_anual': 'Nominal Anual',
};

/// Sistemas de amortizacion.
const Map<String, String> amortizationSystemLabels = {
  'frances': 'Frances (cuota fija)',
  'aleman': 'Aleman (abono fijo)',
  'americano': 'Americano (capital al final)',
};

/// Estados de una deuda.
const Map<String, String> debtStatusLabels = {
  'activa': 'Activa',
  'pagada': 'Pagada',
  'en_mora': 'En mora',
};

/// Devuelve la etiqueta de un valor, o el valor crudo si no esta mapeado.
/// @param map - Mapa de etiquetas.
/// @param key - Valor a traducir.
/// @return La etiqueta legible.
String labelOf(Map<String, String> map, String key) => map[key] ?? key;
