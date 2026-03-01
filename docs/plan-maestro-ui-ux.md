# Plan Maestro – UI/UX FinanciMate (docs/ui-ux.md)

Objetivo: descomponer la especificación `docs/ui-ux.md` en tareas pequeñas, ordenadas y ejecutables. Arquitectura: `/lib` (motor, money, time), `/components` (solo UI), `/services` (Firestore); reglas en `.cursor/rules` (Cents, branded types, Result pattern).

---

## Plan Maestro

**Tareas (en orden recomendado):**

### 1. Design tokens globales y tipografía monetaria
- **Descripción:** Aplicar las reglas de docs/ui-ux.md sección 0 y 1: layout base (max-w-6xl, grid, px-4/px-6, space-y-6), tabular-nums en importes, formato € (1.234,56 €), tokens (rounded-2xl en cards, rounded-xl en inputs, shadow-sm, border-border/60, h-10/h-11 botones). Crear o actualizar un archivo de utilidad de formato de moneda si no existe, y documentar su uso en componentes.
- **Archivos:** `src/app/globals.css`, `tailwind.config.*`, y si aplica `src/lib/money.ts` o `src/lib/format.ts` para formato €; componentes base en `src/components/ui` (card, button, input) solo donde falte aplicar tokens.
- **Criterio de done:** (1) Clases globales/tokens visibles en la app (cards con rounded-2xl, sombra suave). (2) Una función o helper que formatee Cents a "1.234,56 €" con tabular-nums usada en al menos un componente. (3) `npm run build` y lint pasan.
- **Prompt sugerido para Cursor:** "Implementa los design tokens y reglas globales de docs/ui-ux.md (secciones 0 y 1): layout base max-w-6xl, padding responsive, tabular-nums para números, formato de moneda 1.234,56 €, rounded-2xl en cards, shadow-sm, border-border/60, altura de botones h-10/h-11. Añade o actualiza un helper de formato de moneda en /lib si hace falta y úsalo en un componente de ejemplo. No cambies lógica de negocio en /lib/finance-engine ni en /lib/money (solo formato presentación)."

---

### 2. AppShell: componente Sidebar + Topbar + Main
- **Descripción:** Crear el componente AppShell según docs/ui-ux.md §2.1: Sidebar (desktop) con ítems Dashboard, Roadmap, Ajustes; Topbar siempre visible; Main como contenedor del contenido. En móvil la Sidebar se convierte en Sheet (hamburguesa). Sin integrar aún en rutas; componente reutilizable.
- **Archivos:** `src/components/layout/AppShell.tsx` (o `src/components/app-shell/AppShell.tsx`), y opcionalmente `Sidebar.tsx`, `Topbar.tsx`, `Main.tsx` en el mismo directorio si se separan.
- **Criterio de done:** (1) AppShell renderiza Sidebar + Topbar + Main y en viewport móvil muestra botón hamburguesa que abre Sheet con los mismos enlaces. (2) Navegación entre Dashboard/Roadmap/Ajustes funciona dentro del Sheet. (3) Build y lint pasan.
- **Prompt sugerido para Cursor:** "Crea el componente AppShell según docs/ui-ux.md §2.1: Sidebar con enlaces a Dashboard, Roadmap y Ajustes; Topbar siempre visible; Main como área de contenido. En móvil usa Sheet para la navegación (hamburguesa). Usa componentes existentes de src/components/ui (sidebar, sheet, button). No integres aún el AppShell en las rutas de la app; solo el componente exportable."

---

