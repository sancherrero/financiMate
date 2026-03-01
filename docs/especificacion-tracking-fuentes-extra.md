# Especificación: Tracking de Fuentes del Aporte Extra

**Fecha:** 2026-02-27  
**Alcance:** Sistema de trazabilidad de las fuentes que componen el "aporte extra" mensual en el análisis de portafolio de deudas.

---

## 0. Problema Detectado

### 0.1 Síntoma

En el análisis de portafolio actual, el motor calcula y muestra un valor agregado de "aporte extra" por mes sin desglosar su procedencia. El usuario ve:

- **Mes 5:** Extra aplicado: 450€

Pero **no sabe** si esos 450€ provienen de:

- Su sobrante neto habitual
- Una cuota liberada (deuda 1 terminó y ahora sus 90€ se redirigen)
- El fondo de emergencia ya completo (su cuota de 200€/mes al FE se redirige)
- Un incremento salarial
- Una reducción de gastos

### 0.2 Evidencia en código

En `src/lib/finance-engine.ts` (líneas 319-324), el cálculo de `extraAvailableForDebts` **agrega múltiples fuentes** en una única variable escalar:

```typescript
if (isFundFull) {
  extraAvailableForDebts = householdSurplus + debtBudgetLeftover + alreadySavingInExpenses + accumulatedUnspentExtra;
} else {
  extraAvailableForDebts = householdSurplus * effortFactor + debtBudgetLeftover + emergencyOverflow + accumulatedUnspentExtra;
}
```

Variables mezcladas:

| Variable | Fuente |
|----------|--------|
| `householdSurplus` | Sobrante neto base (ingresos - gastos) |
| `debtBudgetLeftover` | Cuotas liberadas de deudas liquidadas |
| `alreadySavingInExpenses` | Aporte base al FE (redirigido cuando FE completo) |
| `emergencyOverflow` | Exceso puntual al llenar el FE |
| `accumulatedUnspentExtra` | Extra acumulado de meses sin deudas activas |

El resultado `totalExtraPaid` se guarda en `PortfolioMonthlyDetail` pero sin breakdown de procedencia.

### 0.3 Impacto en UX

El usuario pierde contexto sobre:

- **Progreso real:** No percibe el efecto bola de nieve (cuotas liberadas).
- **Decisiones óptimas:** No identifica si un incremento salarial tuvo impacto real.
- **Confianza:** Sin transparencia sobre el origen del dinero, el sistema se percibe como "caja negra".

---

## 1. Solución Propuesta

### 1.1 Objetivo

Implementar un sistema de **tracking de fuentes** que descomponga el aporte extra mensual en sus componentes originales, manteniendo:

- **Determinismo:** Mismos inputs → mismos breakdowns
- **Conservación:** `Σ(fuentes) = totalExtra`
- **Integridad:** Sin inventar dinero; cada céntimo trazable

### 1.2 Principios de Diseño

1. **Fuentes mutuamente excluyentes:** Cada céntimo pertenece a una única fuente.
2. **Cálculo antes de agregación:** Separar fuentes antes de sumarlas en `extraAvailableForDebts`.
3. **Persistencia selectiva:** Guardar breakdown en timeline, no en base de datos (es estado derivado).
4. **UI progresiva:** Mostrar desglose solo cuando el usuario lo solicite (hover/click).

---

## 2. Especificación Técnica

### 2.1 Nuevos Tipos

#### `ExtraSourceBreakdown`

```typescript
/**
 * Desglose de las fuentes que componen el aporte extra de un mes.
 * Invariante: sum(all fields) = totalExtra del mes
 */
type ExtraSourceBreakdown = {
  /** Sobrante neto base del mes (ingresos - gastos fijos/variables/ocio) */
  fromBaseSurplus: Cents;
  
  /** Incremento salarial respecto al mes anterior (si cambió snapshot) */
  fromSalaryIncrease: Cents;
  
  /** Reducción de gastos fijos/variables respecto al mes anterior */
  fromExpenseReduction: Cents;
  
  /** Cuotas liberadas de deudas ya liquidadas (efecto cascada) */
  fromReleasedQuotas: Cents;
  
  /** Cuota de aporte al FE redirigida (cuando FE completo) */
  fromEmergencyFundQuota: Cents;
  
  /** Exceso puntual al llenar el FE en el mes actual */
  fromEmergencyOverflow: Cents;
};
```

