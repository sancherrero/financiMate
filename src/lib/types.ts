export type HouseholdType = 'individual' | 'couple' | 'group';
export type FinancialStrategy = 'emergency_first' | 'balanced' | 'goal_first';
export type DebtPrioritization = 'avalanche' | 'snowball';

export interface Member {
  id: string;
  name: string;
  incomeNetMonthly: number;
  individualFixedCosts?: number;
  individualVariableCosts?: number;
  individualMinLeisureCosts?: number;
  individualEmergencyFundIncluded?: number;
}

export interface FinancialSnapshot {
  id: string;
  type: HouseholdType;
  members: Member[];
  totalFixedCosts: number; // Household-wide costs
  totalVariableCosts: number; // Household-wide costs
  totalMinLeisureCosts: number; // Household-wide costs
  emergencyFundIncludedInExpenses: number; // Amount already in fixed/variable
  expenseMode: 'shared' | 'individual';
  emergencyFundAmount: number;
  targetEmergencyFundAmount?: number; // Target goal for the fund
  savingsYieldRate?: number; // Representa el % de rentabilidad anual (TAE)
  startDate?: string; // ISO date string for when this specific plan starts
  createdAt: string;
}

export interface MonthlyPaymentDetail {
  month: number;
  monthName: string; // E.g., "Marzo 2024"
  interestPaid: number;
  commissionPaid: number; // Comisión pagada al banco este mes
  regularPrincipalPaid: number;
  extraPrincipalPaid: number;
  totalPaid: number;
  remainingPrincipal: number;
  baseEmergencyContribution: number;
  extraEmergencyContribution: number;
  emergencyFundContribution: number;
  savingsInterestEarned: number; // Intereses generados por el fondo
  cumulativeEmergencyFund: number;
}

export interface DebtMonthlyBreakdown {
  goalId: string;
  name: string;
  interestPaid: number;
  principalFromMinPayment: number;
  extraPrincipalPaid: number;
  commissionPaid: number;
  remainingPrincipal: number;
}

/**
 * Desglose de las fuentes que componen el aporte extra de un mes.
 * Invariante: suma de todos los campos = totalExtra del mes.
 */
export interface ExtraSourceBreakdown {
  /** Sobrante neto base del mes (ingresos - gastos fijos/variables/ocio) */
  fromBaseSurplus: number;
  /** Incremento salarial respecto al mes anterior (si cambió snapshot) */
  fromSalaryIncrease: number;
  /** Reducción de gastos fijos/variables respecto al mes anterior */
  fromExpenseReduction: number;
  /** Cuotas liberadas de deudas ya liquidadas (efecto cascada) */
  fromReleasedQuotas: number;
  /** Cuota de aporte al FE redirigida (cuando FE completo) */
  fromEmergencyFundQuota: number;
  /** Exceso puntual al llenar el FE en el mes actual */
  fromEmergencyOverflow: number;
}

/**
 * Cambio en el contexto financiero del usuario a partir de un mes concreto.
 * Permite modelar incrementos salariales, reducciones de gastos, etc.
 */
export interface FinancialSnapshotChange {
  /** Mes a partir del cual aplica el cambio (inclusive), formato YYYY-MM */
  effectiveFromMonth: string;
  /** Nuevo salario neto mensual en céntimos (si cambió) */
  netIncomeCents?: number;
  /** Nuevos gastos fijos mensuales en céntimos (si cambiaron) */
  fixedExpensesCents?: number;
  /** Nuevos gastos variables mensuales en céntimos (si cambiaron) */
  variableExpensesCents?: number;
}