### 3. SaveStatusPill e integración de AppShell en rutas
- **Descripción:** Implementar SaveStatusPill con estados: Local (sin auth), Sincronizado, Pendiente, Error (§2.8). Integrar AppShell en layout o en rutas de Dashboard y Roadmap (y Ajustes si existe), colocando SaveStatusPill en la Topbar derecha. Onboarding debe seguir sin AppShell.
- **Archivos:** `src/components/layout/SaveStatusPill.tsx`, `src/app/(dashboard)/layout.tsx` o rutas individuales `dashboard/page.tsx` y `roadmap/page.tsx`, y si aplica `src/app/layout.tsx` (solo si se usa layout anidado).
- **Criterio de done:** (1) SaveStatusPill muestra uno de los cuatro estados (puede ser mock/context según auth y estado de guardado). (2) Al navegar a /dashboard y /roadmap se ve el mismo AppShell con Topbar y SaveStatusPill. (3) /onboarding no usa AppShell. (4) Build y lint pasan.
- **Prompt sugerido para Cursor:** "Implementa SaveStatusPill (docs/ui-ux.md §2.8) con estados Local, Sincronizado, Pendiente y Error. Integra el AppShell en las rutas Dashboard y Roadmap (layout anidado o wrappers) y coloca SaveStatusPill a la derecha de la Topbar. Onboarding debe quedar fuera del AppShell. Respeta la arquitectura: componentes en /components, sin lógica de negocio en UI."

---

### 4. PageHeader reutilizable
- **Descripción:** Crear componente PageHeader con props title, subtitle opcional, actions (ReactNode). En móvil las acciones pasan debajo a la derecha si no caben. Usar en una página de prueba o en Dashboard para validar.
- **Archivos:** `src/components/layout/PageHeader.tsx` (o `src/components/core/PageHeader.tsx`); opcionalmente `src/app/dashboard/page.tsx` para sustituir el header actual por PageHeader.
- **Criterio de done:** (1) PageHeader muestra título, subtítulo y acciones; en viewport estrecho las acciones se apilan/alinean a la derecha. (2) Usado al menos en Dashboard o Roadmap. (3) Build y lint pasan.
- **Prompt sugerido para Cursor:** "Crea el componente PageHeader según docs/ui-ux.md §2.2: title, subtitle opcional, actions (ReactNode). Comportamiento responsive: en móvil acciones debajo a la derecha. Intégralo en la página Dashboard reemplazando el header actual y usa el copy del doc (título 'Dashboard', subtítulo 'Compara estrategias y añade metas a tu roadmap.')."

---

### 5. KPIStat Card y KPIRow responsive
- **Descripción:** Crear KPIStat con props label, value (string), hint opcional (tooltip), tone (neutral|good|warn|bad|info), icon opcional. Crear KPIRow que muestre 2–4 KPIStat: en móvil 2 por fila, en desktop hasta 4. Aplicar semántica de color del doc (verde OK, ámbar avisos, rojo deuda/destructivo, azul FE).
- **Archivos:** `src/components/core/KPIStat.tsx`, `src/components/core/KPIRow.tsx` (o en `src/components/dashboard/` si se prefiere por pantalla).
- **Criterio de done:** (1) KPIStat muestra label, value, tooltip con hint y tone con color correcto. (2) KPIRow en grid responsive (2 columnas móvil, hasta 4 desktop). (3) Build y lint pasan.
- **Prompt sugerido para Cursor:** "Implementa KPIStat (docs/ui-ux.md §2.3) con label, value, hint (tooltip), tone (neutral|good|warn|bad|info) e icon opcional, y KPIRow responsive (máximo 4 KPIs, 2 por fila en móvil). Usa la semántica de color del doc (verde, ámbar, rojo, azul). No conectes aún a datos reales del motor; se pueden usar valores de ejemplo."

---

### 6. StrategySelector y StrategyTradeoffCard
- **Descripción:** Componente StrategySelector (tabs o segmented) con opciones: Seguridad (emergency_first), Equilibrio (balanced), Máximo a meta (goal_first). Debajo, StrategyTradeoffCard con 2 líneas de microcopy según estrategia (texto del doc §2.4 y §5). Sin conectar aún al estado del Dashboard.
- **Archivos:** `src/components/core/StrategySelector.tsx`, `src/components/core/StrategyTradeoffCard.tsx` (o en `src/components/dashboard/`).
- **Criterio de done:** (1) Al cambiar de pestaña/segmento cambia el texto del TradeoffCard. (2) Layout no “salta”. (3) Build y lint pasan.
- **Prompt sugerido para Cursor:** "Crea StrategySelector (tabs o segmented) con las tres estrategias de docs/ui-ux.md §2.4 (Seguridad, Equilibrio, Máximo a meta) y StrategyTradeoffCard con el microcopy de §5. Al cambiar estrategia solo debe actualizarse el texto de la card; no integres aún con el estado de la página Dashboard."

