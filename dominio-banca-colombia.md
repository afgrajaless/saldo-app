# Referencia de dominio: crédito y deuda en la banca colombiana

> Documento de apoyo para el gestor de deuda. Sintetiza cómo los principales bancos de Colombia estructuran sus créditos y cómo opera el marco regulatorio, para que el modelo de la app refleje la realidad y no supuestos.
>
> **Importante:** las tasas aquí son una foto de referencia (junio 2026). Cambian de forma frecuente — la app **no debe hardcodearlas**: el usuario ingresa la tasa de su crédito y el catálogo de usura se actualiza por vigencia.

---

## 1. Marco regulatorio: el que define las reglas del juego

Quien fija el "techo" de las tasas no es cada banco sino la **Superintendencia Financiera de Colombia (SFC)**, que certifica el **Interés Bancario Corriente (IBC)** por modalidad de crédito.

### Modalidades certificadas

| Modalidad | Periodicidad de certificación | Uso típico |
|---|---|---|
| Consumo y ordinario | Mensual | Libre inversión, tarjetas, vehículo, la mayoría de consumo |
| Microcrédito | Trimestral | Créditos a microempresas |
| Consumo de bajo monto | Anual | Préstamos pequeños de rápido desembolso |
| Productivo (rural / urbano / mayor monto) | Mensual | Crédito productivo |
| Popular productivo (rural / urbano) | Mensual | Inclusión financiera, mayor riesgo |

### Tasa de usura

La usura es el tope legal de interés. Su fórmula:

```
tasa_usura = IBC_modalidad × 1.5
```

Ejemplo vigente (junio 2026, Resolución 0823 de 2026):

| Concepto | Valor (E.A.) |
|---|---|
| IBC consumo y ordinario | 19,19 % |
| **Tasa de usura consumo/ordinario** | **28,79 %** |
| Tasa de usura consumo de bajo monto (abril 2026) | ~62,72 % |

Volatilidad reciente de la usura (consumo y ordinario), para dimensionar por qué se modela con vigencia:

| Periodo | Usura (E.A.) |
|---|---|
| Enero 2026 | 24,36 % |
| Abril 2026 | 26,76 % |
| Junio 2026 | 28,79 % |

Cobrar por encima de la usura es delito (art. 305 del Código Penal). La usura también marca el tope del interés de mora.

---

## 2. Cómo se expresan las tasas (clave para el motor de cálculo)

Los bancos colombianos manejan varias representaciones de la misma tasa. Distinguirlas es esencial:

| Sigla | Nombre | Qué es |
|---|---|---|
| **E.A.** | Efectiva Anual | La tasa comparable. Incluye el efecto de la capitalización. Es la que se compara contra la usura. |
| **M.V.** | Mensual Vencida | La tasa del periodo (mes). Es la que entra directo en el cálculo de la cuota. |
| **N.M.V. / NAMV** | Nominal (anual) Mes Vencido | Tasa nominal anual; se divide entre 12 para obtener la mensual. |

Conversión fundamental entre mensual y efectiva anual:

```
E.A. = (1 + i_mensual)^12 − 1
i_mensual = (1 + E.A.)^(1/12) − 1
N.M.V. = i_mensual × 12
```

**Regla de oro de la app:** se almacena la tasa tal como la dio el usuario (`nominal_rate` + `rate_type`) y, además, normalizada a E.A. (`effective_annual_rate`). Se compara contra usura en E.A.; se calcula la cuota con la mensual.

---

## 3. Productos de crédito por banco

Foto de referencia. Los valores exactos varían por perfil, portafolio y fecha.

### Bancolombia (líder de mercado)

- **Libre inversión:** cuota y tasa fijas durante toda la vigencia. Tasa desde ~0,96 % M.V.; E.A. de referencia ~28,7 %. Promedio ponderado de mercado ~20,25 % E.A. Plazos: 12–60 meses en tasa fija, hasta 120 meses en tasa variable. Monto desde $1.000.000. Permite abonos extraordinarios y prepago sin sanción (el abono a capital se hace en sucursal física). Incluye seguro de vida deudor.
- **Hipotecario / leasing habitacional:** en pesos o UVR. Tasas competitivas ~9–12 % E.A. según si el proyecto es financiado por el banco y si es VIS / no VIS.
- **Tarjeta de crédito:** rotativo, tasa cercana al tope de usura.

