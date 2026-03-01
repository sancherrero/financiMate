# Análisis: Problemas del Análisis de Portafolio (2+ deudas)

**Fecha:** 2025-02-27  
**Alcance:** Lógica financiera del análisis de portafolio, fecha de inicio del plan, saldo extra, fondo de emergencia y consistencia entre metas.

---

## 0. Aclaraciones del producto (comportamiento esperado)

### 0.1 Datos por creación de cada deuda

En la **creación de cada nueva deuda** (flujo global de alta de deuda), el usuario indica **todos** los datos de esa fase:

- Salario neto, gastos fijos, variables.
- Dinero destinado a fondo de emergencia.
- **Fondo de emergencia esperado** (objetivo para esa fase).
- Coste de la deuda, intereses, TIN, TAE, etc.

Es decir: cada deuda puede asociarse a un contexto financiero propio (incluido un **objetivo de FE distinto**). El sistema debe poder usar ese contexto al calcular la fase correspondiente a esa deuda.

### 0.2 Estrategia por deuda (no global)

Cada deuda tiene su **propia estrategia** elegida por el usuario:

| Estrategia   | Comportamiento esperado |
|-------------|--------------------------|
| **Conservadora** (`emergency_first`) | Prioridad a llenar el fondo de emergencia; luego destinar el neto + eventual “cuota” del fondo (si aplica) a la deuda. |
| **Equilibrada** (`balanced`)        | Reparto intermedio entre FE y deuda. |
| **Agresiva** (`goal_first`)        | Destinar el 100% del excedente a la deuda (el FE no interesa, ya está cubierto o no preocupa). |

Cada deuda ha de **gestionarse y calcularse** con esta lógica **individual**: al pasar a la siguiente deuda en la cascada, el motor debe usar la estrategia y el objetivo de FE de **esa** deuda (y el estado acumulado del FE al inicio de esa fase), no un único FE objetivo y una única estrategia para todo el plan.

### 0.3 Implicación para el Análisis de Portafolio

- Al **arrancar** una nueva deuda/meta en la cascada:
  - Actualizar el **objetivo de fondo de emergencia** al indicado para esa deuda (o al derivado de su contexto).
  - Usar la **estrategia** de esa deuda para el reparto excedente → FE vs extra a deuda.
- Si el FE actual es **menor** que el nuevo objetivo (p. ej. segunda deuda con FE esperado mayor), el motor debe **redirigir** capital al FE hasta completar ese objetivo (según la estrategia de esa deuda) antes o durante la fase.
- Si el FE ya está **completo** respecto al nuevo objetivo, la estrategia (p. ej. agresiva) determina si se destina todo el excedente a la deuda.

**Resumen:** El análisis de portafolio debe ser **por fases/deudas**: FE objetivo y estrategia son **por deuda**, no únicos a nivel de plan.

---

## 1. Contexto y modelo mental

### Archivos y entidades relevantes

| Archivo | Entidad / Responsabilidad |
|---------|---------------------------|
| `src/lib/finance-engine.ts` | `calculateDebtPortfolio`, `buildMasterRoadmap`; usa `snapshot.startDate` como inicio del plan. |
| `src/lib/types.ts` | `PortfolioPlanResult`, `PortfolioMonthlyDetail`, `FinancialSnapshot`, `Goal` (incl. `startDate` por meta). |
| `src/app/roadmap/page.tsx` | Muestra `roadmap.originalSnapshot.startDate` como inicio; diálogo "Fase 1: Análisis de Portafolio" con totales (meses, intereses, extra, fondo). |
| `src/app/onboarding/page.tsx` | Al completar, escribe `writeSnapshot(snapshot)` con `startDate` del formulario (que puede ser "siguiente al fin del plan" cuando ya hay roadmap). |
| `src/app/dashboard/page.tsx` | `addToRoadmap` usa `readSnapshot()` y llama `buildMasterRoadmap(snapshot, goals, ...)` sin corregir `snapshot.startDate`. |

### Flujo de datos (resumido)

1. **Origen del snapshot**
   - Dashboard: `readSnapshot()` → mismo snapshot que guardó el usuario (onboarding o sesión anterior).
   - Roadmap (editar/borrar meta): usa `roadmap.originalSnapshot` (congelado en el último `buildMasterRoadmap`).

2. **Fecha de inicio del plan**
   - `buildMasterRoadmap` hace `earliestDate = snapshot.startDate ?? new Date()` y devuelve `originalSnapshot: { ...snapshot, startDate: earliestDate.toISOString() }`.
   - No se calcula a partir de las metas (p. ej. `min(goal.startDate)` ni "mes 0" único). La única fuente es `snapshot.startDate`.

