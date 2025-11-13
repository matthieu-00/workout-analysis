import { Workout, Exercise, MuscleGroupStats, Suggestion, TimePeriod } from '../types/workout';
import { MuscleGroup, getMuscleGroupsFromExercise, MAJOR_MUSCLE_GROUPS } from './muscleGroups';

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
    
    const workedMuscles = new Set<MuscleGroup>();
    
    workout.exercises.forEach(exercise => {
      const { primary, secondary } = getMuscleGroupsFromExercise(exercise);
      
      // Count primary muscles with weight 1.0
      primary.forEach(mg => {
        const stat = stats.get(mg);
        if (stat) {
          stat.engagementCount += 1.0;
          stat.workouts += 1;
          workedMuscles.add(mg);
          
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
          stat.engagementCount += 0.5;
          if (!workedMuscles.has(mg)) {
            stat.workouts += 1;
            workedMuscles.add(mg);
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
      .map(({ _priority, ...exercise }) => exercise);
    
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
  // For a 7-day period, 3+ workouts = hot (1.0)
  // For a 14-day period, 6+ workouts = hot (1.0)
  // For a 30-day period, 12+ workouts = hot (1.0)
  const thresholds = {
    7: { hot: 3, warm: 1 },
    14: { hot: 6, warm: 2 },
    30: { hot: 12, warm: 4 },
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

