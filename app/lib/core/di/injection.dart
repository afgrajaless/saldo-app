import 'package:get_it/get_it.dart';
import 'package:injectable/injectable.dart';

import 'injection.config.dart';

/// Contenedor global de inyeccion de dependencias.
final GetIt getIt = GetIt.instance;

/// Inicializa el grafo de dependencias generado por injectable.
/// Debe llamarse una vez al arrancar la app, antes de runApp.
@InjectableInit()
void configureDependencies() => getIt.init();
