// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'payments_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$paymentsControllerHash() =>
    r'a7b26c2e1040cf35f6ec42a6f7769ab4b0146aaf';

/// Controlador de pagos. Registra pagos/abonos y refresca el detalle y la lista
/// de deudas afectadas (el abono reescribe el cronograma).
///
/// Copied from [PaymentsController].
@ProviderFor(PaymentsController)
final paymentsControllerProvider =
    AutoDisposeNotifierProvider<PaymentsController, void>.internal(
  PaymentsController.new,
  name: r'paymentsControllerProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$paymentsControllerHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef _$PaymentsController = AutoDisposeNotifier<void>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
