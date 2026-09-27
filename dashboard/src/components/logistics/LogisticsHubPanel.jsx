import React, { useState } from 'react';
import { Warehouse, Package, Clock, AlertTriangle, CheckCircle2, ChevronRight, Scale, AlertOctagon } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function LogisticsHubPanel({ hubs = [], telemetry }) {
  const { lang } = useLanguage();
  const [selectedHubId, setSelectedHubId] = useState('HUB_BKC_01');

  // Consume live hub state; only use fallback for explicit empty/error state
  const activeHub = hubs.find(h => h.hubId === selectedHubId) || hubs[0] || null;

  if (!activeHub) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs text-center text-slate-400">
        <Warehouse className="w-8 h-8 mx-auto mb-2 text-slate-300" />
        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">
          {lang === 'HI' ? 'हब डेटा अनुपलब्ध' : 'Logistics Hub State Unavailable'}
        </h4>
        <p className="text-[11px] text-slate-400 mt-1">
          Awaiting live LogisticsHubManager telemetry stream...
        </p>
      </div>
    );
  }

  const occupiedBaysCount = (activeHub.bays || []).filter(b => b.status === 'OCCUPIED' || b.status === 'DWELLING').length;
  const totalBays = activeHub.totalBays || (activeHub.bays || []).length || 3;
  const occupancyPct = Math.round((occupiedBaysCount / (totalBays || 1)) * 100);

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-xs">
      {/* Header & Hub Selector Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-[#0A1F44] text-[#F5A623] flex items-center justify-center font-bold">
            <Warehouse className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-[#0A1F44] text-sm">
              {lang === 'HI' ? 'लॉजिस्टिक्स हब व स्मार्ट कर्व' : 'Logistics Hub & Smart Curb Management'}
            </h3>
            <p className="text-xs text-[#475569]">
              Deterministic Loading Bay Dwell & Curb Queue State
            </p>
          </div>
        </div>

        {/* Hub Tab Switcher */}
        <div className="flex items-center space-x-1 bg-[#F8FAFC] p-1 rounded-lg border border-[#E2E8F0]">
          {hubs.map(h => (
            <button
              key={h.hubId}
              onClick={() => setSelectedHubId(h.hubId)}
              className={`px-3 py-1 rounded text-xs font-bold transition cursor-pointer ${
                activeHub.hubId === h.hubId
                  ? 'bg-[#0F2C59] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#0A1F44]'
              }`}
            >
              {h.hubId === 'HUB_BKC_01' ? 'BKC Hub' : h.hubId === 'HUB_DDR_01' ? 'Dadar Depot' : h.name}
            </button>
          ))}
        </div>
      </div>

      {/* Hub Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3.5">
        <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#CBD5E1] shadow-xs">
          <div className="text-xs text-[#475569] font-bold uppercase tracking-wider">Bay Occupancy</div>
          <div className="text-xl sm:text-2xl font-black text-[#0F2942] mt-1">
            {occupiedBaysCount} / {totalBays} <span className="text-xs font-semibold text-slate-500">({occupancyPct}%)</span>
          </div>
        </div>

        <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#CBD5E1] shadow-xs">
          <div className="text-xs text-[#475569] font-bold uppercase tracking-wider">Curb Queue</div>
          <div className={`text-xl sm:text-2xl font-black mt-1 ${(activeHub.curbQueue || []).length > 0 ? 'text-amber-700' : 'text-[#0F2942]'}`}>
            {(activeHub.curbQueue || []).length} <span className="text-xs font-semibold text-slate-500">veh</span>
          </div>
        </div>

        <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#CBD5E1] shadow-xs">
          <div className="text-xs text-[#475569] font-bold uppercase tracking-wider">Curb Saturation</div>
          <div className="text-xl sm:text-2xl font-black text-purple-700 mt-1">
            {activeHub.curbSaturation !== undefined ? activeHub.curbSaturation : Math.min(100, Math.round(((activeHub.curbQueue || []).length / Math.max(1, totalBays)) * 100))}%
          </div>
        </div>

        <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#CBD5E1] shadow-xs">
          <div className="text-xs text-[#475569] font-bold uppercase tracking-wider">Served Freight</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
            {activeHub.completedCount || 0} <span className="text-xs font-semibold text-slate-500">({activeHub.totalFreightServed || 0}t)</span>
          </div>
        </div>
      </div>

      {/* Lane Spillover Alert if curb queue causes lane blockage */}
      {activeHub.laneBlocked && (
        <div className="bg-red-50 border border-red-200 text-red-900 rounded-xl p-3 mb-3.5 flex items-start space-x-2.5 text-xs sm:text-sm shadow-xs">
          <AlertOctagon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">Curb Spillover Alert:</strong> Curb queue exceeds bay capacity, causing a {Math.round((1 / (activeHub.nominalLaneCount || 3)) * 100)}% Effective Lane Capacity Reduction on approach {activeHub.approach}.
          </div>
        </div>
      )}

      {/* Loading Bays Visual Grid */}
      <div className="space-y-2.5">
        <div className="text-xs sm:text-sm font-bold text-[#475569] uppercase tracking-wider flex items-center justify-between">
          <span>Loading Bays Status ({activeHub.name})</span>
          <span className="text-xs text-slate-500 font-semibold">Assoc. Junction: {activeHub.associatedJunction}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {(activeHub.bays || []).map((bay, idx) => {
            const isDwelling = bay.status === 'DWELLING' || bay.status === 'OCCUPIED';
            const dwellProgress = isDwelling && bay.totalDwellSec > 0
              ? Math.round(((bay.totalDwellSec - (bay.dwellRemainingSec || 0)) / bay.totalDwellSec) * 100)
              : 0;

            return (
              <div
                key={idx}
                className={`p-3 rounded-xl border transition shadow-xs ${
                  isDwelling
                    ? 'bg-amber-50/70 border-amber-200'
                    : 'bg-[#F8FAFC] border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${isDwelling ? 'bg-amber-600 animate-pulse' : 'bg-emerald-500'}`} />
                    <span className="font-bold text-sm text-slate-900">Bay 0{idx + 1}</span>
                  </div>
                  <span className={`text-xs font-extrabold uppercase px-2 py-0.5 rounded border ${
                    isDwelling ? 'bg-amber-200 text-amber-900 border-amber-300' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}>
                    {isDwelling ? 'DWELLING' : 'AVAILABLE'}
                  </span>
                </div>

                {isDwelling ? (
                  <div className="space-y-1.5 text-xs sm:text-sm">
                    <div className="flex items-center justify-between text-slate-700">
                      <span>Vehicle: <strong className="text-slate-900 font-black">{bay.vehicleOccupying || bay.occupiedByVehicleId || '—'}</strong></span>
                      <span className="text-slate-600 font-bold">{bay.cargoTonnage ? `${bay.cargoTonnage}t` : '—'}</span>
                    </div>
                    {/* Dwell Progress Bar */}
                    <div className="w-full bg-amber-200/80 rounded-full h-2 mt-1.5 overflow-hidden">
                      <div
                        className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${dwellProgress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                      <span>Remaining: <strong className="text-slate-900 font-bold">{Math.round(bay.dwellRemainingSec || 0)}s</strong></span>
                      <span>Total: {bay.totalDwellSec}s</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 py-1.5 text-center font-medium">
                    Ready for incoming freight docking
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
