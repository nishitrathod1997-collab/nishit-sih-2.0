import React from 'react';
import { CORRIDORS } from '../utils/CorridorCoordinator';
import { Sliders, Zap, Shield, Activity, RefreshCw, AlertTriangle, CheckCircle2, ChevronRight, Gauge, Play, ArrowRight, Radio } from 'lucide-react';

export default function CorridorSidebar({
  selectedCorridor,
  onSelectCorridor,
  coordinationActive,
  onToggleCoordination,
  corridorMetrics,
  onTriggerScenario,
  incidentLogs = [],
  lang = 'EN'
}) {
  return (
    <aside className="w-full lg:w-80 flex-shrink-0 space-y-4">
      {/* 1. Corridor Selector Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
          {lang === 'HI' ? 'सक्रिय धमनी गलियारा (कॉरिडोर)' : 'Active Transit Corridor'}
        </label>
        <select
          value={selectedCorridor.id}
          onChange={(e) => {
            const found = CORRIDORS.find((c) => c.id === e.target.value);
            if (found) onSelectCorridor(found);
          }}
          className="w-full bg-slate-50 border border-slate-300 text-xs font-bold text-[#0A1F44] rounded-lg p-2.5 focus:ring-2 focus:ring-[#1E4D8C] focus:outline-hidden cursor-pointer"
        >
          {CORRIDORS.map((c) => (
            <option key={c.id} value={c.id}>
              {lang === 'HI' && c.nameHi ? c.nameHi : c.name}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
          {selectedCorridor.description}
        </p>
      </div>

      {/* 2. Multi-Intersection Coordination Control Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Radio size={16} className={coordinationActive ? 'text-emerald-600 animate-pulse' : 'text-slate-400'} />
            <span className="text-xs font-extrabold text-[#0A1F44] uppercase tracking-wide">
              {lang === 'HI' ? 'समन्वय नियंत्रण' : 'Multi-Junction Engine'}
            </span>
          </div>
          <button
            onClick={() => onToggleCoordination(!coordinationActive)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
              coordinationActive ? 'bg-emerald-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                coordinationActive ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-600 font-medium">{lang === 'HI' ? 'मोड स्थिति:' : 'Operating State:'}</span>
            <span className={`font-bold ${coordinationActive ? 'text-emerald-700' : 'text-slate-500'}`}>
              {coordinationActive ? 'PREDICTIVE GREEN-WAVE' : 'ISOLATED TIMERS'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-600 font-medium">{lang === 'HI' ? 'प्रेडिक्शन विंडो:' : 'Lookahead Horizon:'}</span>
            <span className="font-bold text-[#0A1F44] font-mono">180 Seconds</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-600 font-medium">{lang === 'HI' ? 'फ्लो एल्गोरिद्म:' : 'Flow Algorithm:'}</span>
            <span className="font-bold text-[#0A1F44]">Platoon Progression</span>
          </div>
        </div>
      </div>

      {/* 3. Real-Time Corridor Telemetry Metrics */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
          <span>{lang === 'HI' ? 'कॉरिडोर प्रदर्शन मेट्रिक्स' : 'Corridor Live Telemetry'}</span>
          <Activity size={13} className="text-[#0F2C59]" />
        </h4>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Sync Efficiency */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-2.5">
            <span className="text-[10px] text-emerald-800 font-semibold block">
              {lang === 'HI' ? 'सिंक दक्षता' : 'Sync Efficiency'}
            </span>
            <div className="text-lg font-black text-emerald-700 font-mono mt-0.5">
              {corridorMetrics?.syncEfficiency || 88}%
            </div>
            <span className="text-[9px] text-emerald-600 font-medium">Green Wave Lock</span>
          </div>

          {/* Corridor Throughput */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-2.5">
            <span className="text-[10px] text-blue-800 font-semibold block">
              {lang === 'HI' ? 'कुल मांग' : 'Active Corridor PCU'}
            </span>
            <div className="text-lg font-black text-[#0A1F44] font-mono mt-0.5">
              {corridorMetrics?.totalPcu || 420}
            </div>
            <span className="text-[9px] text-slate-500 font-medium">Across all 4 nodes</span>
          </div>

          {/* Average Corridor Speed */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
            <span className="text-[10px] text-slate-600 font-semibold block">
              {lang === 'HI' ? 'औसत गति' : 'Arterial Speed'}
            </span>
            <div className="text-lg font-black text-[#0A1F44] font-mono mt-0.5">
              {corridorMetrics?.avgSpeedKmph || 34} <span className="text-xs font-normal text-slate-500">km/h</span>
            </div>
            <span className="text-[9px] text-emerald-600 font-medium">+28% vs uncoordinated</span>
          </div>

          {/* Travel Time Saved */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-2.5">
            <span className="text-[10px] text-amber-800 font-semibold block">
              {lang === 'HI' ? 'समय बचत' : 'Travel Delay Cut'}
            </span>
            <div className="text-lg font-black text-amber-900 font-mono mt-0.5">
              {corridorMetrics?.delayReducedMin || 7.4} <span className="text-xs font-normal text-amber-700">min</span>
            </div>
            <span className="text-[9px] text-amber-700 font-medium">Per vehicle transit</span>
          </div>
        </div>
      </div>

      {/* 4. Live Coordination Scenario Injector (Crucial for live demonstration) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
          <span>{lang === 'HI' ? 'लाइव सिमुलेशन परिदृश्य' : 'Live Scenario Injection'}</span>
          <Play size={12} className="text-[#F5A623] fill-current" />
        </h4>
        <p className="text-[10px] text-slate-500 mb-3">
          {lang === 'HI'
            ? 'परीक्षण करें कि कैसे अपस्ट्रीम का जाम डाउनस्ट्रीम सिग्नलों को स्वतः अनुकूलित करता है:'
            : 'Test how upstream traffic surges trigger automatic downstream green-wave adaptations:'}
        </p>

        <div className="space-y-1.5">
          <button
            onClick={() => onTriggerScenario && onTriggerScenario('rush_hour_surge')}
            className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-300 text-xs font-bold text-slate-700 hover:text-red-800 transition flex items-center justify-between cursor-pointer"
          >
            <span>Inject Heavy Surge at J2 (Dadar)</span>
            <ChevronRight size={14} className="text-slate-400" />
          </button>

          <button
            onClick={() => onTriggerScenario && onTriggerScenario('emergency_ambulance')}
            className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-xs font-bold text-slate-700 hover:text-emerald-800 transition flex items-center justify-between cursor-pointer"
          >
            <span>Trigger Emergency Corridor (J1→J3)</span>
            <ChevronRight size={14} className="text-slate-400" />
          </button>

          <button
            onClick={() => onTriggerScenario && onTriggerScenario('reset_all')}
            className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600 transition flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <RefreshCw size={12} />
              Reset All Nodes to Optimal Flow
            </span>
          </button>
        </div>
      </div>

      {/* 5. Live Corridor Incident / Coordination Feed */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
          {lang === 'HI' ? 'हालिया समन्वय लॉग' : 'Live Coordination Log'}
        </h4>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 no-scrollbar text-xs">
          {incidentLogs.slice(0, 4).map((log) => (
            <div key={log.id} className="p-2 rounded-md bg-slate-50 border border-slate-200 text-[11px]">
              <div className="flex items-center justify-between text-slate-400 text-[9px] mb-1 font-mono">
                <span>{log.timestamp}</span>
                <span className={`font-bold ${
                  log.severity === 'CRITICAL' ? 'text-red-600' : 'text-blue-600'
                }`}>
                  {log.type}
                </span>
              </div>
              <p className="text-slate-700 leading-tight font-medium">
                {log.message}
              </p>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
