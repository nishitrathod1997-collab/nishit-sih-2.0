import React from 'react';
import { 
  Cpu, 
  RotateCcw
} from 'lucide-react';
import { useTraffic } from '../context/TrafficContext';
import { useLanguage } from '../context/LanguageContext';

export const IntersectionVisualizer = () => {
  const { 
    selectedJunction, 
    junctions, 
    setSelectedJunctionId, 
    setJunctionOverride, 
    systemMode
  } = useTraffic();
  const { lang } = useLanguage();

  const isNSGreen = selectedJunction.activePhase === 'NS';
  const isEWGreen = selectedJunction.activePhase === 'EW';
  const isAmber = selectedJunction.overrideMode === 'flash_amber';

  const getSignalState = (approach) => {
    if (isAmber) return 'yellow';
    if (approach === 'N' || approach === 'S') {
      return isNSGreen ? 'green' : 'red';
    } else {
      return isEWGreen ? 'green' : 'red';
    }
  };

  const TrafficLightPole = ({ approach, label }) => {
    const state = getSignalState(approach);

    return (
      <div className="flex flex-col items-center bg-[#090C12] p-1.5 rounded-lg border border-[#1E2638]">
        <span className="text-[9px] font-mono text-slate-400 mb-1">{label}</span>
        <div className="w-5 h-14 bg-[#05070A] rounded border border-slate-800 flex flex-col items-center justify-around py-1">
          <div className={`w-3 h-3 rounded-full transition-colors ${
            state === 'red' ? 'bg-rose-500 ring-1 ring-rose-400' : 'bg-rose-950/40'
          }`} />
          <div className={`w-3 h-3 rounded-full transition-colors ${
            state === 'yellow' ? 'bg-amber-400 ring-1 ring-amber-300 animate-pulse' : 'bg-amber-950/40'
          }`} />
          <div className={`w-3 h-3 rounded-full transition-colors ${
            state === 'green' ? 'bg-emerald-400 ring-1 ring-emerald-300' : 'bg-emerald-950/40'
          }`} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Junction Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#0E121B] border border-[#1D2638]">
        <div className="flex items-center space-x-2.5">
          <Cpu className="w-4 h-4 text-[#F5A623]" />
          <span className="text-xs font-semibold text-white">
            {lang === 'HI' ? 'SCADA सिग्नल चरण नियंत्रक एवं ज्यामिति' : 'SCADA Signal Phase Controller & Geometry'}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {junctions.map(j => (
            <button
              key={j.id}
              onClick={() => setSelectedJunctionId(j.id)}
              className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer ${
                selectedJunction.id === j.id
                  ? 'bg-[#1E293B] text-[#F5A623] border border-[#F5A623]/50'
                  : 'bg-[#101520] text-slate-400 hover:text-slate-200 border border-[#1D2638]'
              }`}
            >
              {j.code}: {j.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Left: 4-Way Intersection Geometry Layout */}
        <div className="lg:col-span-2 rounded-xl bg-[#0B0E14] border border-[#1D2638] p-6 relative flex flex-col items-center justify-center min-h-[500px]">
          
          {/* North Approach Pole */}
          <div className="absolute top-3 flex flex-col items-center space-y-1 z-10">
            <TrafficLightPole approach="N" label={lang === 'HI' ? 'उत्तर पहुंच' : 'NORTH APPROACH'} />
            <span className="text-[10px] font-mono text-slate-400">
              {selectedJunction.approachData.N.count} {lang === 'HI' ? 'वाहन' : 'veh'} ({selectedJunction.approachData.N.pcu} PCU)
            </span>
          </div>

          {/* South Approach Pole */}
          <div className="absolute bottom-3 flex flex-col items-center space-y-1 z-10">
            <span className="text-[10px] font-mono text-slate-400">
              {selectedJunction.approachData.S.count} {lang === 'HI' ? 'वाहन' : 'veh'} ({selectedJunction.approachData.S.pcu} PCU)
            </span>
            <TrafficLightPole approach="S" label={lang === 'HI' ? 'दक्षिण पहुंच' : 'SOUTH APPROACH'} />
          </div>

          {/* West Approach Pole */}
          <div className="absolute left-3 flex items-center space-x-2 z-10">
            <TrafficLightPole approach="W" label={lang === 'HI' ? 'पश्चिम' : 'WEST'} />
            <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
              {selectedJunction.approachData.W.count}v
            </span>
          </div>

          {/* East Approach Pole */}
          <div className="absolute right-3 flex items-center space-x-2 z-10">
            <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
              {selectedJunction.approachData.E.count}v
            </span>
            <TrafficLightPole approach="E" label={lang === 'HI' ? 'पूर्व' : 'EAST'} />
          </div>

          {/* Crossroad Physical Geometry */}
          <div className="relative w-[300px] h-[300px] sm:w-[360px] sm:h-[360px] bg-[#161C28] rounded-2xl overflow-hidden border border-[#243046] flex items-center justify-center">
            
            {/* North-South Road Asphalt */}
            <div className="absolute inset-y-0 w-28 sm:w-32 bg-[#0C1017] border-x border-slate-700/60 flex items-center justify-center">
              <div className="w-0.5 h-full bg-amber-400/60" />
            </div>

            {/* East-West Road Asphalt */}
            <div className="absolute inset-x-0 h-28 sm:h-32 bg-[#0C1017] border-y border-slate-700/60 flex items-center justify-center">
              <div className="h-0.5 w-full bg-amber-400/60" />
            </div>

            {/* Zebra Markings */}
            <div className="absolute top-10 w-28 sm:w-32 h-4 flex justify-around px-2 pointer-events-none">
              {[...Array(6)].map((_, i) => <div key={i} className="w-1.5 h-full bg-slate-400/50" />)}
            </div>
            <div className="absolute bottom-10 w-28 sm:w-32 h-4 flex justify-around px-2 pointer-events-none">
              {[...Array(6)].map((_, i) => <div key={i} className="w-1.5 h-full bg-slate-400/50" />)}
            </div>
            <div className="absolute left-10 h-28 sm:h-32 w-4 flex flex-col justify-around py-2 pointer-events-none">
              {[...Array(6)].map((_, i) => <div key={i} className="h-1.5 w-full bg-slate-400/50" />)}
            </div>
            <div className="absolute right-10 h-28 sm:h-32 w-4 flex flex-col justify-around py-2 pointer-events-none">
              {[...Array(6)].map((_, i) => <div key={i} className="h-1.5 w-full bg-slate-400/50" />)}
            </div>

            {/* Center Phase Hub */}
            <div className="relative z-20 w-24 h-24 rounded-full bg-[#080B10] border border-[#2B3950] flex flex-col items-center justify-center text-center p-1">
              <span className="text-[8px] font-mono text-slate-400">{lang === 'HI' ? 'चरण' : 'PHASE'}</span>
              <span className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
                {selectedJunction.phaseTimer}s
              </span>
              <span className="text-[9px] font-mono text-slate-300">
                {selectedJunction.activePhase} {lang === 'HI' ? 'हरा' : 'GREEN'}
              </span>
            </div>

          </div>

          <div className="mt-3 flex items-center space-x-3 text-xs text-slate-400 font-mono">
            <span>{lang === 'HI' ? 'PCU लोड:' : 'PCU Load:'} <strong className="text-white">{selectedJunction.totalPcu}</strong></span>
            <span>•</span>
            <span>{lang === 'HI' ? 'मोड:' : 'Mode:'} <strong className="text-emerald-400">{systemMode === 'adaptive' ? (lang === 'HI' ? 'एडेप्टिव' : 'Adaptive') : (lang === 'HI' ? 'फिक्स्ड' : 'Fixed')}</strong></span>
          </div>

        </div>

        {/* Right: Telemetry & Controls */}
        <div className="space-y-4 flex flex-col justify-between">
          
          {/* Timing Comparison Matrix */}
          <div className="p-4 rounded-xl bg-[#0E121B] border border-[#1D2638] space-y-3">
            <span className="text-xs font-semibold text-white block">
              {lang === 'HI' ? 'समय मॉडल तुलना' : 'Timing Model Comparison'}
            </span>

            <div className="grid grid-cols-2 gap-2 text-center font-mono">
              <div className="p-3 rounded-lg bg-[#101824] border border-[#1E2D44]">
                <span className="text-[10px] text-slate-400 block">{lang === 'HI' ? 'एडेप्टिव गतिशील' : 'Adaptive Dynamic'}</span>
                <span className="text-xl font-bold text-emerald-400">{selectedJunction.dynamicGreenTime}s</span>
                <span className="text-[10px] text-slate-400 block mt-1">{lang === 'HI' ? 'प्रतीक्षा:' : 'Wait:'} {selectedJunction.averageWaitTimeSec}s</span>
              </div>

              <div className="p-3 rounded-lg bg-[#101520] border border-[#1D2638]">
                <span className="text-[10px] text-slate-400 block">{lang === 'HI' ? 'बेसलाइन फिक्स्ड' : 'Baseline Fixed'}</span>
                <span className="text-xl font-bold text-slate-400">{selectedJunction.fixedGreenTime}s</span>
                <span className="text-[10px] text-slate-500 block mt-1">{lang === 'HI' ? 'प्रतीक्षा:' : 'Wait:'} {selectedJunction.baselineWaitTimeSec}s</span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#0A0D14] border border-[#1D2638] text-xs flex items-center justify-between text-slate-300">
              <span>{lang === 'HI' ? 'प्रति चक्र विलंब बचत:' : 'Delay Saved per Cycle:'}</span>
              <span className="font-mono font-bold text-emerald-400">
                {Math.max(0, (selectedJunction.baselineWaitTimeSec - selectedJunction.averageWaitTimeSec).toFixed(1))}s {lang === 'HI' ? '/ वाहन' : '/ veh'}
              </span>
            </div>
          </div>

          {/* Override Switchboard */}
          <div className="p-4 rounded-xl bg-[#0E121B] border border-[#1D2638] space-y-2.5">
            <span className="text-xs font-semibold text-white block">
              {lang === 'HI' ? 'SCADA मैनुअल ओवरराइड' : 'SCADA Manual Override'}
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setJunctionOverride(selectedJunction.id, 'force_green_ns')}
                className={`p-2 rounded text-xs font-medium border transition-colors cursor-pointer ${
                  selectedJunction.overrideMode === 'force_green_ns'
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-[#101520] hover:bg-[#161E2E] text-slate-300 border-[#1D2638]'
                }`}
              >
                {lang === 'HI' ? 'उत्तर-दक्षिण ग्रीन लॉक' : 'Lock N-S Green'}
              </button>
              <button
                onClick={() => setJunctionOverride(selectedJunction.id, 'force_green_ew')}
                className={`p-2 rounded text-xs font-medium border transition-colors cursor-pointer ${
                  selectedJunction.overrideMode === 'force_green_ew'
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-[#101520] hover:bg-[#161E2E] text-slate-300 border-[#1D2638]'
                }`}
              >
                {lang === 'HI' ? 'पूर्व-पश्चिम ग्रीन लॉक' : 'Lock E-W Green'}
              </button>
              <button
                onClick={() => setJunctionOverride(selectedJunction.id, 'flash_amber')}
                className={`p-2 rounded text-xs font-medium border transition-colors cursor-pointer ${
                  selectedJunction.overrideMode === 'flash_amber'
                    ? 'bg-amber-600 text-white border-amber-500'
                    : 'bg-[#101520] hover:bg-[#161E2E] text-amber-400 border-[#1D2638]'
                }`}
              >
                {lang === 'HI' ? 'फ्लैश एम्बर' : 'Flash Amber'}
              </button>
              <button
                onClick={() => setJunctionOverride(selectedJunction.id, 'auto')}
                className="p-2 rounded text-xs font-medium bg-[#141A26] hover:bg-[#1D2638] text-[#F5A623] border border-[#2B3950] transition-colors cursor-pointer flex items-center justify-center space-x-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{lang === 'HI' ? 'ऑटो AI' : 'Auto AI'}</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
