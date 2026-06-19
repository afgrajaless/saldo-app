import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/form_validators.dart';
import '../providers/auth_controller.dart';
import 'register_screen.dart';

/// Pantalla de inicio de sesion.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  /// Valida el formulario y dispara el inicio de sesion.
  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    await ref.read(authControllerProvider.notifier).login(
          email: _emailController.text.trim(),
          password: _passwordController.text,
        );
  }

  @override
  Widget build(BuildContext context) {
    // Muestra los errores de autenticacion como SnackBar.
    ref.listen(authControllerProvider, (previous, next) {
      if (next.hasError && !next.isLoading) {
        ScaffoldMessenger.of(context)
          ..clearSnackBars()
          ..showSnackBar(SnackBar(content: Text('${next.error}')));
      }
    });

    final isLoading = ref.watch(authControllerProvider).isLoading;
    final theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Icon(Icons.account_balance_wallet_outlined,
                        size: 64, color: theme.colorScheme.primary),
                    const SizedBox(height: 16),
                    Text('Bienvenido a Saldo',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.headlineSmall),
                    const SizedBox(height: 4),
                    Text('Controla tus deudas con claridad',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodyMedium?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant)),
                    const SizedBox(height: 32),
                    TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      autofillHints: const [AutofillHints.email],
                      decoration: const InputDecoration(
                        labelText: 'Correo',
                        prefixIcon: Icon(Icons.mail_outline),
                        border: OutlineInputBorder(),
                      ),
                      validator: FormValidators.email,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _passwordController,
                      obscureText: true,
                      autofillHints: const [AutofillHints.password],
                      decoration: const InputDecoration(
                        labelText: 'Contrasena',
                        prefixIcon: Icon(Icons.lock_outline),
                        border: OutlineInputBorder(),
                      ),
                      validator: FormValidators.password,
                      onFieldSubmitted: (_) => _submit(),
                    ),
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: isLoading ? null : _submit,
                      style: FilledButton.styleFrom(
                          minimumSize: const Size.fromHeight(52)),
                      child: isLoading
                          ? const SizedBox(
                              height: 22,
                              width: 22,
                              child: CircularProgressIndicator(strokeWidth: 2.5),
                            )
                          : const Text('Ingresar'),
                    ),
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: isLoading
                          ? null
                          : () => Navigator.of(context).push(
                                MaterialPageRoute<void>(
                                  builder: (_) => const RegisterScreen(),
                                ),
                              ),
                      child: const Text('No tienes cuenta? Registrate'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