---

### 7. Dashboard layout completo con PageHeader, KPIRow, StrategySelector y MainPanel
- **Descripción:** Montar la estructura completa del Dashboard (§3.2): PageHeader con acciones "Editar base" y "Nueva meta"; KPIRow con 3 KPIs (fecha fin, aporte mensual a meta, FE actual/target); StrategySelector + TradeoffCard; MainPanel con Card "Progreso" (Progress FE, Progress Meta, 3 hitos: FE completo, deuda X liquidada, meta completada); CTA "Añadir al Roadmap" con microcopy. Conectar a calculateAllFinancialPlans y a la estrategia seleccionada; datos reales en KPIs y progreso.
- **Archivos:** `src/app/dashboard/page.tsx`, `src/components/layout/PageHeader.tsx`, `src/components/core/KPIStat.tsx`, `src/components/core/KPIRow.tsx`, `src/components/core/StrategySelector.tsx`, `src/components/core/StrategyTradeoffCard.tsx`; opcionalmente `src/components/dashboard/MainPanel.tsx` o contenido inline.
- **Criterio de done:** (1) Cambiar estrategia actualiza KPIs y contenido sin saltos de layout. (2) El botón "Añadir al Roadmap" persiste y da feedback (toast y SaveStatus si está conectado). (3) Build y lint pasan.
- **Prompt sugerido para Cursor:** "Monta el Dashboard completo según docs/ui-ux.md §3.2 usando PageHeader, KPIRow (3 KPIs), StrategySelector, StrategyTradeoffCard y MainPanel con Card Progreso (Progress FE, Progress Meta, hitos) y CTA 'Añadir al Roadmap'. Conecta a calculateAllFinancialPlans y al estado de estrategia existente; el botón Añadir debe persistir roadmap y mostrar toast. Respeta Cents y tipos en /lib; solo UI en /components."

---

### 8. AuditAccordion y tabla simple 12 meses (Dashboard)
- **Descripción:** Crear AuditAccordion (§2.5) con secciones "Desglose mensual" y "Supuestos". En "Desglose mensual" incluir una tabla de 12 meses (SimpleMonthTable: mes, columnas relevantes según spec). Botón "Ver todo" para mostrar más meses. Sin filas expandibles aún.
- **Archivos:** `src/components/core/AuditAccordion.tsx`, `src/components/dashboard/SimpleMonthTable.tsx` (o `MonthTable.tsx`), `src/app/dashboard/page.tsx`.
- **Criterio de done:** (1) AuditAccordion abre/cierra secciones. (2) Tabla muestra 12 meses por defecto y "Ver todo" amplía. (3) Sección Supuestos muestra snapshot base y parámetros (TAE, strategy). (4) Build y lint pasan.
- **Prompt sugerido para Cursor:** "Implementa AuditAccordion (docs/ui-ux.md §2.5) con secciones 'Desglose mensual' y 'Supuestos'. En Desglose mensual añade SimpleMonthTable con 12 meses por defecto y botón 'Ver todo'. En Supuestos muestra snapshot base y parámetros (TAE, estrategia). Conecta los datos al resultado de calculateAllFinancialPlans en Dashboard. Sin filas expandibles en esta tarea."

---

