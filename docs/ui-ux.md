# UI Spec v1.0 FinanciMate

**Objetivo**: interfaz premium, clara y auditable, con complejidad progresiva.
**Mantra**: *“Destino visible, detalle accesible.”*

## 0) Reglas globales (para que todo huela igual)

Estas reglas se aplican a todas las pantallas.

### 0.1 Layout base

* **Max width contenido**: `max-w-6xl` (o `max-w-5xl` si lo quieres más compacto).
* **Grid principal**:

  * Desktop: sidebar fija + contenido.
  * Móvil: topbar + contenido, navegación inferior opcional (v2).
* **Padding horizontal**:

  * móvil: `px-4`
  * md+: `px-6`
* **Espaciado vertical estándar**:

  * entre secciones: `space-y-6`
  * dentro de cards: `p-4 md:p-6`

### 0.2 Jerarquía visual constante (todas las tabs)

En cualquier pantalla “principal” (Dashboard, Roadmap):

1. **PageHeader** (título + descripción corta + acciones a la derecha)
2. **KPI Row** (2 a 4 KPIs máximo)
3. **Main Panel** (la parte “humana”, lo esencial)
4. **Audit Panel** (acordeones, tablas, sheets, lo detallado)

Esto es clave para que el usuario sienta que todo está “en su sitio”.

### 0.3 Tipografía y números

* Activa `tabular-nums` en todos los importes y porcentajes.
* Números grandes solo para KPIs (no conviertas la app en un bingo).
* Formato siempre consistente:

  * €: `1.234,56 €`
  * Meses: `Feb 2026` o `02/2026` (elige uno y no lo rompas). Recomiendo `Feb 2026` para humano, y `YYYY-MM` para debug en tooltip.

### 0.4 Semántica de color (sin circo)

* **Primario**: acciones (botones y enlaces).
* **Verde**: alcanzado / OK.
* **Ámbar**: avisos de seguridad (FE bajo, riesgo).
* **Rojo**: deuda activa (con moderación), acciones destructivas.
* **Azul suave/cian**: FE (seguridad).

En UI, el color apoya, no explica. La explicación la da el texto.

---

# 1) Design tokens y estilo (Tailwind + shadcn)

Si haces esto bien, lo demás cae por gravedad.

## 1.1 Tokens recomendados

**Radio**

* Cards y contenedores: `rounded-2xl`
* Inputs/buttons: `rounded-xl` (si te gusta) o default shadcn

**Sombras**

* Cards: `shadow-sm` (nada de sombras a lo Marvel)
* Hover card: `hover:shadow-md` suave

**Bordes**

* `border-border/60` en cards grandes
* `border-border/40` en separadores

**Altura de botones**

* Principal: `h-10` o `h-11`
* Compacto: `h-9`

## 1.2 Componentes base shadcn a instalar (mínimo)

* `button`, `card`, `badge`, `tabs`, `table`, `tooltip`, `accordion`, `sheet`, `dialog`, `alert-dialog`, `separator`, `progress`, `dropdown-menu`, `toast/sonner` (si lo usas)

---

# 2) Componentes UI “core” (con especificación)

Estos son los ladrillos que te dan consistencia.

## 2.1 AppShell

**Uso**: Dashboard, Roadmap, Settings
**No usar**: Onboarding (para no distraer)

**Estructura**

* `Sidebar` (desktop)
* `Topbar` (siempre)
* `Main` (contenido)

**Sidebar items**

* Dashboard
* Roadmap
* Ajustes (v1 simple)

**Topbar contenido**

* Izquierda: breadcrumb opcional (v2)
* Centro: nada (respira)
* Derecha:

  * `SaveStatusPill` (Local / Nube / Pendiente)
  * `UserMenu` si auth existe

**Estados**

* Mobile: sidebar se convierte en `Sheet` (hamburguesa)

**Done cuando**

* Navegas entre tabs sin cambios de layout bruscos.
* Topbar y espaciados se sienten idénticos siempre.

---

## 2.2 PageHeader

**Props**

* `title: string`
* `subtitle?: string`
* `actions?: ReactNode`

**Comportamiento**

* En móvil, acciones pasan debajo a la derecha si no caben.

**Copy recomendada**

* Dashboard title: “Dashboard”
* Subtitle: “Compara estrategias y añade metas a tu roadmap.”
* Roadmap title: “Roadmap”
* Subtitle: “Tu plan maestro, con detalle auditable mes a mes.”

