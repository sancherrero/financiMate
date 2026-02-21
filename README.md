# FinanciMate - Tu Orientador de Finanzas Personales

FinanciMate es una plataforma avanzada de planificación financiera diseñada para ayudar a individuos, parejas y grupos a alcanzar sus metas económicas mediante un motor de cálculo matemático preciso y realista. A diferencia de un rastreador de gastos convencional, FinanciMate actúa como un **simulador de decisiones estratégicas**.

## 🚀 Propuesta de Valor
El objetivo principal es responder a la pregunta: *"¿Exactamente cuánto dinero y tiempo necesito para lograr X meta sin comprometer mi seguridad?"*.

## 🧠 Lógica de Negocio y Motor Financiero

### 1. Cálculo del Excedente del Hogar (Household Surplus)
La base de todo plan es el "Sobrante Real". No calculamos sobre el ingreso bruto, sino sobre la capacidad de ahorro neta tras asegurar la calidad de vida:
- **Fórmula**: `Ingresos Netos Totales - (Gastos Fijos + Gastos Variables + Ocio Mínimo Intocable)`.
- **Ocio Mínimo**: Es una innovación de FinanciMate. Consideramos que un plan financiero que elimina el ocio está destinado al fracaso por fatiga. Este monto es "sagrado" y no se toca para el ahorro.

### 2. El Fondo de Emergencia (Colchón de Seguridad)
La seguridad es nuestra prioridad. El sistema gestiona el fondo de forma dinámica:
- **Objetivo (Target)**: Configurable por el usuario (por defecto 3 meses de gastos fijos).
- **Ahorro Base**: Detectamos si el usuario ya está ahorrando dentro de sus gastos declarados.
- **Estrategia de Crecimiento**: Según el perfil elegido (Seguridad, Equilibrado o Máximo), el excedente se divide entre el fondo y la meta.
- **Redirección Automática (Overflow)**: En el momento exacto en que el fondo acumulado alcanza el objetivo, el motor financiero redirige el 100% de ese flujo hacia la meta para acelerar el progreso.

### 3. Amortización de Deuda (Método Francés con Extra)
Para metas que son deudas bancarias, aplicamos rigor financiero:
- **Interés Mensual**: `Capital Vivo * (TIN / 12 / 100)`.
- **Amortización Anticipada**: El aporte extra del usuario se aplica directamente al capital principal al final de cada mes, reduciendo los intereses del mes siguiente.
- **Resultados**: El usuario ve exactamente cuánto dinero en intereses se ahorra al aplicar cada estrategia.

### 4. Reparto Equitativo y Proporcional
En planes de pareja o grupo, resolvemos el conflicto del aporte:
- **Igualitario**: Todos aportan la misma cifra.
- **Proporcional**: El esfuerzo se divide según el peso del salario de cada uno sobre el total (quien más gana, más aporta en porcentaje, manteniendo un esfuerzo relativo justo).

## 🗺️ El Roadmap: Planificación en Cascada
El Roadmap permite encadenar múltiples metas en una línea temporal continua.

### Lógica de Herencia
- **Continuidad Temporal**: La meta B comienza el mes siguiente a la finalización de la meta A.
- **Memoria de Saldo**: El Fondo de Emergencia final de una meta se convierte en el saldo inicial de la siguiente.
- **Recalculación en Cadena**: Si modificas un dato en una meta temprana (ej: te suben el sueldo), el sistema propaga ese cambio por todo el Roadmap, recalculando fechas de fin e intereses de todas las metas posteriores automáticamente.

## 🛠️ Tecnologías Utilizadas
- **Framework**: Next.js 15 (App Router).
- **Base de Datos**: Cloud Firestore (Persistencia en la nube y tiempo real).
- **Autenticación**: Firebase Auth (Perfiles privados y anónimos).
- **UI**: Shadcn/UI + Tailwind CSS.
- **Iconografía**: Lucide React.
- **Motor de Fechas**: date-fns.

## 📊 Resultados Esperados por el Usuario
1. **Claridad**: Una fecha exacta de "Meta Alcanzada".
2. **Seguridad**: Saber que siempre tiene un colchón de dinero para imprevistos.
3. **Optimización**: Descubrir el escenario de ahorro más eficiente.
4. **Paz Mental**: Un plan de acción paso a paso que elimina la incertidumbre financiera.

---
*Nota: FinanciMate proporciona cálculos orientativos basados en matemáticas financieras estándar. No sustituye el asesoramiento financiero profesional personalizado.*
