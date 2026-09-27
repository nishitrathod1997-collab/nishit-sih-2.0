import React from 'react';
import { MapPin, ArrowRight, Waves, Activity, ShieldCheck, Clock, Truck, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { CORRIDORS, JUNCTION_COORDINATES } from '../../utils/CorridorCoordinator';

export default function CorridorProgressionView({ corridorData, activeVehicles = [], strategy = 'adaptive' }) {
  const { lang } = useLanguage();
  const corridor = CORRIDORS[0]; // BKC - Western Express Arterial Corridor
  const links = corridor.links || [];

  const commercialVehicles = (activeVehicles || []).filter(v => v.isCommercial);

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 sm:p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3.5 mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#0A1F44] text-[#F5A623] flex items-center justify-center font-bold shadow-xs">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#0A1F44]">
              {lang === 'HI' ? 'कॉरिडोर माल ढुलाई प्रगति' : 'Modeled Corridor Progression (H1 → J1 → J2 → J3 → J4 → H2)'}
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] mt-0.5">
              {corridor.name} (13.4 km Arterial Freight Corridor)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs">
            {commercialVehicles.length} {lang === 'HI' ? 'सक्रिय माल वाहन' : 'Active Freight'}
          </span>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {strategy === 'adaptive' ? 'Green Wave Synced' : 'Static IRC-67 Cycle'}
          </span>
        </div>
      </div>

      {/* Corridor Visual Progression Chain */}
      <div className="relative py-2 overflow-x-auto">
        <div className="min-w-[920px] flex items-stretch justify-between gap-3">
          {/* H1: Dadar Depot Origin */}
          <div className="flex-1 min-w-[130px] bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 text-center flex flex-col justify-center shadow-xs">
            <div className="text-xs font-black text-amber-800 uppercase tracking-wider">Origin Hub (H1)</div>
            <div className="text-sm sm:text-base font-black text-[#0F2942] mt-1">Dadar Depot</div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">HUB_DDR_01</div>
          </div>

          <div className="flex items-center text-slate-400 px-1 shrink-0">
            <ArrowRight className="w-5 h-5" />
          </div>

          {corridor.junctionIds.map((jId, idx) => {
            const jState = corridorData?.junctionStates?.[jId];
            const isLive = jId === 'J3';
            const classification = jState?.classification || { label: 'UNKNOWN', badgeBg: 'bg-slate-100 text-slate-500', color: '#94A3B8' };
            const outgoing = jState?.outgoingFlow;
            const junctionName = jId === 'J1' ? 'Worli Interchange' : jId === 'J2' ? 'Dadar TT Circle' : jId === 'J3' ? 'BKC Central' : 'Andheri WEH';

            return (
              <React.Fragment key={jId}>
                {/* Node Box */}
                <div className={`flex-1 min-w-[140px] ${isLive ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-400/20 shadow-xs' : 'bg-slate-50 border-slate-200'} border rounded-xl p-3.5 text-center flex flex-col justify-between shadow-xs`}>
                  <div>
                    <div className="flex items-center justify-center space-x-1.5 mb-1">
                      <span className={`w-2.5 h-2.5 rounded-full ${isLive ? 'bg-blue-600 animate-pulse' : ''}`} style={!isLive ? { backgroundColor: classification.color } : {}} />
                      <span className={`text-xs font-black uppercase ${isLive ? 'text-blue-900' : 'text-slate-600'}`}>
                        {jId} {isLive && '(Active)'}
                      </span>
                    </div>
                    <div className="text-sm sm:text-base font-black text-[#0F2942] leading-snug">{junctionName}</div>
                  </div>

                  <div className="my-2">
                    {isLive ? (
                      <div className="text-xs text-blue-800 font-extrabold bg-blue-100/90 border border-blue-200 px-2.5 py-1 rounded-md inline-block">
                        LIVE SIMULATION
                      </div>
                    ) : (
                      <div className="text-xs text-slate-600 font-bold bg-slate-200/80 border border-slate-300 px-2.5 py-1 rounded-md inline-block">
                        MODELED BASELINE
                      </div>
                    )}
                  </div>

                  <div className="text-xs sm:text-sm font-black" style={{ color: classification.color }}>
                    {classification.label} • {Math.round(jState?.junction?.totalPcu || 0)} PCU
                  </div>
                </div>

                {/* Link Arrow */}
                {idx < corridor.junctionIds.length - 1 && (
                  <div className="flex items-center text-slate-400 flex-col justify-center px-1 min-w-[70px] shrink-0">
                    <div className="text-xs font-bold text-slate-500 text-center whitespace-nowrap">
                      {outgoing?.linkDistanceKm || '-'} km
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 my-1" />
                    {outgoing?.travelTimeSec ? (
                      <div className="text-xs sm:text-sm text-purple-800 font-black text-center whitespace-nowrap">
                        {Math.round(outgoing.travelTimeSec / 60)}m ETA
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">N/A</div>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}

          <div className="flex items-center text-slate-400 px-1 shrink-0">
            <ArrowRight className="w-5 h-5" />
          </div>

          {/* H2: BKC Hub Terminal */}
          <div className="flex-1 min-w-[130px] bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 text-center flex flex-col justify-center shadow-xs">
            <div className="text-xs font-black text-emerald-800 uppercase tracking-wider">Terminal Hub (H2)</div>
            <div className="text-sm sm:text-base font-black text-[#0F2942] mt-1">BKC Freight Hub</div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">HUB_BKC_01</div>
          </div>
        </div>
      </div>

    </div>
  );
}
