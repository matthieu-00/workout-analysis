import { useState, useEffect } from 'react';
import { Dumbbell, Calendar, Clock, TrendingUp, RefreshCw } from 'lucide-react';

interface Exercise {
  id: string;
  name: string;
  category: string;
  sets?: number;
  reps?: number;
  duration?: string;
  difficulty?: string;
}

const WorkoutPlanner = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);

  // URL to a sample JSON gist with exercise data
  const EXERCISES_URL = 'https://gist.githubusercontent.com/matthieu-00/example/raw/exercises.json';

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    setLoading(true);
    setError(null);
    try {
      // For demo purposes, using mock data if the gist doesn't exist
      // In production, replace with actual gist URL
      const mockData: Exercise[] = [
        { id: '1', name: 'Push-ups', category: 'Upper Body', sets: 3, reps: 15, difficulty: 'Beginner' },
        { id: '2', name: 'Squats', category: 'Lower Body', sets: 3, reps: 20, difficulty: 'Beginner' },
        { id: '3', name: 'Plank', category: 'Core', duration: '60s', difficulty: 'Beginner' },
        { id: '4', name: 'Burpees', category: 'Full Body', sets: 3, reps: 10, difficulty: 'Intermediate' },
        { id: '5', name: 'Mountain Climbers', category: 'Core', sets: 3, reps: 20, difficulty: 'Intermediate' },
        { id: '6', name: 'Pull-ups', category: 'Upper Body', sets: 3, reps: 8, difficulty: 'Advanced' },
        { id: '7', name: 'Lunges', category: 'Lower Body', sets: 3, reps: 15, difficulty: 'Beginner' },
        { id: '8', name: 'Deadlifts', category: 'Lower Body', sets: 4, reps: 8, difficulty: 'Advanced' },
      ];

      // Try to fetch from gist, fallback to mock data
      try {
        const response = await fetch(EXERCISES_URL);
        if (response.ok) {
          const data = await response.json();
          setExercises(data.exercises || data);
        } else {
          setExercises(mockData);
        }
      } catch {
        // Use mock data if fetch fails
        setExercises(mockData);
      }
    } catch (err) {
      setError('Failed to load exercises');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addToWorkout = (exercise: Exercise) => {
    if (!selectedExercises.find(e => e.id === exercise.id)) {
      setSelectedExercises([...selectedExercises, exercise]);
    }
  };

  const removeFromWorkout = (exerciseId: string) => {
    setSelectedExercises(selectedExercises.filter(e => e.id !== exerciseId));
  };

  const clearWorkout = () => {
    setSelectedExercises([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 mx-auto mb-4 text-indigo-600 animate-spin" />
          <p className="text-gray-600">Loading exercises...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchExercises}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Dumbbell className="w-12 h-12 text-indigo-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-800">Workout Planner</h1>
          </div>
          <p className="text-gray-600">Build your custom workout routine</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Exercise Library */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                <TrendingUp className="w-6 h-6 mr-2 text-indigo-600" />
                Exercise Library
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exercises.map((exercise) => (
                  <div
                    key={exercise.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg text-gray-800">{exercise.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        exercise.difficulty === 'Beginner' ? 'bg-green-100 text-green-800' :
                        exercise.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {exercise.difficulty}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{exercise.category}</p>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        {exercise.sets && exercise.reps && `${exercise.sets} sets × ${exercise.reps} reps`}
                        {exercise.duration && `Duration: ${exercise.duration}`}
                      </div>
                      <button
                        onClick={() => addToWorkout(exercise)}
                        disabled={selectedExercises.some(e => e.id === exercise.id)}
                        className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                          selectedExercises.some(e => e.id === exercise.id)
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                      >
                        {selectedExercises.some(e => e.id === exercise.id) ? 'Added' : 'Add'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Workout Plan */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                <Calendar className="w-6 h-6 mr-2 text-indigo-600" />
                Your Workout
              </h2>
              
              {selectedExercises.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>No exercises selected yet</p>
                  <p className="text-sm mt-2">Add exercises from the library</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                    {selectedExercises.map((exercise, index) => (
                      <div
                        key={exercise.id}
                        className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center">
                            <span className="text-sm font-semibold text-gray-500 mr-2">
                              {index + 1}.
                            </span>
                            <span className="font-medium text-gray-800">{exercise.name}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 ml-5">
                            {exercise.sets && exercise.reps && `${exercise.sets} × ${exercise.reps}`}
                            {exercise.duration && exercise.duration}
                          </p>
                        </div>
                        <button
                          onClick={() => removeFromWorkout(exercise.id)}
                          className="text-red-500 hover:text-red-700 text-sm ml-2"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={clearWorkout}
                    className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Clear All
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkoutPlanner;
