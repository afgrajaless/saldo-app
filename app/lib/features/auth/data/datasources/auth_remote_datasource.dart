import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

import '../../../../core/error/api_exception.dart';
import '../../domain/entities/auth_session.dart';
import '../../domain/entities/user.dart';
import '../models/auth_mappers.dart';

/// Fuente de datos remota de autenticacion: habla con la API NestJS via Dio.
@lazySingleton
class AuthRemoteDataSource {
  /// @param dio - Cliente HTTP configurado.
  AuthRemoteDataSource(this._dio);

  final Dio _dio;

  /// Inicia sesion en el backend.
  /// @param email - Correo del usuario.
  /// @param password - Contrasena.
  /// @return La sesion autenticada.
  /// @throws ApiException si las credenciales son invalidas o falla la red.
  Future<AuthSession> login({required String email, required String password}) async {
    return _send(() async {
      final response = await _dio.post<Map<String, dynamic>>(
        '/auth/login',
        data: {'email': email, 'password': password},
      );
      return authSessionFromJson(response.data!);
    });
  }

  /// Registra un nuevo usuario en el backend.
  /// @param email - Correo del usuario.
  /// @param password - Contrasena.
  /// @param fullName - Nombre completo.
  /// @return La sesion autenticada del usuario creado.
  /// @throws ApiException si el correo ya existe o falla la red.
  Future<AuthSession> register({
    required String email,
    required String password,
    required String fullName,
  }) async {
    return _send(() async {
      final response = await _dio.post<Map<String, dynamic>>(
        '/auth/register',
        data: {'email': email, 'password': password, 'fullName': fullName},
      );
      return authSessionFromJson(response.data!);
    });
  }

  /// Obtiene el usuario autenticado a partir del token vigente.
  /// @return El usuario en sesion.
  /// @throws ApiException si el token es invalido.
  Future<User> me() async {
    return _send(() async {
      final response = await _dio.get<Map<String, dynamic>>('/auth/me');
      return userFromJson(response.data!);
    });
  }

  /// Ejecuta una llamada traduciendo los DioException a ApiException.
  /// @param request - Operacion HTTP a ejecutar.
  /// @return El resultado de la operacion.
  Future<T> _send<T>(Future<T> Function() request) async {
    try {
      return await request();
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }
}
