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
            className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 active:scale-95 transition cursor-pointer flex items-center gap-2 text-sm font-medium"
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
      <div className="bg-white rounded-lg shadow-lg border border-gray-300 p-6 mb-8">
        <h1 className="text-3xl font-bold text-black mb-4">Workout Analysis</h1>
        <p className="text-gray-700">Analyze your fitness journey • {exerciseDB.length} exercises available!</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setViewMode('workouts')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2 border-2 active:scale-95 cursor-pointer ${
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
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2 border-2 active:scale-95 cursor-pointer ${
            viewMode === 'analysis'
              ? 'bg-black text-white border-black'
              : 'bg-white text-black border-gray-300 hover:bg-gray-50 hover:border-gray-400'
          }`}
        >
          <BarChart3 size={20} />
          Analysis
        </button>
      </div>

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
          onClick={() => setShowClearConfirm(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl border-2 border-black p-8 w-full max-w-md mx-auto" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-black mb-4">Clear All Workouts?</h3>
              <div className="h-1 w-12 bg-black rounded-full"></div>
            </div>
            <p className="text-gray-700 mb-8 leading-relaxed">
              This will permanently delete all <span className="font-semibold text-black">{workouts.length}</span> workout{workouts.length === 1 ? '' : 's'}. This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 bg-gray-200 text-gray-800 py-4 px-6 rounded-lg hover:bg-gray-300 active:scale-95 transition cursor-pointer font-medium border-2 border-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={clearAllWorkouts}
                className="flex-1 bg-red-600 text-white py-4 px-6 rounded-lg hover:bg-red-700 active:scale-95 transition cursor-pointer font-medium border-2 border-red-700 shadow-lg"
              >
                Clear All
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
                  className="flex-1 bg-black text-white py-4 px-6 rounded-lg flex items-center justify-center gap-3 hover:bg-gray-800 active:scale-95 transition border-2 border-black shadow-lg cursor-pointer"
                >
                  <Plus size={20} />
                  Start New Workout
                </button>
                {workouts.length > 0 && (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="bg-red-600 text-white py-4 px-6 rounded-lg flex items-center justify-center gap-3 hover:bg-red-700 active:scale-95 transition border-2 border-red-700 shadow-lg cursor-pointer"
                  >
                    <Trash2 size={20} />
                    Clear All
                  </button>
                )}
              </div>

              <div className="space-y-6">
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
                    <div className="space-y-8">
                      {sortedDates.map(dateKey => {
                        const dayWorkouts = workoutsByDate[dateKey];
                        const displayDate = new Date(dayWorkouts[0].date);
                        
                        return (
                          <div key={dateKey} className="space-y-4">
                            {/* Date Header */}
                            <div className="flex items-center gap-4">
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
                                  className="p-6 flex justify-between items-center cursor-pointer hover:bg-gray-50 active:scale-[0.98] transition"
                                  onClick={() => setExpandedWorkout(expandedWorkout === workout.id ? null : workout.id)}
                                >
                                  <div className="flex items-center gap-4">
                                  <div>
                                    <p className="font-semibold text-black">
                                      Workout {workoutIndex + 1}
                                    </p>
                                    <p className="text-sm text-gray-700 mt-2">{workout.exercises.length} {workout.exercises.length === 1 ? 'exercise' : 'exercises'}</p>
                                  </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteWorkout(workout.id);
                                      }}
                                      className="text-black hover:text-red-600 active:scale-95 p-2 transition cursor-pointer"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                    {expandedWorkout === workout.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                  </div>
                                </div>
                                
                                {expandedWorkout === workout.id && (
                                  <div className="p-6 bg-gray-50 border-t">
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
            <div className="bg-white rounded-lg shadow-lg border border-gray-300 p-6 overflow-x-hidden">
              <div className="mb-8">
                <div className="flex items-end gap-4 mb-8">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-black mb-4">Workout Date</label>
                    <input
                      type="date"
                      value={currentWorkout.date}
                      onChange={(e) => setCurrentWorkout({ ...currentWorkout, date: e.target.value })}
                      className="w-full max-w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black box-border"
                    />
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setCurrentWorkout(null)}
                      className="bg-gray-200 text-gray-800 py-4 px-6 rounded-lg hover:bg-gray-300 active:scale-95 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveWorkout}
                      disabled={currentWorkout.exercises.length === 0}
                      className="bg-black text-white py-4 px-6 rounded-lg hover:bg-gray-800 active:scale-95 transition disabled:bg-gray-400 disabled:cursor-not-allowed disabled:active:scale-100 border-2 border-black cursor-pointer"
                    >
                      Save Workout
                    </button>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                {/* Added exercises - shown first, right below search */}
                {currentWorkout.exercises.length > 0 && (
                  <div className="mb-8 space-y-4">
                    <div className="border-t-2 border-b-2 border-black py-4 mb-6">
                      <h4 className="text-sm font-semibold text-black uppercase tracking-wide">Added Exercises</h4>
                    </div>
                    {currentWorkout.exercises.map((exercise, exIdx) => (
                    <div key={exIdx} className="p-6 bg-white rounded-lg border-2 border-black shadow-sm overflow-x-hidden">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="font-semibold text-black">{exercise.name}</h4>
                            {exercise.instructions && exercise.instructions.length > 0 && (
                              <button
                                onClick={() => {
                                  const updated = { ...currentWorkout };
                                  const currentShow = (updated.exercises[exIdx] as any)._showInstructions || false;
                                  (updated.exercises[exIdx] as any)._showInstructions = !currentShow;
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
                            const updated = { ...currentWorkout };
                            updated.exercises.splice(exIdx, 1);
                            setCurrentWorkout(updated);
                          }}
                          className="text-black hover:text-red-600 active:scale-95 ml-4 transition cursor-pointer"
                        >
                          <X size={18} />
                        </button>
                      </div>
                      {(exercise as any)._showInstructions && exercise.instructions && exercise.instructions.length > 0 && (
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
                            value={set.reps}
                            onChange={(e) => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                            className="w-24 px-3 py-2 border border-gray-300 rounded box-border"
                            placeholder="Reps"
                          />
                          <span className="text-sm text-gray-600 flex-shrink-0">reps</span>
                          <input
                            type="number"
                            value={set.weight}
                            onChange={(e) => updateSet(exIdx, setIdx, 'weight', e.target.value)}
                            className="w-24 px-3 py-2 border border-gray-300 rounded box-border"
                            placeholder="Weight"
                          />
                          <span className="text-sm text-gray-600 flex-shrink-0">lbs</span>
                        </div>
                      ))}
                      <button
                        onClick={() => addSet(exIdx)}
                        className="text-sm text-black hover:text-gray-700 active:scale-95 mt-4 font-medium transition cursor-pointer"
                      >
                        + Add Set
                      </button>
                    </div>
                  ))}
                  </div>
                )}

                {/* Always-visible search bar */}
                <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200 overflow-x-hidden">
                  <div className="border-t-2 border-b-2 border-gray-400 py-3 mb-4">
                    <h4 className="text-xs font-semibold text-black uppercase tracking-wide">Search</h4>
                  </div>
                  <input
                    type="text"
                    placeholder="Search exercises..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full max-w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-black focus:border-black box-border"
                  />
                  <div className="mb-6">
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="text-sm font-medium text-black">Filters: </span>
                      {categories.map(cat => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-4 py-2 rounded-full text-sm transition active:scale-95 cursor-pointer ${
                            selectedCategory === cat
                              ? 'bg-black text-white border-2 border-black'
                              : 'bg-white text-black hover:bg-gray-100 border-2 border-gray-300'
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
            <div className="bg-white rounded-lg shadow-lg border border-gray-300 p-8 text-center">
              <p className="text-gray-700 mb-4">No workout data available for the selected time period.</p>
              <p className="text-sm text-gray-600">Start logging workouts to see your analysis!</p>
            </div>
          ) : (
            <>
              {/* Time Period Selector */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-300 p-6">
                <label className="block text-sm font-medium text-black mb-4">
                  Analysis Period
                </label>
                <div className="flex gap-4">
                  {([7, 14, 30] as TimePeriod[]).map(period => (
                    <button
                      key={period}
                      onClick={() => setTimePeriod(period)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition active:scale-95 cursor-pointer ${
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
    <div className="mb-4 last:mb-0 p-4 bg-white rounded border border-gray-200">
      <div className="flex items-center gap-3 mb-4">
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
      <p className="text-xs text-gray-600 mb-4">{exercise.category} • {exercise.equipment || 'N/A'}</p>
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
          <p key={setIdx} className="text-sm text-gray-700">
            Set {setIdx + 1}: {set.reps} reps × {set.weight} lbs
          </p>
        ))}
      </div>
    </div>
  );
}