---

## 2.3 KPIStat Card

**Props**

* `label`
* `value` (string formateado)
* `hint?: string` (tooltip “de dónde sale”)
* `tone?: neutral|good|warn|bad|info`
* `icon?: LucideIcon`

**Reglas**

* Máximo 4 en una fila.
* En móvil 2 por fila.

**KPIs estándar (Dashboard y Roadmap)**

1. **Fecha fin estimada**
2. **Aporte mensual a meta** (o extra aplicado)
3. **FE** (X € / target o “meses cubiertos”)
4. **Riesgo** (bajo/medio/alto) opcional v2

---

## 2.4 StrategySelector (Tabs o Segmented)

**Opciones**

* Seguridad (emergency_first)
* Equilibrio (balanced)
* Máximo a meta (goal_first)

**Contenido adicional**

* Debajo, un `StrategyTradeoffCard` (2 líneas)

  * Ejemplo:

    * Seguridad: “Prioriza estabilizar tu FE antes de apretar la meta.”
    * Máximo a meta: “Recortas seguridad para llegar antes. Úsalo si tu FE ya está sano.”

---

## 2.5 AuditAccordion

**Uso**: mostrar detalles sin saturar

* Secciones típicas:

  * “Desglose mensual”
  * “¿De dónde sale el extra?”
  * “Fórmulas y supuestos”

---

## 2.6 ExpandableMonthTable

**Uso**: Roadmap Fase 1 (deudas), y opcional en fase ahorro

**Fila colapsada (mínimo)**

* Mes
* Extra aplicado
* Aporte FE
* Principal objetivo de ese mes (deuda prioritaria o meta)
* Capital vivo total restante (si deuda)

**Fila expandida**

* Subtabla “Por deuda” (si fase deudas)
* Panel “Fuentes del extra” (barras + totales)

**Regla UX crítica**

* Por defecto muestra 12 meses, con botón “Ver todo”.
* En móvil, la tabla debe ser `overflow-x-auto` y con columnas mínimas.

---

## 2.7 SourceBreakdown (Fuentes del extra)

**Formato**

* Lista con:

  * etiqueta humana
  * importe
  * mini barra proporcional
* Total al final

**Mapeo UI**

* Sobrante base
* Subida salarial
* Reducción de gastos
* Cuotas liberadas
* Cuota del FE redirigida
* Exceso al completar FE

---

## 2.8 SaveStatusPill

**Estados**

* “Local” (si no auth)
* “Sincronizado” (si auth y ok)
* “Pendiente” (si cambios sin guardar)
* “Error” (si fallo persistencia)

**Regla**

* Debe verse en Dashboard y Roadmap siempre.

---

# 3) Pantallas (spec exacta)

## 3.1 Onboarding `/onboarding`

**Objetivo**: terminar en 3 a 6 minutos sin fatiga.

### Layout

* Sin AppShell.
* Contenedor centrado `max-w-3xl`.
* Arriba:

  * Título “Configura tu base”
  * Subtítulo “Esto define tu excedente y la seguridad del plan.”
* Debajo:

  * Stepper (vertical en desktop, horizontal en móvil)
* Columna derecha (desktop) o bloque inferior (móvil):

  * `LiveSummaryCard` (resumen vivo)

### Estructura por paso (los 6)

1. Tipo de hogar + miembros
2. Ingresos netos (por miembro si aplica)
3. Gastos (fijos, variables, ocio mínimo)
4. FE (actual, target, TAE opcional, estrategia reparto si aplica)
5. Meta (deuda o ahorro, con modo Simple/Avanzado)
6. Método de reparto (`splitMethod`)

### Componentes exactos

* `Card` por paso, con `Form` + `Button`.
* `Button` primary: “Continuar”
* `Button` secondary: “Guardar y salir”
* `Tooltip` en ocio mínimo y FE.

### Estados y reglas

* Autoguardado por paso a localStorage.
* Al volver, rehidrata.
* Validación inline (Zod).
* Al final:

  * CTA final: “Ir al Dashboard”
  * toast: “Base guardada.”

**Done cuando**

* Puedes cerrar pestaña en el paso 4, volver y seguir sin perder nada.
* El resumen vivo cambia al editar inputs.

---

## 3.2 Dashboard `/dashboard`

**Objetivo**: comparar estrategias y añadir meta al roadmap.

### Layout fijo