### 9. Roadmap: PageHeader, KPIRow (4) y acciones (Añadir, Exportar, Borrar)
- **Descripción:** En la página Roadmap, usar PageHeader con título "Roadmap", subtítulo del doc, y acciones: "Añadir meta", Dropdown "Exportar" (puede estar disabled en v1), Button destructivo "Borrar roadmap" con AlertDialog de confirmación. Añadir KPIRow con 4 KPIs: fin total plan, FE al final Fase 1 (o actual), nº metas activas, estrategia/priorización (badge). Reutilizar KPIStat/KPIRow.
- **Archivos:** `src/app/roadmap/page.tsx`, `src/components/layout/PageHeader.tsx`, `src/components/core/KPIStat.tsx`, `src/components/core/KPIRow.tsx`, `src/components/ui/alert-dialog.tsx`.
- **Criterio de done:** (1) Roadmap muestra PageHeader y 4 KPIs coherentes con datos del roadmap. (2) Borrar roadmap abre AlertDialog y al confirmar ejecuta la lógica existente. (3) Build y lint pasan.
- **Prompt sugerido para Cursor:** "En la página Roadmap aplica PageHeader (título 'Roadmap', subtítulo del doc) y KPIRow con 4 KPIs (fin total, FE fase 1/actual, metas activas, estrategia). Añade acciones: Añadir meta, Exportar (dropdown, puede disabled), Borrar roadmap con AlertDialog. Reutiliza KPIStat/KPIRow y la lógica de borrado existente; no cambies el modelo de datos en /lib."

---

### 10. Roadmap: bloque Fase 1 (resumen + DebtCards)
- **Descripción:** Implementar el bloque Fase 1 (§3.3): título "Fase 1: Eliminación de deudas", subtítulo del doc. Sub-bloque Resumen: Card con prioridad (Avalancha/Bola de nieve Badge), nº deudas activas, fecha fin fase, nota sobre cuotas liberadas. Sub-bloque DebtCards: una Card por deuda con nombre, capital actual, cuota mínima, TIN, estado Activa/Liquidada, acción "Ver detalle" (Sheet placeholder o vacío por ahora).
- **Archivos:** `src/app/roadmap/page.tsx`, posiblemente `src/components/roadmap/DebtCard.tsx` y `src/components/roadmap/Phase1Summary.tsx` si se extraen.
- **Criterio de done:** (1) Si hay deudas se muestra Fase 1 con resumen y lista de DebtCards. (2) "Ver detalle" abre un Sheet (puede estar vacío o con texto placeholder). (3) Build y lint pasan.
- **Prompt sugerido para Cursor:** "Implementa el bloque Fase 1 del Roadmap (docs/ui-ux.md §3.3): sección con título y subtítulo, Card de resumen (prioridad Avalancha/Bola de nieve, deudas activas, fecha fin fase, nota) y DebtCards (una por deuda: nombre, capital, cuota, TIN, estado, botón Ver detalle que abre Sheet). Usa datos de roadmap.debtsPortfolio; el Sheet puede ser placeholder. Componentes en /components/roadmap o inline en page."

---

### 11. Roadmap: bloque Fase 2 (ahorro en cascada)
- **Descripción:** Implementar bloque Fase 2 (§3.3): título "Fase 2: Ahorro en cascada", cards en pipeline (una por meta de ahorro) con nombre, inicio/fin, aporte mensual, FE heredado (badge), CTA "Ver detalle" (Sheet con tabla resumida o placeholder). Usar datos de roadmap.savingsPlans.
- **Archivos:** `src/app/roadmap/page.tsx`, opcionalmente `src/components/roadmap/SavingsPlanCard.tsx`.
- **Criterio de done:** (1) Si hay planes de ahorro se muestra Fase 2 con una card por meta. (2) "Ver detalle" abre Sheet con contenido relevante o placeholder. (3) Build y lint pasan.
- **Prompt sugerido para Cursor:** "Implementa el bloque Fase 2 del Roadmap (docs/ui-ux.md §3.3): título 'Fase 2: Ahorro en cascada', una card por meta con nombre, inicio/fin, aporte mensual, badge FE heredado y 'Ver detalle' que abre Sheet. Usa roadmap.savingsPlans; el Sheet puede mostrar tabla resumida o placeholder."

