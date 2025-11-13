import type { MuscleGroup } from './muscleGroups';

// Map our standardized muscle groups to react-body-highlighter muscle names
// Based on the library's supported muscle names from documentation:
// trapezius, upper-back, lower-back, chest, biceps, triceps, forearm,
// back-deltoids, front-deltoids, abs, obliques, adductor, hamstring,
// quadriceps, abductors, calves, gluteal, head, neck
export const muscleNameMap: Record<MuscleGroup, string[]> = {
  chest: ['chest'],
  back: ['upper-back'],
  shoulders: ['front-deltoids', 'back-deltoids'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  forearms: ['forearm'],
  abdominals: ['abs', 'obliques'],
  quadriceps: ['quadriceps'],
  hamstrings: ['hamstring'],
  glutes: ['gluteal'],
  calves: ['calves'],
  traps: ['trapezius'],
  lats: ['upper-back'], // lats are part of upper-back in the library
  'middle back': ['upper-back'],
  'lower back': ['lower-back'],
  adductors: ['adductor'],
  abductors: ['abductors'],
  neck: ['neck'],
};

/**
 * Convert our muscle group to react-body-highlighter format
 */
export function getBodyHighlighterMuscles(muscleGroup: MuscleGroup): string[] {
  return muscleNameMap[muscleGroup] || [muscleGroup];
}

/**
 * Get all muscle groups that map to a specific body highlighter muscle name
 */
export function getMuscleGroupFromHighlighterName(highlighterName: string): MuscleGroup | null {
  for (const [muscleGroup, names] of Object.entries(muscleNameMap)) {
    if (names.includes(highlighterName)) {
      return muscleGroup as MuscleGroup;
    }
  }
  return null;
}

