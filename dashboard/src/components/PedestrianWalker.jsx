import React from 'react';

/**
 * Pedestrian Walker (🚶‍♀️)
 *
 * @param {string} direction 'horizontal' | 'vertical' | 'reverse-horizontal' | 'reverse-vertical'
 * @param {boolean} isWalking whether the pedestrian is actively crossing
 * @param {boolean} isFullscreen
 */
export const PedestrianWalker = ({ 
  direction = 'horizontal', 
  isWalking = true, 
  isFullscreen = false 
}) => {
  const isReversed = direction === 'reverse-horizontal';
  const fontSize = isFullscreen ? 'text-2xl' : 'text-lg';

  return (
    <div 
      className={`relative inline-flex items-center justify-center select-none pointer-events-none ${fontSize} leading-none`}
      style={{
        transform: isReversed ? 'scaleX(-1)' : 'none',
        filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.9))'
      }}
    >
      <span className="inline-block transform transition-transform">
        🚶‍♀️
      </span>
      {isWalking && (
        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 border border-slate-900 animate-ping" />
      )}
    </div>
  );
};

export default PedestrianWalker;
