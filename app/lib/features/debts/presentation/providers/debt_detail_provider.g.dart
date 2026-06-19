// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'debt_detail_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$debtDetailHash() => r'61978d9d865e4aa8276eed391690a6259aa9b478';

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

/// Provee el detalle (con cronograma) de una deuda por su id.
/// @param ref - Referencia del provider.
/// @param id - UUID de la deuda.
/// @return El detalle de la deuda.
///
/// Copied from [debtDetail].
@ProviderFor(debtDetail)
const debtDetailProvider = DebtDetailFamily();

/// Provee el detalle (con cronograma) de una deuda por su id.
/// @param ref - Referencia del provider.
/// @param id - UUID de la deuda.
/// @return El detalle de la deuda.
///
/// Copied from [debtDetail].
class DebtDetailFamily extends Family<AsyncValue<DebtDetail>> {
  /// Provee el detalle (con cronograma) de una deuda por su id.
  /// @param ref - Referencia del provider.
  /// @param id - UUID de la deuda.
  /// @return El detalle de la deuda.
  ///
  /// Copied from [debtDetail].
  const DebtDetailFamily();

  /// Provee el detalle (con cronograma) de una deuda por su id.
  /// @param ref - Referencia del provider.
  /// @param id - UUID de la deuda.
  /// @return El detalle de la deuda.
  ///
  /// Copied from [debtDetail].
  DebtDetailProvider call(
    String id,
  ) {
    return DebtDetailProvider(
      id,
    );
  }

  @override
  DebtDetailProvider getProviderOverride(
    covariant DebtDetailProvider provider,
  ) {
    return call(
      provider.id,
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
  String? get name => r'debtDetailProvider';
}

/// Provee el detalle (con cronograma) de una deuda por su id.
/// @param ref - Referencia del provider.
/// @param id - UUID de la deuda.
/// @return El detalle de la deuda.
///
/// Copied from [debtDetail].
class DebtDetailProvider extends AutoDisposeFutureProvider<DebtDetail> {
  /// Provee el detalle (con cronograma) de una deuda por su id.
  /// @param ref - Referencia del provider.
  /// @param id - UUID de la deuda.
  /// @return El detalle de la deuda.
  ///
  /// Copied from [debtDetail].
  DebtDetailProvider(
    String id,
  ) : this._internal(
          (ref) => debtDetail(
            ref as DebtDetailRef,
            id,
          ),
          from: debtDetailProvider,
          name: r'debtDetailProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$debtDetailHash,
          dependencies: DebtDetailFamily._dependencies,
          allTransitiveDependencies:
              DebtDetailFamily._allTransitiveDependencies,
          id: id,
        );

  DebtDetailProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.id,
  }) : super.internal();

  final String id;

  @override
  Override overrideWith(
    FutureOr<DebtDetail> Function(DebtDetailRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: DebtDetailProvider._internal(
        (ref) => create(ref as DebtDetailRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        id: id,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<DebtDetail> createElement() {
    return _DebtDetailProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is DebtDetailProvider && other.id == id;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, id.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin DebtDetailRef on AutoDisposeFutureProviderRef<DebtDetail> {
  /// The parameter `id` of this provider.
  String get id;
}

class _DebtDetailProviderElement
    extends AutoDisposeFutureProviderElement<DebtDetail> with DebtDetailRef {
  _DebtDetailProviderElement(super.provider);

  @override
  String get id => (origin as DebtDetailProvider).id;
}
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