#### `PortfolioMonthlyDetail` extendido

```typescript
type PortfolioMonthlyDetail = {
  // ... campos existentes ...
  totalExtraPaid: Cents;
  
  /** NUEVO: Desglose de fuentes del extra aplicado */
  extraSources: ExtraSourceBreakdown;
};
```

#### `FinancialSnapshotChange` (para modelar cambios temporales)

```typescript
/**
 * Representa un cambio en el contexto financiero del usuario a partir de un mes concreto.
 * Permite modelar incrementos salariales, reducciones de gastos, etc.
 */
type FinancialSnapshotChange = {
  /** Mes a partir del cual aplica el cambio (inclusive) */
  effectiveFromMonth: YearMonth;
  
  /** Nuevo salario neto mensual (si cambió; undefined = sin cambio) */
  netIncomeCents?: Cents;
  
  /** Nuevos gastos fijos mensuales (si cambiaron; undefined = sin cambio) */
  fixedExpensesCents?: Cents;
  
  /** Nuevos gastos variables mensuales (si cambiaron; undefined = sin cambio) */
  variableExpensesCents?: Cents;
};

/**
 * Contexto financiero por deuda (o fase del plan).
 * Permite que cada deuda tenga su propio snapshot o cambios acumulados.
 */
type DebtPhaseContext = {
  /** ID de la deuda asociada */
  debtId: string;
  
  /** Cambios financieros que aplican durante esta fase */
  snapshotChanges?: FinancialSnapshotChange[];
  
  /** Target de fondo de emergencia para esta fase */
  targetEmergencyFundCents: Cents;
  
  /** Estrategia de reparto FE/deuda para esta fase */
  strategy: 'emergency_first' | 'balanced' | 'goal_first';
};
```

---

### 2.2 Cambios en el Motor (`finance-engine.ts`)

#### A. Función auxiliar: `computeExtraSourceBreakdown`

```typescript
/**
 * Calcula el desglose de fuentes del extra disponible para el mes actual.
 * 
 * @param currentSnapshot - Snapshot financiero del mes actual
 * @param previousSnapshot - Snapshot del mes anterior (para detectar cambios)
 * @param debtBudgetLeftover - Cuotas liberadas de deudas liquidadas
 * @param emergencyData - Estado del FE (isFull, overflow, quotaToRedirect)
 * @param accumulatedUnspentExtra - Extra acumulado de meses previos
 * @param effortFactor - Factor de esfuerzo aplicado al sobrante (si FE no completo)
 * 
 * @returns Breakdown con cada fuente en céntimos
 */
function computeExtraSourceBreakdown(
  currentSnapshot: FinancialSnapshot,
  previousSnapshot: FinancialSnapshot | null,
  debtBudgetLeftover: Cents,
  emergencyData: {
    isFull: boolean;
    overflow: Cents;
    quotaToRedirect: Cents; // alreadySavingInExpenses
  },
  accumulatedUnspentExtra: Cents,
  effortFactor: number
): ExtraSourceBreakdown {
  // 1. Base surplus del mes actual
  const householdSurplus = asCents(
    currentSnapshot.netIncomeCents -
    currentSnapshot.fixedExpensesCents -
    currentSnapshot.variableExpensesCents -
    currentSnapshot.minimumLeisureCents
  );

  // 2. Detectar cambios respecto al mes anterior
  let fromSalaryIncrease: Cents = 0;
  let fromExpenseReduction: Cents = 0;
  
  if (previousSnapshot) {
    const incomeDiff = currentSnapshot.netIncomeCents - previousSnapshot.netIncomeCents;
    if (incomeDiff > 0) {
      fromSalaryIncrease = asCents(incomeDiff);
    }
    
    const expenseReduction = 
      (previousSnapshot.fixedExpensesCents + previousSnapshot.variableExpensesCents) -
      (currentSnapshot.fixedExpensesCents + currentSnapshot.variableExpensesCents);
    if (expenseReduction > 0) {
      fromExpenseReduction = asCents(expenseReduction);
    }
  }

  // 3. Calcular base surplus ajustado (sin contar incrementos/reducciones)
  const adjustedBaseSurplus = asCents(
    householdSurplus - fromSalaryIncrease - fromExpenseReduction
  );

  // 4. Aplicar effort factor si FE no está completo
  const fromBaseSurplus = emergencyData.isFull
    ? adjustedBaseSurplus
    : asCents(Math.round(adjustedBaseSurplus * effortFactor));

  // 5. Construir breakdown
  return {
    fromBaseSurplus,
    fromSalaryIncrease,
    fromExpenseReduction,
    fromReleasedQuotas: debtBudgetLeftover,
    fromEmergencyFundQuota: emergencyData.isFull ? emergencyData.quotaToRedirect : 0,
    fromEmergencyOverflow: emergencyData.overflow,
  };
}
```

