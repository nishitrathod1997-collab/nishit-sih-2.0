import { motion } from 'framer-motion';

const TrafficLight = ({ direction, signal, phase = 'GREEN', emergencyActive = false, isFullscreen = false }) => {
  // Positions aligned precisely with sidewalk curbs next to each approach's stop line
  const positions = isFullscreen
    ? {
      N: { top: 'calc(50% - 152px)', left: 'calc(50% - 86px)' }, 
      S: { top: 'calc(50% + 106px)', left: 'calc(50% + 82px)' }, 
      E: { top: 'calc(50% - 86px)', left: 'calc(50% + 142px)' }, 
      W: { top: 'calc(50% + 82px)', left: 'calc(50% - 152px)' }  
    }
    : {
      N: { top: 'calc(50% - 84px)', left: 'calc(50% - 47px)' }, 
      S: { top: 'calc(50% + 52px)', left: 'calc(50% + 43px)' }, 
      E: { top: 'calc(50% - 47px)', left: 'calc(50% + 76px)' }, 
      W: { top: 'calc(50% + 43px)', left: 'calc(50% - 84px)' }  
    };

  const position = positions[direction];

  const isCurrentDir = signal === direction;
  const isGreen = isCurrentDir && phase === 'GREEN';
  const isYellow = isCurrentDir && phase === 'YELLOW';
  const isRed = !isGreen && !isYellow;

  return (
    <div
      className="absolute z-20 flex flex-col items-center select-none pointer-events-none"
      style={position}
    >
      {/* Sleek, ultra-compact traffic light housing matching reference asset sheet */}
      <div
        className={`bg-[#1E242C] rounded-full shadow-xs border border-[#334155] flex flex-col items-center justify-between ${
          isFullscreen ? 'w-3.5 p-0.5 py-1 space-y-1' : 'w-2.5 p-0.5 py-0.5 space-y-0.5'
        }`}
      >
        {/* Red light */}
        <motion.div
          className={`rounded-full ${
            isFullscreen ? 'w-2 h-2' : 'w-1.5 h-1.5'
          }`}
          style={{
            backgroundColor: isRed ? '#EF4444' : '#2D1616',
            boxShadow: isRed ? '0 0 5px rgba(239, 68, 68, 0.9)' : 'none'
          }}
          animate={{ opacity: isRed ? 1 : 0.3 }}
          transition={{ duration: 0.2 }}
        />

        {/* Yellow light */}
        <motion.div 
          className={`rounded-full ${
            isFullscreen ? 'w-2 h-2' : 'w-1.5 h-1.5'
          }`}
          style={{
            backgroundColor: isYellow ? '#F59E0B' : '#2B2312',
            boxShadow: isYellow ? '0 0 5px rgba(245, 158, 11, 0.9)' : 'none'
          }}
          animate={{ opacity: isYellow ? 1 : 0.3 }}
          transition={{ duration: 0.2 }}
        />

        {/* Green light */}
        <motion.div
          className={`rounded-full ${
            isFullscreen ? 'w-2 h-2' : 'w-1.5 h-1.5'
          }`}
          style={{
            backgroundColor: isGreen ? '#22C55E' : '#12261A',
            boxShadow: isGreen ? '0 0 6px rgba(34, 197, 94, 0.95)' : 'none'
          }}
          animate={{ opacity: isGreen ? 1 : 0.3 }}
          transition={{ duration: 0.2 }}
        />
      </div>

      {/* Emergency Active Pulse Badge */}
      {emergencyActive && isCurrentDir && (
        <motion.div
          className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white"
          animate={{ scale: [1, 1.4, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      )}
    </div>
  );
};

export default TrafficLight;