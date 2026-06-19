// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'usury_evaluation_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$usuryEvaluationHash() => r'0e5a7a6c6a6388dd31d44bf5266f26ffba745976';

/// Copied from Dart SDK
class _SystemHash {
  _SystemHash._();

  static int combine(int hash, int value) {
    // ignore: parameter_assignments
    hash = 0x1fffffff & (hash + value);
    // ignore: parameter_assignments
    hash = 0x1fffffff & (hash + ((0x0007ffff & hash) << 10));
    return hash ^ (hash >> 6);
  }

  static int finish(int hash) {
    // ignore: parameter_assignments
    hash = 0x1fffffff & (hash + ((0x03ffffff & hash) << 3));
    // ignore: parameter_assignments
    hash = hash ^ (hash >> 11);
    return 0x1fffffff & (hash + ((0x00003fff & hash) << 15));
  }
}

/// Provee la evaluacion de usura de una deuda (null si no hay tope vigente).
/// @param ref - Referencia del provider.
/// @param debtId - UUID de la deuda.
/// @return La evaluacion de usura, o null.
///
/// Copied from [usuryEvaluation].
@ProviderFor(usuryEvaluation)
const usuryEvaluationProvider = UsuryEvaluationFamily();

/// Provee la evaluacion de usura de una deuda (null si no hay tope vigente).
/// @param ref - Referencia del provider.
/// @param debtId - UUID de la deuda.
/// @return La evaluacion de usura, o null.
///
/// Copied from [usuryEvaluation].
class UsuryEvaluationFamily extends Family<AsyncValue<UsuryEvaluation?>> {
  /// Provee la evaluacion de usura de una deuda (null si no hay tope vigente).
  /// @param ref - Referencia del provider.
  /// @param debtId - UUID de la deuda.
  /// @return La evaluacion de usura, o null.
  ///
  /// Copied from [usuryEvaluation].
  const UsuryEvaluationFamily();

  /// Provee la evaluacion de usura de una deuda (null si no hay tope vigente).
  /// @param ref - Referencia del provider.
  /// @param debtId - UUID de la deuda.
  /// @return La evaluacion de usura, o null.
  ///
  /// Copied from [usuryEvaluation].
  UsuryEvaluationProvider call(
    String debtId,
  ) {
    return UsuryEvaluationProvider(
      debtId,
    );
  }

  @override
  UsuryEvaluationProvider getProviderOverride(
    covariant UsuryEvaluationProvider provider,
  ) {
    return call(
      provider.debtId,
    );
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'usuryEvaluationProvider';
}

/// Provee la evaluacion de usura de una deuda (null si no hay tope vigente).
/// @param ref - Referencia del provider.
/// @param debtId - UUID de la deuda.
/// @return La evaluacion de usura, o null.
///
/// Copied from [usuryEvaluation].
class UsuryEvaluationProvider
    extends AutoDisposeFutureProvider<UsuryEvaluation?> {
  /// Provee la evaluacion de usura de una deuda (null si no hay tope vigente).
  /// @param ref - Referencia del provider.
  /// @param debtId - UUID de la deuda.
  /// @return La evaluacion de usura, o null.
  ///
  /// Copied from [usuryEvaluation].
  UsuryEvaluationProvider(
    String debtId,
  ) : this._internal(
          (ref) => usuryEvaluation(
            ref as UsuryEvaluationRef,
            debtId,
          ),
          from: usuryEvaluationProvider,
          name: r'usuryEvaluationProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$usuryEvaluationHash,
          dependencies: UsuryEvaluationFamily._dependencies,
          allTransitiveDependencies:
              UsuryEvaluationFamily._allTransitiveDependencies,
          debtId: debtId,
        );

  UsuryEvaluationProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.debtId,
  }) : super.internal();

  final String debtId;

  @override
  Override overrideWith(
    FutureOr<UsuryEvaluation?> Function(UsuryEvaluationRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: UsuryEvaluationProvider._internal(
        (ref) => create(ref as UsuryEvaluationRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        debtId: debtId,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<UsuryEvaluation?> createElement() {
    return _UsuryEvaluationProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is UsuryEvaluationProvider && other.debtId == debtId;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, debtId.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin UsuryEvaluationRef on AutoDisposeFutureProviderRef<UsuryEvaluation?> {
  /// The parameter `debtId` of this provider.
  String get debtId;
}

class _UsuryEvaluationProviderElement
    extends AutoDisposeFutureProviderElement<UsuryEvaluation?>
    with UsuryEvaluationRef {
  _UsuryEvaluationProviderElement(super.provider);

  @override
  String get debtId => (origin as UsuryEvaluationProvider).debtId;
}
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
