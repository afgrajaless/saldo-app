// dart format width=80
// GENERATED CODE - DO NOT MODIFY BY HAND

// **************************************************************************
// InjectableConfigGenerator
// **************************************************************************

// ignore_for_file: type=lint
// coverage:ignore-file

// ignore_for_file: no_leading_underscores_for_library_prefixes
import 'package:dio/dio.dart' as _i361;
import 'package:flutter_secure_storage/flutter_secure_storage.dart' as _i558;
import 'package:get_it/get_it.dart' as _i174;
import 'package:injectable/injectable.dart' as _i526;
import 'package:saldo/core/di/register_module.dart' as _i962;
import 'package:saldo/core/network/auth_interceptor.dart' as _i604;
import 'package:saldo/core/storage/token_storage.dart' as _i390;
import 'package:saldo/features/auth/data/datasources/auth_remote_datasource.dart'
    as _i523;
import 'package:saldo/features/auth/data/repositories/auth_repository_impl.dart'
    as _i765;
import 'package:saldo/features/auth/domain/repositories/auth_repository.dart'
    as _i919;
import 'package:saldo/features/auth/domain/usecases/login_usecase.dart'
    as _i240;
import 'package:saldo/features/auth/domain/usecases/register_usecase.dart'
    as _i1049;
import 'package:saldo/features/budget/data/budget_repository_impl.dart'
    as _i147;
import 'package:saldo/features/budget/domain/repositories/budget_repository.dart'
    as _i580;
import 'package:saldo/features/debts/data/datasources/debts_remote_datasource.dart'
    as _i394;
import 'package:saldo/features/debts/data/repositories/debts_repository_impl.dart'
    as _i331;
import 'package:saldo/features/debts/domain/repositories/debts_repository.dart'
    as _i409;
import 'package:saldo/features/payments/data/datasources/payments_remote_datasource.dart'
    as _i54;
import 'package:saldo/features/payments/data/repositories/payments_repository_impl.dart'
    as _i286;
import 'package:saldo/features/payments/domain/repositories/payments_repository.dart'
    as _i54;
import 'package:saldo/features/usury/data/datasources/usury_remote_datasource.dart'
    as _i403;
import 'package:saldo/features/usury/data/repositories/usury_repository_impl.dart'
    as _i611;
import 'package:saldo/features/usury/domain/repositories/usury_repository.dart'
    as _i763;

extension GetItInjectableX on _i174.GetIt {
// initializes the registration of main-scope dependencies inside of GetIt
  _i174.GetIt init({
    String? environment,
    _i526.EnvironmentFilter? environmentFilter,
  }) {
    final gh = _i526.GetItHelper(
      this,
      environment,
      environmentFilter,
    );
    final registerModule = _$RegisterModule();
    gh.lazySingleton<_i558.FlutterSecureStorage>(
        () => registerModule.secureStorage);
    gh.lazySingleton<_i361.Dio>(() => registerModule.dio);
    gh.lazySingleton<_i394.DebtsRemoteDataSource>(
        () => _i394.DebtsRemoteDataSource(gh<_i361.Dio>()));
    gh.lazySingleton<_i54.PaymentsRemoteDataSource>(
        () => _i54.PaymentsRemoteDataSource(gh<_i361.Dio>()));
    gh.lazySingleton<_i523.AuthRemoteDataSource>(
        () => _i523.AuthRemoteDataSource(gh<_i361.Dio>()));
    gh.lazySingleton<_i403.UsuryRemoteDataSource>(
        () => _i403.UsuryRemoteDataSource(gh<_i361.Dio>()));
    gh.lazySingleton<_i580.BudgetRepository>(
        () => _i147.BudgetRepositoryImpl(gh<_i361.Dio>()));
    gh.lazySingleton<_i763.UsuryRepository>(
        () => _i611.UsuryRepositoryImpl(gh<_i403.UsuryRemoteDataSource>()));
    gh.lazySingleton<_i54.PaymentsRepository>(() =>
        _i286.PaymentsRepositoryImpl(gh<_i54.PaymentsRemoteDataSource>()));
    gh.lazySingleton<_i409.DebtsRepository>(
        () => _i331.DebtsRepositoryImpl(gh<_i394.DebtsRemoteDataSource>()));
    gh.lazySingleton<_i390.TokenStorage>(
        () => _i390.TokenStorage(gh<_i558.FlutterSecureStorage>()));
    gh.lazySingleton<_i919.AuthRepository>(() => _i765.AuthRepositoryImpl(
          gh<_i523.AuthRemoteDataSource>(),
          gh<_i390.TokenStorage>(),
        ));
    gh.lazySingleton<_i604.AuthInterceptor>(
        () => _i604.AuthInterceptor(gh<_i390.TokenStorage>()));
    gh.factory<_i1049.RegisterUseCase>(
        () => _i1049.RegisterUseCase(gh<_i919.AuthRepository>()));
    gh.factory<_i240.LoginUseCase>(
        () => _i240.LoginUseCase(gh<_i919.AuthRepository>()));
    return this;
  }
}

class _$RegisterModule extends _i962.RegisterModule {}
