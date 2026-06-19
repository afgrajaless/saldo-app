import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

import '../config/app_config.dart';
import '../storage/token_storage.dart';

/// Interceptor que adjunta el JWT de acceso a cada peticion y, ante un 401,
/// intenta renovar la sesion con el refresh token y reintentar una sola vez.
@lazySingleton
class AuthInterceptor extends Interceptor {
  /// @param storage - Almacenamiento de los tokens de sesion.
  AuthInterceptor(this._storage);

  final TokenStorage _storage;

  /// Rutas de autenticacion que no llevan token ni disparan refresh.
  static const _authPaths = ['/auth/login', '/auth/register', '/auth/refresh'];

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    if (!_isAuthPath(options.path)) {
      final token = await _storage.readAccessToken();
      if (token != null) {
        options.headers['Authorization'] = 'Bearer $token';
      }
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final isUnauthorized = err.response?.statusCode == 401;
    final alreadyRetried = err.requestOptions.extra['retried'] == true;
    if (!isUnauthorized || alreadyRetried || _isAuthPath(err.requestOptions.path)) {
      return handler.next(err);
    }

    final refreshed = await _tryRefresh();
    if (!refreshed) {
      await _storage.clear();
      return handler.next(err);
    }

    try {
      final response = await _retry(err.requestOptions);
      handler.resolve(response);
    } on DioException catch (retryError) {
      handler.next(retryError);
    }
  }

  /// Intenta renovar la sesion con el refresh token almacenado.
  /// @return `true` si la renovacion fue exitosa.
  Future<bool> _tryRefresh() async {
    final refreshToken = await _storage.readRefreshToken();
    if (refreshToken == null) return false;
    try {
      final dio = Dio(BaseOptions(baseUrl: AppConfig.apiBaseUrl));
      final response = await dio.post<Map<String, dynamic>>(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
      );
      final data = response.data;
      if (data == null) return false;
      await _storage.saveTokens(
        accessToken: data['accessToken'] as String,
        refreshToken: data['refreshToken'] as String,
      );
      return true;
    } on DioException {
      return false;
    }
  }

  /// Reintenta la peticion original con el nuevo token de acceso.
  /// @param options - Opciones de la peticion fallida.
  /// @return La respuesta del reintento.
  Future<Response<dynamic>> _retry(RequestOptions options) async {
    final token = await _storage.readAccessToken();
    final dio = Dio(BaseOptions(baseUrl: AppConfig.apiBaseUrl));
    return dio.request<dynamic>(
      options.path,
      data: options.data,
      queryParameters: options.queryParameters,
      options: Options(
        method: options.method,
        headers: {...options.headers, 'Authorization': 'Bearer $token'},
        extra: {'retried': true},
      ),
    );
  }

  /// Indica si la ruta corresponde a un endpoint de autenticacion.
  bool _isAuthPath(String path) => _authPaths.any(path.contains);
}