---

### 12. ExpandableMonthTable (fila colapsada + expandida por deuda)
- **Descripción:** Crear ExpandableMonthTable (§2.6): por defecto 12 meses, botón "Ver todo". Fila colapsada: mes, extra aplicado, aporte FE, principal objetivo del mes, capital vivo restante (si deuda). Fila expandida: subtabla "Por deuda" (cuota mínima, extra, interés, principal por deuda). En móvil tabla con overflow-x-auto y columnas mínimas. Integrar en Roadmap Fase 1.
- **Archivos:** `src/components/roadmap/ExpandableMonthTable.tsx`, `src/app/roadmap/page.tsx`; tipos en `src/lib/types.ts` si hace falta para filas.
- **Criterio de done:** (1) Tabla muestra 12 meses por defecto, "Ver todo" amplía. (2) Expandir fila muestra desglose por deuda. (3) Móvil con scroll horizontal. (4) Build y lint pasan.
- **Prompt sugerido para Cursor:** "Crea ExpandableMonthTable según docs/ui-ux.md §2.6: 12 meses por defecto, botón Ver todo, fila colapsada (mes, extra aplicado, aporte FE, principal objetivo, capital vivo), fila expandida con subtabla por deuda. Integra en Roadmap Fase 1. Responsive: overflow-x-auto en móvil. Usa datos del motor (timeline de debtsPortfolio); no añadas aún SourceBreakdown en la fila expandida."

---

### 13. SourceBreakdown (fuentes del extra)
- **Descripción:** Crear componente SourceBreakdown (§2.7): lista con etiqueta humana, importe y mini barra proporcional por fuente; total al final. Fuentes: Sobrante base, Subida salarial, Reducción de gastos, Cuotas liberadas, Cuota del FE redirigida, Exceso al completar FE. Mapear desde el tipo/desglose que exponga el motor (si existe) o desde estructura definida en types.
- **Archivos:** `src/components/roadmap/SourceBreakdown.tsx`, `src/lib/types.ts` si se añade tipo para desglose de fuentes.
- **Criterio de done:** (1) SourceBreakdown muestra las 6 fuentes con etiquetas del doc (§5), importe y barra proporcional. (2) Muestra total. (3) Acepta datos en formato definido (props); no requiere integración en tabla aún. (4) Build y lint pasan.
- **Prompt sugerido para Cursor:** "Implementa SourceBreakdown (docs/ui-ux.md §2.7): lista con etiqueta, importe y mini barra proporcional para cada fuente del extra (Sobrante base, Subida salarial, Reducción de gastos, Cuotas liberadas, Cuota FE redirigida, Exceso al completar FE), más total. Usa los nombres de §5. Define props para el desglose (p. ej. array de { label, cents }) y respeta Cents en /lib/money para formato. No integres aún en ExpandableMonthTable."

---

### 14. Integrar SourceBreakdown en ExpandableMonthTable y Sheet detalle deuda
- **Descripción:** En la fila expandida de ExpandableMonthTable añadir el panel "Fuentes del extra" usando SourceBreakdown. Completar el Sheet "Ver detalle" de cada deuda (Fase 1) con mini calendario/datos de esa deuda (según datos disponibles en el roadmap). Asegurar que los datos de fuentes del extra se pasen desde el motor o desde la timeline (según lo que exponga el tipo Roadmap/DebtsPortfolio).
- **Archivos:** `src/components/roadmap/ExpandableMonthTable.tsx`, `src/components/roadmap/SourceBreakdown.tsx`, `src/app/roadmap/page.tsx` (o componente Sheet de detalle de deuda).
- **Criterio de done:** (1) Al expandir una fila mensual se ve subtabla por deuda + SourceBreakdown. (2) "Ver detalle" en DebtCard abre Sheet con datos de esa deuda. (3) Build y lint pasan.
- **Prompt sugerido para Cursor:** "Integra SourceBreakdown en la fila expandida de ExpandableMonthTable. Pasa los datos de fuentes del extra desde la timeline/roadmap (usa el desglose si el motor lo expone; si no, define un mapeo desde los campos existentes). Completa el Sheet 'Ver detalle' de cada deuda con los datos disponibles (capital, cuota, fechas, etc.). Respeta Cents y tipos en /lib."

