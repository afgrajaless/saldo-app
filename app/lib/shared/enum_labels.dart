// Etiquetas en espanol para los enumerados del dominio (valores de la BD).

/// Tipos de obligacion (para mostrar; incluye todos los valores de la BD).
const Map<String, String> debtTypeLabels = {
  'libre_inversion': 'Libre inversión',
  'tarjeta_credito': 'Tarjeta de crédito',
  'libranza': 'Libranza',
  'hipotecario': 'Hipotecario',
  'vehiculo': 'Vehículo',
  'educativo': 'Educativo',
  'gota_gota': 'Gota a gota',
};

/// Tipos de obligacion seleccionables al crear una deuda. Excluye
/// 'tarjeta_credito' a proposito: las tarjetas se gestionan en su propia
/// seccion (Cuentas > Tarjetas), no como una deuda generica.
const Map<String, String> debtTypeOptions = {
  'libre_inversion': 'Libre inversión',
  'libranza': 'Libranza',
  'hipotecario': 'Hipotecario',
  'vehiculo': 'Vehículo',
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
  'frances': 'Cuota fija',
  'aleman': 'Abono fijo',
  'americano': 'Capital al final',
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