### Davivienda

- **Libre inversión:** varios productos; tasa fija o variable; plazos hasta 120 meses en variable. Promedio ponderado de mercado ~22,07 % E.A.
- **Hipotecario:** pesos o UVR; tasas preferenciales en proyectos financiados.

### BBVA Colombia

- **Libre inversión:** tasa y cuota fijas. Sin portafolio: ~2,08 % N.M.V. / 28,05 % E.A. Con portafolio de productos: ~2,02 % N.M.V. / 27,05 % E.A. (mejora la tasa por vinculación).

### Grupo Aval (Banco de Bogotá, Popular, Occidente, AV Villas)

- **Hipotecario / leasing habitacional:** financiación de vivienda desde ~9,5–10 % E.A. en condiciones promocionales.

---

## 4. Sistemas de amortización en la práctica

- **Cuota fija (sistema francés):** el dominante en consumo. La cuota es constante; al principio se paga más interés y menos capital. Es lo que el banco vende como "siempre la misma cuota".
- **Tasa fija vs. variable:** la fija no cambia en toda la vigencia; la variable se indexa a un referente (IBR para algunos consumo, UVR para hipotecario).
- **UVR (Unidad de Valor Real):** los hipotecarios en UVR tienen tasa nominal más baja pero el saldo se ajusta con la inflación. Implica modelar capital indexado (fase posterior del proyecto).

---

## 5. Características operativas comunes

- **Prepago sin penalización:** por la Ley 1555 de 2012 el deudor puede pagar anticipadamente (total o parcial) sin sanción en créditos de consumo y vivienda por debajo de cierto monto. Esto es justo lo que motiva separar `installments` (cronograma) de `payments` (pagos reales): un abono a capital recalcula las cuotas futuras.
- **Seguro de vida deudor:** casi siempre obligatorio; se suma a la cuota. Candidato a un campo futuro `insurance_amount`.
- **Interés de mora:** ligado a la usura; se activa con el primer día de atraso.
- **Débito automático:** mecanismo de pago, no afecta el cálculo.

---

## 6. Cómo aterriza esto en el modelo de datos

| Concepto del dominio | Dónde vive en el modelo |
|---|---|
| Productos (libre inversión, hipotecario, tarjeta, vehículo, libranza, educativo, gota a gota) | `debts.debt_type` (enum) |
| Representación de la tasa (E.A. / M.V. / N.M.V.) | `debts.rate_type` + `debts.nominal_rate` |
| Tasa normalizada para comparar y alertar | `debts.effective_annual_rate` |
| Sistema de amortización (francés dominante) | `debts.amortization_system` |
| Modalidades de usura (consumo/ordinario, microcrédito, bajo monto) | `usury_rates.modality` (enum) |
| Tope legal vigente por periodo | `usury_rates` con `valid_from` / `valid_to` |
| Abonos extraordinarios a capital | `payments.type = 'abono_capital'` → recalcula `installments` futuras |

### Pendientes para fases posteriores

- Seguro de vida deudor como componente de la cuota.
- Crédito en UVR (capital indexado a inflación).
- Tasa variable indexada (IBR / UVR) con recálculo periódico.
- Actualización automática del catálogo de usura.

---

## 7. Fuentes

- Banco de la República — glosario de tasa de usura.
- Superintendencia Financiera de Colombia — certificación del Interés Bancario Corriente (Resolución 0823 de 2026).
- Sitios oficiales de Bancolombia, Davivienda, BBVA y Grupo Aval; prensa económica (La República, El Tiempo, El Colombiano, Infobae) para tasas de referencia.

*Valores de referencia a junio de 2026. Verificar contra fuentes oficiales antes de usarlos como dato productivo.*
