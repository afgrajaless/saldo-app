# Política de Seguridad

La seguridad es un pilar de diseño de este proyecto, no un parche final. Se trata de una aplicación financiera, por lo que el manejo de datos sensibles y credenciales se toma con seriedad.

## Reportar una vulnerabilidad

Si descubres una vulnerabilidad de seguridad, por favor **no abras un issue público**. Repórtala de forma privada:

1. Usa la opción **"Report a vulnerability"** en la pestaña *Security* del repositorio (GitHub Private Vulnerability Reporting), o
2. Escribe a través de los datos de contacto del autor en el perfil de GitHub.

Incluye, en lo posible: descripción del problema, pasos para reproducirlo, impacto potencial y, si la tienes, una propuesta de mitigación. Se intentará dar respuesta inicial en un plazo razonable.

## Prácticas de seguridad aplicadas

- **Autenticación:** JWT de acceso corto + refresh token rotatorio.
- **Contraseñas:** hash con Argon2, nunca en texto plano.
- **Validación de entrada:** estricta con class-validator; no se confía en el cliente.
- **Aislamiento por usuario:** cada query filtra por el usuario autenticado; un usuario no puede acceder a obligaciones ajenas aunque adivine un UUID.
- **Cabeceras y transporte:** Helmet, rate limiting y HTTPS forzado.
- **Cifrado en reposo** de los campos más sensibles.
- Alineado con buenas prácticas **OWASP** y con la **Ley 1581 de 2012** de protección de datos personales (Colombia).

## Manejo de secretos

- Las credenciales y secretos **nunca** se versionan. El archivo `.env` está excluido por `.gitignore`.
- Usa `.env.example` como plantilla; genera secretos fuertes (p. ej. `openssl rand -base64 48`).
- Si un secreto se filtra accidentalmente, **rótalo de inmediato** y purga el historial.

## Versiones soportadas

El proyecto está en desarrollo activo (MVP). Las correcciones de seguridad se aplican sobre la rama `main`.