3. **Onboarding al añadir otra meta**
   - `useEffect` lee el roadmap existente y calcula `nextStart` = fin del último plan (portafolio o ahorro) + 1 mes, y hace `setStartDate(nextStart)` y `setEmergencyFund(lastFund)`.
   - En `handleComplete` se construye un snapshot con `startDate: new Date(startDate).toISOString()` (la del formulario) y `emergencyFundAmount: emergencyFund` (el heredado del fin del plan).
   - Se llama `writeSnapshot(snapshot)`, **sobrescribiendo** el snapshot global con una fecha de inicio que en realidad es “cuándo empieza la nueva meta”, no “mes 0 del plan maestro”.

4. **Consecuencia**
   - La siguiente vez que se ejecuta `buildMasterRoadmap(snapshot, goals)` (dashboard o primer guardado desde onboarding), el plan “arranca” en la fecha de la última meta añadida. El análisis de portafolio muestra mes 1..N referidos a esa fecha errónea, y los totales (saldo extra aplicado, aporte al fondo de emergencia) quedan asociados a una línea temporal desplazada.

---

## 2. Problemas identificados (con evidencia en código)

### 2.1 La fecha de inicio del plan es la del “último ítem añadido”

**Evidencia:**

- En **onboarding** (`src/app/onboarding/page.tsx`), al existir roadmap, se fija la fecha del formulario al “siguiente al fin del plan” (líneas 54–76) y al completar se guarda ese valor en el snapshot (líneas 144–149, 146 `startDate: new Date(startDate).toISOString()`).
- En **dashboard** (`src/app/dashboard/page.tsx`, líneas 56–77) no se ajusta el snapshot: se usa `readSnapshot()` tal cual y se llama `buildMasterRoadmap(snapshot, goals, ...)`.
- En **finance-engine** (`buildMasterRoadmap`, líneas 427, 455) la fecha del plan es siempre `snapshot.startDate`; no hay derivación desde las metas.

**Conclusión:** Si el usuario añade una segunda (o más) meta pasando por onboarding, el snapshot guardado tiene `startDate` = “inicio de esa nueva meta”. Ese mismo snapshot se usa para el plan maestro → el análisis de portafolio “arranca” en esa fecha.

---

### 2.2 Saldo extra disponible y total a aportar al fondo de emergencia “confundidos”

**Evidencia:**

- El **cálculo interno** en `calculateDebtPortfolio` es coherente para un snapshot dado: `householdSurplus`, `targetEmergencyFund`, `currentEmergencyFund`, reparto emergencia/deuda (líneas 218–314 en `finance-engine.ts`).
- El problema no es la fórmula, sino el **estado** con el que se invoca:
  - Tras añadir otra meta por onboarding, el snapshot puede tener:
    - `startDate` = “cuando empieza la nueva meta”,
    - `emergencyFundAmount` = valor al **final** del portafolio anterior (`lastMonth.cumulativeEmergencyFund`).
  - Eso mezcla dos momentos temporales: “inicio” de un subplan vs “estado al cierre” del plan anterior. El “saldo extra disponible” y el “total a aportar al fondo” que el usuario percibe en la UI pueden no corresponder al mismo “mes 0” ni al mismo estado de fondo de emergencia que él espera (por ejemplo, el del inicio real del plan con 2+ deudas).

- En el **diálogo** “Fase 1: Análisis de Portafolio” (`roadmap/page.tsx`, ~567–584) se muestran totales (Meses, Intereses, Extra Aplicado, Deudas liquidadas) pero **no** se muestra de forma explícita:
  - La fecha de inicio del análisis (mes 0),
  - El excedente mensual usado como referencia,
  - El target de fondo de emergencia y el saldo inicial del fondo para ese análisis.

Por tanto, aunque los números sean internamente consistentes para ese snapshot, la **interpretación** por el usuario se vuelve confusa si la fecha de inicio es incorrecta o si el estado del snapshot no representa el “mes 0” del plan global.

---

### 2.3 Consistencia entre metas, configuraciones, fechas y solapación

**Evidencia:**

- **Fechas por meta:** `Goal.startDate` existe (tipos y `isActiveThisMonth` en `finance-engine.ts`, 248–254). Las deudas con `startDate` futura no reciben pago extra hasta ese mes; el sobrante se acumula en `accumulatedUnspentExtra` (256, 369–371).
- **Fecha del plan:** Sigue siendo `snapshot.startDate`. No hay:
  - Cálculo de una “fecha de inicio del plan” a partir de las metas (p. ej. mínimo de `goal.startDate` o “hoy”),
  - Regla explícita del tipo “el plan empieza en mes 0 = max(hoy, min(fechas de inicio de metas))” o “snapshot.startDate es inmutable una vez fijado”.