#### B. Integrar en `calculateDebtPortfolio`

**Ubicación:** Dentro del bucle mensual, **antes** de calcular `extraAvailableForDebts`.

```typescript
// ANTES (líneas ~319-324):
if (isFundFull) {
  extraAvailableForDebts = householdSurplus + debtBudgetLeftover + alreadySavingInExpenses + accumulatedUnspentExtra;
} else {
  extraAvailableForDebts = householdSurplus * effortFactor + debtBudgetLeftover + emergencyOverflow + accumulatedUnspentExtra;
}

// DESPUÉS:
// 1. Computar breakdown
const extraBreakdown = computeExtraSourceBreakdown(
  currentSnapshot,
  previousSnapshot, // null en mes 1
  debtBudgetLeftover,
  {
    isFull: isFundFull,
    overflow: emergencyOverflow,
    quotaToRedirect: alreadySavingInExpenses
  },
  accumulatedUnspentExtra,
  debtEffortFactor
);

// 2. Validar invariante de conservación
const totalFromSources = 
  extraBreakdown.fromBaseSurplus +
  extraBreakdown.fromSalaryIncrease +
  extraBreakdown.fromExpenseReduction +
  extraBreakdown.fromReleasedQuotas +
  extraBreakdown.fromEmergencyFundQuota +
  extraBreakdown.fromEmergencyOverflow;

// 3. Usar total como extraAvailableForDebts
extraAvailableForDebts = asCents(totalFromSources + accumulatedUnspentExtra);

// 4. Incluir en el timeline
timeline.push({
  // ... campos existentes ...
  totalExtraPaid: extraApplied,
  extraSources: extraBreakdown,
});
```

**Invariante crítico:**

```typescript
assert(
  extraBreakdown.fromBaseSurplus +
  extraBreakdown.fromSalaryIncrease +
  extraBreakdown.fromExpenseReduction +
  extraBreakdown.fromReleasedQuotas +
  extraBreakdown.fromEmergencyFundQuota +
  extraBreakdown.fromEmergencyOverflow
  === extraAvailableForDebts - accumulatedUnspentExtra
);
```

---

### 2.3 Modelado de Cambios de Snapshot por Fase

Para soportar incrementos salariales y reducciones de gastos asociados a una deuda concreta:

#### Opción A: `snapshotChanges` en `Goal`

Añadir al tipo `Goal`:

```typescript
type Goal = {
  // ... campos existentes ...
  
  /** NUEVO: Cambios financieros que aplican al entrar en esta deuda */
  snapshotChanges?: FinancialSnapshotChange;
};
```

**Flujo en el motor:**

1. Al activar una deuda (por `startDate` o por prioridad), aplicar `goal.snapshotChanges` al snapshot actual.
2. Mantener un `currentSnapshot` y un `previousSnapshot` en el bucle mensual.
3. La función `computeExtraSourceBreakdown` detecta diferencias entre `currentSnapshot` y `previousSnapshot`.

#### Opción B: Array de `DebtPhaseContext`

Pasar a `calculateDebtPortfolio` un array de contextos por fase:

```typescript
function calculateDebtPortfolio(
  snapshot: FinancialSnapshot,
  debts: Goal[],
  strategy: StrategyType,
  phaseContexts: DebtPhaseContext[] // NUEVO
): PortfolioPlanResult
```

**Ventaja:** Más explícito; permite múltiples cambios dentro de una misma deuda.