---

### 15. Editar meta: modal/sheet con formulario e ImpactPreview
- **Descripción:** Al editar una meta del roadmap, abrir Modal o Sheet con formulario (campos según tipo de meta). Antes de guardar mostrar ImpactPreview: "Antes: fin …" / "Después: fin …" (y si aplica FE final). Persistir cambios, mostrar toast y actualizar SaveStatus si está conectado.
- **Archivos:** `src/app/roadmap/page.tsx`, `src/components/roadmap/EditGoalSheet.tsx` o similar, `src/components/roadmap/ImpactPreview.tsx`; posible uso de buildMasterRoadmap o equivalente para previsualizar "después".
- **Criterio de done:** (1) Editar meta abre formulario en Sheet/Modal. (2) ImpactPreview muestra fechas antes/después. (3) Guardar persiste, toast y estado de guardado se actualizan. (4) Build y lint pasan.
- **Prompt sugerido para Cursor:** "Implementa la edición de meta en Roadmap (docs/ui-ux.md §3.3): Sheet o Modal con formulario y, antes de guardar, ImpactPreview con 'Antes: fin X' y 'Después: fin Y'. Usa el motor para recalcular 'después' (buildMasterRoadmap o función equivalente) sin persistir hasta confirmar. Al guardar: persistir, toast y actualizar SaveStatus. Respeta Result pattern y Cents en /lib."

---

### 16. Borrar meta con AlertDialog e impacto
- **Descripción:** Al borrar una meta individual mostrar AlertDialog con mensaje de impacto (ej. cambio de fecha fin). Confirmar borrado y persistir; toast y actualizar estado.
- **Archivos:** `src/app/roadmap/page.tsx`, `src/components/ui/alert-dialog.tsx`.
- **Criterio de done:** (1) Borrar meta abre AlertDialog con texto de impacto. (2) Confirmar elimina la meta y persiste. (3) Toast y estado coherentes. (4) Build y lint pasan.
- **Prompt sugerido para Cursor:** "Añade borrado de meta individual en Roadmap con AlertDialog que muestre el impacto (ej. 'La fecha fin pasará de X a Y'). Al confirmar, eliminar la meta del roadmap y persistir; mostrar toast. Reutiliza la lógica existente de actualización del roadmap sin tocar /lib/finance-engine más allá de lo necesario."

---

### 17. Estados de carga: skeletons para KPI y tabla
- **Descripción:** Implementar estados de loading (§4.1): skeleton para KPI cards y skeleton para tabla mensual. Mostrarlos en Dashboard y Roadmap mientras se cargan datos (snapshot/roadmap o resultados del motor).
- **Archivos:** `src/components/ui/skeleton.tsx` (ya existe), `src/app/dashboard/page.tsx`, `src/app/roadmap/page.tsx`; opcionalmente `src/components/core/KPIRowSkeleton.tsx` o `MonthTableSkeleton.tsx`.
- **Criterio de done:** (1) Dashboard muestra skeletons en lugar de KPIs y tabla durante carga. (2) Roadmap muestra skeletons donde corresponda. (3) Build y lint pasan.
- **Prompt sugerido para Cursor:** "Añade estados de carga según docs/ui-ux.md §4.1: skeleton para las KPI cards y para la tabla mensual en Dashboard y Roadmap. Usa el componente Skeleton de shadcn; no cambies la lógica de fetch, solo la UI mientras loading es true."

---