- **Solapación:** No hay validación ni mensaje cuando, por ejemplo, la `startDate` del snapshot es **posterior** al inicio de alguna deuda (o al revés). Tampoco se documenta qué hacer si dos metas se solapan en el tiempo de forma contradictoria con el orden de prioridad.
- **Desvío de fondos sobrantes:** La lógica de `accumulatedUnspentExtra` y el reparto por prioridad (avalancha/snowball) está en el motor, pero al estar la fecha de inicio del plan mal fijada, la secuencia de meses a la que se aplica ese reparto puede no coincidir con la línea temporal que el usuario tiene en la cabeza.

**Conclusión:** Falta una **fuente de verdad única** para “mes 0” del plan y una política clara de cómo se relacionan `snapshot.startDate`, `Goal.startDate` y la posibilidad de solapamiento entre metas.

---

## 3. Resumen de causas raíz

1. **Snapshot usado como “estado del plan en mes 0” y como “estado para pre-rellenar la siguiente meta”:** En onboarding se sobrescribe el snapshot con la fecha y fondo de la “nueva meta”, y ese mismo snapshot se usa después como base del plan maestro.
2. **No hay separación entre “fecha de inicio del plan maestro” y “fecha de inicio de la meta que se está añadiendo”:** Ambas se confunden en `snapshot.startDate`.
3. **UI del análisis de portafolio:** No muestra fecha de inicio del análisis ni excedente/target de fondo de forma explícita, lo que agrava la sensación de “datos confundidos” cuando la fecha de inicio es incorrecta.

---

## 4. Plan de revisión integral (tareas atómicas)

### Fase A: Fuente de verdad para la fecha de inicio del plan

| # | Archivo | Cambio | Verificación |
|---|---------|--------|--------------|
| A1 | `src/lib/finance-engine.ts` | En `buildMasterRoadmap`, calcular una **fecha de inicio del plan** explícita: p. ej. `planStartDate = snapshot.startDate ?? new Date()`, y **opcionalmente** normalizar con las metas (p. ej. si hay deudas, `min(debts[].startDate ?? planStartDate)` o política documentada). Usar siempre esa fecha para el portafolio y para `originalSnapshot.startDate` (no confiar en que `snapshot.startDate` venga correcto). | Con 2+ deudas y snapshot con `startDate` posterior a “hoy”, el roadmap debe mostrar inicio del plan en la fecha definida por la política (no la del último ítem). |
| A2 | `src/app/onboarding/page.tsx` | **No** escribir en el snapshot la “fecha de inicio de la nueva meta” como `snapshot.startDate` cuando ya existe un roadmap. Opciones: (1) No llamar `writeSnapshot` al añadir una meta (solo guardar goal y que el roadmap se construya con el `originalSnapshot` existente), o (2) Escribir un snapshot que preserve `startDate` = fecha de inicio **del plan maestro** (leyendo `roadmap.originalSnapshot.startDate` y usándola solo para el snapshot si el usuario está “añadiendo meta”). | Tras añadir una segunda meta desde onboarding, `readSnapshot().startDate` no debe pasar a ser la fecha de la nueva meta; el plan maestro debe seguir empezando en la misma fecha que antes. |

### Fase B: Consistencia del snapshot para el portafolio

| # | Archivo | Cambio | Verificación |
|---|---------|--------|--------------|
| B1 | `src/app/dashboard/page.tsx` | Al construir el roadmap cuando ya existe `existingRoadmap`, usar **como snapshot** el `existingRoadmap.originalSnapshot` (fecha y estado de mes 0) en lugar de `readSnapshot()`, de modo que la fecha de inicio y el fondo de emergencia inicial no dependan del último guardado en onboarding. | Añadir segunda meta desde dashboard: el análisis de portafolio debe mantener la misma fecha de inicio y estado inicial que antes. |
| B2 | `src/lib/finance-engine.ts` | Documentar en comentario o tipo que `FinancialSnapshot.startDate` en el contexto del **plan maestro** significa “mes 0 / fecha de inicio del plan”, y que no debe ser sobrescrito por la “fecha de inicio de una meta concreta”. | Revisión de código y reglas del proyecto. |

### Fase C: Claridad en la UI del análisis de portafolio

| # | Archivo | Cambio | Verificación |
|---|---------|--------|--------------|
| C1 | `src/app/roadmap/page.tsx` | En el diálogo “Fase 1: Análisis de Portafolio”, mostrar de forma explícita: (1) **Fecha de inicio del análisis** (ej. “Plan desde: MMM yyyy”), (2) **Excedente mensual** usado (ej. “Excedente mensual: €X”), (3) **Target fondo de emergencia** y **saldo inicial del fondo** para este análisis (ej. “Fondo emergencia: €Y inicial → €Z objetivo”). Usar `viewingPortfolio.snapshot` y/o campos ya existentes en `PortfolioPlanResult`. | El usuario ve sin ambigüedad desde qué mes y con qué cifras se ha calculado el análisis. |
| C2 | `src/lib/types.ts` / `finance-engine.ts` | Si hace falta, exponer en `PortfolioPlanResult` campos como `planStartDate`, `monthlySurplus` (ya existe), `targetEmergencyFund`, `initialEmergencyFund` para que la UI no tenga que inferirlos. | UI puede mostrar todos los datos sin duplicar lógica. |

