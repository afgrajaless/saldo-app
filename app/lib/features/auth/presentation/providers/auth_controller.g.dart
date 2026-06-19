// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'auth_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$authControllerHash() => r'79a9e8e4c43ea0ffc074078118d720fd6e82de3e';

/// Controlador de autenticacion. El estado es la sesion actual:
/// - `AsyncData(null)`  -> sin sesion (mostrar login).
/// - `AsyncData(session)` -> autenticado.
/// - `AsyncLoading`     -> operacion en curso.
/// - `AsyncError`       -> fallo (credenciales, red, etc.).
///
/// Copied from [AuthController].
@ProviderFor(AuthController)
final authControllerProvider =
    AutoDisposeAsyncNotifierProvider<AuthController, AuthSession?>.internal(
  AuthController.new,
  name: r'authControllerProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$authControllerHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef _$AuthController = AutoDisposeAsyncNotifier<AuthSession?>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