### 18. Empty states: sin snapshot y sin roadmap
- **Descripción:** Empty state cuando no hay snapshot/configuración: Card grande "Aún no has configurado tu base", CTA "Empezar onboarding". Empty state cuando no hay roadmap: "Aún no tienes roadmap maestro", CTA "Ir al Dashboard". Colocar en las rutas correspondientes (onboarding redirect o dashboard para el primero; roadmap para el segundo).
- **Archivos:** `src/app/dashboard/page.tsx`, `src/app/roadmap/page.tsx`; opcionalmente `src/components/core/EmptyState.tsx` reutilizable.
- **Criterio de done:** (1) Sin snapshot se muestra el empty de base y el CTA lleva a onboarding. (2) Sin roadmap se muestra el empty de roadmap y el CTA lleva a dashboard. (3) Build y lint pasan.
- **Prompt sugerido para Cursor:** "Implementa empty states de docs/ui-ux.md §4.2: (1) Sin snapshot/base: card con 'Aún no has configurado tu base' y CTA 'Empezar onboarding'. (2) Sin roadmap: 'Aún no tienes roadmap maestro' y CTA 'Ir al Dashboard'. Colócalos en dashboard y roadmap respectivamente; si ya existe lógica de redirect, mantén la coherencia y muestra el empty solo cuando tenga sentido (ej. usuario en roadmap sin metas)."

---

### 19. Estado de error: Alert + Reintentar
- **Descripción:** En caso de error de carga o guardado (§4.3), mostrar Alert en la parte superior del contenido con mensaje (ej. "No se pudo guardar en la nube") y botón "Reintentar". Aplicar en Dashboard y Roadmap donde ya exista manejo de error.
- **Archivos:** `src/app/dashboard/page.tsx`, `src/app/roadmap/page.tsx`, `src/components/ui/alert.tsx`.
- **Criterio de done:** (1) Si hay error se muestra Alert con botón Reintentar. (2) Reintentar ejecuta de nuevo la carga o guardado. (3) Build y lint pasan.
- **Prompt sugerido para Cursor:** "Añade el estado de error de docs/ui-ux.md §4.3: Alert en la parte superior del contenido con mensaje 'No se pudo guardar en la nube' (o equivalente según contexto) y botón 'Reintentar'. Conecta Reintentar a la función de carga o guardado existente en Dashboard y Roadmap. Usa el componente Alert de shadcn."

---

### 20. Onboarding: layout sin AppShell, stepper y LiveSummaryCard
- **Descripción:** Ajustar layout de Onboarding (§3.1): sin AppShell, contenedor centrado max-w-3xl, título "Configura tu base", subtítulo del doc, stepper (vertical desktop, horizontal móvil), columna derecha (desktop) o bloque inferior (móvil) con LiveSummaryCard (resumen vivo). LiveSummaryCard puede ser placeholder que luego se conecte a los datos del wizard.
- **Archivos:** `src/app/onboarding/page.tsx`, `src/components/onboarding/Stepper.tsx` (o similar), `src/components/onboarding/LiveSummaryCard.tsx`.
- **Criterio de done:** (1) Onboarding no usa AppShell y tiene max-w-3xl centrado. (2) Stepper muestra los 6 pasos y estado actual. (3) LiveSummaryCard visible en desktop a la derecha y en móvil abajo. (4) Build y lint pasan.
- **Prompt sugerido para Cursor:** "Ajusta el Onboarding según docs/ui-ux.md §3.1: sin AppShell, contenedor max-w-3xl centrado, título 'Configura tu base', subtítulo, stepper (vertical en desktop, horizontal en móvil) para 6 pasos, y LiveSummaryCard en columna derecha (desktop) o inferior (móvil). LiveSummaryCard puede mostrar datos estáticos o conectados a los primeros campos del wizard. No reescribas toda la lógica del onboarding; integra el nuevo layout y stepper con la estructura existente."

---

