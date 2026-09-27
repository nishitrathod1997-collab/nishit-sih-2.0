import React from 'react';
import { ArrowUpRight, ArrowDownLeft, Zap, Shield, Clock, AlertTriangle, Compass, Activity, Radio, CheckCircle, ChevronRight, Gauge } from 'lucide-react';
import { JUNCTION_COORDINATES } from '../utils/CorridorCoordinator';

export default function CorridorJunctionCard({
  junctionState,
  isSelected = false,
  onSelect,
  onOverride,
  coordinationActive = true,
  lang = 'EN'
}) {
  if (!junctionState) return null;

  const { junction, classification, approaches, incomingPredictions, outgoingFlow, coordinationAction } = junctionState;
  const coords = JUNCTION_COORDINATES[junction.id] || {};
  const isCongested = classification?.level === 'HEAVY' || classification?.level === 'JAM';

  return (
    <div
      onClick={onSelect}
      className={`rounded-xl border transition-all cursor-pointer bg-white overflow-hidden shadow-xs hover:shadow-md ${
        isSelected
          ? 'border-[#1E4D8C] ring-2 ring-[#F5A623] shadow-md'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* 1. Header: Junction Identification & Congestion Badge */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs text-white shadow-xs"
            style={{ backgroundColor: classification?.dotColor || '#16A34A' }}
          >
            {junction.id}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-extrabold text-sm text-[#0A1F44]">{junction.name}</h3>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-200/80 px-1.5 py-0.5 rounded font-mono">
                {coords.code || junction.id}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              Lat {coords.lat?.toFixed(4)}, Lng {coords.lng?.toFixed(4)}
            </span>
          </div>
        </div>

        {/* Congestion Status Pill */}
        <div className="flex flex-col items-end">
          <span className={`text-[10px] font-black px-2.5 py-1 rounded-md border shadow-xs ${classification?.badgeBg}`}>
            {lang === 'HI' ? classification?.labelHi : classification?.label}
          </span>
          <span className="text-[9px] text-slate-400 mt-0.5 font-medium">
            Avg Speed: {Math.round(
              ((approaches?.N?.speedKmph || 35) + (approaches?.S?.speedKmph || 35) + (approaches?.E?.speedKmph || 35) + (approaches?.W?.speedKmph || 35)) / 4
            )} km/h
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3.5">
        {/* 2. Live Signal State & Timer Bar */}
        <div className="grid grid-cols-2 gap-2">
          {/* Active Phase */}
          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200">
            <span className="text-[10px] text-slate-500 font-medium block">
              {lang === 'HI' ? 'वर्तमान सिग्नल स्थिति' : 'Active Signal Phase'}
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs font-black text-emerald-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {junction.activePhase} GREEN
              </span>
              <span className="text-[11px] font-mono font-bold text-[#0A1F44]">
                {junction.phaseTimer}s
              </span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (junction.phaseTimer / (junction.dynamicGreenTime || 40)) * 100)}%` }}
              />
            </div>
          </div>

          {/* Demand & Wait Time */}
          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200">
            <span className="text-[10px] text-slate-500 font-medium block">
              {lang === 'HI' ? 'कुल मांग व प्रतीक्षा' : 'Total PCU & Delay'}
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs font-black text-[#0A1F44] font-mono">
                {junction.totalPcu} PCU
              </span>
              <span className="text-[10px] font-semibold text-slate-600">
                ~{junction.averageWaitTimeSec}s wait
              </span>
            </div>
            <div className="flex items-center space-x-1 text-[9px] text-emerald-600 font-medium mt-1">
              <span>{Math.round(((junction.baselineWaitTimeSec - junction.averageWaitTimeSec) / junction.baselineWaitTimeSec) * 100)}% saved vs fixed</span>
            </div>
          </div>
        </div>

        {/* 3. 4-Approach Traffic Classification Grid (N, S, E, W) */}
        <div>
          <div className="text-[11px] font-bold text-[#0A1F44] mb-2 flex items-center justify-between">
            <span>{lang === 'HI' ? 'प्रत्येक मार्ग स्थिति (4-वे अप्रोच)' : 'Approach-by-Approach Classification'}</span>
            <span className="text-[10px] text-slate-400 font-normal">N • S • E • W</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 text-center">
            {['N', 'S', 'E', 'W'].map((dir) => {
              const app = approaches?.[dir] || {};
              const appClass = app.classification || { label: 'NORMAL', dotColor: '#16A34A', badgeBg: 'bg-emerald-50 text-emerald-700' };
              const isPhaseGreen = (dir === 'N' || dir === 'S') ? junction.activePhase === 'NS' : junction.activePhase === 'EW';

              return (
                <div
                  key={dir}
                  className={`rounded-lg p-2 border transition-all ${
                    isPhaseGreen
                      ? 'bg-emerald-50/40 border-emerald-300'
                      : 'bg-slate-50/90 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-700 mb-1">
                    <span>{dir}</span>
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: appClass.dotColor || '#16A34A' }}
                      title={`${appClass.label}`}
                    />
                  </div>
                  <div className="text-[11px] font-extrabold font-mono text-[#0A1F44]">
                    {app.pcu || 0}
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                    {app.speedKmph || 0} km/h
                  </div>
                  <div className={`text-[8.5px] font-bold mt-1 px-1 py-0.5 rounded truncate ${appClass.badgeBg}`}>
                    {appClass.level}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Multi-Intersection Upstream Wave Prediction */}
        {incomingPredictions && incomingPredictions.length > 0 ? (
          <div className="bg-amber-50/90 border border-amber-300 rounded-lg p-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black text-amber-900 flex items-center gap-1 uppercase tracking-wide">
                <Zap size={12} className="text-amber-600 fill-amber-500 animate-bounce" />
                {lang === 'HI' ? 'अपस्ट्रीम वेव चेतावनी' : 'Upstream Platoon Warning'}
              </span>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-200/80 px-1.5 py-0.2 rounded font-mono">
                ETA: ~{incomingPredictions[0].etaSeconds}s
              </span>
            </div>
            <p className="text-[11px] text-amber-950 leading-relaxed font-medium">
              Surge of <strong>+{incomingPredictions[0].dispatchedPcu} PCU</strong> in transit from{' '}
              <strong>{incomingPredictions[0].fromName || incomingPredictions[0].fromJunctionId}</strong> along{' '}
              {incomingPredictions[0].targetApproach}-approach.
            </p>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-lg p-2 border border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle size={12} className="text-emerald-500" />
              {lang === 'HI' ? 'कोई प्रतिकूल अपस्ट्रीम जाम नहीं' : 'No upstream bottleneck surge in transit'}
            </span>
            <span className="font-mono text-slate-400">Platoon Stable</span>
          </div>
        )}

        {/* 5. Coordinated Action / Signal Recommendation */}
        {coordinationActive && coordinationAction && (
          <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-extrabold text-[#0A1F44] flex items-center gap-1 uppercase tracking-wider">
                <Radio size={12} className="text-[#1E4D8C] animate-pulse" />
                {lang === 'HI' ? 'समन्वित सिग्नल समायोजन' : 'Coordinated Adaptive Action'}
              </span>
              <span className="text-[9px] font-bold bg-[#1E4D8C] text-white px-1.5 py-0.5 rounded">
                {coordinationAction.badge}
              </span>
            </div>
            <p className="text-[11px] text-slate-700 leading-snug">
              {lang === 'HI' ? coordinationAction.actionHi : coordinationAction.action}
            </p>
          </div>
        )}

        {/* 6. Outgoing Traffic Dispatch to Downstream Link */}
        {outgoingFlow && outgoingFlow.targetJunctionId && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>Flow → {outgoingFlow.targetJunctionId}</span>
            <span className="font-bold text-[#0A1F44]">
              {outgoingFlow.volumePcu} PCU @ {outgoingFlow.speedKmph} km/h
            </span>
            <span className="text-emerald-600 font-semibold">
              ~{Math.round(outgoingFlow.travelTimeSec / 60)}m transit
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
