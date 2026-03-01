import { z } from 'zod';
import { FinancialSnapshot, Goal, Roadmap } from '@/lib/types';

export const STORAGE_KEYS = {
  snapshot: 'financiMate_snapshot',
  goal: 'financiMate_goal',
  splitMethod: 'financiMate_splitMethod',
  roadmap: 'financiMate_roadmap',
} as const;

const memberSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  incomeNetMonthly: z.number().finite().nonnegative(),
  individualFixedCosts: z.number().finite().nonnegative().optional(),
  individualVariableCosts: z.number().finite().nonnegative().optional(),
  individualMinLeisureCosts: z.number().finite().nonnegative().optional(),
  individualEmergencyFundIncluded: z.number().finite().nonnegative().optional(),
});

const snapshotSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['individual', 'couple', 'group']),
  members: z.array(memberSchema).min(1),
  totalFixedCosts: z.number().finite().nonnegative(),
  totalVariableCosts: z.number().finite().nonnegative(),
  totalMinLeisureCosts: z.number().finite().nonnegative(),
  emergencyFundIncludedInExpenses: z.number().finite().nonnegative(),
  expenseMode: z.enum(['shared', 'individual']),
  emergencyFundAmount: z.number().finite().nonnegative(),
  targetEmergencyFundAmount: z.number().finite().nonnegative().optional(),
  savingsYieldRate: z.number().finite().min(0).optional(),
  startDate: z.string().optional(),
  createdAt: z.string(),
});

const goalSchema = z.object({
  id: z.string().min(1),
  name: z.string().default('Meta financiera'),
  targetAmount: z.number().finite().nonnegative(),
  targetDate: z.string().optional(),
  startDate: z.string().optional(),
  urgencyLevel: z.number().int().min(1).max(5),
  type: z.enum(['debt', 'savings', 'other']),
  strategy: z.enum(['emergency_first', 'balanced', 'goal_first']).optional(),
  targetEmergencyFundAmount: z.number().finite().nonnegative().optional(),
  isExistingDebt: z.boolean().optional(),
  existingMonthlyPayment: z.number().finite().nonnegative().optional(),
  debtCategory: z.enum(['fixed', 'variable']).optional(),
  assignedTo: z.string().optional(),
  tin: z.number().finite().min(0).optional(),
  tae: z.number().finite().min(0).optional(),
  remainingPrincipal: z.number().finite().nonnegative().optional(),
  earlyRepaymentCommission: z.number().finite().min(0).optional(),
});

const roadmapSchema = z.object({
  id: z.string().min(1),
  originalSnapshot: snapshotSchema,
  goals: z.array(goalSchema),
  debtPrioritization: z.enum(['avalanche', 'snowball']).default('avalanche'),
  generalStrategy: z.enum(['emergency_first', 'balanced', 'goal_first']).default('balanced'),
  debtsPortfolio: z.unknown().nullable(),
  savingsPlans: z.array(z.unknown()).default([]),
  lastUpdated: z.string(),
});

const splitMethodSchema = z.enum(['equal', 'proportional_income']);

const storageEnvelopeSchema = z.object({
  version: z.number().int().positive(),
  data: z.unknown(),
});

type ParseResult<T> = { value: T | null; migrated: boolean };

function safeParse(raw: string | null): unknown | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function unwrapVersioned(raw: unknown): { value: unknown; migrated: boolean } {
  const parsed = storageEnvelopeSchema.safeParse(raw);
  if (parsed.success) {
    return { value: parsed.data.data, migrated: false };
  }
  return { value: raw, migrated: true };
}

function migrateSnapshot(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const draft = { ...(value as Record<string, unknown>) };
  if (draft.emergencyFundIncludedInExpenses == null && typeof draft.emergencyFundIncluded === 'number') {
    draft.emergencyFundIncludedInExpenses = draft.emergencyFundIncluded;
  }
  return draft;
}

function migrateRoadmap(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const draft = { ...(value as Record<string, unknown>) };

  if (!Array.isArray(draft.goals) && Array.isArray(draft.items)) {
    draft.goals = draft.items;
  }

  return draft;
}

function readTyped<T>(
  key: string,
  schema: z.ZodTypeAny,
  migrate: (value: unknown) => unknown = (value) => value,
): ParseResult<T> {
  const raw = safeParse(localStorage.getItem(key));
  if (raw == null) return { value: null, migrated: false };

  const { value: unwrapped, migrated: hadLegacyFormat } = unwrapVersioned(raw);
  const migrated = migrate(unwrapped);
  const parsed = schema.safeParse(migrated);

  if (!parsed.success) {
    localStorage.removeItem(key);
    return { value: null, migrated: false };
  }

  if (hadLegacyFormat || migrated !== unwrapped) {
    localStorage.setItem(key, JSON.stringify({ version: 1, data: parsed.data }));
    return { value: parsed.data as T, migrated: true };
  }

  return { value: parsed.data as T, migrated: false };
}

export function writeTyped<T>(key: string, schema: z.ZodTypeAny, value: T) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new Error(`Invalid data for key: ${key}`);
  }
  localStorage.setItem(key, JSON.stringify({ version: 1, data: parsed.data }));
}

export function readSnapshot() {
  return readTyped<FinancialSnapshot>(STORAGE_KEYS.snapshot, snapshotSchema, migrateSnapshot);
}

export function writeSnapshot(snapshot: FinancialSnapshot) {
  writeTyped(STORAGE_KEYS.snapshot, snapshotSchema, snapshot);
}

export function readGoal() {
  return readTyped<Goal>(STORAGE_KEYS.goal, goalSchema);
}

export function writeGoal(goal: Goal) {
  writeTyped(STORAGE_KEYS.goal, goalSchema, goal);
}

export function readSplitMethod(defaultValue: 'equal' | 'proportional_income' = 'equal') {
  const raw = localStorage.getItem(STORAGE_KEYS.splitMethod);
  const parsed = splitMethodSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  localStorage.setItem(STORAGE_KEYS.splitMethod, defaultValue);
  return defaultValue;
}

export function writeSplitMethod(splitMethod: 'equal' | 'proportional_income') {
  localStorage.setItem(STORAGE_KEYS.splitMethod, splitMethod);
}

export function readRoadmap() {
  return readTyped<Roadmap>(STORAGE_KEYS.roadmap, roadmapSchema, migrateRoadmap);
}

export function writeRoadmap(roadmap: Roadmap) {
  writeTyped(STORAGE_KEYS.roadmap, roadmapSchema, roadmap);
}

export function clearRoadmap() {
  localStorage.removeItem(STORAGE_KEYS.roadmap);
}
