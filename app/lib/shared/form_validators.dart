/// Validadores reutilizables para formularios.
class FormValidators {
  const FormValidators._();

  /// Valida un correo electronico.
  /// @param value - Valor del campo.
  /// @return Mensaje de error, o `null` si es valido.
  static String? email(String? value) {
    final text = value?.trim() ?? '';
    if (text.isEmpty) return 'Ingresa tu correo.';
    final regex = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
    if (!regex.hasMatch(text)) return 'Correo no valido.';
    return null;
  }

  /// Valida una contrasena (minimo 8 caracteres, alineado con el backend).
  /// @param value - Valor del campo.
  /// @return Mensaje de error, o `null` si es valida.
  static String? password(String? value) {
    final text = value ?? '';
    if (text.isEmpty) return 'Ingresa tu contrasena.';
    if (text.length < 8) return 'Minimo 8 caracteres.';
    return null;
  }

  /// Valida un nombre (minimo 2 caracteres).
  /// @param value - Valor del campo.
  /// @return Mensaje de error, o `null` si es valido.
  static String? fullName(String? value) {
    final text = value?.trim() ?? '';
    if (text.length < 2) return 'Ingresa tu nombre.';
    return null;
  }
}
