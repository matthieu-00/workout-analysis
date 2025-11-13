import type { Workout, Exercise, MuscleGroupStats, Suggestion, TimePeriod } from '../types/workout';
import type { MuscleGroup } from './muscleGroups';
import { getMuscleGroupsFromExercise, MAJOR_MUSCLE_GROUPS } from './muscleGroups';

/**
 * Calculate muscle group engagement from workout history
 */
export function analyzeMuscleGroups(
  workouts: Workout[],
  timePeriod: TimePeriod
): Map<MuscleGroup, MuscleGroupStats> {
  const stats = new Map<MuscleGroup, MuscleGroupStats>();
  
  // Initialize all major muscle groups
  MAJOR_MUSCLE_GROUPS.forEach(mg => {
    stats.set(mg, {
      muscleGroup: mg,
      engagementCount: 0,
      lastWorkedDate: null,
      workouts: 0,
    });
  });
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - timePeriod);
  
  // Process workouts within the time period
  workouts.forEach(workout => {
    const workoutDate = new Date(workout.date);
    if (workoutDate < cutoffDate) {
      return; // Skip workouts outside the time period
    }
    
    workout.exercises.forEach(exercise => {
      const { primary, secondary } = getMuscleGroupsFromExercise(exercise);
      
      // Calculate volume: sum of (sets * reps * weight)
      // This gives us a better measure of engagement than just counting exercises
      const totalVolume = exercise.sets.reduce((sum, set) => {
        return sum + (set.reps * set.weight);
      }, 0);
      
      // Normalize volume: divide by 1000 to get a reasonable scale
      // (e.g., 3 sets of 10 reps at 100lbs = 3000 / 1000 = 3.0)
      const normalizedVolume = totalVolume / 1000;
      
      // Use volume if > 0, otherwise just count the exercise (for exercises with no sets logged)
      const engagementValue = normalizedVolume > 0 ? normalizedVolume : 1.0;
      
      // Track which muscles were worked in this exercise
      const exerciseMuscles = new Set<MuscleGroup>();
      
      // Count primary muscles
      primary.forEach(mg => {
        const stat = stats.get(mg);
        if (stat) {
          stat.engagementCount += engagementValue;
          stat.workouts += 1; // Count exercises (keeping field name as workouts for compatibility)
          exerciseMuscles.add(mg);
          
          // Update last worked date
          if (!stat.lastWorkedDate || workoutDate > new Date(stat.lastWorkedDate)) {
            stat.lastWorkedDate = workout.date;
          }
        }
      });
      
      // Count secondary muscles with weight 0.5
      secondary.forEach(mg => {
        const stat = stats.get(mg);
        if (stat) {
          stat.engagementCount += engagementValue * 0.5; // Secondary gets half the engagement
          if (!exerciseMuscles.has(mg)) {
            stat.workouts += 1; // Count exercises (keeping field name as workouts for compatibility)
            exerciseMuscles.add(mg);
          }
          
          // Update last worked date
          if (!stat.lastWorkedDate || workoutDate > new Date(stat.lastWorkedDate)) {
            stat.lastWorkedDate = workout.date;
          }
        }
      });
    });
  });
  
  return stats;
}

/**
 * Get underworked muscle groups (not worked in last 7 days)
 */
export function getUnderworkedMuscles(
  stats: Map<MuscleGroup, MuscleGroupStats>
): MuscleGroup[] {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const underworked: MuscleGroup[] = [];
  
  stats.forEach((stat, muscleGroup) => {
    if (!stat.lastWorkedDate) {
      // Never worked
      underworked.push(muscleGroup);
    } else {
      const lastWorked = new Date(stat.lastWorkedDate);
      if (lastWorked < sevenDaysAgo) {
        // Not worked in last 7 days
        underworked.push(muscleGroup);
      }
    }
  });
  
  return underworked;
}

/**
 * Generate exercise suggestions for underworked muscle groups
 */
export function generateSuggestions(
  underworkedMuscles: MuscleGroup[],
  exerciseDB: Exercise[],
  limitPerGroup: number = 5
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  
  underworkedMuscles.forEach(muscleGroup => {
    const matchingExercises: Exercise[] = [];
    
    exerciseDB.forEach(exercise => {
      const { primary, secondary } = getMuscleGroupsFromExercise(exercise);
      
      // Prioritize exercises where this is a primary muscle
      const isPrimary = primary.includes(muscleGroup);
      const isSecondary = secondary.includes(muscleGroup);
      
      if (isPrimary || isSecondary) {
        matchingExercises.push({
          ...exercise,
          // Add a priority score for sorting
          ...(isPrimary ? { _priority: 2 } : { _priority: 1 }),
        } as Exercise & { _priority: number });
      }
    });
    
    // Sort by priority (primary first), then by name
    matchingExercises.sort((a, b) => {
      const aPriority = (a as Exercise & { _priority: number })._priority || 0;
      const bPriority = (b as Exercise & { _priority: number })._priority || 0;
      if (bPriority !== aPriority) {
        return bPriority - aPriority;
      }
      return a.name.localeCompare(b.name);
    });
    
    // Remove priority property and limit results
    const topExercises = matchingExercises
      .slice(0, limitPerGroup)
      .map((exerciseWithPriority) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _priority, ...exercise } = exerciseWithPriority as Exercise & { _priority: number };
        return exercise;
      });
    
    if (topExercises.length > 0) {
      suggestions.push({
        muscleGroup,
        exercises: topExercises,
        reason: `You haven't worked your ${muscleGroup} in the last week. Try these exercises:`,
      });
    }
  });
  
  return suggestions;
}

/**
 * Get heatmap intensity for a muscle group (0-1 scale)
 */
export function getHeatmapIntensity(
  stat: MuscleGroupStats,
  timePeriod: TimePeriod
): number {
  // Normalize engagement count based on time period
  // Engagement count now includes volume (sets * reps * weight / 1000)
  // For a 7-day period, 6+ exercises worth of volume = hot (1.0)
  // For a 14-day period, 12+ exercises worth of volume = hot (1.0)
  // For a 30-day period, 24+ exercises worth of volume = hot (1.0)
  const thresholds = {
    7: { hot: 6, warm: 2 },
    14: { hot: 12, warm: 4 },
    30: { hot: 24, warm: 8 },
  };
  
  const threshold = thresholds[timePeriod];
  const engagement = stat.engagementCount;
  
  if (engagement >= threshold.hot) {
    return 1.0; // Hot
  } else if (engagement >= threshold.warm) {
    return 0.6; // Warm
  } else if (engagement > 0) {
    return 0.3; // Cool
  } else {
    return 0.0; // Cold
  }
}

/**
 * Get heatmap color for intensity
 */
export function getHeatmapColor(intensity: number): string {
  if (intensity >= 0.8) {
    return '#ef4444'; // Red - Hot
  } else if (intensity >= 0.5) {
    return '#f97316'; // Orange - Warm
  } else if (intensity >= 0.2) {
    return '#eab308'; // Yellow - Cool
  } else {
    return '#3b82f6'; // Blue - Cold
  }
}