**Desventaja:** Mayor complejidad en el modelo de datos.

**Recomendación:** Empezar con **Opción A** (más simple); migrar a B si se requieren múltiples cambios por fase.

---

### 2.4 Cambios en UI (`roadmap/page.tsx`)

#### A. Componente `ExtraSourceTooltip`

```tsx
type ExtraSourceTooltipProps = {
  sources: ExtraSourceBreakdown;
  totalExtra: Cents;
};

function ExtraSourceTooltip({ sources, totalExtra }: ExtraSourceTooltipProps) {
  const formatCents = (cents: Cents) => `${(cents / 100).toFixed(2)}€`;
  
  const items = [
    { label: 'Sobrante neto base', value: sources.fromBaseSurplus },
    { label: 'Cuotas liberadas', value: sources.fromReleasedQuotas },
    { label: 'Cuota FE redirigida', value: sources.fromEmergencyFundQuota },
    { label: 'Incremento salarial', value: sources.fromSalaryIncrease },
    { label: 'Reducción de gastos', value: sources.fromExpenseReduction },
    { label: 'Exceso al llenar FE', value: sources.fromEmergencyOverflow },
  ].filter(item => item.value > 0); // Solo mostrar fuentes con valor
  
  return (
    <div className="p-3 space-y-2 text-sm">
      <div className="font-semibold border-b pb-1">
        Procedencia del Extra: {formatCents(totalExtra)}
      </div>
      {items.map(({ label, value }) => (
        <div key={label} className="flex justify-between">
          <span className="text-gray-600">{label}:</span>
          <span className="font-medium">{formatCents(value)}</span>
        </div>
      ))}
    </div>
  );
}
```

#### B. Integración en `ExpandableRow`

En la columna "Extra":

```tsx
<Tooltip>
  <TooltipTrigger>
    <span className="cursor-help underline decoration-dotted">
      {formatCurrency(month.totalExtraPaid)}
    </span>
  </TooltipTrigger>
  <TooltipContent>
    <ExtraSourceTooltip 
      sources={month.extraSources} 
      totalExtra={month.totalExtraPaid} 
    />
  </TooltipContent>
</Tooltip>
```

**Alternativa:** Botón expandible para panel lateral con gráfico de barras apiladas (fase futura).

---

## 3. Casos Edge y Validaciones

| Caso | Comportamiento esperado |
|------|------------------------|
| **TIN = 0%** | `fromReleasedQuotas` incluye la cuota completa (sin intereses) al liquidar. |
| **FE completo desde mes 1** | `fromEmergencyFundQuota` = cuota base del FE desde mes 1. |
| **Sin deudas activas en mes N** | `extraAvailableForDebts` se acumula en `accumulatedUnspentExtra`; breakdown muestra fuentes pero extra aplicado = 0. |
| **Incremento salarial negativo** | `fromSalaryIncrease` = 0; la reducción de ingresos afecta `householdSurplus` directamente. |
| **Reducción de gastos negativa** | `fromExpenseReduction` = 0; el aumento de gastos reduce `householdSurplus`. |
| **Suma de fuentes ≠ totalExtra** | Error de programación → lanzar assertion en desarrollo; en producción, registrar warning interno. |

---

## 4. Invariantes de Conservación

### Invariante 1: Suma de fuentes = Total extra disponible

```typescript
extraBreakdown.fromBaseSurplus +
extraBreakdown.fromSalaryIncrease +
extraBreakdown.fromExpenseReduction +
extraBreakdown.fromReleasedQuotas +
extraBreakdown.fromEmergencyFundQuota +
extraBreakdown.fromEmergencyOverflow
=== extraAvailableForDebts - accumulatedUnspentExtra
```

### Invariante 2: No inventar dinero

Cada fuente debe tener origen trazable:

- `fromBaseSurplus` ≤ `householdSurplus` (ajustado por effort factor)
- `fromReleasedQuotas` = suma de cuotas de deudas liquidadas hasta el mes anterior
- `fromEmergencyFundQuota` = cuota base al FE solo si `isFundFull`
- `fromEmergencyOverflow` = exceso calculado al llenar FE ese mes

### Invariante 3: Fuentes mutuamente excluyentes

