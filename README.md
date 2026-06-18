# Saldo — Gestor de deuda y crédito 🇨🇴

> Aplicación de **control de deudas y crédito** enfocada en la realidad financiera colombiana. No es un gestor genérico de gastos: su diferenciador es el dominio —amortización real, conversión de tasas y alerta de usura según la regulación local.

<p align="left">
  <img alt="NestJS" src="https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white" />
  <img alt="Flutter" src="https://img.shields.io/badge/Flutter-02569B?style=flat&logo=flutter&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white" />
  <img alt="Drizzle ORM" src="https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=flat&logo=drizzle&logoColor=black" />
  <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-green.svg" />
</p>

---

## ¿Qué resuelve?

Quien tiene deudas en Colombia rara vez sabe cuánto de cada cuota es **capital** y cuánto **interés**, si su tasa supera el **tope de usura** vigente, o cómo un **abono a capital** recalcula su cronograma. Saldo responde esas preguntas con cálculos financieros exactos y trazables.

### Características (MVP)

- 🔐 **Autenticación** de usuario (registro / login) con JWT + refresh rotatorio.
- 📋 **CRUD de obligaciones**: libre inversión, tarjeta de crédito, libranza, hipotecario, vehículo, educativo y "gota a gota".
- 🧮 **Motor de amortización**: genera el cronograma cuota por cuota (sistema francés; alemán y americano en camino).
- 🔁 **Conversión de tasas**: E.A. ↔ M.V. ↔ nominal.
- ⚠️ **Alerta de usura**: compara la tasa contra el tope legal vigente por modalidad (Superfinanciera).
- 📊 **Dashboard**: deuda total, distribución por tipo, capital vs. interés en el tiempo y capacidad de endeudamiento.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| **Backend** | NestJS (TypeScript) · Clean Architecture |
| **ORM / DB** | Drizzle ORM · PostgreSQL (Neon serverless) |
| **Validación / Docs** | class-validator · Swagger / OpenAPI |
| **Frontend** | Flutter (Dart) · Riverpod 3 · Material 3 + Forui |
| **DI Frontend** | get_it · injectable |
| **Calidad** | Biome · Jest/Vitest · Husky · commitlint |
| **Infra** | Neon · Render · GitHub Actions · Sentry |

---

## Arquitectura

Clean Architecture en ambos lados: las dependencias apuntan siempre hacia el **dominio**. El motor de amortización y el cálculo de usura son lógica pura, sin conocer NestJS, Postgres ni Flutter — lo que los hace 100 % testeables sin base de datos.

```
App Flutter (Presentation → Domain → Data)
        │  REST · HTTPS + JWT
        ▼
API NestJS (Controllers → Application → Domain → Infrastructure)
        │  Drizzle · SQL
        ▼
Neon — PostgreSQL serverless
```

### Estructura del monorepo

```
saldo-app/
├── backend/                 # API NestJS
│   └── src/
│       ├── modules/         # auth · debts · installments · payments · usury
│       ├── domain/          # motor de amortización, conversión de tasas, usura
│       ├── shared/          # guards, decorators, filtros, utils
│       ├── db/              # esquema Drizzle, migraciones, conexión Neon
│       └── config/
├── app/                     # App Flutter
│   └── lib/
│       ├── core/            # tema, design tokens, DI, router
│       ├── features/        # auth · debts · dashboard (data/domain/presentation)
│       └── shared/
├── 001_init_schema.sql      # esquema PostgreSQL inicial
└── dominio-banca-colombia.md
```

---

## Modelo de datos

Seis entidades principales (DDL completo en [`001_init_schema.sql`](./001_init_schema.sql)):

- **`users`** — identidad y credenciales (Argon2).
- **`income_sources`** — fuentes de ingreso para capacidad de endeudamiento.
- **`debts`** — la obligación: acreedor, tipo, capital, tasa, plazo, sistema de amortización.
- **`installments`** — cronograma proyectado con desglose capital/interés y saldo.
- **`payments`** — pagos reales, incluido el abono a capital que recalcula cuotas futuras.
- **`usury_rates`** — catálogo de la tasa de usura por modalidad y vigencia.

**Decisiones de modelado:** dinero como `NUMERIC(15,2)` (nunca float); tasas guardadas como las ingresó el usuario y normalizadas a E.A.; cronograma almacenado (no calculado al vuelo) para soportar abonos; PK = UUID; soft delete + auditoría; aislamiento estricto por `user_id`.

---

## Dominio financiero (lo esencial)

- **Tasas:** E.A. (comparable, se evalúa contra usura), M.V. (entra al cálculo de la cuota) y N.M.V.
  `E.A. = (1 + i_mensual)¹² − 1` · `i_mensual = (1 + E.A.)^(1/12) − 1`
- **Amortización dominante:** francés (cuota fija); también alemán y americano.
- **Usura:** la define la Superfinanciera por modalidad (`usura = IBC × 1.5`); cambia periódicamente, por eso se consulta del catálogo, **nunca se hardcodea**.
- **Prepago sin sanción** (Ley 1555 de 2012): el abono a capital recalcula las cuotas pendientes.

Referencia ampliada en [`dominio-banca-colombia.md`](./dominio-banca-colombia.md).

---

## Puesta en marcha

> Requisitos: Node.js 20 LTS, Flutter (fijado con FVM), una base de datos PostgreSQL (Neon).

### Backend

```bash
cd backend
npm install
cp ../.env.example .env        # completa DATABASE_URL y los secretos JWT
npm run start:dev
```

La documentación Swagger queda disponible en `http://localhost:3000/api`.

### Base de datos

```bash
# Aplicar el esquema inicial
psql "$DATABASE_URL" -f 001_init_schema.sql
```

### Frontend

```bash
cd app
fvm flutter pub get
fvm flutter run
```

---

## Seguridad

App financiera → la seguridad es parte del diseño. JWT de acceso corto + refresh rotatorio, contraseñas con Argon2, validación estricta de toda entrada, Helmet, rate limiting, HTTPS forzado y aislamiento por usuario. Detalle y reporte de vulnerabilidades en [`SECURITY.md`](./SECURITY.md).

---

## Roadmap

1. ✅ **Modelo y base de datos** — esquema definido.
2. 🔜 **Motor de dominio** — amortización (francés), conversión de tasas, evaluación de usura (lógica pura + tests).
3. **Backend NestJS** — módulo por módulo: auth → debts → installments → payments → usury.
4. **App Flutter** — Clean Architecture, Riverpod, consumo de API, dashboard con gráficos.
5. **Endurecimiento y pruebas** — seguridad completa, e2e, observabilidad.
6. **Despliegue** — Neon + Render + CI con GitHub Actions.

---

## Licencia

Distribuido bajo licencia MIT. Ver [`LICENSE`](./LICENSE).
