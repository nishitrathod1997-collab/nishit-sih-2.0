import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Car from '../car';
import TrafficLight from '../TrafficLight';
import { useLanguage } from '../../context/LanguageContext';
import { ShieldCheck, Truck, AlertTriangle, Video, CheckCircle2 } from 'lucide-react';
import SimulationCanvas from '../SimulationCanvas';

export default function LogisticsIntersectionVisualizer({
  state,
  selectedVehicleId,
  onSelectVehicle,
  strategy = 'adaptive'
}) {
  const { lang } = useLanguage();

  const signal = state?.signal || 'N';
  const phase = state?.phase || 'GREEN';
  const weatherMode = state?.effective_weather_mode || 'normal';

  const isRain = weatherMode === 'rain';
  const isFog = weatherMode === 'fog';

  const getSignalState = (approach) => {
    if (signal === approach) {
      return phase === 'GREEN' ? 'green' : phase === 'YELLOW' ? 'yellow' : 'red';
    }
    return 'red';
  };

  const getPhaseRemaining = (approach) => {
    if (signal === approach) {
      return state?.phase_remaining_sec !== undefined ? Math.round(state.phase_remaining_sec) : state?.signal_timer || 0;
    }
    return 0;
  };

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-xs">
      {/* Visualizer Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-[#0A1F44] text-[#F5A623] flex items-center justify-center font-bold">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-[#0A1F44] text-sm">
              {lang === 'HI' ? 'लाइव लॉजिस्टिक्स जंक्शन दृश्य (BKC Jn 03)' : 'Live Logistics Intersection View (BKC Jn 03)'}
            </h3>
            <p className="text-xs text-[#475569]">
              Interactive Top-Down Telemetry • Click any vehicle to inspect
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-2 text-[11px] font-bold">
          <span className="flex items-center space-x-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-600" />
            <span>HCV Freight Truck</span>
          </span>
          <span className="flex items-center space-x-1 text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span>LCV Delivery Van</span>
          </span>
        </div>
      </div>

      {/* Main 2D Intersection Canvas */}
      <SimulationCanvas
        state={state}
        weatherMode={weatherMode}
        isFullscreen={false}
        intersectionRef={null}
        setWeather={() => {}}
        toggleFullscreen={() => {}}
        triggerEmergencyVehicle={() => {}}
        onSelectVehicle={onSelectVehicle}
        selectedVehicleId={selectedVehicleId}
      />

      {/* Canvas Footer Legend */}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-[#475569]">Active Signals:</span>
          <span className={`font-bold px-2 py-0.5 rounded text-xs ${
            phase === 'GREEN' ? 'bg-emerald-100 text-emerald-800' : phase === 'YELLOW' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
          }`}>
            {signal} {phase}
          </span>
        </div>
        <div className="text-[11px] text-slate-400">
          Tip: Click any vehicle sprite to open the Telemetry Inspector
        </div>
      </div>
    </div>
  );
}