Un mismo céntimo no puede aparecer en dos fuentes distintas.

---

## 5. Plan de Implementación (Fases)

### Fase 1: Tipos y Modelo de Datos

| # | Archivo | Tarea | Verificación |
|---|---------|-------|--------------|
| 1.1 | `src/lib/types.ts` | Crear `ExtraSourceBreakdown`, `FinancialSnapshotChange`, extender `PortfolioMonthlyDetail`. | Compilación sin errores. |
| 1.2 | `src/lib/types.ts` | Añadir `snapshotChanges?: FinancialSnapshotChange` a `Goal`. | Tipos actualizados. |

### Fase 2: Motor - Función de Breakdown

| # | Archivo | Tarea | Verificación |
|---|---------|-------|--------------|
| 2.1 | `src/lib/finance-engine.ts` | Implementar `computeExtraSourceBreakdown` sin integrar. | Unit test: inputs fijos → outputs esperados. |
| 2.2 | `src/lib/finance-engine.ts` | Añadir lógica de diff entre `currentSnapshot` y `previousSnapshot`. | Test: incremento salarial de 100€ → `fromSalaryIncrease = 10000` (cents). |

### Fase 3: Motor - Integración en Bucle Mensual

| # | Archivo | Tarea | Verificación |
|---|---------|-------|--------------|
| 3.1 | `src/lib/finance-engine.ts` | Refactorizar bucle de `calculateDebtPortfolio`: llamar a `computeExtraSourceBreakdown` antes de calcular `extraAvailableForDebts`. | Invariante 1 se cumple en todos los meses. |
| 3.2 | `src/lib/finance-engine.ts` | Incluir `extraSources` en cada `timeline.push()`. | Timeline incluye breakdown por mes. |
| 3.3 | `src/lib/finance-engine.ts` | Validar que `totalFromSources === extraAvailableForDebts - accumulatedUnspentExtra`. | Assertion no falla en test suite. |

### Fase 4: UI - Tooltip de Desglose

| # | Archivo | Tarea | Verificación |
|---|---------|-------|--------------|
| 4.1 | `src/app/roadmap/page.tsx` | Crear componente `ExtraSourceTooltip`. | Renderizado correcto con datos mock. |
| 4.2 | `src/app/roadmap/page.tsx` | Integrar tooltip en columna "Extra" de `ExpandableRow`. | Hover sobre cifra muestra desglose. |
| 4.3 | `src/app/roadmap/page.tsx` | Filtrar fuentes con valor = 0 en el tooltip. | Solo se muestran fuentes activas. |

### Fase 5: Soporte de Cambios de Snapshot (Opcional - MVP)

| # | Archivo | Tarea | Verificación |
|---|---------|-------|--------------|
| 5.1 | `src/lib/finance-engine.ts` | Detectar cambios en `Goal.snapshotChanges` al activar una deuda. | Snapshot se actualiza en el mes correcto. |
| 5.2 | `src/lib/finance-engine.ts` | Aplicar cambios de snapshot en bucle mensual. | `previousSnapshot` y `currentSnapshot` reflejan cambios. |
| 5.3 | `src/app/onboarding/page.tsx` | Añadir UI para indicar "¿Tu salario cambiará al entrar en esta deuda?". | Usuario puede indicar cambio salarial. |

### Fase 6: Tests y Documentación

| # | Archivo | Tarea | Verificación |
|---|---------|-------|--------------|
| 6.1 | `tests/finance-engine.test.ts` | Test: 2 deudas, cascada con cuota liberada → `fromReleasedQuotas` correcto. | Test pasa. |
| 6.2 | `tests/finance-engine.test.ts` | Test: FE se llena en mes 5 → `fromEmergencyOverflow` > 0 ese mes. | Test pasa. |
| 6.3 | `tests/finance-engine.test.ts` | Test: Incremento salarial en deuda 2 → `fromSalaryIncrease` desde mes de activación. | Test pasa. |
| 6.4 | `docs/` | Actualizar `analisis-portafolio-deudas.md` con referencia a tracking de fuentes. | Documentación coherente. |

---

## 6. Preguntas Abiertas y Decisiones Pendientes

