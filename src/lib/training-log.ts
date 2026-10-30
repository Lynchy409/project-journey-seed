import type { FitnessSlot, FitnessSet } from './fitness-types';
export const TRAINING_LABELS: Record<FitnessSlot, string> = { strength: 'Strength', cardio: 'Fitness', recovery: 'Recovery' };
export const TRAINING_ORDER: FitnessSlot[] = ['strength', 'cardio', 'recovery'];
export const FITNESS_ACTIVITIES = ['Run', 'Sprints', 'Bag / Thai boxing', 'Circuits', 'Cindy'];
export function sessionName(slots: FitnessSlot[]) { return TRAINING_ORDER.filter(s => slots.includes(s)).map(s => TRAINING_LABELS[s]).join(' · '); }
export function activityKind(name: string) {
  if (/sprint/i.test(name)) return 'sprints';
  if (/cindy/i.test(name)) return 'cindy';
  if (/circu/i.test(name)) return 'circuit';
  if (/bag|thai|box/i.test(name)) return 'boxing';
  if (/run/i.test(name)) return 'run';
  return 'conditioning';
}
export function nextSet(set: FitnessSet): FitnessSet {
  return { exercise: set.exercise, weight: null, reps: null, seconds: null, distance_m: null, rest_seconds: null, load_type: 'external', side: 'both', effort: null, notes: '' };
}
export function completedDrivers(slots: FitnessSlot[], kind: string): string[] {
  return slots.map(s => s === 'cardio' && kind === 'sprints' ? 'sprint' : s);
}