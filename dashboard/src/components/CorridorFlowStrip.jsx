import React from 'react';
import { ArrowRight, Zap, Clock, ShieldCheck, Activity, AlertCircle, CheckCircle2, TrendingUp, Navigation } from 'lucide-react';
import { JUNCTION_COORDINATES } from '../utils/CorridorCoordinator';

export default function CorridorFlowStrip({
  corridor,
  junctionStates = {},
  selectedJunctionId,
  onSelectJunction,
  coordinationActive = true,
  lang = 'EN'
}) {
  const links = corridor.links || [];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      {/* Header Banner: Multi-Intersection Coordination Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-5">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-[#0A1F44] text-[#F5A623] flex items-center justify-center font-black shadow-xs">
            <Zap size={20} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm sm:text-base font-extrabold text-[#0A1F44] uppercase tracking-wide">
                {lang === 'HI' ? 'मल्टी-इंटरसेक्शन समन्वय पाइपलाइन' : 'Multi-Intersection Coordination Pipeline'}
              </h2>
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                coordinationActive ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-600'
              }`}>
                {coordinationActive ? (lang === 'HI' ? 'सक्रिय' : 'ACTIVE') : (lang === 'HI' ? 'निष्क्रिय' : 'OFFLINE')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {lang === 'HI'
                ? 'अपस्ट्रीम नोड से अग्रिम ट्रैफिक प्रवाह प्रेडिक्शन डाउनस्ट्रीम सिग्नलों को पूर्व-सक्रिय करता है'
                : 'Upstream traffic flow predictions proactively adapt downstream green-wave cycles'}
            </p>
          </div>
        </div>

        {/* Global Coordination Mode Indicator */}
        <div className="flex items-center space-x-3 text-xs bg-slate-50 px-3.5 py-1.5 rounded-lg border border-slate-200">
          <div className="flex items-center space-x-1.5 text-slate-600">
            <Activity size={14} className="text-[#0F2C59]" />
            <span className="font-semibold">{lang === 'HI' ? 'प्रवाह दिशा:' : 'Corridor Flow:'}</span>
            <span className="font-bold text-[#0A1F44]">South-to-North (Arterial)</span>
          </div>
        </div>
      </div>

      {/* Visual Pipeline Strip: Nodes connected by animated directional conduits */}
      <div className="overflow-x-auto pb-3 no-scrollbar">
        <div className="min-w-[760px] flex items-stretch justify-between relative py-2">
          {corridor.junctionIds.map((jId, index) => {
            const state = junctionStates[jId];
            const junction = state?.junction;
            const coords = JUNCTION_COORDINATES[jId] || {};
            const classification = state?.classification || { label: 'NORMAL', dotColor: '#16A34A', badgeBg: 'bg-emerald-50 text-emerald-800' };
            const isSelected = selectedJunctionId === jId;

            // Check if there is an incoming link to this junction
            const incomingLink = links.find(l => l.to === jId);
            const outgoingLink = links.find(l => l.from === jId);
            const incomingPrediction = state?.incomingPredictions?.[0];
            const coordAction = state?.coordinationAction;

            return (
              <React.Fragment key={jId}>
                {/* Visual Inter-Junction Connection Conduit (Arrow / Pipeline) */}
                {index > 0 && incomingLink && (
                  <div className="flex-1 flex flex-col items-center justify-center px-2 relative min-w-[120px] max-w-[170px] select-none">
                    {/* Traffic Platoon in Transit Badge */}
                    {incomingPrediction ? (
                      <div className="mb-2 text-center animate-bounce">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border shadow-xs flex items-center gap-1 ${
                          incomingPrediction.severity === 'HIGH'
                            ? 'bg-red-50 text-red-700 border-red-300'
                            : 'bg-amber-50 text-amber-700 border-amber-300'
                        }`}>
                          <Zap size={10} className="fill-current" />
                          <span>+{incomingPrediction.dispatchedPcu} PCU</span>
                          <span className="text-slate-400 font-normal">|</span>
                          <span className="font-mono">~{incomingPrediction.etaSeconds}s</span>
                        </span>
                      </div>
                    ) : (
                      <div className="mb-2 text-[10px] font-medium text-slate-400">
                        {incomingLink.distanceKm} km ({incomingLink.freeFlowSpeedKmph} km/h)
                      </div>
                    )}

                    {/* Animated Conduit Line */}
                    <div className="w-full relative flex items-center">
                      <div className={`h-2 w-full rounded-full overflow-hidden ${
                        incomingPrediction ? 'bg-amber-100' : 'bg-slate-200'
                      }`}>
                        <div
                          className={`h-full w-full rounded-full ${
                            incomingPrediction
                              ? 'bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500 animate-pulse'
                              : 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                          }`}
                        />
                      </div>
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 text-slate-400">
                        <ArrowRight size={16} className={incomingPrediction ? 'text-amber-500 animate-pulse' : 'text-slate-400'} />
                      </div>
                    </div>

                    {/* Transit Description */}
                    <span className="text-[9px] text-slate-400 font-medium mt-1.5 text-center truncate w-full">
                      {incomingLink.roadName || `${incomingLink.from} → ${incomingLink.to}`}
                    </span>
                  </div>
                )}

                {/* Junction Node Card */}
                <div
                  onClick={() => onSelectJunction && onSelectJunction(jId)}
                  className={`flex-shrink-0 w-[185px] rounded-xl border p-3.5 transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-white border-[#1E4D8C] ring-2 ring-[#F5A623] shadow-md scale-[1.02]'
                      : 'bg-slate-50/80 border-slate-200 hover:bg-white hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  {/* Top Node Header: Badge + ID */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-black text-white shadow-xs"
                        style={{ backgroundColor: classification.dotColor || '#16A34A' }}
                      >
                        {jId}
                      </span>
                      <span className="text-[11px] font-bold text-slate-700">{coords.code || jId}</span>
                    </div>

                    {/* Congestion Level Pill */}
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${classification.badgeBg}`}>
                      {lang === 'HI' ? classification.labelHi : classification.label}
                    </span>
                  </div>

                  {/* Junction Full Name */}
                  <h3 className="text-xs font-bold text-[#0A1F44] truncate mb-2" title={coords.name}>
                    {coords.name || `Junction ${jId}`}
                  </h3>

                  {/* Signal State & Timer */}
                  <div className="bg-white rounded-lg p-2 border border-slate-200/80 mb-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">{lang === 'HI' ? 'सक्रिय सिग्नल:' : 'Active Phase:'}</span>
                      <span className="font-extrabold text-emerald-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        {junction?.activePhase || 'NS'} GREEN
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
                      <span>Timer</span>
                      <span className="font-bold text-[#0A1F44]">{junction?.phaseTimer || 0}s left</span>
                    </div>
                  </div>

                  {/* Demand Metrics */}
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-2 px-1">
                    <span>{lang === 'HI' ? 'कुल मांग:' : 'Total Demand:'}</span>
                    <span className="font-extrabold text-[#0A1F44] font-mono">{junction?.totalPcu || 0} PCU</span>
                  </div>

                  {/* Coordinated Action / Notification Banner */}
                  {coordAction ? (
                    <div className="bg-amber-50/90 border border-amber-200 rounded-md p-1.5 text-[9px] text-amber-900 leading-tight flex items-start space-x-1">
                      <Zap size={11} className="text-amber-600 flex-shrink-0 mt-0.5 fill-amber-500" />
                      <div className="flex-1">
                        <strong className="block font-bold">{lang === 'HI' ? coordAction.titleHi : coordAction.title}</strong>
                        <span className="text-slate-600 text-[8.5px]">
                          {coordAction.greenAdjustmentSec > 0 ? `+${coordAction.greenAdjustmentSec}s Green offset` : 'Timing locked'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-md p-1.5 text-[9px] text-emerald-800 leading-tight flex items-center space-x-1">
                      <CheckCircle2 size={11} className="text-emerald-600 flex-shrink-0" />
                      <span className="font-medium">{lang === 'HI' ? 'प्रवाह संतुलित' : 'Synchronized Flow'}</span>
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Footer Corridor Pipeline Info Bar */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center space-x-2">
          <ShieldCheck size={14} className="text-[#0F2C59]" />
          <span>
            {lang === 'HI'
              ? 'सिस्टम स्वचालित रूप से अपस्ट्रीम क्लस्टर से डाउनस्ट्रीम तक ग्रीन वेव सिंक्रोनाइजेशन बनाए रखता है।'
              : 'Automated coordination engine continuously adjusts split timings to eliminate inter-junction bottlenecks.'}
          </span>
        </div>
        <div className="text-[11px] font-mono font-semibold text-slate-600">
          Corridor Telemetry: <span className="text-emerald-600 font-bold">100% HEALTHY</span>
        </div>
      </div>
    </div>
  );
}
