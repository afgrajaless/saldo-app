/// Token efímero para inicializar el widget de consentimiento del proveedor.
/// El cliente lo usa para abrir el widget donde el usuario se autentica en su
/// banco; las credenciales bancarias nunca pasan por la app.
class WidgetToken {
  const WidgetToken({required this.accessToken, this.expiresAt});

  final String accessToken;
  final DateTime? expiresAt;
}