export interface PortfolioMonthlyDetail {
  month: number;
  monthName: string;
  totalInterestPaid: number;
  totalPrincipalPaid: number;
  totalExtraPaid: number;
  totalPaid: number;
  remainingTotalDebt: number;
  emergencyFundContribution: number;
  cumulativeEmergencyFund: number;
  activeDebtsCount: number;
  // Mapa de cómo quedó cada deuda este mes { idDeuda: capitalVivoRestante }
  debtBalances: Record<string, number>; 
  breakdown: DebtMonthlyBreakdown[]; // NUEVO: Desglose individual de cada deuda este mes
  /** Desglose de fuentes del extra aplicado (opcional; retrocompatibilidad con roadmaps ya calculados) */
  extraSources?: ExtraSourceBreakdown;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  targetDate?: string;
  startDate?: string; // Fecha en la que empieza la deuda (YYYY-MM-DD)
  urgencyLevel: number; // 1-5
  type: 'debt' | 'savings' | 'other';
  strategy?: FinancialStrategy;
  /** Para deudas en portafolio: target de FE (€) para esta fase. Si no viene, se usa snapshot.targetEmergencyFundAmount o 3×fijos. */
  targetEmergencyFundAmount?: number;
  isExistingDebt?: boolean;
  existingMonthlyPayment?: number;
  debtCategory?: 'fixed' | 'variable';
  assignedTo?: string; // 'shared' or memberId
  tin?: number; 
  tae?: number; 
  remainingPrincipal?: number;
  earlyRepaymentCommission?: number; // % comisión amortización anticipada
  /** Cambios financieros que aplican al entrar en esta deuda (ej. más salario neto, menos gastos) */
  snapshotChanges?: FinancialSnapshotChange;
}

export interface Milestone {
  month: number;
  label: string;
  description: string;
}

export interface MathStep {
  label: string;
  operation: string;
  result: string;
}

export interface PlanResult {
  id: string;
  snapshot: FinancialSnapshot;
  goal: Goal;
  strategy: FinancialStrategy;
  splitMethod: 'equal' | 'proportional_income';
  monthlySurplus: number;
  monthlyContributionExtra: number;
  monthlyEmergencyContribution: number;
  extraEmergencyContribution: number; // Solo la parte del excedente
  acceleratedExtraDebtContribution: number; // El aporte real cuando el fondo de emergencia se completa
  fundCompletedAtMonth: number; // El mes exacto en el que el fondo se llena y ocurre la aceleración
  estimatedMonthsToGoal: number;
  totalInterestPaid: number;
  totalCommissionPaid: number; // Total comisiones pagadas
  totalSavingsInterestEarned: number; // Total intereses ganados
  totalEmergencySaved: number;
  targetEmergencyFund: number;
  recommendations: string[];
  explanations: string[];
  milestones: Milestone[];
  mathSteps: MathStep[];
  monthlyTable: MonthlyPaymentDetail[];
  split?: { memberId: string; monthlyContribution: number }[];
  splitReasoning?: string;
  warnings: string[];
  startDate: string;
  endDate: string;
}

export interface PortfolioPlanResult {
  id: string;
  snapshot: FinancialSnapshot;
  debts: Goal[];
  prioritization: DebtPrioritization;
  strategy: FinancialStrategy;
  monthlySurplus: number;
  totalInterestPaid: number;
  totalCommissionPaid: number;
  totalMonths: number;
  timeline: PortfolioMonthlyDetail[];
  warnings: string[];
  /** Fecha de inicio del plan (mes 0) en ISO. Para UI: "Plan desde: MMM yyyy". */
  planStartDate?: string;
  /** Objetivo del fondo de emergencia usado en el análisis (€). */
  targetEmergencyFund?: number;
  /** Saldo inicial del fondo de emergencia al inicio del análisis (€). */
  initialEmergencyFund?: number;
}

export interface MultiPlanResult {
  emergency_first: PlanResult;
  balanced: PlanResult;
  goal_first: PlanResult;
}

export interface Roadmap {
  id: string;
  originalSnapshot: FinancialSnapshot; 
  goals: Goal[]; 
  debtPrioritization: DebtPrioritization; 
  generalStrategy: FinancialStrategy; 
  debtsPortfolio: PortfolioPlanResult | null; 
  savingsPlans: PlanResult[]; 
  lastUpdated: string;
}
