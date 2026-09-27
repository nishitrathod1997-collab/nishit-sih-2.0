import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, CloudRain, CloudFog, Minimize, Maximize, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import Car from './car';
import TrafficLight from './TrafficLight';
import PedestrianLight from './PedestrianLight';
import ParkEnvironment from './ParkEnvironment';
import WeatherEffects from './WeatherEffects';

const SimulationCanvas = ({
  state,
  weatherMode,
  isFullscreen,
  intersectionRef,
  setWeather,
  toggleFullscreen,
  triggerEmergencyVehicle,
  onSelectVehicle,
  selectedVehicleId
}) => {
  const { lang } = useLanguage();

  return (
    <div
      ref={intersectionRef}
      className={`relative w-full bg-[#D9DEE3] rounded-2xl overflow-hidden border border-[#CBD2D9] shadow-xs select-none ${isFullscreen ? 'h-full' : 'h-[380px]'
        }`}
    >
      {/* Neutral Ground, Sidewalks, and Compact Realistic Greenery */}
      <ParkEnvironment isFullscreen={isFullscreen} />

      {/* Road asphalt layers & markings */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Horizontal road (#454D57 dark slate) */}
        <div
          className={`absolute top-1/2 left-0 w-full bg-[#454D57] transform -translate-y-1/2 shadow-xs ${isFullscreen ? 'h-40' : 'h-20'
            }`}
        >
          {/* Yellow double center line */}
          <div className="absolute top-1/2 left-0 w-full h-[2.5px] bg-[#EAB308] transform -translate-y-1/2 shadow-xs" />
          {/* Dashed lane lines */}
          <div className="absolute top-1/4 left-0 w-full border-t border-dashed border-white/50" />
          <div className="absolute top-3/4 left-0 w-full border-t border-dashed border-white/50" />
        </div>

        {/* Vertical road (#454D57 dark slate) */}
        <div
          className={`absolute left-1/2 top-0 h-full bg-[#454D57] transform -translate-x-1/2 shadow-xs ${isFullscreen ? 'w-40' : 'w-20'
            }`}
        >
          {/* Yellow double center line */}
          <div className="absolute left-1/2 top-0 w-[2.5px] h-full bg-[#EAB308] transform -translate-x-1/2 shadow-xs" />
          {/* Dashed lane lines */}
          <div className="absolute left-1/4 top-0 h-full border-l border-dashed border-white/50" />
          <div className="absolute left-3/4 top-0 h-full border-l border-dashed border-white/50" />
        </div>

        {/* Center Intersection Box (#3E4754 with subtle dashed yellow boundary) */}
        <div
          className={`absolute top-1/2 left-1/2 bg-[#3E4754] rounded-xs transform -translate-x-1/2 -translate-y-1/2 border border-dashed border-yellow-400/40 shadow-inner ${isFullscreen ? 'w-40 h-40' : 'w-20 h-20'
            }`}
        />

        {/* Direction Arrows Painted on Road Lanes matching screenshot */}
        <div className={`absolute left-1/2 text-white/90 font-extrabold tracking-wider z-10 select-none ${isFullscreen ? 'top-6 transform -translate-x-1/2 text-sm' : 'top-3.5 transform -translate-x-1/2 text-[11px]'
          }`}>
          {lang === 'HI' ? 'उत्तर ↑' : 'N ↑'}
        </div>
        <div className={`absolute left-1/2 text-white/90 font-extrabold tracking-wider z-10 select-none ${isFullscreen ? 'bottom-6 transform -translate-x-1/2 text-sm' : 'bottom-3.5 transform -translate-x-1/2 text-[11px]'
          }`}>
          {lang === 'HI' ? 'दक्षिण ↓' : 'S ↓'}
        </div>
        <div className={`absolute top-1/2 text-white/90 font-extrabold tracking-wider z-10 select-none ${isFullscreen ? 'left-8 transform -translate-y-1/2 text-sm' : 'left-5 transform -translate-y-1/2 text-[11px]'
          }`}>
          {lang === 'HI' ? 'पश्चिम ←' : 'W ←'}
        </div>
        <div className={`absolute top-1/2 text-white/90 font-extrabold tracking-wider z-10 select-none ${isFullscreen ? 'right-8 transform -translate-y-1/2 text-sm' : 'right-5 transform -translate-y-1/2 text-[11px]'
          }`}>
          {lang === 'HI' ? 'पूर्व →' : 'E →'}
        </div>

        {/* Zebra Crosswalks */}
        {/* North Crosswalk */}
        {(() => {
          const pN = state?.pedestrian_signals?.N || 'STOP';
          const isWalk = pN === 'WALK';
          return (
            <>
              <div
                className={`absolute left-1/2 transform -translate-x-1/2 z-10 pointer-events-none ${isFullscreen
                  ? 'top-[calc(50%-145px)] w-32 h-12'
                  : 'top-[calc(50%-78px)] w-16 h-6.5'
                  }`}
              >
                <div className="w-full h-full flex justify-between px-0.5">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-full rounded-[0.5px] bg-white shadow-xs ${isFullscreen ? 'w-[3.5px]' : 'w-[2px]'
                        }`}
                    />
                  ))}
                </div>
                {isWalk && (
                  <motion.div
                    className={`absolute select-none pointer-events-none filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] ${isFullscreen ? 'text-2xl -top-5' : 'text-lg -top-3.5'
                      }`}
                    animate={{ left: ['-5%', '100%'], opacity: [0, 1, 1, 1, 0] }}
                    transition={{ duration: 3.8, repeat: Infinity, ease: 'linear' }}
                  >
                    <span className="inline-block">🚶‍♀️</span>
                  </motion.div>
                )}
              </div>
              <div
                className={`absolute z-20 ${isFullscreen
                  ? 'left-[calc(50%+84px)] top-[calc(50%-148px)]'
                  : 'left-[calc(50%+42px)] top-[calc(50%-80px)]'
                  }`}
              >
                <PedestrianLight status={pN} isFullscreen={isFullscreen} />
              </div>
            </>
          );
        })()}

        {/* South Crosswalk */}
        {(() => {
          const pS = state?.pedestrian_signals?.S || 'STOP';
          const isWalk = pS === 'WALK';
          return (
            <>
              <div
                className={`absolute left-1/2 transform -translate-x-1/2 z-10 pointer-events-none ${isFullscreen
                  ? 'top-[calc(50%+102px)] w-32 h-12'
                  : 'top-[calc(50%+55px)] w-16 h-6.5'
                  }`}
              >
                <div className="w-full h-full flex justify-between px-0.5">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-full rounded-[0.5px] bg-white shadow-xs ${isFullscreen ? 'w-[3.5px]' : 'w-[2px]'
                        }`}
                    />
                  ))}
                </div>
                {isWalk && (
                  <motion.div
                    className={`absolute select-none pointer-events-none filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] ${isFullscreen ? 'text-2xl -top-5' : 'text-lg -top-3.5'
                      }`}
                    animate={{ left: ['105%', '-5%'], opacity: [0, 1, 1, 1, 0] }}
                    transition={{ duration: 3.8, repeat: Infinity, ease: 'linear' }}
                  >
                    <span className="inline-block transform -scale-x-100">🚶‍♀️</span>
                  </motion.div>
                )}
              </div>
              <div
                className={`absolute z-20 ${isFullscreen
                  ? 'left-[calc(50%-98px)] top-[calc(50%+102px)]'
                  : 'left-[calc(50%-52px)] top-[calc(50%+55px)]'
                  }`}
              >
                <PedestrianLight status={pS} isFullscreen={isFullscreen} />
              </div>
            </>
          );
        })()}

        {/* West Crosswalk */}
        {(() => {
          const pW = state?.pedestrian_signals?.W || 'STOP';
          const isWalk = pW === 'WALK';
          return (
            <>
              <div
                className={`absolute top-1/2 transform -translate-y-1/2 z-10 flex flex-col justify-between pointer-events-none ${isFullscreen
                  ? 'left-[calc(50%-145px)] w-12 h-32 py-0.5'
                  : 'left-[calc(50%-78px)] w-6.5 h-16 py-0.5'
                  }`}
              >
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-full rounded-[0.5px] bg-white shadow-xs ${isFullscreen ? 'h-[3.5px]' : 'h-[2px]'
                      }`}
                  />
                ))}
                {isWalk && (
                  <motion.div
                    className={`absolute select-none pointer-events-none filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] ${isFullscreen ? 'text-2xl -left-5' : 'text-lg -left-3'
                      }`}
                    animate={{ top: ['-5%', '100%'], opacity: [0, 1, 1, 1, 0] }}
                    transition={{ duration: 3.8, repeat: Infinity, ease: 'linear' }}
                  >
                    <span className="inline-block">🚶‍♀️</span>
                  </motion.div>
                )}
              </div>
              <div
                className={`absolute z-20 ${isFullscreen
                  ? 'left-[calc(50%-148px)] top-[calc(50%-98px)]'
                  : 'left-[calc(50%-80px)] top-[calc(50%-52px)]'
                  }`}
              >
                <PedestrianLight status={pW} isFullscreen={isFullscreen} />
              </div>
            </>
          );
        })()}

        {/* East Crosswalk */}
        {(() => {
          const pE = state?.pedestrian_signals?.E || 'STOP';
          const isWalk = pE === 'WALK';
          return (
            <>
              <div
                className={`absolute top-1/2 transform -translate-y-1/2 z-10 flex flex-col justify-between pointer-events-none ${isFullscreen
                  ? 'left-[calc(50%+102px)] w-12 h-32 py-0.5'
                  : 'left-[calc(50%+55px)] w-6.5 h-16 py-0.5'
                  }`}
              >
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-full rounded-[0.5px] bg-white shadow-xs ${isFullscreen ? 'h-[3.5px]' : 'h-[2px]'
                      }`}
                  />
                ))}
                {isWalk && (
                  <motion.div
                    className={`absolute select-none pointer-events-none filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] ${isFullscreen ? 'text-2xl -right-5' : 'text-lg -right-3'
                      }`}
                    animate={{ top: ['105%', '-5%'], opacity: [0, 1, 1, 1, 0] }}
                    transition={{ duration: 3.8, repeat: Infinity, ease: 'linear' }}
                  >
                    <span className="inline-block transform -scale-x-100">🚶‍♀️</span>
                  </motion.div>
                )}
              </div>
              <div
                className={`absolute z-20 ${isFullscreen
                  ? 'left-[calc(50%+102px)] top-[calc(50%+84px)]'
                  : 'left-[calc(50%+55px)] top-[calc(50%+42px)]'
                  }`}
              >
                <PedestrianLight status={pE} isFullscreen={isFullscreen} />
              </div>
            </>
          );
        })()}
      </div>

      {/* Traffic Lights for 4 approaches */}
      <TrafficLight
        direction="N"
        signal={state?.signal}
        phase={state?.phase}
        emergencyActive={state?.emergencyActive && state?.emergencyDirection === 'N'}
        isFullscreen={isFullscreen}
      />
      <TrafficLight
        direction="S"
        signal={state?.signal}
        phase={state?.phase}
        emergencyActive={state?.emergencyActive && state?.emergencyDirection === 'S'}
        isFullscreen={isFullscreen}
      />
      <TrafficLight
        direction="E"
        signal={state?.signal}
        phase={state?.phase}
        emergencyActive={state?.emergencyActive && state?.emergencyDirection === 'E'}
        isFullscreen={isFullscreen}
      />
      <TrafficLight
        direction="W"
        signal={state?.signal}
        phase={state?.phase}
        emergencyActive={state?.emergencyActive && state?.emergencyDirection === 'W'}
        isFullscreen={isFullscreen}
      />

      {/* Cars simulation */}
      <AnimatePresence>
        {state?.cars &&
          Object.entries(state.cars).map(([lane, cars]) =>
            cars.map(car => (
              <Car
                key={`${car.id}-${lane}`}
                id={car.id}
                lane={lane}
                position={car.position}
                speed={car.speed}
                type={car.type}
                isFullscreen={isFullscreen}
                onClick={onSelectVehicle ? () => onSelectVehicle(car) : undefined}
                isSelected={selectedVehicleId === car.id}
              />
            ))
          )}
      </AnimatePresence>

      {/* Weather Visual Effects Layer (Rain & Fog) */}
      <WeatherEffects weatherMode={state?.weather_mode || weatherMode || 'normal'} isFullscreen={isFullscreen} />

      {/* Queue counts per lane */}
      {state?.queues &&
        Object.entries(state.queues).map(([lane, count]) => {
          const laneName = lang === 'HI'
            ? (lane === 'N' ? 'उत्तर' : lane === 'S' ? 'दक्षिण' : lane === 'E' ? 'पूर्व' : 'पश्चिम')
            : lane;
          return (
            <div
              key={lane}
              className={`absolute text-[11px] font-bold text-white bg-[#1E293B]/90 px-2 py-0.5 rounded-md shadow-xs z-30 ${lane === 'N'
                ? 'top-2 left-1/2 transform -translate-x-1/2'
                : lane === 'S'
                  ? 'bottom-2 left-1/2 transform -translate-x-1/2'
                  : lane === 'E'
                    ? 'right-2 top-1/2 transform -translate-y-1/2'
                    : 'left-2 top-1/2 transform -translate-y-1/2'
                }`}
            >
              {laneName}: {count}
            </div>
          );
        })}

      {/* Fullscreen Floating Controls */}
      {isFullscreen && (
        <>
          {/* 1. Top-Left: Current Signal Indicator (Image 2) */}
          <div className="absolute top-4 left-4 z-40 pointer-events-auto flex items-center px-4 py-2 rounded-full text-xs font-bold bg-[#0A1F44]/95 backdrop-blur-md text-[#F5A623] shadow-xl border border-[#1E4D8C] select-none">
            <span>
              Current Signal: {state?.signal || 'E'} ({state?.phase || 'GREEN'}) | Green remaining: {state?.phase_remaining_sec ?? 2}s
            </span>
          </div>

          {/* 2. Top-Right: Weather Controls & Exit Fullscreen */}
          <div className="absolute top-4 right-4 z-40 flex items-center space-x-1.5 pointer-events-auto bg-[#0A1F44]/90 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 shadow-lg select-none">
            {[
              { mode: 'normal', label: 'Clear', icon: Sun },
              { mode: 'rain', label: 'Rain', icon: CloudRain },
              { mode: 'fog', label: 'Fog', icon: CloudFog }
            ].map(({ mode, label, icon: Icon }) => {
              const currentMode = (state?.weather_mode || weatherMode || 'normal').toLowerCase();
              const isActive = (mode === 'normal' && (currentMode === 'normal' || currentMode === 'clear')) || currentMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setWeather && setWeather(mode)}
                  className={`px-3 py-1 text-xs font-bold rounded-xl transition-all flex items-center space-x-1 cursor-pointer ${isActive
                    ? 'bg-[#0F2C59] text-white shadow-xs border border-[#1E4D8C]'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                >
                  <Icon size={12} />
                  <span>{label}</span>
                </button>
              );
            })}
            <div className="w-[1px] h-4 bg-white/20 mx-1" />
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Exit Fullscreen"
            >
              <Minimize size={14} />
            </button>
          </div>

          {/* 3. Bottom-Right: Emergency Dispatch Button (Image 1) */}
          <div className="absolute bottom-4 right-4 z-40 pointer-events-auto">
            <button
              onClick={() => triggerEmergencyVehicle && triggerEmergencyVehicle()}
              disabled={state?.emergencyActive}
              className={`px-5 py-2.5 rounded-full font-black text-xs text-white transition-all shadow-xl flex items-center space-x-2 cursor-pointer border border-white/20 select-none ${state?.emergencyActive
                  ? 'bg-red-800 animate-pulse cursor-default'
                  : 'bg-[#DC2626] hover:bg-red-700 active:scale-95 hover:shadow-red-500/25'
                }`}
              title="Dispatch emergency vehicle priority clearance"
            >
              <AlertTriangle size={16} className="text-[#F5A623] fill-[#F5A623]/20" />
              <span className="tracking-wide">
                {state?.emergencyActive ? `EMERGENCY ACTIVE (${state?.emergencyDirection || ''})` : 'EMERGENCY DISPATCH'}
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default SimulationCanvas;