1. `PageHeader`

   * Actions: `Button` “Editar base” + `Button` ghost “Nueva meta” (si lo separas)
2. `KPIRow` (3 KPIs)
3. `StrategySelector`
4. `MainPanel` (visual principal)
5. `AuditAccordion` (detalle mensual)

### KPIRow (Dashboard)

* Fecha fin (según estrategia seleccionada)
* Aporte mensual a meta (promedio o primer mes, decide 1)
* FE: `actual/target` + porcentaje

### MainPanel (Dashboard)

**Opción A (sin gráfica al principio, rápida y limpia)**

* `Card` “Progreso”

  * `Progress` FE
  * `Progress` Meta
  * “Hitos” (3 bullets):

    * “FE completo en …”
    * “Deuda X liquidada en …” (si aplica)
    * “Meta completada en …”

**Opción B (con gráfica simple)**

* Una gráfica línea para FE y meta (si ya tienes Recharts). Si no, no pasa nada, primero clava UX.

### CTA principal

Botón grande al final del MainPanel:

* **“Añadir al Roadmap”**
  Debajo, microcopy:
* “Esto recalcula tu plan maestro y lo guarda.”

### AuditAccordion (Dashboard)

* “Ver desglose mensual”

  * tabla 12 meses
* “Supuestos”

  * snapshot base y parámetros (TAE, strategy)

**Done cuando**

* Cambiar estrategia cambia KPIs y contenido sin “saltos” de layout.
* El botón “Añadir” hace persistencia + feedback (toast + SaveStatus cambia).

---

## 3.3 Roadmap `/roadmap`

**Objetivo**: entender el plan maestro de un vistazo, poder auditar por mes.

### Layout fijo

1. `PageHeader`

   * Actions:

     * “Añadir meta” (si lo soportas desde aquí)
     * `Dropdown` “Exportar” (disabled v1 si aún no)
     * `Button` destructivo “Borrar roadmap” (con AlertDialog)
2. `KPIRow` (4 KPIs)
3. Bloque Fase 1 (si hay deudas)
4. Bloque Fase 2 (si hay ahorro en cascada)
5. Panel de auditoría (tablas, expandibles)

### KPIRow (Roadmap)

* Fin total plan maestro
* FE al final de Fase 1 (o FE actual si no hay deudas)
* Nº metas activas
* Estrategia global (badge) o priorización (Avalancha/Bola de nieve)

---

### Bloque Fase 1: Deudas

**Sección header**

* Título “Fase 1: Eliminación de deudas”
* Subtítulo “Extra aplicado con efecto cascada, con trazabilidad por mes.”

**Sub-bloque A: Resumen**

* `Card` con:

  * Prioridad: Avalancha/Bola de nieve (Badge)
  * Deudas activas: N
  * Fecha fin fase
  * Nota: “Las cuotas liberadas alimentan el extra.”

**Sub-bloque B: DebtCards**
Lista de cards (1 por deuda):

* Nombre
* Capital actual
* Cuota mínima
* TIN
* Estado: Activa/Liquidada
* Acción: “Ver detalle” (abre `Sheet` con su mini calendario y datos)

**Sub-bloque C: Monthly Table (la buena)**

* `ExpandableMonthTable` con:

  * 12 meses por defecto
  * Expand por fila
* Al expand:

  * Subtabla por deuda (cuota mínima, extra, interés, principal)
  * `SourceBreakdown` (fuentes del extra)

---

### Bloque Fase 2: Ahorro en cascada

**Sección header**

* Título “Fase 2: Ahorro en cascada”

**Cards en pipeline**
Cada meta de ahorro es una card con:

* Nombre meta
* Inicio, fin
* Aporte mensual
* FE heredado (badge)
* CTA: “Ver detalle” (Sheet con tabla resumida)

---

### Acciones de edición en Roadmap

* Editar meta:

  * Modal/Sheet con formulario
  * Antes de guardar, muestra `ImpactPreview`:

    * “Antes: fin …”
    * “Después: fin …”
* Borrar meta:

  * AlertDialog con impacto
* Borrar todo:

  * Confirmación fuerte

**Done cuando**

* Un usuario entiende “qué pasa” en 20 segundos mirando arriba.
* Un usuario puede auditar “el mes X” en 2 clicks.

---

# 4) Estados universales (para que no se rompa el aura)

## 4.1 Loading

* Skeleton para KPI cards
* Skeleton para tabla mensual

