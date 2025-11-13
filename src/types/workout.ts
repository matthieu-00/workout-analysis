export interface Exercise {
  category: string;
  equipment: string | null;
  name: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions?: string[]; // Optional array of instruction steps
}

export interface Set {
  reps: number;
  weight: number;
}

export interface WorkoutExercise extends Exercise {
  sets: Set[];
}

export interface Workout {
  id: number;
  date: string;
  exercises: WorkoutExercise[];
}

export interface MuscleGroupStats {
  muscleGroup: string;
  engagementCount: number;
  lastWorkedDate: string | null;
  workouts: number;
}

export interface Suggestion {
  muscleGroup: string;
  exercises: Exercise[];
  reason: string;
}

export type TimePeriod = 7 | 14 | 30;

