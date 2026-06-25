import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/di/injection.dart';
import '../../domain/entities/institution.dart';
import '../../domain/entities/open_finance_connection.dart';
import '../../domain/repositories/open_finance_repository.dart';

part 'open_finance_providers.g.dart';

/// Repositorio de Open Finance desde el contenedor DI.
/// @param ref - Referencia del provider.
/// @return La instancia de [OpenFinanceRepository] registrada en get_it.
@riverpod
OpenFinanceRepository openFinanceRepository(Ref ref) =>
    getIt<OpenFinanceRepository>();

/// Instituciones disponibles para conectar.
/// @param ref - Referencia del provider.
/// @return La lista de instituciones soportadas por Open Finance.
@riverpod
Future<List<Institution>> institutions(Ref ref) =>
    ref.watch(openFinanceRepositoryProvider).listInstitutions();

/// Conexiones activas del usuario con instituciones financieras.
/// @param ref - Referencia del provider.
/// @return La lista de conexiones del usuario autenticado.
@riverpod
Future<List<OpenFinanceConnection>> connectionsList(Ref ref) =>
    ref.watch(openFinanceRepositoryProvider).listConnections();
