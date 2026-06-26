# Despliegue — Saldo (backend en Render + Neon prod)

Guía para publicar el backend NestJS. El repo ya trae todo lo necesario
(`render.yaml`, healthcheck, Sentry opcional); estos pasos requieren **tus
cuentas** y secretos, así que los haces tú.

## 1. Base de datos de producción (Neon)

1. En [neon.com](https://neon.com), dentro del proyecto, crea una **branch nueva**
   `prod` (aislada de `dev`).
2. Copia su **connection string** (con `?sslmode=require`).
3. Aplica el esquema a prod desde tu máquina:
   ```bash
   cd backend
   DATABASE_URL="<connection-string-de-prod>" npm run db:migrate
   DATABASE_URL="<connection-string-de-prod>" npm run db:seed   # catálogo de usura
   ```
   > Repite `db:migrate` contra prod cada vez que agregues una migración nueva
   > (Render free no corre `preDeployCommand`; en plan de pago se automatiza).

## 2. Backend en Render (Blueprint)

1. En [render.com](https://render.com) → **New** → **Blueprint** → conecta este repo.
   Render lee `render.yaml` y crea el web service `saldo-backend` (rootDir `backend`,
   región Ohio = misma que Neon).
2. Rellena los **secretos** (marcados `sync: false`) en el panel del servicio:
   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | connection string de la branch **prod** de Neon |
   | `JWT_ACCESS_SECRET` | `openssl rand -base64 48` |
   | `JWT_REFRESH_SECRET` | `openssl rand -base64 48` (distinto al anterior) |
   | `ENCRYPTION_KEY` | `openssl rand -base64 32` (**guárdala**: sin ella no se descifran los datos) |
   | `CORS_ORIGIN` | origen del front (o `*` mientras no haya web pública) |
   | `SENTRY_DSN` | DSN de Sentry (opcional; vacío = sin observabilidad) |
3. **Deploy**. El healthcheck es `GET /api/health`. Swagger en `/api/docs`.

> **Cold start (free):** tras ~15 min sin tráfico, el servicio se duerme y la
> primera petición tarda ~30–60 s. Es normal en el plan free.

## 3. Observabilidad (Sentry, opcional)

1. Crea un proyecto **Node** en [sentry.io](https://sentry.io), copia su **DSN**.
2. Ponlo en `SENTRY_DSN` (paso 2). Sin DSN, Sentry queda **desactivado** (la app
   corre igual). Con DSN, se reportan automáticamente los errores **5xx**.

## 4. Verificación post-deploy

```bash
curl https://<tu-servicio>.onrender.com/api/health      # {"status":"ok",...}
```
Registra un usuario y prueba `/api/auth/login` para confirmar BD + JWT + cifrado.

## Notas
- El CI (`.github/workflows/ci.yml`) ya valida cada push (build + tests + analyze).
- `ENCRYPTION_KEY` debe ser **estable**: si la rotas, los datos cifrados con la
  clave anterior dejan de poder descifrarse (habría que re-cifrarlos).
- La app Flutter apunta al backend con `app/lib/core/config/app_config.dart`
  (cambia la base URL a la de Render para builds de producción).
