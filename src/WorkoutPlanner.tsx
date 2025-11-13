import { useState, useEffect, useMemo } from 'react';
import { Calendar, Plus, X, ChevronDown, ChevronUp, Trash2, Loader, BarChart3, Activity, Info } from 'lucide-react';
import type { Workout, Exercise, WorkoutExercise, TimePeriod } from './types/workout';
import { analyzeMuscleGroups, getUnderworkedMuscles, generateSuggestions } from './utils/workoutAnalysis';
import BodyHeatmap from './components/BodyHeatmap';
import SuggestionsPanel from './components/SuggestionsPanel';

// Exercise picker card component with instructions
function ExercisePickerCard({ exercise, onAdd }: { exercise: Exercise; onAdd: () => void }) {
  const [showInstructions, setShowInstructions] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div
        onClick={onAdd}
        className="p-3 hover:bg-gray-100 cursor-pointer transition"
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <p className="font-medium text-black">{exercise.name}</p>
            <p className="text-sm text-gray-700">{exercise.category} • {exercise.equipment || 'N/A'}</p>
            <p className="text-xs text-gray-600 mt-1">
              Primary: {exercise.primaryMuscles.join(', ') || 'N/A'}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowInstructions(!showInstructions);
            }}
            className="ml-2 p-1 text-gray-500 hover:text-black transition"
            title="Show instructions"
          >
            <Info size={16} />
          </button>
        </div>
      </div>
      {showInstructions && exercise.instructions && exercise.instructions.length > 0 && (
        <div className="px-3 pb-3 pt-2 bg-gray-50 border-t border-gray-200">
          <p className="text-xs font-semibold text-gray-700 mb-2">Instructions:</p>
          <ol className="list-decimal list-inside space-y-1">
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
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedWorkout, setExpandedWorkout] = useState<number | null>(null);
  const [exerciseDB, setExerciseDB] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('workouts');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(7);

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
    if (workouts.length > 0) {
      localStorage.setItem('workoutPlanner', JSON.stringify({ workouts }));
    }
  }, [workouts]);

  const startNewWorkout = () => {
    setCurrentWorkout({
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      exercises: []
    });
  };

  const addExercise = (exercise: Exercise) => {
    if (currentWorkout) {
      const workoutExercise: WorkoutExercise = {
        ...exercise,
        sets: [{ reps: 10, weight: 0 }]
      };
      setCurrentWorkout({
        ...currentWorkout,
        exercises: [...currentWorkout.exercises, workoutExercise]
      });
      // Keep exercise picker open so user can add more exercises
      setSearchTerm('');
    }
  };

  const updateSet = (exerciseIndex: number, setIndex: number, field: 'reps' | 'weight', value: string) => {
    if (!currentWorkout) return;
    
    const updated = { ...currentWorkout };
    const numValue = field === 'reps' ? parseInt(value) || 0 : parseFloat(value) || 0;
    updated.exercises[exerciseIndex].sets[setIndex][field] = numValue;
    setCurrentWorkout(updated);
  };

  const addSet = (exerciseIndex: number) => {
    if (!currentWorkout) return;
    
    const updated = { ...currentWorkout };
    const lastSet = updated.exercises[exerciseIndex].sets.slice(-1)[0];
    updated.exercises[exerciseIndex].sets.push({ ...lastSet });
    setCurrentWorkout(updated);
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
      <div className="max-w-6xl mx-auto p-6 bg-gray-100 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin text-black mx-auto mb-4" size={48} />
          <p className="text-gray-700">Loading exercise database...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6 bg-gray-100 min-h-screen flex items-center justify-center">
        <div className="bg-white border-2 border-black rounded-lg p-6 text-center shadow-lg">
          <p className="text-black font-semibold mb-2">Error Loading Exercises</p>
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-100 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg border border-gray-300 p-6 mb-6">
        <h1 className="text-3xl font-bold text-black mb-2">Workout Planner</h1>
        <p className="text-gray-700">Track your fitness journey • {exerciseDB.length} exercises available</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setViewMode('workouts')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2 border-2 ${
            viewMode === 'workouts'
              ? 'bg-black text-white border-black'
              : 'bg-white text-black border-gray-300 hover:bg-gray-50 hover:border-gray-400'
          }`}
        >
          <Activity size={20} />
          Workouts
        </button>
        <button
          onClick={() => setViewMode('analysis')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2 border-2 ${
            viewMode === 'analysis'
              ? 'bg-black text-white border-black'
              : 'bg-white text-black border-gray-300 hover:bg-gray-50 hover:border-gray-400'
          }`}
        >
          <BarChart3 size={20} />
          Analysis
        </button>
      </div>

      {viewMode === 'workouts' ? (
        <>
          {!currentWorkout ? (
            <>
              <button
                onClick={startNewWorkout}
                className="w-full bg-black text-white py-3 px-4 rounded-lg mb-6 flex items-center justify-center gap-2 hover:bg-gray-800 transition border-2 border-black shadow-lg"
              >
                <Plus size={20} />
                Start New Workout
              </button>

              <div className="space-y-4">
                {workouts.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-lg border border-gray-300 p-8 text-center text-gray-600">
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
                    <div className="space-y-6">
                      {sortedDates.map(dateKey => {
                        const dayWorkouts = workoutsByDate[dateKey];
                        const displayDate = new Date(dayWorkouts[0].date);
                        
                        return (
                          <div key={dateKey} className="space-y-4">
                            {/* Date Header */}
                            <div className="flex items-center gap-3">
                              <Calendar className="text-black" size={20} />
                              <h3 className="text-lg font-semibold text-black">
                                {displayDate.toLocaleDateString('en-US', { 
                                  weekday: 'long', 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}
                              </h3>
                            </div>
                            
                            {/* Workouts for this day */}
                            {dayWorkouts.map((workout, workoutIndex) => (
                              <div key={workout.id} className="bg-white rounded-lg shadow-lg border border-gray-300 overflow-hidden ml-8">
                                <div 
                                  className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition"
                                  onClick={() => setExpandedWorkout(expandedWorkout === workout.id ? null : workout.id)}
                                >
                                  <div className="flex items-center gap-3">
                                    <div>
                                      <p className="font-semibold text-black">
                                        Workout {workoutIndex + 1}
                                      </p>
                                      <p className="text-sm text-gray-700">{workout.exercises.length} {workout.exercises.length === 1 ? 'exercise' : 'exercises'}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteWorkout(workout.id);
                                      }}
                                      className="text-black hover:text-gray-600 p-2 transition"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                    {expandedWorkout === workout.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                  </div>
                                </div>
                                
                                {expandedWorkout === workout.id && (
                                  <div className="p-4 bg-gray-50 border-t">
                                    {workout.exercises.map((exercise, idx) => (
                                      <div key={idx} className="mb-4 last:mb-0">
                                        <SavedExerciseCard exercise={exercise} />
                                      </div>
                                    ))}
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
            <div className="bg-white rounded-lg shadow-lg border border-gray-300 p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-black mb-2">Workout Date</label>
                <input
                  type="date"
                  value={currentWorkout.date}
                  onChange={(e) => setCurrentWorkout({ ...currentWorkout, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-black">Exercises</h3>
                  <button
                    onClick={() => setShowExercisePicker(!showExercisePicker)}
                    className="bg-black text-white py-2 px-4 rounded-lg flex items-center gap-2 hover:bg-gray-800 transition border-2 border-black"
                  >
                    <Plus size={16} />
                    Add Exercise
                  </button>
                </div>

                {showExercisePicker && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <input
                      type="text"
                      placeholder="Search exercises..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-black focus:border-black"
                    />
                    <div className="flex gap-2 mb-3 flex-wrap">
                      {categories.map(cat => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-3 py-1 rounded-full text-sm transition ${
                            selectedCategory === cat
                              ? 'bg-black text-white border-2 border-black'
                              : 'bg-white text-black hover:bg-gray-100 border-2 border-gray-300'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {filteredExercises.slice(0, 50).map((ex, idx) => (
                        <ExercisePickerCard
                          key={idx}
                          exercise={ex}
                          onAdd={() => addExercise(ex)}
                        />
                      ))}
                      {filteredExercises.length === 0 && (
                        <p className="text-center text-gray-500 py-4">No exercises found</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {currentWorkout.exercises.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No exercises added yet. Click "Add Exercise" to get started.</p>
                  )}
                  {currentWorkout.exercises.map((exercise, exIdx) => (
                    <div key={exIdx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-black">{exercise.name}</h4>
                            {exercise.instructions && exercise.instructions.length > 0 && (
                              <button
                                onClick={() => {
                                  const updated = { ...currentWorkout };
                                  const currentShow = (updated.exercises[exIdx] as any)._showInstructions || false;
                                  (updated.exercises[exIdx] as any)._showInstructions = !currentShow;
                                  setCurrentWorkout(updated);
                                }}
                                className="p-1 text-gray-500 hover:text-black transition"
                                title="Show instructions"
                              >
                                <Info size={16} />
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-gray-600">{exercise.category}</p>
                        </div>
                        <button
                          onClick={() => {
                            const updated = { ...currentWorkout };
                            updated.exercises.splice(exIdx, 1);
                            setCurrentWorkout(updated);
                          }}
                          className="text-black hover:text-gray-600 ml-2"
                        >
                          <X size={18} />
                        </button>
                      </div>
                      {(exercise as any)._showInstructions && exercise.instructions && exercise.instructions.length > 0 && (
                        <div className="mb-3 p-3 bg-white rounded border border-gray-200">
                          <p className="text-xs font-semibold text-gray-700 mb-2">Instructions:</p>
                          <ol className="list-decimal list-inside space-y-1">
                            {exercise.instructions.map((instruction, idx) => (
                              <li key={idx} className="text-xs text-gray-600">{instruction}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                      {exercise.sets.map((set, setIdx) => (
                        <div key={setIdx} className="flex gap-2 mb-2 items-center">
                          <span className="text-sm text-gray-600 w-12">Set {setIdx + 1}</span>
                          <input
                            type="number"
                            value={set.reps}
                            onChange={(e) => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded"
                            placeholder="Reps"
                          />
                          <span className="text-sm text-gray-600">reps</span>
                          <input
                            type="number"
                            value={set.weight}
                            onChange={(e) => updateSet(exIdx, setIdx, 'weight', e.target.value)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded"
                            placeholder="Weight"
                          />
                          <span className="text-sm text-gray-600">lbs</span>
                        </div>
                      ))}
                      <button
                        onClick={() => addSet(exIdx)}
                        className="text-sm text-black hover:text-gray-700 mt-2 font-medium"
                      >
                        + Add Set
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentWorkout(null)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={saveWorkout}
                  disabled={currentWorkout.exercises.length === 0}
                  className="flex-1 bg-black text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition disabled:bg-gray-400 disabled:cursor-not-allowed border-2 border-black"
                >
                  Save Workout
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6">
          {!hasAnalysisData ? (
            <div className="bg-white rounded-lg shadow-lg border border-gray-300 p-8 text-center">
              <p className="text-gray-700 mb-2">No workout data available for the selected time period.</p>
              <p className="text-sm text-gray-600">Start logging workouts to see your analysis!</p>
            </div>
          ) : (
            <>
              {/* Time Period Selector */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-300 p-4">
                <label className="block text-sm font-medium text-black mb-2">
                  Analysis Period
                </label>
                <div className="flex gap-2">
                  {([7, 14, 30] as TimePeriod[]).map(period => (
                    <button
                      key={period}
                      onClick={() => setTimePeriod(period)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        timePeriod === period
                          ? 'bg-black text-white border-2 border-black'
                          : 'bg-white text-black border-2 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Last {period} Days
                    </button>
                  ))}
                </div>
              </div>

              {/* Heatmap and Suggestions Side by Side */}
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 min-w-0">
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
  );
}

// Saved exercise card component with instructions
function SavedExerciseCard({ exercise }: { exercise: WorkoutExercise }) {
  const [showInstructions, setShowInstructions] = useState(false);

  return (
    <div className="mb-4 last:mb-0 p-3 bg-white rounded border border-gray-200">
      <div className="flex items-center gap-2 mb-2">
        <h4 className="font-semibold text-black">{exercise.name}</h4>
        {exercise.instructions && exercise.instructions.length > 0 && (
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="p-1 text-gray-500 hover:text-black transition"
            title="Show instructions"
          >
            <Info size={14} />
          </button>
        )}
      </div>
      <p className="text-xs text-gray-600 mb-2">{exercise.category} • {exercise.equipment || 'N/A'}</p>
      {showInstructions && exercise.instructions && exercise.instructions.length > 0 && (
        <div className="mb-2 p-2 bg-gray-50 rounded border border-gray-300">
          <p className="text-xs font-semibold text-black mb-1">Instructions:</p>
          <ol className="list-decimal list-inside space-y-0.5">
            {exercise.instructions.map((instruction, idx) => (
              <li key={idx} className="text-xs text-gray-700">{instruction}</li>
            ))}
          </ol>
        </div>
      )}
      {exercise.sets.map((set, setIdx) => (
        <p key={setIdx} className="text-sm text-gray-700">
          Set {setIdx + 1}: {set.reps} reps × {set.weight} lbs
        </p>
      ))}
    </div>
  );
}
