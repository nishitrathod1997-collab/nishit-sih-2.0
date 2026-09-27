import React from 'react';
import {
  CalendarClock,
  Truck,
  ShieldAlert,
  CheckCircle2,
  Anchor
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { formatSimTime } from '../../utils/FreightSlotManager';

export default function FreightSlotManagerPanel({
  slotState = {},
  selectedVehicle = null,
  hubs = [],
  activeScenario = 'normal',
  onSelectVehicle = null
}) {
  const { lang } = useLanguage();

  const stagedVehicles = slotState?.stagedVehicles || [];
  const activeSlots = slotState?.activeSlotAssignments || [];
  const latestDecision = slotState?.latestDecision || null;
  const decisionHistory = slotState?.decisionHistory || [];

  const totalReleased = slotState?.totalVehiclesReleased || 0;
  const curbPrevented = slotState?.totalCurbEntriesPrevented || 0;

  // Determine active displayed record
  // 1. If selectedVehicle matches a staged vehicle or decision history
  // 2. Else first staged vehicle
  // 3. Else latest decision
  let displayedRecord = null;
  if (selectedVehicle && selectedVehicle.isCommercial) {
    displayedRecord = stagedVehicles.find(s => s.vehicleId === selectedVehicle.id) ||
      decisionHistory.slice().reverse().find(d => d.vehicleId === selectedVehicle.id) ||
      null;
  }

  if (!displayedRecord && stagedVehicles.length > 0) {
    displayedRecord = stagedVehicles[0];
  }

  if (!displayedRecord && latestDecision) {
    displayedRecord = latestDecision;
  }

  // Destination hub data
  const targetHubId = displayedRecord?.destinationHubId || selectedVehicle?.destinationHubId || 'HUB_DDR_01';
  const targetHub = hubs.find(h => h.hubId === targetHubId) || null;

  const totalBays = targetHub ? (targetHub.totalBays || 3) : 3;
  const occupiedBays = targetHub ? (typeof targetHub.occupiedBays === 'number' ? targetHub.occupiedBays : 0) : 0;
  const availableBays = targetHub ? (typeof targetHub.availableBays === 'number' ? targetHub.availableBays : Math.max(0, totalBays - occupiedBays)) : totalBays;
  const curbSat = targetHub ? (typeof targetHub.curbSaturation === 'number' ? targetHub.curbSaturation : 0) : 0;

  // Decision & Styling mapping
  const decisionKey = displayedRecord?.decision || 'PROCEED_NOW';

  let decisionBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
  let decisionLabel = lang === 'HI' ? 'तुरंत आगे बढ़ें' : 'PROCEED NOW';
  let DecisionIcon = CheckCircle2;

  if (decisionKey === 'SLOT_ASSIGNED') {
    decisionBadgeClass = 'bg-blue-100 text-blue-800 border-blue-300';
    decisionLabel = lang === 'HI' ? 'स्लॉट आवंटित' : 'SLOT ASSIGNED';
    DecisionIcon = CalendarClock;
  } else if (decisionKey === 'HOLD_AT_ORIGIN') {
    decisionBadgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
    decisionLabel = lang === 'HI' ? 'मूल स्थान पर रोकें' : 'HOLD AT ORIGIN';
    DecisionIcon = Anchor;
  } else if (decisionKey === 'DEFER_EMERGENCY') {
    decisionBadgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
    decisionLabel = lang === 'HI' ? 'आपातकालीन प्राथमिकता स्थगित' : 'DEFER – EMERGENCY';
    DecisionIcon = ShieldAlert;
  }

  // Travel time & Arrival window
  const travelTimeSec = displayedRecord?.estimatedTravelTimeSec !== undefined
    ? displayedRecord.estimatedTravelTimeSec
    : (displayedRecord?.originJunctionId === 'J1' ? 306 : 378);

  const slotWindow = displayedRecord?.assignedSlotStartSec
    ? `${formatSimTime(displayedRecord.assignedSlotStartSec)} – ${formatSimTime(displayedRecord.assignedSlotEndSec)}`
    : (lang === 'HI' ? 'तत्काल / खुला विंडो' : 'Immediate / Open Window');

  // Holding location calculation
  let holdingLocation = lang === 'HI' ? 'अपस्ट्रीम स्टेजिंग (J1)' : 'Upstream Staging (J1)';
  if (displayedRecord?.status === 'RELEASED' || decisionKey === 'PROCEED_NOW') {
    holdingLocation = lang === 'HI' ? 'कॉरिडोर लिंक पर जारी' : 'Released to Corridor Link';
  } else if (displayedRecord?.originJunctionId) {
    holdingLocation = lang === 'HI' ? `स्टेजिंग क्षेत्र @ जंक्शन ${displayedRecord.originJunctionId}` : `Staging Area @ Junction ${displayedRecord.originJunctionId}`;
  } else if (selectedVehicle?.location) {
    holdingLocation = selectedVehicle.location;
  }

  const isScenarioInjection = activeScenario === 'hub_congestion';

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0A1F44] text-[#F5A623] flex items-center justify-center font-bold">
            <CalendarClock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-[#0A1F44] text-sm">
                {lang === 'HI' ? 'स्मार्ट फ्रेट स्लॉट नियंत्रण' : 'Freight Arrival Slot Control'}
              </h3>
              {isScenarioInjection && (
                <span className="text-[9px] font-extrabold text-amber-700 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded">
                  {lang === 'HI' ? 'परिदृश्य इंजेक्शन' : 'SCENARIO INJECTION'}
                </span>
              )}
            </div>
            <p className="text-xs text-[#475569]">
              {lang === 'HI'
                ? 'पूर्वानुमानित हब शेड्यूलिंग और अपस्ट्रीम होल्डिंग'
                : 'Predictive hub-entry scheduling and upstream staging'}
            </p>
          </div>
        </div>
      </div>

      {/* 3 Metric Counters */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-3.5 text-center shadow-xs">
          <div className="text-xs font-bold text-[#475569] uppercase tracking-wider">
            {lang === 'HI' ? 'वर्तमान में आयोजित' : 'Currently Staged'}
          </div>
          <div className="text-3xl font-black text-amber-700 mt-1">
            {stagedVehicles.length}
          </div>
          <span className="text-xs font-bold text-slate-500">{lang === 'HI' ? 'वाहन' : 'VEHICLES'}</span>
        </div>

        <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-3.5 text-center shadow-xs">
          <div className="text-xs font-bold text-[#475569] uppercase tracking-wider">
            {lang === 'HI' ? 'सक्रिय स्लॉट' : 'Assigned Slots'}
          </div>
          <div className="text-3xl font-black text-blue-700 mt-1">
            {activeSlots.length}
          </div>
          <span className="text-xs font-bold text-slate-500">{lang === 'HI' ? 'सक्रिय' : 'ACTIVE'}</span>
        </div>

        <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-3.5 text-center shadow-xs">
          <div className="text-xs font-bold text-[#475569] uppercase tracking-wider">
            {lang === 'HI' ? 'जारी किए गए वाहन' : 'Released Freight'}
          </div>
          <div className="text-3xl font-black text-emerald-700 mt-1">
            {totalReleased}
          </div>
          <span className="text-xs font-bold text-slate-500">{lang === 'HI' ? 'प्रेषित' : 'DISPATCHED'}</span>
        </div>
      </div>

      {/* Main Selected Vehicle Telemetry Card */}
      <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#CBD5E1] mb-4 space-y-3 shadow-xs">
        {/* Selected Vehicle Header & Decision */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold">
              <Truck className="w-4 h-4 text-slate-800" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-sm sm:text-base text-[#0A1F44]">
                  {displayedRecord?.vehicleId || selectedVehicle?.id || 'No Active Freight Selected'}
                </span>
                {displayedRecord?.vehicleType && (
                  <span className="text-xs font-semibold text-slate-500">
                    ({displayedRecord.vehicleType === 'freight_truck' ? 'HCV Truck' : 'LCV Van'})
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className={`flex items-center space-x-1.5 text-xs font-black px-3 py-1 rounded-lg border shadow-xs ${decisionBadgeClass}`}>
            <DecisionIcon className="w-4 h-4" />
            <span>{decisionLabel}</span>
          </div>
        </div>

        {/* Reason Banner */}
        <div className="p-3 bg-white rounded-lg border border-slate-200">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            {lang === 'HI' ? 'कारण एवं स्थिति:' : 'Scheduling Decision & Rationale:'}
          </div>
          <p className="text-sm text-[#0F2942] font-semibold leading-relaxed">
            "{displayedRecord?.reason || 'Corridor entry normal. Destination hub operational.'}"
          </p>
        </div>

        {/* Grid Attributes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <span className="text-xs text-slate-500 font-bold block">Origin Junction</span>
            <span className="font-black text-slate-900 text-sm block mt-1">
              {displayedRecord?.originJunctionId || 'J1 (Upstream Corridor)'}
            </span>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <span className="text-xs text-slate-500 font-bold block">Destination Hub</span>
            <span className="font-black text-slate-900 text-sm block mt-1">
              {targetHubId} {targetHub ? `(${targetHub.name?.split(' ')[0]})` : ''}
            </span>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-bold">Est. Travel Time</span>
              <span className="text-[9px] font-extrabold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">MODELED</span>
            </div>
            <span className="font-black text-slate-900 text-sm block mt-1">
              {travelTimeSec}s ({Math.round(travelTimeSec / 60)} min)
            </span>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-bold">Bay Availability</span>
              <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">LIVE SIMULATION</span>
            </div>
            <span className="font-black text-slate-900 text-sm block mt-1">
              {availableBays} of {totalBays} Bays Free
            </span>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-bold">Curb Saturation</span>
              <span className="text-[9px] font-extrabold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">LIVE SIMULATION</span>
            </div>
            <span className="font-black text-slate-900 text-sm block mt-1">
              {curbSat}% ({targetHub?.queueLength || 0} queued)
            </span>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-bold">Arrival Window</span>
            </div>
            <span className="font-black text-indigo-900 text-sm block mt-1">
              {slotWindow}
            </span>
          </div>
        </div>

        {/* Current Holding Location */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs sm:text-sm">
          <span className="text-slate-600 font-bold">Current Location:</span>
          <span className="font-extrabold text-slate-900 bg-slate-200 px-2.5 py-1 rounded-md">
            {holdingLocation}
          </span>
        </div>
      </div>

      {/* Staged Vehicle Queue List if any vehicles are waiting */}
      {stagedVehicles.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
          <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-600 uppercase tracking-wider">
            <span>Staged Freight Vehicles ({stagedVehicles.length})</span>
            <span className="text-amber-800 font-extrabold">HELD UPSTREAM</span>
          </div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {stagedVehicles.map(veh => (
              <button
                key={veh.vehicleId}
                onClick={() => onSelectVehicle && onSelectVehicle(veh.vehicle || { id: veh.vehicleId, isCommercial: true, ...veh })}
                className="w-full text-left flex items-center justify-between p-2 rounded-lg bg-amber-50/70 hover:bg-amber-100 border border-amber-200 transition text-xs sm:text-sm font-semibold cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-amber-600" />
                  <span className="font-bold text-slate-900">{veh.vehicleId}</span>
                  <span className="text-xs text-slate-500">(@ {veh.originJunctionId} → {veh.destinationHubId})</span>
                </div>
                <span className="text-[10px] font-extrabold text-amber-900 px-2 py-0.5 bg-white rounded border border-amber-300">
                  {veh.decision === 'DEFER_EMERGENCY' ? 'EMERGENCY DEFERRED' : (veh.status === 'SLOT_PENDING' ? 'SLOT PENDING' : 'HELD')}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Derived Counter: Curb Entries Prevented */}
      <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
        <div>
          <span className="text-xs sm:text-sm font-bold text-slate-600 uppercase block">
            {lang === 'HI' ? 'रोके गए कर्ब प्रवेश' : 'Curb Entries Prevented'}
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase">
            Upstream Staging Metric
          </span>
        </div>
        <div className="text-right">
          <span className="text-xl sm:text-2xl font-black text-[#0A1F44]">
            {curbPrevented}
          </span>
          <span className="text-xs font-semibold text-slate-500 ml-1">
            vehicles held
          </span>
        </div>
      </div>
    </div>
  );
}