## 4.2 Empty states

**Sin snapshot/goals**

* Card grande:

  * “Aún no has configurado tu base”
  * CTA: “Empezar onboarding”

**Sin roadmap**

* “Aún no tienes roadmap maestro”
* CTA: “Ir al Dashboard”

## 4.3 Error

* `Alert` en la parte superior del contenido:

  * “No se pudo guardar en la nube”
  * Botón “Reintentar”

---

# 5) Copy UI (texto listo para pegar)

### Estrategias

* Seguridad: “Prioriza completar el FE antes de acelerar la meta.”
* Equilibrio: “Reparto estable entre seguridad y avance.”
* Máximo a meta: “Llegas antes, pero tu FE crece más lento.”

### FE

* “Fondo de emergencia”
* “Objetivo”
* “Cubres X meses de gastos fijos” (si lo calculas)

### Fuentes del extra

* “Sobrante base”
* “Subida salarial”
* “Reducción de gastos”
* “Cuotas liberadas”
* “Cuota del FE redirigida”
* “Exceso al completar FE”

---

# 6) Implementación paso a paso (orden recomendado)

Esto es lo que te permite construir sin romper consistencia.

## Paso 1: AppShell + navegación

**Tareas**

* Crear `AppShell` (Sidebar + Topbar + Main)
* Integrar rutas Dashboard y Roadmap dentro del shell
* Montar `SaveStatusPill` (aunque sea mock)

**Done**

* Navegas sin saltos, header consistente.

---

## Paso 2: Sistema de PageHeader + KPIStat

**Tareas**

* `PageHeader`
* `KPIStat`
* `KPIRow` responsive

**Done**

* Dashboard y Roadmap comparten exactamente la misma cabecera visual.

---

## Paso 3: StrategySelector + TradeoffCard

**Tareas**

* Tabs/segmented para estrategias
* Card con microcopy y cambios suaves

**Done**

* Cambias estrategia y el layout no “baila”.

---

## Paso 4: Dashboard layout completo (sin tabla aún)

**Tareas**

* Montar estructura completa de Dashboard:

  * Header, KPIs, selector, panel principal, CTA “Añadir”
* Conectar a `calculateAllFinancialPlans`

**Done**

* Se ve “producto” aunque falten auditorías.

---

## Paso 5: AuditAccordion + tabla 12 meses (Dashboard)

**Tareas**

* `AuditAccordion`
* `SimpleMonthTable` (sin expandibles por ahora)
* Botón “Ver todo”

**Done**

* El usuario puede validar que no es magia.

---

## Paso 6: Roadmap layout y fases (sin expandibles aún)

**Tareas**

* Sección Fase 1 (resumen + debt cards)
* Sección Fase 2 (pipeline cards)
* Acciones editar/borrar (aunque sea placeholder)

**Done**

* Roadmap comunica el plan maestro con claridad.

---

## Paso 7: ExpandableMonthTable + SourceBreakdown (Roadmap)

**Tareas**

* Tabla mensual expandible
* Expand muestra:

  * por deuda
  * fuentes del extra
* Sheet “Ver detalle” por deuda

**Done**

* Auditoría real por mes, sin perderse.

---

## Paso 8: Edición y “ImpactPreview”

**Tareas**

* Editar meta en modal/sheet
* Previsualizar cambio en fecha fin y FE final
* Persistir, toast, estado de guardado

**Done**

* Cambiar metas no da miedo.

---

# 7) Criterios de consistencia (para que todas las tabs sean “familia”)

En cada tab principal, asegúrate de:

* Mismo `PageHeader` (tamaño, padding, acciones).
* Mismo `KPIRow` (componentes, alturas, alineación).
* Misma estructura “Humano arriba, Auditoría abajo”.
* Mismo lenguaje (Seguridad, Equilibrio, Máximo a meta).
* Mismos componentes para:

  * confirmaciones destructivas (AlertDialog)
  * detalles (Sheet)
  * explicaciones (Tooltip)

Si algo se repite 2 veces, se convierte en componente. Si se repite 3, es ley.

---

# 8) Entregables prácticos (lo que deberías tener al terminar v1)

1. Dashboard usable y comprensible sin leer documentación.
2. Roadmap con fase 1 y 2 navegables.
3. Tabla mensual expandible con fuentes del extra.
4. Guardado local + nube con estado visible.
5. Onboarding con autoguardado y resumen vivo.