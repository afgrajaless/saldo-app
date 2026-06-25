// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'open_finance_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$openFinanceRepositoryHash() =>
    r'd9b9b11481d7f708feb24ae3b5c95f82fcc71290';

/// Repositorio de Open Finance desde el contenedor DI.
/// @param ref - Referencia del provider.
/// @return La instancia de [OpenFinanceRepository] registrada en get_it.
///
/// Copied from [openFinanceRepository].
@ProviderFor(openFinanceRepository)
final openFinanceRepositoryProvider =
    AutoDisposeProvider<OpenFinanceRepository>.internal(
  openFinanceRepository,
  name: r'openFinanceRepositoryProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$openFinanceRepositoryHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef OpenFinanceRepositoryRef
    = AutoDisposeProviderRef<OpenFinanceRepository>;
String _$institutionsHash() => r'69acaac612f736256573c30c7cdd378ff60bb641';

/// Instituciones disponibles para conectar.
/// @param ref - Referencia del provider.
/// @return La lista de instituciones soportadas por Open Finance.
///
/// Copied from [institutions].
@ProviderFor(institutions)
final institutionsProvider =
    AutoDisposeFutureProvider<List<Institution>>.internal(
  institutions,
  name: r'institutionsProvider',
  debugGetCreateSourceHash:
      const bool.fromEnvironment('dart.vm.product') ? null : _$institutionsHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef InstitutionsRef = AutoDisposeFutureProviderRef<List<Institution>>;
String _$connectionsListHash() => r'a1f3d1bafd9b99d758265c885d91654cb7e7197b';

/// Conexiones activas del usuario con instituciones financieras.
/// @param ref - Referencia del provider.
/// @return La lista de conexiones del usuario autenticado.
///
/// Copied from [connectionsList].
@ProviderFor(connectionsList)
final connectionsListProvider =
    AutoDisposeFutureProvider<List<OpenFinanceConnection>>.internal(
  connectionsList,
  name: r'connectionsListProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$connectionsListHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef ConnectionsListRef
    = AutoDisposeFutureProviderRef<List<OpenFinanceConnection>>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
