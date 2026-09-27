import React from 'react';
import { 
  MapPin
} from 'lucide-react';
import { useTraffic } from '../context/TrafficContext';
import { useLanguage } from '../context/LanguageContext';

export const NetworkMapView = ({ onSelectJunction }) => {
  const { junctions, selectedJunctionId, emergencyCorridor } = useTraffic();
  const { lang } = useLanguage();

  const arterialRoutes = [
    { from: 'J1', to: 'J2', name: 'WORLI-DADAR ARTERIAL', isCorridor: true, status: 'moderate' },
    { from: 'J2', to: 'J3', name: 'DADAR-BKC FLYOVER', isCorridor: true, status: 'congested' },
    { from: 'J2', to: 'J4', name: 'WEH MAIN TRUNK', isCorridor: false, status: 'optimal' },
    { from: 'J3', to: 'J4', name: 'SCLR CONNECTOR', isCorridor: false, status: 'optimal' }
  ];

  const getJunction = (id) => junctions.find(j => j.id === id);

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden flex flex-col h-full min-h-[360px] shadow-xs">
      {/* Map Control Bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <div className="flex items-center space-x-2">
          <MapPin className="w-3.5 h-3.5 text-[#0F2C59]" />
          <span className="text-xs font-bold text-[#0A1F44] uppercase tracking-wider">
            {lang === 'HI' ? 'प्राथमिक मुख्य मार्ग GIS टोपोलॉजी' : 'Primary Arterial GIS Topology'}
          </span>
          <span className="text-[10px] text-[#64748B] hidden sm:inline">
            {lang === 'HI' ? '[मुंबई ज़ोन-1]' : '[MUMBAI ZONE-1]'}
          </span>
        </div>

        <div className="flex items-center space-x-3 text-[10px] text-[#475569]">
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
            <span className="font-semibold">&lt;85 PCU</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-[#F5A623]" />
            <span className="font-semibold">85-140</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
            <span className="font-semibold">&gt;140</span>
          </div>
        </div>
      </div>

      {/* Vector GIS Map Body */}
      <div className="relative flex-1 bg-[#F4F6F9] overflow-hidden p-4 select-none flex items-center justify-center">
        
        {/* SVG Arterial Network Connections */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {arterialRoutes.map((route, idx) => {
            const start = getJunction(route.from);
            const end = getJunction(route.to);
            if (!start || !end) return null;

            const isCorridorActive = emergencyCorridor.isActive && route.isCorridor;

            // Route color based on congestion
            let strokeColor = '#E2E8F0';
            if (isCorridorActive) strokeColor = '#DC2626';
            else if (route.status === 'congested') strokeColor = '#DC2626';
            else if (route.status === 'moderate') strokeColor = '#F5A623';
            else strokeColor = '#16A34A';

            return (
              <g key={idx}>
                {/* Road Casing */}
                <line
                  x1={`${start.x}%`}
                  y1={`${start.y}%`}
                  x2={`${end.x}%`}
                  y2={`${end.y}%`}
                  stroke="#E2E8F0"
                  strokeWidth="8"
                  strokeLinecap="round"
                />

                {/* Road Surface Link */}
                <line
                  x1={`${start.x}%`}
                  y1={`${start.y}%`}
                  x2={`${end.x}%`}
                  y2={`${end.y}%`}
                  stroke={strokeColor}
                  strokeWidth={isCorridorActive ? '4' : '2.5'}
                  strokeDasharray={isCorridorActive ? '6 3' : 'none'}
                  strokeLinecap="round"
                />

                {/* Route Label */}
                <text
                  x={`${(start.x + end.x) / 2}%`}
                  y={`${(start.y + end.y) / 2 - 3}%`}
                  fill="#475569"
                  fontSize="9"
                  fontWeight="600"
                  fontFamily="'Noto Sans', sans-serif"
                  textAnchor="middle"
                >
                  {route.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Junction Nodes */}
        {junctions.map((j) => {
          const isSelected = selectedJunctionId === j.id;
          const isEmergencyNode = emergencyCorridor.isActive && emergencyCorridor.routeNodeIds.includes(j.id);

          const statusBorder = {
            optimal: 'border-[#BBF7D0]',
            moderate: 'border-[#FDE68A]',
            congested: 'border-[#FECACA]',
            failsafe: 'border-[#FDE68A]'
          }[j.status] || 'border-[#E2E8F0]';

          return (
            <div
              key={j.id}
              onClick={() => onSelectJunction(j.id)}
              style={{ left: `${j.x}%`, top: `${j.y}%` }}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group"
            >
              {/* Main Node Box */}
              <div className={`px-2.5 py-1.5 rounded-lg border bg-white shadow-xs transition-all ${
                isSelected 
                  ? 'border-2 border-[#0F2C59] ring-2 ring-[#0F2C59]/20 shadow-md' 
                  : `${statusBorder} hover:border-[#0F2C59]`
              }`}>
                <div className="flex items-center space-x-1.5">
                  <span className={`w-2 h-2 rounded-full ${
                    isEmergencyNode ? 'bg-[#DC2626] animate-ping' :
                    j.status === 'optimal' ? 'bg-[#16A34A]' :
                    j.status === 'moderate' ? 'bg-[#F5A623]' : 'bg-[#DC2626]'
                  }`} />
                  <span className="text-xs font-bold font-mono text-[#0A1F44]">
                    {j.code}
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#F1F5F9] border border-[#E2E8F0] text-[#0A1F44] font-bold">
                    {j.activePhase} {j.phaseTimer}s
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#475569] mt-0.5">
                  <span>{j.name.split(' ')[0]}</span>
                  <span className="text-[#0F2C59] ml-1.5 font-bold font-mono">{j.totalPcu} PCU</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Emergency Vehicle Beacon */}
        {emergencyCorridor.isActive && (
          <div
            style={{
              left: `${22 + (emergencyCorridor.currentProgressPercent * 0.53)}%`,
              top: `${65 - (emergencyCorridor.currentProgressPercent * 0.30)}%`
            }}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none transition-all duration-300"
          >
            <div className="px-2 py-0.5 rounded-full bg-[#DC2626] border border-white text-[9px] font-bold font-mono text-white shadow-md flex items-center space-x-1">
              <span>{lang === 'HI' ? 'प्राथमिकता' : 'PRIORITY'}</span>
              <span>{emergencyCorridor.vehicleId}</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
