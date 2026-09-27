import React, { useState, useMemo } from 'react';
import { useTraffic } from '../context/TrafficContext';
import { useLanguage } from '../context/LanguageContext';
import { CORRIDORS, computeCorridorCoordination } from '../utils/CorridorCoordinator';
import CityCorridorMap from '../components/CityCorridorMap';
import CorridorFlowStrip from '../components/CorridorFlowStrip';
import CorridorJunctionCard from '../components/CorridorJunctionCard';
import CorridorSidebar from '../components/CorridorSidebar';
import UrbanResourcePressurePanel from '../components/UrbanResourcePressurePanel';
import { MapPin, Zap, Radio, Activity, ShieldCheck, RefreshCw, AlertTriangle, Layers, TrendingUp } from 'lucide-react';

export default function CityCorridorPage({ onNavigate }) {
  const { lang } = useLanguage();
  const {
    junctions,
    selectedJunctionId,
    setSelectedJunctionId,
    incidentLogs,
    triggerScenario,
    setJunctionOverride
  } = useTraffic();

  const [selectedCorridor, setSelectedCorridor] = useState(CORRIDORS[0]);
  const [coordinationActive, setCoordinationActive] = useState(true);

  // Compute real-time coordination state
  const { junctionStates, corridorStatus, corridorMetrics, activePredictions } = useMemo(() => {
    return computeCorridorCoordination(junctions, selectedCorridor, coordinationActive);
  }, [junctions, selectedCorridor, coordinationActive]);

  return (
    <div className="max-w-[1520px] mx-auto px-4 sm:px-8 space-y-6">
      {/* 1. Page Header with Title & Operational Badges */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#0A1F44] text-[#F5A623] flex items-center justify-center font-black shadow-xs">
              <MapPin size={22} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-xl font-black text-[#0A1F44] tracking-tight">
                  {lang === 'HI'
                    ? 'लाइव गूगल ट्रैफिक समन्वित मल्टी-इंटरसेक्शन नियंत्रण'
                    : 'Live Traffic-Aware Multi-Intersection Coordination'}
                </h1>
                <span className="hidden sm:inline-block text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full">
                  Live GIS Integrated
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {lang === 'HI'
                  ? 'गूगल मैप्स रियल-टाइम ट्रैफिक परत एवं परस्पर जुड़े सिग्नलों के बीच अग्रिम प्रवाह भविष्यवाणी'
                  : 'Google Maps real-time traffic overlay paired with predictive inter-junction green wave management'}
              </p>
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-slate-600 font-medium">GIS Feed:</span>
            <span className="font-bold text-[#0A1F44]">Google Maps Live</span>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#0A1F44] text-white text-xs font-bold shadow-xs">
            <Radio size={14} className="text-[#F5A623] animate-pulse" />
            <span>
              {coordinationActive
                ? (lang === 'HI' ? 'कॉरिडोर समन्वय: सक्रिय' : 'CORRIDOR SYNC: ON')
                : (lang === 'HI' ? 'कॉरिडोर समन्वय: बंद' : 'CORRIDOR SYNC: OFF')}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Top Section: Sidebar Controls + Interactive Google Map with Traffic Layer */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Sidebar Panel */}
        <CorridorSidebar
          selectedCorridor={selectedCorridor}
          onSelectCorridor={setSelectedCorridor}
          coordinationActive={coordinationActive}
          onToggleCoordination={setCoordinationActive}
          corridorMetrics={corridorMetrics}
          onTriggerScenario={triggerScenario}
          incidentLogs={incidentLogs}
          lang={lang}
        />

        {/* Center/Right: Google Map with Live Traffic Layer & Inter-junction Links */}
        <div className="flex-1 w-full space-y-4">
          <CityCorridorMap
            corridor={selectedCorridor}
            junctionStates={junctionStates}
            selectedJunctionId={selectedJunctionId}
            onSelectJunction={setSelectedJunctionId}
            coordinationActive={coordinationActive}
            lang={lang}
          />
        </div>
      </div>

      {/* 3. Middle Section: Visual Corridor Pipeline Strip */}
      <CorridorFlowStrip
        corridor={selectedCorridor}
        junctionStates={junctionStates}
        selectedJunctionId={selectedJunctionId}
        onSelectJunction={setSelectedJunctionId}
        coordinationActive={coordinationActive}
        lang={lang}
      />

      {/* Urban Resource Pressure & Response Engine */}
      <UrbanResourcePressurePanel />

      {/* 4. Bottom Section: Detailed Per-Junction Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-extrabold text-[#0A1F44] uppercase tracking-wide">
              {lang === 'HI' ? 'कॉरिडोर नोड विवरण एवं दृष्टिकोण वर्गीकरण' : 'Corridor Intersections & Approach Conditions'}
            </h2>
            <p className="text-xs text-slate-500">
              {lang === 'HI'
                ? 'प्रत्येक जंक्शन पर लाइव गूगल ट्रैफिक स्थिति, सक्रिय सिग्नल समय और अपस्ट्रीम वेव तैयारी'
                : 'Real-time 4-approach classification, active signal timing, and upstream wave preparation per junction'}
            </p>
          </div>

          <div className="text-xs font-mono text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
            Nodes In Network: <span className="font-bold text-[#0A1F44]">{selectedCorridor.junctionIds.length}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {selectedCorridor.junctionIds.map((jId) => (
            <CorridorJunctionCard
              key={jId}
              junctionState={junctionStates[jId]}
              isSelected={selectedJunctionId === jId}
              onSelect={() => setSelectedJunctionId(jId)}
              onOverride={setJunctionOverride}
              coordinationActive={coordinationActive}
              lang={lang}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
