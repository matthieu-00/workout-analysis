import { useState, useEffect, useMemo } from 'react';
import { Calendar, Plus, ChevronDown, ChevronUp, Trash2, BarChart3, Activity, Info, RefreshCw, AlertCircle } from 'lucide-react';
import type { Workout, Exercise, WorkoutExercise, TimePeriod } from './types/workout';
import { analyzeMuscleGroups, getUnderworkedMuscles, generateSuggestions } from './utils/workoutAnalysis';
import BodyHeatmap from './components/BodyHeatmap';
import SuggestionsPanel from './components/SuggestionsPanel';

// Exercise picker card component with instructions
function ExercisePickerCard({ exercise, onAdd }: { exercise: Exercise; onAdd: () => void }) {
  const [showInstructions, setShowInstructions] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-4 flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="font-medium text-black">{exercise.name}</p>
          <p className="text-sm text-gray-700 mt-2">{exercise.category} • {exercise.equipment || 'N/A'}</p>
          <p className="text-xs text-gray-600 mt-2">
            Primary: {exercise.primaryMuscles.join(', ') || 'N/A'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {exercise.instructions && exercise.instructions.length > 0 && (
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="p-2 text-gray-500 hover:text-black active:scale-95 transition cursor-pointer"
              title="Show instructions"
            >
              <Info size={16} />
            </button>
          )}
          <button
            onClick={onAdd}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 active:scale-95 transition cursor-pointer flex items-center gap-2 text-sm font-semibold"
            title="Add to workout"
          >
            <Plus size={16} />
            Add
          </button>
        </div>
      </div>
      {showInstructions && exercise.instructions && exercise.instructions.length > 0 && (
        <div className="px-4 pb-4 pt-3 bg-gray-50 border-t border-gray-200">
          <p className="text-xs font-semibold text-gray-700 mb-3">Instructions:</p>
          <ol className="list-decimal list-inside space-y-2">
            {exercise.instructions.map((instruction, idx) => (
              <li key={idx} className="text-xs text-gray-600">{instruction}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

type ViewMode = 'workouts' | 'analysis';

export default function WorkoutPlanner() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [currentWorkout, setCurrentWorkout] = useState<Workout | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedWorkout, setExpandedWorkout] = useState<number | null>(null);
  const [exerciseDB, setExerciseDB] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('workouts');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(7);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteWorkoutConfirm, setShowDeleteWorkoutConfirm] = useState<{ workoutId: number; workoutName: string } | null>(null);
  const [showDeleteExerciseConfirm, setShowDeleteExerciseConfirm] = useState<{ workoutId: number; exerciseIndex: number; exerciseName: string } | null>(null);
  const [editingWorkoutId, setEditingWorkoutId] = useState<number | null>(null);
  const [addExerciseSearchTerm, setAddExerciseSearchTerm] = useState('');
  const [addExerciseCategory, setAddExerciseCategory] = useState('all');

  // Fetch exercises from GitHub Gist on component mount
  useEffect(() => {
    const fetchExercises = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://gist.githubusercontent.com/matthieu-00/3862e0aa8b88fe5352677a83e0b4a438/raw/37fb90968748be8a094707fd4ee2bff68e613f68/workout_list');
        
        if (!response.ok) {
          throw new Error('Failed to fetch exercises');
        }
        
        const data = await response.json();
        
        // Filter out stretching and cardio categories
        const filteredData = data.filter((ex: Exercise) => 
          ex.category !== 'stretching' && ex.category !== 'cardio'
        );
        
        setExerciseDB(filteredData);
        setError(null);
      } catch (err) {
        console.error('Error fetching exercises:', err);
        setError('Failed to load exercise database. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchExercises();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('workoutPlanner');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setWorkouts(data.workouts || []);
      } catch (err) {
        console.error('Error loading saved workouts:', err);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('workoutPlanner', JSON.stringify({ workouts }));
  }, [workouts]);

  const startNewWorkout = () => {
    setCurrentWorkout({
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      exercises: []
    });
  };

  const addExercise = (exercise: Exercise) => {
    setCurrentWorkout(prev => {
      if (!prev) {
        console.warn('Cannot add exercise: no current workout');
        return prev;
      }
      const workoutExercise: WorkoutExercise = {
        ...exercise,
        sets: [{ reps: 10, weight: 0 }]
      };
      return {
        ...prev,
        exercises: [...prev.exercises, workoutExercise]
      };
    });
  };

  const addExerciseToWorkout = (workoutId: number, exercise: Exercise) => {
    const workoutExercise: WorkoutExercise = {
      ...exercise,
      sets: [{ reps: 10, weight: 0 }]
    };
    
    const updatedWorkouts = workouts.map(w => 
      w.id === workoutId 
        ? { ...w, exercises: [...w.exercises, workoutExercise] }
        : w
    );
    
    setWorkouts(updatedWorkouts);
    // Keep search open for multiple additions
  };

  const filteredExercisesForAdd = useMemo(() => {
    return exerciseDB.filter(ex => {
      const matchesSearch = ex.name.toLowerCase().includes(addExerciseSearchTerm.toLowerCase());
      const matchesCategory = addExerciseCategory === 'all' || ex.category === addExerciseCategory;
      return matchesSearch && matchesCategory;
    });
  }, [exerciseDB, addExerciseSearchTerm, addExerciseCategory]);

  const updateSet = (exerciseIndex: number, setIndex: number, field: 'reps' | 'weight', value: string) => {
    if (!currentWorkout) return;
    
    const updated = { ...currentWorkout };
    // Handle empty string - store as 0 for number fields
    if (value === '' || value === '-') {
      updated.exercises[exerciseIndex].sets[setIndex][field] = 0;
    } else {
      const numValue = field === 'reps' ? parseInt(value, 10) : parseFloat(value);
      // Only update if valid number
      if (!isNaN(numValue) && isFinite(numValue)) {
        updated.exercises[exerciseIndex].sets[setIndex][field] = numValue;
      }
    }
    setCurrentWorkout(updated);
  };

  const addSet = (exerciseIndex: number) => {
    if (!currentWorkout) return;
    
    const updated = { ...currentWorkout };
    const lastSet = updated.exercises[exerciseIndex].sets.slice(-1)[0];
    updated.exercises[exerciseIndex].sets.push({ ...lastSet });
    setCurrentWorkout(updated);
  };

  const updateSetInWorkout = (workoutId: number, exerciseIndex: number, setIndex: number, field: 'reps' | 'weight', value: string) => {
    const updatedWorkouts = workouts.map(w => {
      if (w.id === workoutId) {
        const updated = { ...w };
        // Handle empty string - store as 0 for number fields
        if (value === '' || value === '-') {
          updated.exercises[exerciseIndex].sets[setIndex][field] = 0;
        } else {
          const numValue = field === 'reps' ? parseInt(value, 10) : parseFloat(value);
          // Only update if valid number
          if (!isNaN(numValue) && isFinite(numValue)) {
            updated.exercises[exerciseIndex].sets[setIndex][field] = numValue;
          }
        }
        return updated;
      }
      return w;
    });
    setWorkouts(updatedWorkouts);
  };

  const addSetToWorkout = (workoutId: number, exerciseIndex: number) => {
    const updatedWorkouts = workouts.map(w => {
      if (w.id === workoutId) {
        const updated = { ...w };
        const lastSet = updated.exercises[exerciseIndex].sets.slice(-1)[0];
        updated.exercises[exerciseIndex].sets.push({ ...lastSet });
        return updated;
      }
      return w;
    });
    setWorkouts(updatedWorkouts);
  };

  const deleteExerciseFromWorkout = (workoutId: number, exerciseIndex: number) => {
    const updatedWorkouts = workouts.map(w => {
      if (w.id === workoutId) {
        const updated = { ...w };
        updated.exercises.splice(exerciseIndex, 1);
        return updated;
      }
      return w;
    });
    setWorkouts(updatedWorkouts);
  };

  const saveWorkout = () => {
    if (currentWorkout && currentWorkout.exercises.length > 0) {
      setWorkouts([...workouts, currentWorkout]);
      setCurrentWorkout(null);
    }
  };

  const deleteWorkout = (id: number) => {
    setWorkouts(workouts.filter(w => w.id !== id));
  };

  const clearAllWorkouts = () => {
    setWorkouts([]);
    setShowClearConfirm(false);
  };

  const categories = useMemo(() => {
    return ['all', ...new Set(exerciseDB.map(e => e.category).filter(Boolean))];
  }, [exerciseDB]);

  const filteredExercises = useMemo(() => {
    return exerciseDB.filter(ex => {
      const matchesSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || ex.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [exerciseDB, searchTerm, selectedCategory]);

  // Analysis calculations
  const muscleStats = useMemo(() => {
    return analyzeMuscleGroups(workouts, timePeriod);
  }, [workouts, timePeriod]);

  const underworkedMuscles = useMemo(() => {
    return getUnderworkedMuscles(muscleStats);
  }, [muscleStats]);

  const suggestions = useMemo(() => {
    if (underworkedMuscles.length === 0) return [];
    return generateSuggestions(underworkedMuscles, exerciseDB, 5);
  }, [underworkedMuscles, exerciseDB]);

  // Check if we have enough data for analysis
  const hasAnalysisData = useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timePeriod);
    return workouts.some(w => new Date(w.date) >= cutoffDate);
  }, [workouts, timePeriod]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-3 md:p-6 bg-gray-50 min-h-screen flex items-center justify-center" style={{ fontFamily: "'Fira Code', monospace" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Protest+Guerrilla&family=Fira+Code:wght@400;500;600;700&display=swap');
          h1, h2, h3, h4, h5, h6 { font-family: 'Protest Guerrilla', sans-serif; }
        `}</style>
        <div className="text-center">
          <RefreshCw className="animate-spin text-blue-500 mx-auto mb-4" size={32} />
          <p className="text-gray-600">Loading exercise database...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-3 md:p-6 bg-gray-50 min-h-screen flex items-center justify-center" style={{ fontFamily: "'Fira Code', monospace" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Protest+Guerrilla&family=Fira+Code:wght@400;500;600;700&display=swap');
          h1, h2, h3, h4, h5, h6 { font-family: 'Protest Guerrilla', sans-serif; }
        `}</style>
        <div className="bg-white border rounded-lg p-6 text-center shadow-md">
          <AlertCircle className="text-red-500 mx-auto mb-2" size={24} />
          <p className="text-black font-semibold mb-2">Error Loading Exercises</p>
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 md:p-6" style={{ fontFamily: "'Fira Code', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Protest+Guerrilla&family=Fira+Code:wght@400;500;600;700&display=swap');
        h1, h2, h3, h4, h5, h6 { font-family: 'Protest Guerrilla', sans-serif; }
      `}</style>
      <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex justify-between items-start mb-2">
          <h1 className="text-2xl md:text-3xl font-bold">Workout Analysis</h1>
        </div>
        <div className="flex gap-2 flex-wrap mb-4">
          <button
            onClick={() => setViewMode('workouts')}
            className={`px-4 py-2 rounded font-semibold text-sm transition-all ${
              viewMode === 'workouts'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 border'
            }`}
          >
            <Activity size={16} className="inline mr-2" />
            Workouts
          </button>
          <button
            onClick={() => setViewMode('analysis')}
            className={`px-4 py-2 rounded font-semibold text-sm transition-all ${
              viewMode === 'analysis'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 border'
            }`}
          >
            <BarChart3 size={16} className="inline mr-2" />
            Analysis
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">Analyze your fitness journey • {exerciseDB.length} exercises available!</p>
      </div>

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div 
          className="fixed inset-0 bg-gray-900 bg-opacity-30 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto" 
          onClick={() => setShowClearConfirm(false)}
        >
          <div 
            className="bg-white w-full md:w-96 rounded-lg p-4 md:p-6 my-4 shadow-xl border border-gray-200" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle size={24} className="text-red-500" />
              <h3 className="text-lg font-bold">Confirm Delete</h3>
            </div>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete {workouts.length === 1 ? 'this workout' : `all ${workouts.length} workouts`}? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-semibold text-sm hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={clearAllWorkouts}
                className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg font-semibold text-sm hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Workout Confirmation Modal */}
      {showDeleteWorkoutConfirm && (
        <div 
          className="fixed inset-0 bg-gray-900 bg-opacity-30 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto" 
          onClick={() => setShowDeleteWorkoutConfirm(null)}
        >
          <div 
            className="bg-white w-full md:w-96 rounded-lg p-4 md:p-6 my-4 shadow-xl border border-gray-200" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle size={24} className="text-red-500" />
              <h3 className="text-lg font-bold">Confirm Delete Workout</h3>
            </div>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete <span className="font-semibold">"{showDeleteWorkoutConfirm.workoutName}"</span>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteWorkoutConfirm(null)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-semibold text-sm hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteWorkout(showDeleteWorkoutConfirm.workoutId);
                  setShowDeleteWorkoutConfirm(null);
                }}
                className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg font-semibold text-sm hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Exercise Confirmation Modal */}
      {showDeleteExerciseConfirm && (
        <div 
          className="fixed inset-0 bg-gray-900 bg-opacity-30 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto" 
          onClick={() => setShowDeleteExerciseConfirm(null)}
        >
          <div 
            className="bg-white w-full md:w-96 rounded-lg p-4 md:p-6 my-4 shadow-xl border border-gray-200" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle size={24} className="text-red-500" />
              <h3 className="text-lg font-bold">Confirm Delete Exercise</h3>
            </div>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete <span className="font-semibold">"{showDeleteExerciseConfirm.exerciseName}"</span>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteExerciseConfirm(null)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-semibold text-sm hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Check if it's a new workout (currentWorkout) or saved workout
                  if (currentWorkout && currentWorkout.id === showDeleteExerciseConfirm.workoutId) {
                    // Delete from current workout
                    const updated = { ...currentWorkout };
                    updated.exercises.splice(showDeleteExerciseConfirm.exerciseIndex, 1);
                    setCurrentWorkout(updated);
                  } else {
                    // Delete from saved workout
                    deleteExerciseFromWorkout(showDeleteExerciseConfirm.workoutId, showDeleteExerciseConfirm.exerciseIndex);
                  }
                  setShowDeleteExerciseConfirm(null);
                }}
                className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg font-semibold text-sm hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'workouts' ? (
        <>
          {!currentWorkout ? (
            <>
              <div className="flex gap-4 mb-8">
                <button
                  onClick={startNewWorkout}
                  className="flex-1 bg-blue-500 text-white py-3 px-6 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-blue-600 shadow-lg hover:shadow-xl transition-all text-base active:scale-95"
                >
                  <Plus size={20} />
                  Start New Workout
                </button>
                {workouts.length > 0 && (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="bg-red-500 text-white py-3 px-6 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-red-600 shadow-lg hover:shadow-xl transition-all active:scale-95"
                  >
                    <Trash2 size={20} />
                    Clear All
                  </button>
                )}
              </div>

              <div className="space-y-6">
                {workouts.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 text-center text-gray-600">
                    <p>No workouts yet. Start your first workout above!</p>
                  </div>
                ) : (() => {
                  // Group workouts by date
                  const workoutsByDate = workouts.reduce((acc, workout) => {
                    const dateKey = new Date(workout.date).toDateString();
                    if (!acc[dateKey]) {
                      acc[dateKey] = [];
                    }
                    acc[dateKey].push(workout);
                    return acc;
                  }, {} as Record<string, typeof workouts>);

                  // Sort dates in descending order (most recent first)
                  const sortedDates = Object.keys(workoutsByDate).sort((a, b) => 
                    new Date(b).getTime() - new Date(a).getTime()
                  );

                  return (
                    <div className="space-y-8">
                      {sortedDates.map(dateKey => {
                        const dayWorkouts = workoutsByDate[dateKey];
                        const displayDate = new Date(dayWorkouts[0].date);
                        
                        return (
                          <div key={dateKey} className="space-y-4">
                            {/* Date Header */}
                            <div className="flex items-center gap-4 mb-2">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <Calendar className="text-blue-600" size={24} />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-gray-900">
                                  {displayDate.toLocaleDateString('en-US', { 
                                    weekday: 'long', 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                  })}
                                </h3>
                                <div className="h-1 w-16 bg-blue-500 rounded-full mt-2"></div>
                              </div>
                            </div>
                            
                            {/* Workouts for this day */}
                            {dayWorkouts.map((workout, workoutIndex) => (
                              <div key={workout.id} className="bg-white rounded-lg shadow-lg border-l-4 border-l-blue-500 border border-gray-200 overflow-hidden ml-8 hover:shadow-xl transition-all">
                                <div 
                                  className="p-4 md:p-6 flex justify-between items-center cursor-pointer hover:bg-blue-50 active:scale-[0.98] transition"
                                  onClick={() => setExpandedWorkout(expandedWorkout === workout.id ? null : workout.id)}
                                >
                                  <div className="flex items-center gap-4">
                                  <div>
                                    <p className="font-bold text-lg text-black">
                                      Workout {workoutIndex + 1}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                                        {workout.exercises.length} {workout.exercises.length === 1 ? 'exercise' : 'exercises'}
                                      </span>
                                    </div>
                                  </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowDeleteWorkoutConfirm({
                                          workoutId: workout.id,
                                          workoutName: `Workout ${workoutIndex + 1}`
                                        });
                                      }}
                                      className="text-black hover:text-red-600 active:scale-95 p-2 transition cursor-pointer"
                                      title="Delete workout"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                    {expandedWorkout === workout.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                  </div>
                                </div>
                                
                                {expandedWorkout === workout.id && (
                                  <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50 border-t border-blue-200">
                                    {editingWorkoutId === workout.id ? (
                                      <>
                                        {/* Inline Search UX - Same as new workout */}
                                        <div className="mb-6 p-4 md:p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200 overflow-x-hidden shadow-md">
                                          <div className="mb-4">
                                            <div className="flex items-center justify-between mb-3">
                                              <div className="flex items-center gap-2">
                                                <div className="h-1 w-8 bg-blue-500 rounded-full"></div>
                                                <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wide">Search Exercises</h4>
                                              </div>
                                              <button
                                                onClick={() => {
                                                  setEditingWorkoutId(null);
                                                  setAddExerciseSearchTerm('');
                                                  setAddExerciseCategory('all');
                                                }}
                                                className="bg-gray-500 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-gray-600 active:scale-95 transition"
                                              >
                                                Done
                                              </button>
                                            </div>
                                          </div>
                                          <input
                                            type="text"
                                            placeholder="Search exercises..."
                                            value={addExerciseSearchTerm}
                                            onChange={(e) => setAddExerciseSearchTerm(e.target.value)}
                                            className="w-full max-w-full px-3 py-2 border rounded text-sm mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                          />
                                          <div className="mb-6">
                                            <div className="flex items-center gap-4 flex-wrap">
                                              <span className="text-sm font-medium text-black">Filters: </span>
                                              {categories.map(cat => (
                                                <button
                                                  key={cat}
                                                  onClick={() => setAddExerciseCategory(cat)}
                                                  className={`px-4 py-2 rounded-full text-sm transition active:scale-95 cursor-pointer font-semibold ${
                                                    addExerciseCategory === cat
                                                      ? 'bg-blue-500 text-white'
                                                      : 'bg-white text-gray-700 border hover:bg-gray-50'
                                                  }`}
                                                >
                                                  {cat}
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                          {filteredExercisesForAdd.length > 0 && (
                                            <>
                                              <h3 className="text-lg font-semibold text-black mb-4">Exercises</h3>
                                              <div className="max-h-60 overflow-y-auto space-y-4">
                                                {filteredExercisesForAdd.slice(0, 50).map((ex, idx) => (
                                                  <ExercisePickerCard
                                                    key={`add-${ex.name}-${ex.category}-${idx}`}
                                                    exercise={ex}
                                                    onAdd={() => addExerciseToWorkout(workout.id, ex)}
                                                  />
                                                ))}
                                              </div>
                                            </>
                                          )}
                                          {filteredExercisesForAdd.length === 0 && addExerciseSearchTerm && (
                                            <>
                                              <h3 className="text-lg font-semibold text-black mb-4">Exercises</h3>
                                              <p className="text-center text-gray-500 py-8">No exercises found</p>
                                            </>
                                          )}
                                          {!addExerciseSearchTerm && (
                                            <p className="text-center text-gray-500 py-8 text-sm">Start typing to search for exercises</p>
                                          )}
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <div className="mb-4">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingWorkoutId(workout.id);
                                            }}
                                            className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-green-600 shadow-md hover:shadow-lg transition-all flex items-center gap-2 active:scale-95"
                                          >
                                            <Plus size={16} />
                                            Add Exercise
                                          </button>
                                        </div>
                                      </>
                                    )}
                                    {workout.exercises.map((exercise, idx) => (
                                      <div key={idx} className="mb-4 last:mb-0">
                                        <SavedExerciseCard 
                                          exercise={exercise}
                                          workoutId={workout.id}
                                          exerciseIndex={idx}
                                          onUpdateSet={updateSetInWorkout}
                                          onAddSet={addSetToWorkout}
                                          onDeleteRequest={(workoutId, exerciseIndex, exerciseName) => {
                                            setShowDeleteExerciseConfirm({
                                              workoutId,
                                              exerciseIndex,
                                              exerciseName
                                            });
                                          }}
                                        />
                                      </div>
                                    ))}
                                    {workout.exercises.length === 0 && editingWorkoutId !== workout.id && (
                                      <p className="text-gray-500 text-center py-4">No exercises yet. Click "Add Exercise" to get started.</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 md:p-6 overflow-x-hidden">
          <div className="mb-8">
            <div className="flex items-end gap-4 mb-8">
              <div className="flex-1">
                <label className="block text-sm font-semibold mb-1">Workout Date</label>
                <input
                  type="date"
                  value={currentWorkout.date}
                  onChange={(e) => setCurrentWorkout({ ...currentWorkout, date: e.target.value })}
                  className="w-full max-w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setCurrentWorkout(null)}
                  className="bg-gray-300 text-gray-800 py-2 px-4 rounded font-semibold text-sm hover:bg-gray-400 active:scale-95 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={saveWorkout}
                  disabled={currentWorkout.exercises.length === 0}
                  className="bg-green-500 text-white py-3 px-6 rounded-lg font-semibold text-base hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed active:scale-95 transition shadow-lg hover:shadow-xl disabled:shadow-none flex items-center gap-2"
                >
                  {currentWorkout.exercises.length > 0 && <Plus size={18} />}
                  Save Workout
                </button>
              </div>
            </div>
          </div>

              <div className="mb-8">
                {/* Added exercises - shown first, right below search */}
                {currentWorkout.exercises.length > 0 && (
                  <div className="mb-8 space-y-4">
                    <div className="border-t-2 border-b-2 border-green-500 py-4 mb-6 bg-green-50 rounded-lg">
                      <h4 className="text-sm font-semibold text-green-800 uppercase tracking-wide">Added Exercises</h4>
                    </div>
                    {currentWorkout.exercises.map((exercise, exIdx) => {
                      const exerciseWithState = exercise as WorkoutExercise & { _showInstructions?: boolean; _collapsed?: boolean };
                      const isCollapsed = exerciseWithState._collapsed || false;
                      
                      return (
                        <div key={exIdx} className="p-4 md:p-6 bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-hidden">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => {
                                    const updated = { ...currentWorkout };
                                    const ex = updated.exercises[exIdx] as WorkoutExercise & { _collapsed?: boolean };
                                    ex._collapsed = !(ex._collapsed || false);
                                    setCurrentWorkout(updated);
                                  }}
                                  className="p-1 text-gray-500 hover:text-black active:scale-95 transition cursor-pointer"
                                  title={isCollapsed ? "Expand exercise" : "Collapse exercise"}
                                >
                                  {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                                </button>
                                <h4 className="font-semibold text-black">{exercise.name}</h4>
                                {exercise.instructions && exercise.instructions.length > 0 && (
                                  <button
                                    onClick={() => {
                                      const updated = { ...currentWorkout };
                                      const ex = updated.exercises[exIdx] as WorkoutExercise & { _showInstructions?: boolean };
                                      const currentShow = ex._showInstructions || false;
                                      ex._showInstructions = !currentShow;
                                      setCurrentWorkout(updated);
                                    }}
                                    className="p-2 text-gray-500 hover:text-black active:scale-95 transition cursor-pointer"
                                    title="Show instructions"
                                  >
                                    <Info size={16} />
                                  </button>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 mt-2 mb-4">{exercise.category}</p>
                            </div>
                            <button
                              onClick={() => {
                                setShowDeleteExerciseConfirm({
                                  workoutId: currentWorkout.id,
                                  exerciseIndex: exIdx,
                                  exerciseName: exercise.name
                                });
                              }}
                              className="text-black hover:text-red-600 active:scale-95 ml-4 transition cursor-pointer"
                              title="Delete exercise"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          {!isCollapsed && (
                            <>
                              {exerciseWithState._showInstructions && exercise.instructions && exercise.instructions.length > 0 && (
                                <div className="mb-4 p-4 bg-gray-50 rounded border border-gray-200">
                                  <p className="text-xs font-semibold text-gray-700 mb-3">Instructions:</p>
                                  <ol className="list-decimal list-inside space-y-2">
                                    {exercise.instructions.map((instruction, idx) => (
                                      <li key={idx} className="text-xs text-gray-600">{instruction}</li>
                                    ))}
                                  </ol>
                                </div>
                              )}
                              {exercise.sets.map((set, setIdx) => (
                                <div key={setIdx} className="flex gap-4 mb-4 items-center flex-wrap">
                                  <span className="text-sm text-gray-600 w-16 flex-shrink-0">Set {setIdx + 1}</span>
                                  <input
                                    type="number"
                                    value={set.reps === 0 ? '' : set.reps || ''}
                                    onChange={(e) => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                                    className="w-24 px-3 py-2 border border-gray-300 rounded box-border"
                                    placeholder="Reps"
                                  />
                                  <span className="text-sm text-gray-600 flex-shrink-0">reps</span>
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={set.weight === 0 ? '' : set.weight || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      // Handle empty string
                                      if (val === '') {
                                        updateSet(exIdx, setIdx, 'weight', '');
                                        return;
                                      }
                                      // Prevent leading zeros (except for 0.5, 0.1, etc.)
                                      if (/^0[1-9]/.test(val)) {
                                        // Remove leading zero from numbers like 01, 02, etc.
                                        updateSet(exIdx, setIdx, 'weight', val.replace(/^0+/, ''));
                                      } else {
                                        updateSet(exIdx, setIdx, 'weight', val);
                                      }
                                    }}
                                    className="w-24 px-3 py-2 border border-gray-300 rounded box-border"
                                    placeholder="Weight"
                                  />
                                  <span className="text-sm text-gray-600 flex-shrink-0">lbs</span>
                                </div>
                              ))}
                              <button
                                onClick={() => addSet(exIdx)}
                                className="text-sm text-blue-600 hover:text-blue-700 active:scale-95 mt-4 font-semibold transition cursor-pointer"
                              >
                                + Add Set
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Always-visible search bar */}
                <div className="mb-8 p-4 md:p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200 overflow-x-hidden shadow-md">
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-1 w-8 bg-blue-500 rounded-full"></div>
                      <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wide">Search Exercises</h4>
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Search exercises..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full max-w-full px-3 py-2 border rounded text-sm mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="mb-6">
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="text-sm font-medium text-black">Filters: </span>
                      {categories.map(cat => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-4 py-2 rounded-full text-sm transition active:scale-95 cursor-pointer font-semibold ${
                            selectedCategory === cat
                              ? 'bg-blue-500 text-white'
                              : 'bg-white text-gray-700 border hover:bg-gray-50'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                  {filteredExercises.length > 0 && (
                    <>
                      <h3 className="text-lg font-semibold text-black mb-4">Exercises</h3>
                      <div className="max-h-60 overflow-y-auto space-y-4">
                      {filteredExercises.slice(0, 50).map((ex, idx) => (
                        <ExercisePickerCard
                          key={`${ex.name}-${ex.category}-${idx}`}
                          exercise={ex}
                          onAdd={() => addExercise(ex)}
                        />
                      ))}
                      </div>
                    </>
                  )}
                  {filteredExercises.length === 0 && searchTerm && (
                    <>
                      <h3 className="text-lg font-semibold text-black mb-4">Exercises</h3>
                      <p className="text-center text-gray-500 py-8">No exercises found</p>
                    </>
                  )}
                  {!searchTerm && (
                    <p className="text-center text-gray-500 py-8 text-sm">Start typing to search for exercises</p>
                  )}
                </div>

                {currentWorkout.exercises.length === 0 && (
                  <p className="text-center text-gray-500 py-12">No exercises added yet. Search above to add exercises.</p>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-8">
          {!hasAnalysisData ? (
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 text-center">
              <p className="text-gray-700 mb-4">No workout data available for the selected time period.</p>
              <p className="text-sm text-gray-600">Start logging workouts to see your analysis!</p>
            </div>
          ) : (
            <>
              {/* Time Period Selector */}
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 md:p-6">
                <label className="block text-sm font-semibold mb-4">
                  Analysis Period
                </label>
                <div className="flex gap-4">
                  {([7, 14, 30] as TimePeriod[]).map(period => (
                    <button
                      key={period}
                      onClick={() => setTimePeriod(period)}
                      className={`px-4 py-2 rounded font-semibold text-sm transition active:scale-95 cursor-pointer ${
                        timePeriod === period
                          ? 'bg-purple-500 text-white'
                          : 'bg-white text-gray-700 border hover:bg-gray-50'
                      }`}
                    >
                      Last {period} Days
                    </button>
                  ))}
                </div>
              </div>

              {/* Heatmap and Suggestions Side by Side */}
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="flex-1 min-w-0 self-start">
                  <BodyHeatmap stats={muscleStats} timePeriod={timePeriod} />
                </div>
                <div className="flex-1 min-w-0">
                  <SuggestionsPanel suggestions={suggestions} />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      </div>
    </div>
  );
}

// Saved exercise card component with instructions and editable sets
function SavedExerciseCard({ 
  exercise, 
  workoutId, 
  exerciseIndex,
  onUpdateSet,
  onAddSet,
  onDeleteRequest
}: { 
  exercise: WorkoutExercise;
  workoutId: number;
  exerciseIndex: number;
  onUpdateSet: (workoutId: number, exerciseIndex: number, setIndex: number, field: 'reps' | 'weight', value: string) => void;
  onAddSet: (workoutId: number, exerciseIndex: number) => void;
  onDeleteRequest: (workoutId: number, exerciseIndex: number, exerciseName: string) => void;
}) {
  const [showInstructions, setShowInstructions] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="mb-4 last:mb-0 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-gray-500 hover:text-black active:scale-95 transition cursor-pointer"
            title={isCollapsed ? "Expand exercise" : "Collapse exercise"}
          >
            {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
          <h4 className="font-semibold text-black">{exercise.name}</h4>
          {exercise.instructions && exercise.instructions.length > 0 && (
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="p-2 text-gray-500 hover:text-black active:scale-95 transition cursor-pointer"
              title="Show instructions"
            >
              <Info size={14} />
            </button>
          )}
        </div>
        <button
          onClick={() => onDeleteRequest(workoutId, exerciseIndex, exercise.name)}
          className="text-black hover:text-red-600 active:scale-95 ml-4 transition cursor-pointer"
          title="Delete exercise"
        >
          <Trash2 size={16} />
        </button>
      </div>
      <p className="text-xs text-gray-600 mb-4">{exercise.category} • {exercise.equipment || 'N/A'}</p>
      {!isCollapsed && (
        <>
          {showInstructions && exercise.instructions && exercise.instructions.length > 0 && (
            <div className="mb-4 p-4 bg-gray-50 rounded border border-gray-300">
              <p className="text-xs font-semibold text-black mb-3">Instructions:</p>
              <ol className="list-decimal list-inside space-y-2">
                {exercise.instructions.map((instruction, idx) => (
                  <li key={idx} className="text-xs text-gray-700">{instruction}</li>
                ))}
              </ol>
            </div>
          )}
          <div className="space-y-2">
            {exercise.sets.map((set, setIdx) => (
              <div key={setIdx} className="flex gap-4 items-center flex-wrap">
                <span className="text-sm text-gray-600 w-16 flex-shrink-0">Set {setIdx + 1}</span>
                <input
                  type="number"
                  value={set.reps === 0 ? '' : set.reps || ''}
                  onChange={(e) => onUpdateSet(workoutId, exerciseIndex, setIdx, 'reps', e.target.value)}
                  className="w-24 px-3 py-2 border border-gray-300 rounded box-border"
                  placeholder="Reps"
                />
                <span className="text-sm text-gray-600 flex-shrink-0">reps</span>
                <input
                  type="number"
                  step="0.1"
                  value={set.weight === 0 ? '' : set.weight || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    // Handle empty string
                    if (val === '') {
                      onUpdateSet(workoutId, exerciseIndex, setIdx, 'weight', '');
                      return;
                    }
                    // Prevent leading zeros (except for 0.5, 0.1, etc.)
                    if (/^0[1-9]/.test(val)) {
                      // Remove leading zero from numbers like 01, 02, etc.
                      onUpdateSet(workoutId, exerciseIndex, setIdx, 'weight', val.replace(/^0+/, ''));
                    } else {
                      onUpdateSet(workoutId, exerciseIndex, setIdx, 'weight', val);
                    }
                  }}
                  className="w-24 px-3 py-2 border border-gray-300 rounded box-border"
                  placeholder="Weight"
                />
                <span className="text-sm text-gray-600 flex-shrink-0">lbs</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => onAddSet(workoutId, exerciseIndex)}
            className="text-sm text-blue-600 hover:text-blue-700 active:scale-95 mt-4 font-semibold transition cursor-pointer"
          >
            + Add Set
          </button>
        </>
      )}
    </div>
  );
}
