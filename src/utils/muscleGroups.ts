// Standardized muscle group names
export type MuscleGroup = 
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abdominals'
  | 'quadriceps'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'traps'
  | 'lats'
  | 'middle back'
  | 'lower back'
  | 'adductors'
  | 'abductors'
  | 'neck';

// Map Gist muscle names to standardized groups
const muscleGroupMap: Record<string, MuscleGroup> = {
  // Chest variations
  'chest': 'chest',
  'pectorals': 'chest',
  'pecs': 'chest',
  
  // Back variations
  'back': 'back',
  'lats': 'lats',
  'latissimus dorsi': 'lats',
  'middle back': 'middle back',
  'lower back': 'lower back',
  'upper back': 'middle back',
  
  // Shoulders
  'shoulders': 'shoulders',
  'shoulder': 'shoulders',
  'deltoids': 'shoulders',
  'delts': 'shoulders',
  'anterior deltoid': 'shoulders',
  'posterior deltoid': 'shoulders',
  'lateral deltoid': 'shoulders',
  
  // Arms
  'biceps': 'biceps',
  'bicep': 'biceps',
  'triceps': 'triceps',
  'tricep': 'triceps',
  'forearms': 'forearms',
  'forearm': 'forearms',
  
  // Core
  'abdominals': 'abdominals',
  'abs': 'abdominals',
  'abdominal': 'abdominals',
  'core': 'abdominals',
  
  // Legs
  'quadriceps': 'quadriceps',
  'quads': 'quadriceps',
  'quad': 'quadriceps',
  'hamstrings': 'hamstrings',
  'hamstring': 'hamstrings',
  'hams': 'hamstrings',
  'glutes': 'glutes',
  'glute': 'glutes',
  'gluteal': 'glutes',
  'calves': 'calves',
  'calf': 'calves',
  'gastrocnemius': 'calves',
  'soleus': 'calves',
  
  // Other
  'traps': 'traps',
  'trapezius': 'traps',
  'trap': 'traps',
  'adductors': 'adductors',
  'adductor': 'adductors',
  'abductors': 'abductors',
  'abductor': 'abductors',
  'neck': 'neck',
};

// All major muscle groups for heatmap
export const MAJOR_MUSCLE_GROUPS: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'abdominals',
  'quadriceps',
  'hamstrings',
  'glutes',
  'calves',
  'traps',
  'lats',
  'middle back',
  'lower back',
  'adductors',
  'abductors',
];

/**
 * Normalize a muscle name from the Gist to a standardized muscle group
 */
export function normalizeMuscleGroup(muscleName: string): MuscleGroup | null {
  const normalized = muscleName.toLowerCase().trim();
  
  // Direct match
  if (muscleGroupMap[normalized]) {
    return muscleGroupMap[normalized];
  }
  
  // Check for partial matches
  for (const [key, value] of Object.entries(muscleGroupMap)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  return null;
}

/**
 * Get all muscle groups from primary and secondary muscles
 */
export function getMuscleGroupsFromExercise(exercise: { primaryMuscles: string[]; secondaryMuscles: string[] }): {
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
} {
  const primary = exercise.primaryMuscles
    .map(normalizeMuscleGroup)
    .filter((mg): mg is MuscleGroup => mg !== null);
  
  const secondary = exercise.secondaryMuscles
    .map(normalizeMuscleGroup)
    .filter((mg): mg is MuscleGroup => mg !== null);
  
  return { primary, secondary };
}

