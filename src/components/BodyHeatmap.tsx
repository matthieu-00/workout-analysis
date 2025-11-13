import { useState } from 'react';
import { MuscleGroupStats, TimePeriod } from '../types/workout';
import { MuscleGroup } from '../utils/muscleGroups';
import { getHeatmapIntensity, getHeatmapColor } from '../utils/workoutAnalysis';

interface BodyHeatmapProps {
  stats: Map<MuscleGroup, MuscleGroupStats>;
  timePeriod: TimePeriod;
  onMuscleHover?: (muscleGroup: MuscleGroup | null) => void;
}

// Body SVG paths for front and back views
// Coordinates are relative to a 400x600 viewBox with center at (200, 300)
const bodyRegions: Record<MuscleGroup, { front?: string; back?: string }> = {
  // Front view
  chest: { 
    front: 'M 160 140 Q 180 130 200 130 Q 220 130 240 140 L 240 200 Q 240 210 235 215 Q 230 220 200 220 Q 170 220 165 215 Q 160 210 160 200 Z' 
  },
  shoulders: { 
    front: 'M 150 120 Q 160 110 170 115 L 175 140 Q 175 150 170 155 L 160 160 Q 155 160 150 155 Z M 230 120 Q 240 110 250 115 L 255 140 Q 255 150 250 155 L 240 160 Q 235 160 230 155 Z',
    back: 'M 150 120 Q 160 110 170 115 L 175 140 Q 175 150 170 155 L 160 160 Q 155 160 150 155 Z M 230 120 Q 240 110 250 115 L 255 140 Q 255 150 250 155 L 240 160 Q 235 160 230 155 Z'
  },
  biceps: { 
    front: 'M 170 160 L 185 160 L 190 220 L 175 220 Z M 215 160 L 230 160 L 225 220 L 210 220 Z' 
  },
  triceps: { 
    front: 'M 155 160 L 170 160 L 175 220 L 160 220 Z M 230 160 L 245 160 L 240 220 L 225 220 Z',
    back: 'M 155 160 L 170 160 L 175 220 L 160 220 Z M 230 160 L 245 160 L 240 220 L 225 220 Z'
  },
  forearms: { 
    front: 'M 160 220 L 180 220 L 185 280 L 165 280 Z M 220 220 L 240 220 L 235 280 L 215 280 Z',
    back: 'M 160 220 L 180 220 L 185 280 L 165 280 Z M 220 220 L 240 220 L 235 280 L 215 280 Z'
  },
  abdominals: { 
    front: 'M 170 220 Q 185 220 200 220 Q 215 220 230 220 L 230 280 Q 230 290 200 290 Q 170 290 170 280 Z' 
  },
  quadriceps: { 
    front: 'M 175 300 L 200 300 L 205 420 L 180 420 Z M 200 300 L 225 300 L 220 420 L 195 420 Z' 
  },
  hamstrings: { 
    back: 'M 175 300 L 200 300 L 205 420 L 180 420 Z M 200 300 L 225 300 L 220 420 L 195 420 Z' 
  },
  glutes: { 
    back: 'M 170 280 Q 185 280 200 280 Q 215 280 230 280 L 230 320 Q 230 330 200 330 Q 170 330 170 320 Z' 
  },
  calves: { 
    front: 'M 180 420 L 195 420 L 198 520 L 183 520 Z M 205 420 L 220 420 L 217 520 L 202 520 Z',
    back: 'M 180 420 L 195 420 L 198 520 L 183 520 Z M 205 420 L 220 420 L 217 520 L 202 520 Z'
  },
  // Back view
  back: { 
    back: 'M 160 140 Q 180 130 200 130 Q 220 130 240 140 L 240 250 Q 240 260 200 260 Q 160 260 160 250 Z' 
  },
  traps: { 
    back: 'M 170 100 Q 185 90 200 90 Q 215 90 230 100 L 230 140 Q 230 150 200 150 Q 170 150 170 140 Z' 
  },
  lats: { 
    back: 'M 150 160 L 170 160 L 175 240 L 155 240 Z M 230 160 L 250 160 L 245 240 L 225 240 Z' 
  },
  'middle back': { 
    back: 'M 170 160 Q 185 160 200 160 Q 215 160 230 160 L 230 220 Q 230 230 200 230 Q 170 230 170 220 Z' 
  },
  'lower back': { 
    back: 'M 170 220 Q 185 220 200 220 Q 215 220 230 220 L 230 280 Q 230 290 200 290 Q 170 290 170 280 Z' 
  },
  adductors: { 
    front: 'M 170 320 L 180 320 L 182 420 L 172 420 Z M 220 320 L 230 320 L 228 420 L 218 420 Z' 
  },
  abductors: { 
    front: 'M 160 320 L 170 320 L 172 420 L 162 420 Z M 230 320 L 240 320 L 238 420 L 228 420 Z' 
  },
  neck: { 
    front: 'M 185 70 Q 195 60 200 60 Q 205 60 215 70 L 215 120 Q 215 130 200 130 Q 185 130 185 120 Z',
    back: 'M 185 70 Q 195 60 200 60 Q 205 60 215 70 L 215 120 Q 215 130 200 130 Q 185 130 185 120 Z'
  },
};

