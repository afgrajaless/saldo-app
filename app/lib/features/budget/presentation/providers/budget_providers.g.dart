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

String _$accountsListHash() => r'4d021f28ceb5e6348d58ea61d456ddc8ef8bdae4';

/// Cuentas del usuario.
/// @param ref - Referencia del provider.
/// @return La lista de cuentas.
///
/// Copied from [accountsList].
@ProviderFor(accountsList)
final accountsListProvider = AutoDisposeFutureProvider<List<Account>>.internal(
  accountsList,
  name: r'accountsListProvider',
  debugGetCreateSourceHash:
      const bool.fromEnvironment('dart.vm.product') ? null : _$accountsListHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef AccountsListRef = AutoDisposeFutureProviderRef<List<Account>>;
String _$monthTransfersHash() => r'58eddca9a73ea3d076dbf027914ae54408fdb107';

/// Transferencias de un mes.
/// @param ref - Referencia del provider.
/// @param month - Mes YYYY-MM.
/// @return Las transferencias del periodo.
///
/// Copied from [monthTransfers].
@ProviderFor(monthTransfers)
const monthTransfersProvider = MonthTransfersFamily();

/// Transferencias de un mes.
/// @param ref - Referencia del provider.
/// @param month - Mes YYYY-MM.
/// @return Las transferencias del periodo.
///
/// Copied from [monthTransfers].
class MonthTransfersFamily extends Family<AsyncValue<List<Transfer>>> {
  /// Transferencias de un mes.
  /// @param ref - Referencia del provider.
  /// @param month - Mes YYYY-MM.
  /// @return Las transferencias del periodo.
  ///
  /// Copied from [monthTransfers].
  const MonthTransfersFamily();

  /// Transferencias de un mes.
  /// @param ref - Referencia del provider.
  /// @param month - Mes YYYY-MM.
  /// @return Las transferencias del periodo.
  ///
  /// Copied from [monthTransfers].
  MonthTransfersProvider call(
    String month,
  ) {
    return MonthTransfersProvider(
      month,
    );
  }

  @override
  MonthTransfersProvider getProviderOverride(
    covariant MonthTransfersProvider provider,
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
  String? get name => r'monthTransfersProvider';
}

/// Transferencias de un mes.
/// @param ref - Referencia del provider.
/// @param month - Mes YYYY-MM.
/// @return Las transferencias del periodo.
///
/// Copied from [monthTransfers].
class MonthTransfersProvider extends AutoDisposeFutureProvider<List<Transfer>> {
  /// Transferencias de un mes.
  /// @param ref - Referencia del provider.
  /// @param month - Mes YYYY-MM.
  /// @return Las transferencias del periodo.
  ///
  /// Copied from [monthTransfers].
  MonthTransfersProvider(
    String month,
  ) : this._internal(
          (ref) => monthTransfers(
            ref as MonthTransfersRef,
            month,
          ),
          from: monthTransfersProvider,
          name: r'monthTransfersProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$monthTransfersHash,
          dependencies: MonthTransfersFamily._dependencies,
          allTransitiveDependencies:
              MonthTransfersFamily._allTransitiveDependencies,
          month: month,
        );

  MonthTransfersProvider._internal(
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
    FutureOr<List<Transfer>> Function(MonthTransfersRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: MonthTransfersProvider._internal(
        (ref) => create(ref as MonthTransfersRef),
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
  AutoDisposeFutureProviderElement<List<Transfer>> createElement() {
    return _MonthTransfersProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is MonthTransfersProvider && other.month == month;
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
mixin MonthTransfersRef on AutoDisposeFutureProviderRef<List<Transfer>> {
  /// The parameter `month` of this provider.
  String get month;
}

class _MonthTransfersProviderElement
    extends AutoDisposeFutureProviderElement<List<Transfer>>
    with MonthTransfersRef {
  _MonthTransfersProviderElement(super.provider);

  @override
  String get month => (origin as MonthTransfersProvider).month;
}

String _$accountProjectionHash() => r'0e7a5c8c3ccffc50a20808c3b837938ea3771020';

/// Proyeccion de crecimiento de una cuenta con rendimiento.
/// @param ref - Referencia del provider.
/// @param accountId - UUID de la cuenta.
/// @return La proyeccion.
///
/// Copied from [accountProjection].
@ProviderFor(accountProjection)
const accountProjectionProvider = AccountProjectionFamily();

/// Proyeccion de crecimiento de una cuenta con rendimiento.
/// @param ref - Referencia del provider.
/// @param accountId - UUID de la cuenta.
/// @return La proyeccion.
///
/// Copied from [accountProjection].
class AccountProjectionFamily extends Family<AsyncValue<AccountProjection>> {
  /// Proyeccion de crecimiento de una cuenta con rendimiento.
  /// @param ref - Referencia del provider.
  /// @param accountId - UUID de la cuenta.
  /// @return La proyeccion.
  ///
  /// Copied from [accountProjection].
  const AccountProjectionFamily();

  /// Proyeccion de crecimiento de una cuenta con rendimiento.
  /// @param ref - Referencia del provider.
  /// @param accountId - UUID de la cuenta.
  /// @return La proyeccion.
  ///
  /// Copied from [accountProjection].
  AccountProjectionProvider call(
    String accountId,
  ) {
    return AccountProjectionProvider(
      accountId,
    );
  }

  @override
  AccountProjectionProvider getProviderOverride(
    covariant AccountProjectionProvider provider,
  ) {
    return call(
      provider.accountId,
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
  String? get name => r'accountProjectionProvider';
}

/// Proyeccion de crecimiento de una cuenta con rendimiento.
/// @param ref - Referencia del provider.
/// @param accountId - UUID de la cuenta.
/// @return La proyeccion.
///
/// Copied from [accountProjection].
class AccountProjectionProvider
    extends AutoDisposeFutureProvider<AccountProjection> {
  /// Proyeccion de crecimiento de una cuenta con rendimiento.
  /// @param ref - Referencia del provider.
  /// @param accountId - UUID de la cuenta.
  /// @return La proyeccion.
  ///
  /// Copied from [accountProjection].
  AccountProjectionProvider(
    String accountId,
  ) : this._internal(
          (ref) => accountProjection(
            ref as AccountProjectionRef,
            accountId,
          ),
          from: accountProjectionProvider,
          name: r'accountProjectionProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$accountProjectionHash,
          dependencies: AccountProjectionFamily._dependencies,
          allTransitiveDependencies:
              AccountProjectionFamily._allTransitiveDependencies,
          accountId: accountId,
        );

  AccountProjectionProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.accountId,
  }) : super.internal();

  final String accountId;

  @override
  Override overrideWith(
    FutureOr<AccountProjection> Function(AccountProjectionRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: AccountProjectionProvider._internal(
        (ref) => create(ref as AccountProjectionRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        accountId: accountId,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<AccountProjection> createElement() {
    return _AccountProjectionProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is AccountProjectionProvider && other.accountId == accountId;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, accountId.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin AccountProjectionRef on AutoDisposeFutureProviderRef<AccountProjection> {
  /// The parameter `accountId` of this provider.
  String get accountId;
}

class _AccountProjectionProviderElement
    extends AutoDisposeFutureProviderElement<AccountProjection>
    with AccountProjectionRef {
  _AccountProjectionProviderElement(super.provider);

  @override
  String get accountId => (origin as AccountProjectionProvider).accountId;
}

String _$accountSnapshotsHash() => r'd654d9c3e07ff8edd0ed24c6cf0c973f92f59523';

/// Snapshots de saldo de una cuenta.
/// @param ref - Referencia del provider.
/// @param accountId - UUID de la cuenta.
/// @return Los snapshots ordenados por fecha.
///
/// Copied from [accountSnapshots].
@ProviderFor(accountSnapshots)
const accountSnapshotsProvider = AccountSnapshotsFamily();

/// Snapshots de saldo de una cuenta.
/// @param ref - Referencia del provider.
/// @param accountId - UUID de la cuenta.
/// @return Los snapshots ordenados por fecha.
///
/// Copied from [accountSnapshots].
class AccountSnapshotsFamily extends Family<AsyncValue<List<AccountSnapshot>>> {
  /// Snapshots de saldo de una cuenta.
  /// @param ref - Referencia del provider.
  /// @param accountId - UUID de la cuenta.
  /// @return Los snapshots ordenados por fecha.
  ///
  /// Copied from [accountSnapshots].
  const AccountSnapshotsFamily();

  /// Snapshots de saldo de una cuenta.
  /// @param ref - Referencia del provider.
  /// @param accountId - UUID de la cuenta.
  /// @return Los snapshots ordenados por fecha.
  ///
  /// Copied from [accountSnapshots].
  AccountSnapshotsProvider call(
    String accountId,
  ) {
    return AccountSnapshotsProvider(
      accountId,
    );
  }

  @override
  AccountSnapshotsProvider getProviderOverride(
    covariant AccountSnapshotsProvider provider,
  ) {
    return call(
      provider.accountId,
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
  String? get name => r'accountSnapshotsProvider';
}

/// Snapshots de saldo de una cuenta.
/// @param ref - Referencia del provider.
/// @param accountId - UUID de la cuenta.
/// @return Los snapshots ordenados por fecha.
///
/// Copied from [accountSnapshots].
class AccountSnapshotsProvider
    extends AutoDisposeFutureProvider<List<AccountSnapshot>> {
  /// Snapshots de saldo de una cuenta.
  /// @param ref - Referencia del provider.
  /// @param accountId - UUID de la cuenta.
  /// @return Los snapshots ordenados por fecha.
  ///
  /// Copied from [accountSnapshots].
  AccountSnapshotsProvider(
    String accountId,
  ) : this._internal(
          (ref) => accountSnapshots(
            ref as AccountSnapshotsRef,
            accountId,
          ),
          from: accountSnapshotsProvider,
          name: r'accountSnapshotsProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$accountSnapshotsHash,
          dependencies: AccountSnapshotsFamily._dependencies,
          allTransitiveDependencies:
              AccountSnapshotsFamily._allTransitiveDependencies,
          accountId: accountId,
        );

  AccountSnapshotsProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.accountId,
  }) : super.internal();

  final String accountId;

  @override
  Override overrideWith(
    FutureOr<List<AccountSnapshot>> Function(AccountSnapshotsRef provider)
        create,
  ) {
    return ProviderOverride(
      origin: this,
      override: AccountSnapshotsProvider._internal(
        (ref) => create(ref as AccountSnapshotsRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        accountId: accountId,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<List<AccountSnapshot>> createElement() {
    return _AccountSnapshotsProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is AccountSnapshotsProvider && other.accountId == accountId;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, accountId.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin AccountSnapshotsRef
    on AutoDisposeFutureProviderRef<List<AccountSnapshot>> {
  /// The parameter `accountId` of this provider.
  String get accountId;
}

class _AccountSnapshotsProviderElement
    extends AutoDisposeFutureProviderElement<List<AccountSnapshot>>
    with AccountSnapshotsRef {
  _AccountSnapshotsProviderElement(super.provider);

  @override
  String get accountId => (origin as AccountSnapshotsProvider).accountId;
}

String _$netWorthHash() => r'e6bc29553491550fc5b14f798c37a444b5c722f7';

/// Serie de patrimonio total por fecha.
/// @param ref - Referencia del provider.
/// @return Los puntos de patrimonio.
///
/// Copied from [netWorth].
@ProviderFor(netWorth)
final netWorthProvider =
    AutoDisposeFutureProvider<List<NetWorthPoint>>.internal(
  netWorth,
  name: r'netWorthProvider',
  debugGetCreateSourceHash:
      const bool.fromEnvironment('dart.vm.product') ? null : _$netWorthHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef NetWorthRef = AutoDisposeFutureProviderRef<List<NetWorthPoint>>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
