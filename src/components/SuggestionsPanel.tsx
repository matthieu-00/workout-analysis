import { useState } from 'react';
import type { Suggestion, Exercise } from '../types/workout';
import { Plus, ChevronDown, ChevronUp, Info } from 'lucide-react';

interface SuggestionsPanelProps {
  suggestions: Suggestion[];
  onAddExercise?: (exercise: Exercise) => void;
}

export default function SuggestionsPanel({ suggestions, onAddExercise }: SuggestionsPanelProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedExercises, setExpandedExercises] = useState<Map<string, boolean>>(new Map());

  const toggleGroup = (muscleGroup: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(muscleGroup)) {
      newExpanded.delete(muscleGroup);
    } else {
      newExpanded.add(muscleGroup);
    }
    setExpandedGroups(newExpanded);
  };

  const toggleExercises = (muscleGroup: string) => {
    const newExpanded = new Map(expandedExercises);
    newExpanded.set(muscleGroup, !newExpanded.get(muscleGroup));
    setExpandedExercises(newExpanded);
  };

  if (suggestions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-300 p-6 h-full flex flex-col">
        <h3 className="text-xl font-semibold text-black mb-6">Exercise Suggestions</h3>
        <div className="text-center py-12 text-gray-600 flex-1 flex items-center justify-center">
          <p>Great job! All major muscle groups have been worked in the last week.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-300 p-6 h-full flex flex-col">
      <h3 className="text-xl font-semibold text-black mb-4">Exercise Suggestions</h3>
      <p className="text-sm text-gray-700 mb-6">
        These muscle groups haven't been worked in the last week. Consider adding these exercises:
      </p>
      
      <div className="space-y-4 overflow-y-auto flex-1 pr-2">
        {suggestions.map((suggestion) => {
          const isGroupExpanded = expandedGroups.has(suggestion.muscleGroup);
          const showAllExercises = expandedExercises.get(suggestion.muscleGroup) || false;
          const initialExercises = suggestion.exercises.slice(0, 3);
          const remainingExercises = suggestion.exercises.slice(3);
          const hasMore = remainingExercises.length > 0;

          return (
            <div
              key={suggestion.muscleGroup}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggleGroup(suggestion.muscleGroup)}
                className="w-full p-4 bg-gray-50 hover:bg-gray-100 active:scale-[0.98] transition flex justify-between items-center cursor-pointer"
              >
                <div className="text-left">
                  <h4 className="font-semibold text-black capitalize">
                    {suggestion.muscleGroup}
                  </h4>
                  <p className="text-sm text-gray-700 mt-2">{suggestion.reason}</p>
                </div>
                {isGroupExpanded ? (
                  <ChevronUp className="text-gray-600" size={20} />
                ) : (
                  <ChevronDown className="text-gray-600" size={20} />
                )}
              </button>

              {isGroupExpanded && (
                <div className="p-6 bg-white">
                  <div className="space-y-4">
                    {initialExercises.map((exercise, idx) => (
                      <ExerciseCard
                        key={idx}
                        exercise={exercise}
                      />
                    ))}
                    
                    {hasMore && (
                      <>
                        {showAllExercises && (
                          <div className="space-y-4 mt-4">
                            {remainingExercises.map((exercise, idx) => (
                              <ExerciseCard
                                key={idx + 3}
                                exercise={exercise}
                              />
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => toggleExercises(suggestion.muscleGroup)}
                          className="w-full text-sm text-black hover:text-gray-700 active:scale-95 font-medium py-3 flex items-center justify-center gap-2 transition cursor-pointer"
                        >
                          {showAllExercises ? (
                            <>
                              <ChevronUp size={16} />
                              Show Less
                            </>
                          ) : (
                            <>
                              <ChevronDown size={16} />
                              Show {remainingExercises.length} More Exercises
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ExerciseCardProps {
  exercise: Exercise;
  onAdd?: (exercise: Exercise) => void;
}

function ExerciseCard({ exercise, onAdd }: ExerciseCardProps) {
  const [showInstructions, setShowInstructions] = useState(false);

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex items-start justify-between p-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h5 className="font-medium text-black">{exercise.name}</h5>
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
          <div className="flex flex-wrap gap-3 mt-4">
            <span className="text-xs px-3 py-1.5 bg-gray-200 text-black rounded border border-gray-300">
              {exercise.category}
            </span>
            {exercise.equipment && (
              <span className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded border border-gray-300">
                {exercise.equipment}
              </span>
            )}
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-700">
              <span className="font-medium">Primary:</span>{' '}
              {exercise.primaryMuscles.join(', ') || 'N/A'}
            </p>
            {exercise.secondaryMuscles.length > 0 && (
              <p className="text-xs text-gray-700 mt-2">
                <span className="font-medium">Secondary:</span>{' '}
                {exercise.secondaryMuscles.join(', ')}
              </p>
            )}
          </div>
        </div>
        {onAdd && (
          <button
            onClick={() => onAdd(exercise)}
            className="ml-4 p-3 text-black hover:text-gray-700 hover:bg-gray-100 active:scale-95 rounded transition border border-gray-300 cursor-pointer"
            title="Add to workout"
          >
            <Plus size={18} />
          </button>
        )}
      </div>
      {showInstructions && exercise.instructions && exercise.instructions.length > 0 && (
        <div className="px-4 pb-4 pt-3 bg-white border-t border-gray-200">
          <p className="text-xs font-semibold text-black mb-3">Instructions:</p>
          <ol className="list-decimal list-inside space-y-2">
            {exercise.instructions.map((instruction, idx) => (
              <li key={idx} className="text-xs text-gray-700">{instruction}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