export default function BodyHeatmap({ stats, timePeriod, onMuscleHover }: BodyHeatmapProps) {
  const [hoveredMuscle, setHoveredMuscle] = useState<MuscleGroup | null>(null);
  const [view, setView] = useState<'front' | 'back'>('front');

  const handleMouseEnter = (muscleGroup: MuscleGroup) => {
    setHoveredMuscle(muscleGroup);
    onMuscleHover?.(muscleGroup);
  };

  const handleMouseLeave = () => {
    setHoveredMuscle(null);
    onMuscleHover?.(null);
  };

  const renderBodyView = (side: 'front' | 'back') => {
    return (
      <svg width="400" height="600" viewBox="0 0 400 600" className="w-full h-auto max-w-md mx-auto">
        {/* Body outline - simplified human silhouette */}
        <path
          d="M 200 50 Q 180 50 170 70 L 150 120 Q 140 140 145 160 L 145 200 Q 145 220 150 240 L 150 280 Q 150 300 160 320 L 160 400 Q 160 420 170 440 L 180 480 Q 185 500 200 500 Q 215 500 220 480 L 230 440 Q 240 420 240 400 L 240 320 Q 250 300 250 280 L 250 240 Q 255 220 255 200 L 255 160 Q 260 140 250 120 L 230 70 Q 220 50 200 50 Z"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="3"
        />
        
        {/* Muscle groups */}
        {Array.from(stats.entries()).map(([muscleGroup, stat]) => {
          const region = bodyRegions[muscleGroup];
          const path = region?.[side];
          
          if (!path) return null;
          
          const intensity = getHeatmapIntensity(stat, timePeriod);
          const color = getHeatmapColor(intensity);
          const isHovered = hoveredMuscle === muscleGroup;
          
          return (
            <g key={`${muscleGroup}-${side}`}>
              <path
                d={path}
                fill={color}
                fillOpacity={isHovered ? 0.85 : 0.65}
                stroke={isHovered ? '#1f2937' : color}
                strokeWidth={isHovered ? 2.5 : 1}
                onMouseEnter={() => handleMouseEnter(muscleGroup)}
                onMouseLeave={handleMouseLeave}
                className="cursor-pointer transition-all"
                style={{ filter: isHovered ? 'brightness(1.15) drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none' }}
              />
              {isHovered && (
                <g>
                  <rect
                    x="50"
                    y="20"
                    width="300"
                    height="30"
                    fill="rgba(255, 255, 255, 0.95)"
                    stroke="#1f2937"
                    strokeWidth="1"
                    rx="4"
                  />
                  <text
                    x="200"
                    y="40"
                    textAnchor="middle"
                    className="text-sm font-semibold fill-gray-800"
                  >
                    {muscleGroup.charAt(0).toUpperCase() + muscleGroup.slice(1)} - {stat.engagementCount.toFixed(1)} workouts
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-800">Muscle Group Heatmap</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setView('front')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              view === 'front'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Front
          </button>
          <button
            onClick={() => setView('back')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              view === 'back'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Back
          </button>
        </div>
      </div>
      
      <div className="flex justify-center mb-4">
        {view === 'front' ? renderBodyView('front') : renderBodyView('back')}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
          <span>Cold (0 workouts)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#eab308' }}></div>
          <span>Cool (1-2 workouts)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f97316' }}></div>
          <span>Warm (2-3 workouts)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
          <span>Hot (3+ workouts)</span>
        </div>
      </div>
    </div>
  );
}