| # | Pregunta | Opciones | Decisión Recomendada |
|---|----------|----------|---------------------|
| Q1 | ¿Trackear extra **sin usar** (cuando no hay deudas activas)? | (A) Solo trackear extra aplicado (B) Trackear ambos | **(A)** - Más simple para MVP; B en fase futura. |
| Q2 | ¿Modelar cambios de snapshot con array de `FinancialSnapshotChange` o un solo cambio por deuda? | (A) Un cambio por deuda (B) Array de cambios | **(A)** - Suficiente para caso de uso actual. |
| Q3 | ¿Mostrar breakdown solo en detalle mensual o también en resumen agregado? | (A) Solo mensual (B) Mensual + agregado | **(A)** - Resumen agregado puede ser confuso ("€X de cuotas liberadas en total" no es útil si varió por mes). |
| Q4 | ¿Persistir breakdown en Firestore o solo calcularlo en runtime? | (A) Solo runtime (B) Persistir | **(A)** - Es estado derivado; recalcular siempre. |
| Q5 | ¿Validar invariantes con assertion o con Result Pattern? | (A) Assertion (desarrollo) (B) Result Pattern (producción) | **(A)** en desarrollo; si persiste en producción → logging silencioso (no bloquear UX). |

---

## 7. Performance y Complejidad

### Complejidad Computacional

- **Antes:** O(meses × deudas)
- **Después:** O(meses × deudas) + O(meses) para diff de snapshots

**Impacto:** Negligible; solo añade operaciones de asignación y sumas por mes.

### Complejidad de Código

| Aspecto | Evaluación |
|---------|-----------|
| **Tipos nuevos** | +3 interfaces (bajo) |
| **Lógica de motor** | +1 función auxiliar, refactor de 10-15 líneas (medio) |
| **UI** | +1 componente tooltip (bajo) |
| **Tests** | +5 casos de prueba (medio) |

**Total:** Complejidad **MEDIA**. Cambio localizado pero toca núcleo del motor.

---

## 8. Migración y Retrocompatibilidad

### Datos existentes

Los `PortfolioMonthlyDetail` existentes en memoria (roadmaps ya calculados) **no tendrán** `extraSources`.

**Estrategia:**

1. Hacer `extraSources` opcional en el tipo: `extraSources?: ExtraSourceBreakdown`
2. En UI, si `extraSources` es `undefined`, no mostrar tooltip (o mostrar "Desglose no disponible - recalcular plan")
3. Al recalcular roadmap (cualquier cambio en deudas), el breakdown se genera automáticamente

**No requiere migración de base de datos** (el roadmap no se persiste).

---

## 9. Referencias y Contexto Adicional

- **Documento relacionado:** `docs/analisis-portafolio-deudas.md` (sección 0.2: estrategia por deuda)
- **Código relacionado:** `src/lib/finance-engine.ts` líneas 200-400 (bucle de `calculateDebtPortfolio`)
- **Reglas del proyecto:** `.cursor/rules/cursorrules.mdc` (sección 0.1: representación en céntimos; sección 0.2: invariantes de conservación)

---

## 10. Resumen Ejecutivo

| Aspecto | Detalle |
|---------|---------|
| **Problema** | Falta de trazabilidad del origen del "aporte extra" mensual |
| **Solución** | Nuevo tipo `ExtraSourceBreakdown` con 6 fuentes trackeadas |
| **Impacto en motor** | Refactor de cálculo de `extraAvailableForDebts` para separar fuentes antes de agregar |
| **Impacto en UI** | Tooltip/panel con desglose visual en columna "Extra" |
| **Complejidad** | Media (tipos + lógica de motor + UI) |
| **Invariante crítico** | Σ(fuentes) = totalExtra (conservación) |
| **Casos edge** | Incrementos salariales, reducciones de gastos, FE completo desde mes 1, sin deudas activas |
| **Tests requeridos** | 5+ casos (cascada, overflow FE, cambio salarial, invariante) |
| **Performance** | Sin impacto (mismo O(n × m)) |
| **Retrocompatibilidad** | Campo opcional; no requiere migración |

---

**Estado del documento:** Especificación completa - Listo para implementación  
**Próximo paso:** Fase 1 (Tipos y Modelo de Datos)
