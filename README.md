# FinanciMate - Tu Orientador de Finanzas Personales

FinanciMate es una plataforma de planificación financiera que ayuda a individuos, parejas y grupos a alcanzar sus metas económicas mediante un **motor de cálculo determinista**. No es un rastreador de gastos: actúa como **simulador de decisiones estratégicas** con fechas y cifras concretas.

## 🚀 Propuesta de Valor

Responde a: *"¿Cuánto dinero y tiempo necesito para lograr X meta sin comprometer mi seguridad?"*  
El usuario obtiene un **roadmap maestro** en dos fases: **Fase 1** (eliminación de deudas simultáneas) y **Fase 2** (planes de ahorro en cascada), con herencia de fondo de emergencia y fechas.

---

## 🧠 Estado del Arte: Motor Financiero y Roadmap

### 1. Excedente del Hogar (Household Surplus)

Base de todo el plan. No se usa ingreso bruto, sino capacidad de ahorro neta tras asegurar calidad de vida:

- **Fórmula**: `Ingresos Netos Totales - (Gastos Fijos + Gastos Variables + Ocio Mínimo)`.
- **Ocio Mínimo**: Monto intocable; un plan que elimina el ocio se considera inviable por fatiga.
- Soporta **hogar individual, pareja o grupo**: gastos compartidos y/o por miembro (ingresos, fijos, variables, ocio por persona).

### 2. Fondo de Emergencia (FE)

- **Objetivo (target)**: Configurable; por defecto 3 meses de gastos fijos (compartidos + individuales).
- **Ahorro ya incluido en gastos**: `emergencyFundIncludedInExpenses` para no duplicar.
- **Rentabilidad del ahorro**: TAE configurable (`savingsYieldRate`) aplicada mensualmente al saldo del FE.
- **Estrategias de reparto** (cuando el FE no está lleno):
  - **Seguridad máxima** (`emergency_first`): ~75% excedente al FE, ~25% a la meta.
  - **Equilibrada** (`balanced`): 50% / 50%.
  - **Máximo a meta** (`goal_first`): ~5% al FE, ~95% a la meta.
- **Overflow**: Cuando el FE alcanza el target en un mes, el exceso y la cuota habitual del FE se redirigen íntegramente a la meta (o al siguiente paso del roadmap).

### 3. Plan Single: Deuda (Método Francés) o Ahorro

- **Deuda**:
  - Cuota mínima existente + aporte extra del excedente (según estrategia).
  - Interés mensual: `Capital Vivo × (TIN/12/100)`.
  - **Comisión por amortización anticipada** (% configurable) se deduce del extra antes de aplicarlo al principal.
  - Último pago ajusta principal a 0 (sin residuo).
- **Ahorro**: Mismo excedente y lógica de FE; el “aporte extra” va al objetivo de ahorro (meta) en lugar de amortizar deuda.
- **Reparto en hogar**: Igualitario o proporcional al ingreso neto (`splitMethod`).

### 4. Portafolio de Deudas (Fase 1 del Roadmap)

- **Varias deudas simultáneas** con un único excedente mensual.
- **Priorización**:
  - **Avalancha**: orden por TIN descendente (mayor interés primero).
  - **Bola de nieve**: orden por capital ascendente.
- El extra disponible cada mes se aplica a la deuda prioritaria hasta liquidarla; el resto puede acumularse para el mes siguiente (`accumulatedUnspentExtra`).
- **Cuotas liberadas**: al liquidar una deuda, su cuota mínima se suma al extra disponible (efecto cascada).
- **Fechas de inicio por deuda**: cada meta puede tener `startDate`; solo se considera activa a partir de ese mes.
- **Target de FE por fase**: cada deuda puede definir `targetEmergencyFundAmount` y `strategy` propios para esa fase.
- **Cambios de contexto** (`FinancialSnapshotChange`): por meta se puede definir un cambio efectivo desde un mes (`effectiveFromMonth` en formato YYYY-MM): nuevo salario neto, gastos fijos o variables. El motor etiqueta el extra (incremento salarial, reducción de gastos, etc.) en el desglose de fuentes.

### 5. Desglose de Fuentes del Extra (Tracking)

Para cada mes del portafolio se calcula de dónde sale el “extra” aplicado a deudas:

- **fromBaseSurplus**: parte del sobrante neto base.
- **fromSalaryIncrease**: incremento de ingresos respecto al mes anterior (vía `snapshotChange` o comparación de snapshots).
- **fromExpenseReduction**: reducción de gastos.
- **fromReleasedQuotas**: cuotas liberadas por deudas ya liquidadas.
- **fromEmergencyFundQuota**: cuota que iba al FE y se redirige cuando el FE está lleno.
- **fromEmergencyOverflow**: exceso puntual al llenar el FE en ese mes.

Invariante: la suma de estas fuentes = extra disponible del mes (antes de sumar acumulado de meses previos).

### 6. Roadmap Maestro (`buildMasterRoadmap`)

