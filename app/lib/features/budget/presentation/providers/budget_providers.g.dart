// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'budget_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$categoriesListHash() => r'4cb839cec9427b910a9c197856668f4eb1f61940';

/// Categorias del usuario.
/// @param ref - Referencia del provider.
/// @return La lista de categorias.
///
/// Copied from [categoriesList].
@ProviderFor(categoriesList)
final categoriesListProvider =
    AutoDisposeFutureProvider<List<Category>>.internal(
  categoriesList,
  name: r'categoriesListProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$categoriesListHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef CategoriesListRef = AutoDisposeFutureProviderRef<List<Category>>;
String _$budgetSummaryHash() => r'0c8ee00c80e0bf58f964d2d39ca84b88dc45c6db';

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

/// Resumen del presupuesto de un mes.
/// @param ref - Referencia del provider.
/// @param month - Mes YYYY-MM.
/// @return El resumen mensual.
///
/// Copied from [budgetSummary].
@ProviderFor(budgetSummary)
const budgetSummaryProvider = BudgetSummaryFamily();

/// Resumen del presupuesto de un mes.
/// @param ref - Referencia del provider.
/// @param month - Mes YYYY-MM.
/// @return El resumen mensual.
///
/// Copied from [budgetSummary].
class BudgetSummaryFamily extends Family<AsyncValue<BudgetSummary>> {
  /// Resumen del presupuesto de un mes.
  /// @param ref - Referencia del provider.
  /// @param month - Mes YYYY-MM.
  /// @return El resumen mensual.
  ///
  /// Copied from [budgetSummary].
  const BudgetSummaryFamily();

  /// Resumen del presupuesto de un mes.
  /// @param ref - Referencia del provider.
  /// @param month - Mes YYYY-MM.
  /// @return El resumen mensual.
  ///
  /// Copied from [budgetSummary].
  BudgetSummaryProvider call(
    String month,
  ) {
    return BudgetSummaryProvider(
      month,
    );
  }

  @override
  BudgetSummaryProvider getProviderOverride(
    covariant BudgetSummaryProvider provider,
  ) {
    return call(
      provider.month,
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
  String? get name => r'budgetSummaryProvider';
}

/// Resumen del presupuesto de un mes.
/// @param ref - Referencia del provider.
/// @param month - Mes YYYY-MM.
/// @return El resumen mensual.
///
/// Copied from [budgetSummary].
class BudgetSummaryProvider extends AutoDisposeFutureProvider<BudgetSummary> {
  /// Resumen del presupuesto de un mes.
  /// @param ref - Referencia del provider.
  /// @param month - Mes YYYY-MM.
  /// @return El resumen mensual.
  ///
  /// Copied from [budgetSummary].
  BudgetSummaryProvider(
    String month,
  ) : this._internal(
          (ref) => budgetSummary(
            ref as BudgetSummaryRef,
            month,
          ),
          from: budgetSummaryProvider,
          name: r'budgetSummaryProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$budgetSummaryHash,
          dependencies: BudgetSummaryFamily._dependencies,
          allTransitiveDependencies:
              BudgetSummaryFamily._allTransitiveDependencies,
          month: month,
        );

  BudgetSummaryProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.month,
  }) : super.internal();

  final String month;

  @override
  Override overrideWith(
    FutureOr<BudgetSummary> Function(BudgetSummaryRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: BudgetSummaryProvider._internal(
        (ref) => create(ref as BudgetSummaryRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        month: month,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<BudgetSummary> createElement() {
    return _BudgetSummaryProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is BudgetSummaryProvider && other.month == month;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, month.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin BudgetSummaryRef on AutoDisposeFutureProviderRef<BudgetSummary> {
  /// The parameter `month` of this provider.
  String get month;
}

class _BudgetSummaryProviderElement
    extends AutoDisposeFutureProviderElement<BudgetSummary>
    with BudgetSummaryRef {
  _BudgetSummaryProviderElement(super.provider);

  @override
  String get month => (origin as BudgetSummaryProvider).month;
}

String _$monthTransactionsHash() => r'e65a2e8a748b8d8f51c77ed502586e6e8da3812d';

/// Movimientos de un mes.
/// @param ref - Referencia del provider.
/// @param month - Mes YYYY-MM.
/// @return Los movimientos del periodo.
///
/// Copied from [monthTransactions].
@ProviderFor(monthTransactions)
const monthTransactionsProvider = MonthTransactionsFamily();

/// Movimientos de un mes.
/// @param ref - Referencia del provider.
/// @param month - Mes YYYY-MM.
/// @return Los movimientos del periodo.
///
/// Copied from [monthTransactions].
class MonthTransactionsFamily extends Family<AsyncValue<List<Transaction>>> {
  /// Movimientos de un mes.
  /// @param ref - Referencia del provider.
  /// @param month - Mes YYYY-MM.
  /// @return Los movimientos del periodo.
  ///
  /// Copied from [monthTransactions].
  const MonthTransactionsFamily();

  /// Movimientos de un mes.
  /// @param ref - Referencia del provider.
  /// @param month - Mes YYYY-MM.
  /// @return Los movimientos del periodo.
  ///
  /// Copied from [monthTransactions].
  MonthTransactionsProvider call(
    String month,
  ) {
    return MonthTransactionsProvider(
      month,
    );
  }

  @override
  MonthTransactionsProvider getProviderOverride(
    covariant MonthTransactionsProvider provider,
  ) {
    return call(
      provider.month,
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
  String? get name => r'monthTransactionsProvider';
}

/// Movimientos de un mes.
/// @param ref - Referencia del provider.
/// @param month - Mes YYYY-MM.
/// @return Los movimientos del periodo.
///
/// Copied from [monthTransactions].
class MonthTransactionsProvider
    extends AutoDisposeFutureProvider<List<Transaction>> {
  /// Movimientos de un mes.
  /// @param ref - Referencia del provider.
  /// @param month - Mes YYYY-MM.
  /// @return Los movimientos del periodo.
  ///
  /// Copied from [monthTransactions].
  MonthTransactionsProvider(
    String month,
  ) : this._internal(
          (ref) => monthTransactions(
            ref as MonthTransactionsRef,
            month,
          ),
          from: monthTransactionsProvider,
          name: r'monthTransactionsProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$monthTransactionsHash,
          dependencies: MonthTransactionsFamily._dependencies,
          allTransitiveDependencies:
              MonthTransactionsFamily._allTransitiveDependencies,
          month: month,
        );

  MonthTransactionsProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.month,
  }) : super.internal();

  final String month;

  @override
  Override overrideWith(
    FutureOr<List<Transaction>> Function(MonthTransactionsRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: MonthTransactionsProvider._internal(
        (ref) => create(ref as MonthTransactionsRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        month: month,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<List<Transaction>> createElement() {
    return _MonthTransactionsProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is MonthTransactionsProvider && other.month == month;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, month.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin MonthTransactionsRef on AutoDisposeFutureProviderRef<List<Transaction>> {
  /// The parameter `month` of this provider.
  String get month;
}

class _MonthTransactionsProviderElement
    extends AutoDisposeFutureProviderElement<List<Transaction>>
    with MonthTransactionsRef {
  _MonthTransactionsProviderElement(super.provider);

  @override
  String get month => (origin as MonthTransactionsProvider).month;
}
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
