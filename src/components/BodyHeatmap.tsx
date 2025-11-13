import { useState, useMemo } from 'react';
import Model from 'react-body-highlighter';
import { X } from 'lucide-react';
import type { MuscleGroupStats, TimePeriod } from '../types/workout';
import type { MuscleGroup } from '../utils/muscleGroups';
import { getHeatmapIntensity, getHeatmapColor } from '../utils/workoutAnalysis';
import { getBodyHighlighterMuscles, getMuscleGroupFromHighlighterName } from '../utils/muscleNameMapping';

interface BodyHeatmapProps {
  stats: Map<MuscleGroup, MuscleGroupStats>;
  timePeriod: TimePeriod;
  onMuscleHover?: (muscleGroup: MuscleGroup | null) => void;
}


export default function BodyHeatmap({ stats, timePeriod, onMuscleHover }: BodyHeatmapProps) {
  const [view, setView] = useState<'anterior' | 'posterior'>('anterior');
  const [selectedMuscle, setSelectedMuscle] = useState<{ muscleGroup: MuscleGroup; stat: MuscleGroupStats } | null>(null);

  // Convert our stats to react-body-highlighter format
  const exerciseData = useMemo(() => {
    const data: Array<{ name: string; muscles: string[]; intensity: number }> = [];
    
    stats.forEach((stat, muscleGroup) => {
      const intensity = getHeatmapIntensity(stat, timePeriod);
      const bodyHighlighterMuscles = getBodyHighlighterMuscles(muscleGroup);
      
      bodyHighlighterMuscles.forEach(muscle => {
        data.push({
          name: muscleGroup,
          muscles: [muscle],
          intensity,
        });
      });
    });
    
    return data;
  }, [stats, timePeriod]);

  // Create highlighted colors array based on intensity levels
  const highlightedColors = useMemo(() => {
    const colors = new Set<string>();
    exerciseData.forEach(item => {
      colors.add(getHeatmapColor(item.intensity));
    });
    return Array.from(colors);
  }, [exerciseData]);

  // Create data format for react-body-highlighter
  // The library expects: [{ name: string, muscles: string[] }]
  // We create "exercise" entries for each muscle group that has been worked
  const modelData = useMemo(() => {
    const data: Array<{ name: string; muscles: string[] }> = [];
    
    stats.forEach((stat, muscleGroup) => {
      // Only include muscles that have been worked (engagementCount > 0)
      if (stat.engagementCount > 0) {
        const bodyHighlighterMuscles = getBodyHighlighterMuscles(muscleGroup);
        if (bodyHighlighterMuscles.length > 0) {
          // Create an entry for each muscle in the group
          bodyHighlighterMuscles.forEach(muscle => {
            data.push({
              name: `${muscleGroup} workout`,
              muscles: [muscle],
            });
          });
        }
      }
    });
    
    // If no data, return empty array to avoid errors
    return data.length > 0 ? data : [];
  }, [stats]);

  const handleMuscleClick = ({ muscle }: { muscle: string; data?: any }) => {
    const muscleGroup = getMuscleGroupFromHighlighterName(muscle);
    if (muscleGroup) {
      onMuscleHover?.(muscleGroup);
      const stat = stats.get(muscleGroup);
      if (stat) {
        setSelectedMuscle({ muscleGroup, stat });
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-black mb-2">Muscle Group Heatmap</h3>
        
        {/* Legend as subheader */}
        <div className="flex items-center gap-3 text-xs text-gray-700 mb-3 flex-wrap">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
            <span className="font-medium">Cold (0 workouts)</span>
          </div>
          <span className="text-gray-400">•</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#eab308' }}></div>
            <span className="font-medium">Cool (1-2 workouts)</span>
          </div>
          <span className="text-gray-400">•</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f97316' }}></div>
            <span className="font-medium">Warm (2-3 workouts)</span>
          </div>
          <span className="text-gray-400">•</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }}></div>
            <span className="font-medium">Hot (3+ workouts)</span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setView('anterior')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              view === 'anterior'
                ? 'bg-black text-white border-2 border-black'
                : 'bg-white text-black border-2 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Front
          </button>
          <button
            onClick={() => setView('posterior')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              view === 'posterior'
                ? 'bg-black text-white border-2 border-black'
                : 'bg-white text-black border-2 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Back
          </button>
        </div>
      </div>
      
      <div className="flex flex-col items-center justify-center mb-4 flex-1 min-h-0">
        <div className="relative w-full max-w-full" style={{ maxHeight: '100%' }}>
          <div className="w-full flex justify-center" style={{ maxWidth: '100%', height: 'auto' }}>
            <Model
              data={modelData as any}
              type={view}
              bodyColor="#e5e7eb"
              highlightedColors={highlightedColors}
              onClick={handleMuscleClick}
              style={{ width: '100%', maxWidth: 'min(400px, 100%)', padding: '2rem', height: 'auto' }}
              svgStyle={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))', maxWidth: '100%', height: 'auto' }}
            />
          </div>
        </div>
      </div>
      
      {/* Selected muscle info - more prominent below heatmap */}
      {selectedMuscle && (
        <div className="mt-4 p-4 bg-gray-100 border-2 border-black rounded-lg relative">
          <button
            onClick={() => setSelectedMuscle(null)}
            className="absolute top-2 right-2 text-black hover:text-gray-600 p-1 transition z-10 bg-white rounded"
            title="Close"
          >
            <X size={20} />
          </button>
          <div className="pr-8">
            <h4 className="text-lg font-bold text-black capitalize mb-1">
              {selectedMuscle.muscleGroup}
            </h4>
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Exercise Frequency:</span>{' '}
              {selectedMuscle.stat.workouts} {selectedMuscle.stat.workouts === 1 ? 'exercise' : 'exercises'} in the last {timePeriod} days
            </p>
            {selectedMuscle.stat.lastWorkedDate && (
              <p className="text-xs text-gray-600 mt-1">
                Last worked: {new Date(selectedMuscle.stat.lastWorkedDate).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