### Fase D: Solapación y fechas por meta

| # | Archivo | Cambio | Verificación |
|---|---------|--------|--------------|
| D1 | `src/lib/finance-engine.ts` | Definir y documentar la regla: “La fecha de inicio del plan (mes 0) es …” (ej. “la menor entre snapshot.startDate y las startDate de las deudas activas” o “siempre snapshot.startDate”). Aplicarla en `buildMasterRoadmap` y, si se normaliza con metas, en `calculateDebtPortfolio`. | Tests o casos manuales con deudas con `startDate` en el futuro. |
| D2 | `src/lib/finance-engine.ts` | Opcional: si `snapshot.startDate` es posterior al mínimo `goal.startDate` de las deudas, añadir un warning en `PortfolioPlanResult.warnings` para que la UI pueda informar al usuario. | Mensaje claro en caso de inconsistencia de fechas. |

---

## 5. Orden recomendado de implementación

1. **A2 + B1** (evitar sobrescribir snapshot y usar `originalSnapshot` al añadir metas): corrigen la causa raíz de “el plan arranca con la fecha del último ítem”.
2. **A1** (normalización de fecha en el motor): refuerza que el plan tenga una única fecha de inicio bien definida.
3. **C1, C2** (UI del análisis): reducen la confusión sobre saldo extra y fondo de emergencia.
4. **B2, D1, D2** (documentación y reglas de solapación): mejoran mantenibilidad y bordes con varias metas y fechas distintas.

---

## 6. Invariantes a respetar (cursorrules)

- **Mes 0 / Mes 1:** El motor debe seguir operando en meses lógicos; `initialSnapshot` y `monthlySnapshots` deben ser coherentes con la fecha de inicio elegida.
- **Conservación:** Excedente, asignaciones y fondo de emergencia no deben inventar dinero; el orden del waterfall (supervivencia → emergencia → deudas por prioridad) se mantiene.
- **Determinismo:** Mismos inputs (snapshot, goals, estrategia) → mismos resultados; la única corrección debe ser la de “qué consideramos mes 0”, no introducir no-determinismo.
- **Result pattern:** Cualquier nuevo caso de error de dominio (p. ej. fechas incoherentes) debería devolverse como resultado tipado, no solo como warning.

Este documento sirve como base para la **revisión integral** del sistema de lógica financiera del análisis de portafolio y puede usarse como checklist para las tareas de implementación y pruebas.

---

## 7. Requisitos derivados de las aclaraciones (FE y estrategia por deuda)

A partir de la sección 0, para que el Análisis de Portafolio se comporte como se espera:

| Requisito | Estado actual | Objetivo |
|-----------|----------------|----------|
| **FE objetivo por deuda** | Un solo `snapshot.targetEmergencyFundAmount` para todo el plan. | Cada deuda (o su contexto de creación) debe aportar un **target de FE** para su fase; el motor debe usarlo al entrar en esa deuda en la cascada. |
| **Estrategia por deuda** | `Roadmap.generalStrategy` único; `Goal.strategy` no se usa en el portafolio. | Usar **`Goal.strategy`** (o equivalente por fase) en `calculateDebtPortfolio` para cada deuda: al procesar los meses correspondientes a una deuda, aplicar la estrategia de esa deuda. |
| **Contexto financiero por fase** | Un solo snapshot (plan); al añadir una deuda desde onboarding se sobrescribe el snapshot global. | Persistir o reconstruir el **contexto por deuda** (al menos FE objetivo, y si aplica ingresos/gastos de esa fase) para que el motor pueda cambiar de “reglas” al pasar de una deuda a la siguiente. |
| **Transición entre deudas** | No existe: mismo `targetEmergencyFund` y mismo `debtEffortFactor` todo el bucle. | Al **liquidar** una deuda o al **activar** la siguiente (p. ej. por `startDate` o por orden de prioridad), actualizar `targetEmergencyFund` y `debtEffortFactor` según la **siguiente** deuda; si el nuevo FE objetivo es mayor que el saldo actual, repartir excedente hacia el FE según la nueva estrategia. |

Estos requisitos deben tenerse en cuenta en el plan de revisión (Fases A–D) y en cualquier refactor del motor y del modelo de datos (p. ej. `Goal` con `targetEmergencyFundAmount` o snapshot/fase asociado por meta).