- **Entrada**: `FinancialSnapshot`, lista de `Goal[]`, priorización de deudas (`avalanche` | `snowball`), estrategia general.
- **Salida**: `Roadmap` con:
  - **debtsPortfolio**: si hay metas tipo deuda → se calcula el portafolio; el FE final y la fecha de fin pasan a ser el punto de partida de la siguiente fase.
  - **savingsPlans**: metas de ahorro (no deuda) se ejecutan **en cascada**: cada plan usa el `emergencyFundAmount` y la fecha de fin del anterior; la siguiente meta empieza el mes siguiente al fin de la anterior.
- **Mes 0**: `originalSnapshot.startDate` es la fecha de inicio del plan maestro (no de una meta concreta). Los cálculos se hacen por mes desde esa fecha.

### 7. Persistencia y Datos

- **Cálculo**: Todo el motor vive en `src/lib/finance-engine.ts`; sin Firebase ni fechas aleatorias dentro del motor. Mismos inputs → mismos outputs.
- **Validación**: Zod en `src/lib/local-storage.ts` para snapshot, goal, roadmap y splitMethod.
- **Almacenamiento**:
  - **Local**: `localStorage` con claves versionadas para snapshot, goal, splitMethod y roadmap (lectura/escritura en onboarding, dashboard y roadmap).
  - **Nube**: Si el usuario está autenticado, el roadmap se guarda en Firestore en `users/{userId}/roadmap/current` (lectura al cargar roadmap, escritura al guardar/actualizar/borrar).

---

## 🗺️ Flujo de la Aplicación

1. **Onboarding** (`/onboarding`): 6 pasos — tipo de hogar, miembros, gastos (fijos, variables, ocio mínimo), fondo de emergencia (actual, target, TAE opcional), meta (deuda o ahorro; si es deuda: cuota, TIN, comisión, estrategia, opcional `snapshotChange`), método de reparto. Al finalizar se guardan snapshot y goal y se redirige al dashboard.
2. **Dashboard** (`/dashboard`): Lee snapshot y goal; calcula los tres escenarios (emergency_first, balanced, goal_first) con `calculateAllFinancialPlans`. El usuario elige una pestaña y pulsa “Añadir al Roadmap”; se llama a `buildMasterRoadmap` con el roadmap existente (si hay) más la nueva meta y se persiste (localStorage + Firestore si hay usuario).
3. **Roadmap** (`/roadmap`): Muestra el roadmap maestro: Fase 1 (bloque de deudas con tabla mensual expandible, desglose por deuda y por fuentes del extra) y Fase 2 (tarjetas de planes de ahorro en cascada). Permite editar metas, borrar metas y borrar todo el roadmap; cada cambio recalcula con `buildMasterRoadmap` y persiste.

---

## 🛠️ Tecnologías

| Área        | Stack actual |
|------------|--------------|
| Framework  | Next.js 15 (App Router), React 19 |
| Base de datos / Auth | Firebase (Firestore, Auth) |
| UI         | Shadcn/UI, Tailwind CSS, Lucide React |
| Fechas     | date-fns (locale `es`) |
| Validación | Zod |
| IA (opcional) | Genkit (flujos en `src/ai/flows/`) |

---

## 🖥️ Desarrollo Local

### Requisitos

- **Node.js** 18+ (recomendado 20 LTS).
- **npm**.

### Pasos

1. **Instalar dependencias**
   ```bash
   npm install
   ```

2. **Modo desarrollo**
   ```bash
   npm run dev
   ```
   App en **http://localhost:9002** (Next.js con Turbopack).

3. **Firebase (Auth + Firestore)**  
   Configuración en `src/firebase/config.ts`. En local puede usarse ese config como fallback sin `.env`.  
   - La app se conecta al proyecto en la nube (Auth y Firestore).  
   - Para otro proyecto en local: ajustar `config.ts` o usar variables de entorno que inyecte App Hosting en producción y leerlas desde `.env.local` en desarrollo.

4. **Comandos útiles**

   | Comando | Descripción |
   |--------|-------------|
   | `npm run dev` | Servidor de desarrollo (puerto 9002) |
   | `npm run build` | Build de producción |
   | `npm run start` | Servir build de producción |
   | `npm run lint` | ESLint |
   | `npm run typecheck` | Comprobación de tipos (TypeScript) |
   | `npm run genkit:dev` | Servidor Genkit para flujos de IA (opcional) |

5. **Genkit / IA (opcional)**  
   Para flujos de IA en `src/ai/`:
   ```bash
   npm run genkit:dev
   ```
   Puede requerir `.env` con `GOOGLE_GENAI_API_KEY` según la configuración de los flows.

---

## 📊 Resultados para el Usuario

1. **Claridad**: Fecha estimada de “libertad financiera” y fin de cada fase/meta.
2. **Seguridad**: Fondo de emergencia explícito y evolución mes a mes.
3. **Optimización**: Comparativa de estrategias (seguridad / equilibrio / máximo a meta) y priorización avalancha vs bola de nieve.
4. **Trazabilidad**: Desglose del extra por fuentes (sobrante, subida salarial, reducción gastos, cuotas liberadas, FE) y por deuda en cada mes.

---

*FinanciMate ofrece cálculos orientativos basados en matemáticas financieras estándar. No sustituye asesoramiento financiero profesional personalizado.*
