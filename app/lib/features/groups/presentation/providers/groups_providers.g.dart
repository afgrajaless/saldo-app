// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'groups_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$groupsListHash() => r'a70908724067fbe44fa719f834b8de7bc0ef2023';

/// Lista los grupos en los que participa el usuario autenticado.
/// @param ref - Referencia del provider.
/// @return Lista de grupos del usuario.
///
/// Copied from [groupsList].
@ProviderFor(groupsList)
final groupsListProvider = AutoDisposeFutureProvider<List<Group>>.internal(
  groupsList,
  name: r'groupsListProvider',
  debugGetCreateSourceHash:
      const bool.fromEnvironment('dart.vm.product') ? null : _$groupsListHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef GroupsListRef = AutoDisposeFutureProviderRef<List<Group>>;
String _$groupMembersHash() => r'85f4405cb33aec5590ba856e97bcd87b6a3c2b31';

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

/// Lista los miembros de un grupo.
/// @param ref - Referencia del provider.
/// @param groupId - UUID del grupo.
/// @return Lista de miembros del grupo.
///
/// Copied from [groupMembers].
@ProviderFor(groupMembers)
const groupMembersProvider = GroupMembersFamily();

/// Lista los miembros de un grupo.
/// @param ref - Referencia del provider.
/// @param groupId - UUID del grupo.
/// @return Lista de miembros del grupo.
///
/// Copied from [groupMembers].
class GroupMembersFamily extends Family<AsyncValue<List<GroupMember>>> {
  /// Lista los miembros de un grupo.
  /// @param ref - Referencia del provider.
  /// @param groupId - UUID del grupo.
  /// @return Lista de miembros del grupo.
  ///
  /// Copied from [groupMembers].
  const GroupMembersFamily();

  /// Lista los miembros de un grupo.
  /// @param ref - Referencia del provider.
  /// @param groupId - UUID del grupo.
  /// @return Lista de miembros del grupo.
  ///
  /// Copied from [groupMembers].
  GroupMembersProvider call(
    String groupId,
  ) {
    return GroupMembersProvider(
      groupId,
    );
  }

  @override
  GroupMembersProvider getProviderOverride(
    covariant GroupMembersProvider provider,
  ) {
    return call(
      provider.groupId,
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
  String? get name => r'groupMembersProvider';
}

/// Lista los miembros de un grupo.
/// @param ref - Referencia del provider.
/// @param groupId - UUID del grupo.
/// @return Lista de miembros del grupo.
///
/// Copied from [groupMembers].
class GroupMembersProvider
    extends AutoDisposeFutureProvider<List<GroupMember>> {
  /// Lista los miembros de un grupo.
  /// @param ref - Referencia del provider.
  /// @param groupId - UUID del grupo.
  /// @return Lista de miembros del grupo.
  ///
  /// Copied from [groupMembers].
  GroupMembersProvider(
    String groupId,
  ) : this._internal(
          (ref) => groupMembers(
            ref as GroupMembersRef,
            groupId,
          ),
          from: groupMembersProvider,
          name: r'groupMembersProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$groupMembersHash,
          dependencies: GroupMembersFamily._dependencies,
          allTransitiveDependencies:
              GroupMembersFamily._allTransitiveDependencies,
          groupId: groupId,
        );

  GroupMembersProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.groupId,
  }) : super.internal();

  final String groupId;

  @override
  Override overrideWith(
    FutureOr<List<GroupMember>> Function(GroupMembersRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: GroupMembersProvider._internal(
        (ref) => create(ref as GroupMembersRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        groupId: groupId,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<List<GroupMember>> createElement() {
    return _GroupMembersProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is GroupMembersProvider && other.groupId == groupId;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, groupId.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin GroupMembersRef on AutoDisposeFutureProviderRef<List<GroupMember>> {
  /// The parameter `groupId` of this provider.
  String get groupId;
}

class _GroupMembersProviderElement
    extends AutoDisposeFutureProviderElement<List<GroupMember>>
    with GroupMembersRef {
  _GroupMembersProviderElement(super.provider);

  @override
  String get groupId => (origin as GroupMembersProvider).groupId;
}

String _$groupBalanceHash() => r'5ecb301747540a3ccd0a2f24de01f7cca9085428';

/// Obtiene el balance de deudas entre miembros de un grupo.
/// @param ref - Referencia del provider.
/// @param groupId - UUID del grupo.
/// @return Balance con netos y deudas entre miembros.
///
/// Copied from [groupBalance].
@ProviderFor(groupBalance)
const groupBalanceProvider = GroupBalanceFamily();

/// Obtiene el balance de deudas entre miembros de un grupo.
/// @param ref - Referencia del provider.
/// @param groupId - UUID del grupo.
/// @return Balance con netos y deudas entre miembros.
///
/// Copied from [groupBalance].
class GroupBalanceFamily extends Family<AsyncValue<GroupBalance>> {
  /// Obtiene el balance de deudas entre miembros de un grupo.
  /// @param ref - Referencia del provider.
  /// @param groupId - UUID del grupo.
  /// @return Balance con netos y deudas entre miembros.
  ///
  /// Copied from [groupBalance].
  const GroupBalanceFamily();

  /// Obtiene el balance de deudas entre miembros de un grupo.
  /// @param ref - Referencia del provider.
  /// @param groupId - UUID del grupo.
  /// @return Balance con netos y deudas entre miembros.
  ///
  /// Copied from [groupBalance].
  GroupBalanceProvider call(
    String groupId,
  ) {
    return GroupBalanceProvider(
      groupId,
    );
  }

  @override
  GroupBalanceProvider getProviderOverride(
    covariant GroupBalanceProvider provider,
  ) {
    return call(
      provider.groupId,
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
  String? get name => r'groupBalanceProvider';
}

/// Obtiene el balance de deudas entre miembros de un grupo.
/// @param ref - Referencia del provider.
/// @param groupId - UUID del grupo.
/// @return Balance con netos y deudas entre miembros.
///
/// Copied from [groupBalance].
class GroupBalanceProvider extends AutoDisposeFutureProvider<GroupBalance> {
  /// Obtiene el balance de deudas entre miembros de un grupo.
  /// @param ref - Referencia del provider.
  /// @param groupId - UUID del grupo.
  /// @return Balance con netos y deudas entre miembros.
  ///
  /// Copied from [groupBalance].
  GroupBalanceProvider(
    String groupId,
  ) : this._internal(
          (ref) => groupBalance(
            ref as GroupBalanceRef,
            groupId,
          ),
          from: groupBalanceProvider,
          name: r'groupBalanceProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$groupBalanceHash,
          dependencies: GroupBalanceFamily._dependencies,
          allTransitiveDependencies:
              GroupBalanceFamily._allTransitiveDependencies,
          groupId: groupId,
        );

  GroupBalanceProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.groupId,
  }) : super.internal();

  final String groupId;

  @override
  Override overrideWith(
    FutureOr<GroupBalance> Function(GroupBalanceRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: GroupBalanceProvider._internal(
        (ref) => create(ref as GroupBalanceRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        groupId: groupId,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<GroupBalance> createElement() {
    return _GroupBalanceProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is GroupBalanceProvider && other.groupId == groupId;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, groupId.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin GroupBalanceRef on AutoDisposeFutureProviderRef<GroupBalance> {
  /// The parameter `groupId` of this provider.
  String get groupId;
}

class _GroupBalanceProviderElement
    extends AutoDisposeFutureProviderElement<GroupBalance>
    with GroupBalanceRef {
  _GroupBalanceProviderElement(super.provider);

  @override
  String get groupId => (origin as GroupBalanceProvider).groupId;
}

String _$groupExpensesHash() => r'345484e4a7b201a05ff2164d1acf0ce279d90130';

/// Lista los gastos compartidos de un grupo.
/// @param ref - Referencia del provider.
/// @param groupId - UUID del grupo.
/// @return Lista de gastos del grupo.
///
/// Copied from [groupExpenses].
@ProviderFor(groupExpenses)
const groupExpensesProvider = GroupExpensesFamily();

/// Lista los gastos compartidos de un grupo.
/// @param ref - Referencia del provider.
/// @param groupId - UUID del grupo.
/// @return Lista de gastos del grupo.
///
/// Copied from [groupExpenses].
class GroupExpensesFamily extends Family<AsyncValue<List<SharedExpense>>> {
  /// Lista los gastos compartidos de un grupo.
  /// @param ref - Referencia del provider.
  /// @param groupId - UUID del grupo.
  /// @return Lista de gastos del grupo.
  ///
  /// Copied from [groupExpenses].
  const GroupExpensesFamily();

  /// Lista los gastos compartidos de un grupo.
  /// @param ref - Referencia del provider.
  /// @param groupId - UUID del grupo.
  /// @return Lista de gastos del grupo.
  ///
  /// Copied from [groupExpenses].
  GroupExpensesProvider call(
    String groupId,
  ) {
    return GroupExpensesProvider(
      groupId,
    );
  }

  @override
  GroupExpensesProvider getProviderOverride(
    covariant GroupExpensesProvider provider,
  ) {
    return call(
      provider.groupId,
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
  String? get name => r'groupExpensesProvider';
}

/// Lista los gastos compartidos de un grupo.
/// @param ref - Referencia del provider.
/// @param groupId - UUID del grupo.
/// @return Lista de gastos del grupo.
///
/// Copied from [groupExpenses].
class GroupExpensesProvider
    extends AutoDisposeFutureProvider<List<SharedExpense>> {
  /// Lista los gastos compartidos de un grupo.
  /// @param ref - Referencia del provider.
  /// @param groupId - UUID del grupo.
  /// @return Lista de gastos del grupo.
  ///
  /// Copied from [groupExpenses].
  GroupExpensesProvider(
    String groupId,
  ) : this._internal(
          (ref) => groupExpenses(
            ref as GroupExpensesRef,
            groupId,
          ),
          from: groupExpensesProvider,
          name: r'groupExpensesProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$groupExpensesHash,
          dependencies: GroupExpensesFamily._dependencies,
          allTransitiveDependencies:
              GroupExpensesFamily._allTransitiveDependencies,
          groupId: groupId,
        );

  GroupExpensesProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.groupId,
  }) : super.internal();

  final String groupId;

  @override
  Override overrideWith(
    FutureOr<List<SharedExpense>> Function(GroupExpensesRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: GroupExpensesProvider._internal(
        (ref) => create(ref as GroupExpensesRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        groupId: groupId,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<List<SharedExpense>> createElement() {
    return _GroupExpensesProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is GroupExpensesProvider && other.groupId == groupId;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, groupId.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin GroupExpensesRef on AutoDisposeFutureProviderRef<List<SharedExpense>> {
  /// The parameter `groupId` of this provider.
  String get groupId;
}

class _GroupExpensesProviderElement
    extends AutoDisposeFutureProviderElement<List<SharedExpense>>
    with GroupExpensesRef {
  _GroupExpensesProviderElement(super.provider);

  @override
  String get groupId => (origin as GroupExpensesProvider).groupId;
}

String _$groupSettlementsHash() => r'76c7f2ecc803a49903933d10e4830c87306bfaa9';

/// Lista las liquidaciones de deuda registradas en un grupo.
/// @param ref - Referencia del provider.
/// @param groupId - UUID del grupo.
/// @return Lista de liquidaciones del grupo.
///
/// Copied from [groupSettlements].
@ProviderFor(groupSettlements)
const groupSettlementsProvider = GroupSettlementsFamily();

/// Lista las liquidaciones de deuda registradas en un grupo.
/// @param ref - Referencia del provider.
/// @param groupId - UUID del grupo.
/// @return Lista de liquidaciones del grupo.
///
/// Copied from [groupSettlements].
class GroupSettlementsFamily extends Family<AsyncValue<List<Settlement>>> {
  /// Lista las liquidaciones de deuda registradas en un grupo.
  /// @param ref - Referencia del provider.
  /// @param groupId - UUID del grupo.
  /// @return Lista de liquidaciones del grupo.
  ///
  /// Copied from [groupSettlements].
  const GroupSettlementsFamily();

  /// Lista las liquidaciones de deuda registradas en un grupo.
  /// @param ref - Referencia del provider.
  /// @param groupId - UUID del grupo.
  /// @return Lista de liquidaciones del grupo.
  ///
  /// Copied from [groupSettlements].
  GroupSettlementsProvider call(
    String groupId,
  ) {
    return GroupSettlementsProvider(
      groupId,
    );
  }

  @override
  GroupSettlementsProvider getProviderOverride(
    covariant GroupSettlementsProvider provider,
  ) {
    return call(
      provider.groupId,
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
  String? get name => r'groupSettlementsProvider';
}

/// Lista las liquidaciones de deuda registradas en un grupo.
/// @param ref - Referencia del provider.
/// @param groupId - UUID del grupo.
/// @return Lista de liquidaciones del grupo.
///
/// Copied from [groupSettlements].
class GroupSettlementsProvider
    extends AutoDisposeFutureProvider<List<Settlement>> {
  /// Lista las liquidaciones de deuda registradas en un grupo.
  /// @param ref - Referencia del provider.
  /// @param groupId - UUID del grupo.
  /// @return Lista de liquidaciones del grupo.
  ///
  /// Copied from [groupSettlements].
  GroupSettlementsProvider(
    String groupId,
  ) : this._internal(
          (ref) => groupSettlements(
            ref as GroupSettlementsRef,
            groupId,
          ),
          from: groupSettlementsProvider,
          name: r'groupSettlementsProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$groupSettlementsHash,
          dependencies: GroupSettlementsFamily._dependencies,
          allTransitiveDependencies:
              GroupSettlementsFamily._allTransitiveDependencies,
          groupId: groupId,
        );

  GroupSettlementsProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.groupId,
  }) : super.internal();

  final String groupId;

  @override
  Override overrideWith(
    FutureOr<List<Settlement>> Function(GroupSettlementsRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: GroupSettlementsProvider._internal(
        (ref) => create(ref as GroupSettlementsRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        groupId: groupId,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<List<Settlement>> createElement() {
    return _GroupSettlementsProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is GroupSettlementsProvider && other.groupId == groupId;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, groupId.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin GroupSettlementsRef on AutoDisposeFutureProviderRef<List<Settlement>> {
  /// The parameter `groupId` of this provider.
  String get groupId;
}

class _GroupSettlementsProviderElement
    extends AutoDisposeFutureProviderElement<List<Settlement>>
    with GroupSettlementsRef {
  _GroupSettlementsProviderElement(super.provider);

  @override
  String get groupId => (origin as GroupSettlementsProvider).groupId;
}

String _$myGroupDebtsHash() => r'b638011537b1f3a498f49100ac4f9d6da6db0607';

/// Lista todas las deudas activas del usuario autenticado en todos sus grupos.
/// @param ref - Referencia del provider.
/// @return Lista de resumenes de deuda por grupo.
///
/// Copied from [myGroupDebts].
@ProviderFor(myGroupDebts)
final myGroupDebtsProvider =
    AutoDisposeFutureProvider<List<GroupDebtSummary>>.internal(
  myGroupDebts,
  name: r'myGroupDebtsProvider',
  debugGetCreateSourceHash:
      const bool.fromEnvironment('dart.vm.product') ? null : _$myGroupDebtsHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef MyGroupDebtsRef = AutoDisposeFutureProviderRef<List<GroupDebtSummary>>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
