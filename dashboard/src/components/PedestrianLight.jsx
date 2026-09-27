import React from 'react';
import { motion } from 'framer-motion';
import { Hand, PersonStanding } from 'lucide-react';

/**
 * Realistic Compact Pedestrian Signal Light Head
 * @param {string} status 'WALK' | 'STOP'
 * @param {string} label optional direction label (e.g. 'N', 'S', 'E', 'W')
 * @param {boolean} isFullscreen
 */
const PedestrianLight = ({ status = 'STOP', isFullscreen = false, className = '' }) => {
  const isWalk = status === 'WALK';

  return (
    <div className={`flex flex-col items-center select-none pointer-events-none ${className}`}>
      {/* Signal Housing */}
      <div className={`bg-gray-950 rounded-[4px] border border-gray-700 shadow-md flex flex-col items-center justify-between ${
        isFullscreen ? 'w-5 h-9 p-0.5 space-y-0.5' : 'w-3.5 h-6 p-[2px] space-y-[2px]'
      }`}>
        {/* Red STOP Hand / Standing Person */}
        <motion.div
          className={`w-full flex items-center justify-center rounded-[2px] transition-colors duration-300 ${
            !isWalk 
              ? 'bg-red-600 text-white shadow-[0_0_6px_rgba(239,68,68,0.9)]' 
              : 'bg-red-950/60 text-red-900/40'
          }`}
          style={{ height: '48%' }}
        >
          <span className={isFullscreen ? 'text-[9px] leading-none' : 'text-[6px] leading-none font-bold'}>
            <Hand size={16} />
          </span>
        </motion.div>

        {/* Green WALK Person */}
        <motion.div
          className={`w-full flex items-center justify-center rounded-[2px] transition-colors duration-300 ${
            isWalk 
              ? 'bg-emerald-500 text-white shadow-[0_0_6px_rgba(34,197,94,0.9)]' 
              : 'bg-emerald-950/60 text-emerald-900/40'
          }`}
          style={{ height: '48%' }}
          animate={isWalk ? { opacity: [1, 0.7, 1] } : { opacity: 1 }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          <span className={isFullscreen ? 'text-[11px] leading-none' : 'text-[7px] leading-none'}>
            🚶‍♀️
          </span>
        </motion.div>
      </div>

      {/* Tiny Post Mount */}
      <div className={`bg-gray-700 rounded-b-[1px] ${isFullscreen ? 'w-1 h-1.5' : 'w-0.5 h-1'}`} />
    </div>
  );
};

export default PedestrianLight;