### 21. Onboarding: pasos 1–3 con Card, Form y autoguardado
- **Descripción:** Estructurar pasos 1–3 (tipo hogar/miembros, ingresos netos, gastos) con Card por paso, Form y botones "Continuar" / "Guardar y salir". Autoguardado por paso en localStorage; al volver rehidratar. Validación inline (Zod) donde aplique.
- **Archivos:** `src/app/onboarding/page.tsx`, schemas en `src/lib` si se usan Zod para snapshot; `src/lib/local-storage.ts` para persistencia por paso.
- **Criterio de done:** (1) Cerrar en paso 2 y volver mantiene datos. (2) Validación impide continuar con datos inválidos. (3) Build y lint pasan.
- **Prompt sugerido para Cursor:** "Estructura los pasos 1–3 del Onboarding (tipo hogar/miembros, ingresos, gastos) con Card por paso, formulario y botones Continuar / Guardar y salir. Implementa autoguardado por paso en localStorage y rehidratación al volver. Añade validación con Zod en los campos que ya tengan schema; no cambies el modelo de datos en /lib/types. Respeta Cents en /lib/money para importes."

---

### 22. Onboarding: pasos 4–6, CTA final y toast
- **Descripción:** Pasos 4 (FE), 5 (meta deuda/ahorro), 6 (método reparto) con Card + Form. Tooltips en ocio mínimo y FE según doc. CTA final "Ir al Dashboard"; al guardar mostrar toast "Base guardada." y redirigir. Asegurar que el resumen vivo (LiveSummaryCard) se actualice al editar inputs en todos los pasos.
- **Archivos:** `src/app/onboarding/page.tsx`, `src/components/onboarding/LiveSummaryCard.tsx`, hooks o estado para resumen.
- **Criterio de done:** (1) Pasos 4–6 completos con validación y autoguardado. (2) Al finalizar, toast y redirección a dashboard. (3) LiveSummaryCard refleja cambios al editar. (4) Build y lint pasan.
- **Prompt sugerido para Cursor:** "Completa los pasos 4–6 del Onboarding (FE, meta, método reparto) con Card y Form, tooltips en ocio mínimo y FE. CTA final 'Ir al Dashboard'; al guardar mostrar toast 'Base guardada.' y redirigir. Conecta LiveSummaryCard para que se actualice al cambiar cualquier input del wizard. Respeta tipos y Cents; persistencia en localStorage según esquema existente."

---

**Riesgos y mitigaciones:**

- **Riesgo:** Cambiar formato de moneda o layout global puede afectar pantallas ya existentes.
- **Mitigación:** Tarea 1 acotada a tokens y un helper de formato; no tocar lógica en /lib/finance-engine. Revisar usos de formato € en el repo antes de centralizar.

- **Riesgo:** AppShell y rutas: conflicto con layout actual (dashboard/roadmap sin layout anidado).
- **Mitigación:** Usar layout de grupo (e.g. `(app)/layout.tsx`) que envuelva solo dashboard y roadmap, dejando onboarding y landing fuera.

- **Riesgo:** ExpandableMonthTable y SourceBreakdown dependen de que el motor exponga desglose de fuentes del extra.
- **Mitigación:** Revisar `src/lib/types.ts` y `finance-engine` para el tipo de desglose; si no existe, definir estructura mínima en types y mapear desde timeline en la tarea 13/14.

- **Riesgo:** Onboarding muy grande en una sola tarea.
- **Mitigación:** Onboarding dividido en tareas 20 (layout/stepper/summary), 21 (pasos 1–3) y 22 (pasos 4–6 + CTA y resumen vivo).

---

**Resumen:**

- **Tiempo estimado:** 22 tareas; estimación orientativa 2–4 h por tarea en desarrollo incremental → unas 44–88 h de desarrollo (depende de sesiones y de si partes del Dashboard/Roadmap ya cumplen parte de la spec).
- **Puntos de verificación:** Tras tareas 7 (Dashboard completo), 11 (Roadmap con fases), 14 (tabla expandible + fuentes), 15–16 (edición/borrado), 19 (errores), 22 (onboarding completo).
- **Comando final de validación completa:** `npm run build && npm run lint` (y si existen: `npm run type-check`, `npm test`).
