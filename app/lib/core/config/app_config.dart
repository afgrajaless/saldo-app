/// Configuracion de la aplicacion.
///
/// La URL base de la API se puede sobreescribir en tiempo de compilacion con
/// `--dart-define=API_BASE_URL=...`. Por defecto apunta al backend local.
/// En el simulador iOS, `localhost` resuelve a la maquina host, asi que el
/// valor por defecto funciona para desarrollo.
class AppConfig {
  const AppConfig._();

  /// URL base del backend NestJS (incluye el prefijo `/api`).
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000/api',
  );
}
