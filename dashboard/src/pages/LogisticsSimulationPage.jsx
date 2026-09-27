import React, { useState, useMemo } from 'react';
import {
  Truck,
  Package,
  Clock,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  ShieldCheck,
  Activity,
  Layers,
  Sparkles,
  Scale,
  Warehouse,
  TrendingDown,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { useLanguage } from '../context/LanguageContext';
import LogisticsIntersectionVisualizer from '../components/logistics/LogisticsIntersectionVisualizer';
import LogisticsVehicleInspector from '../components/logistics/LogisticsVehicleInspector';
import FreightGreenWavePanel from '../components/logistics/FreightGreenWavePanel';
import LogisticsHubPanel from '../components/logistics/LogisticsHubPanel';
import FreightSlotManagerPanel from '../components/logistics/FreightSlotManagerPanel';
import CorridorProgressionView from '../components/logistics/CorridorProgressionView';
import UrbanResourcePressurePanel from '../components/UrbanResourcePressurePanel';
import { computeCorridorCoordination, CORRIDORS } from '../utils/CorridorCoordinator';

// MODELED CORRIDOR BASELINE
// Provenance: Derived from existing defaults in CorridorCoordinator.js (20 PCU, 35 km/h)
// Configurable Simulation Assumption
const MODELED_CORRIDOR_BASELINE = {
  totalPcu: 80,
  approachData: {
    N: { pcu: 20, speedKmph: 35 },
    S: { pcu: 20, speedKmph: 35 },
    E: { pcu: 20, speedKmph: 35 },
    W: { pcu: 20, speedKmph: 35 }
  },
  activePhase: 'NS',
  phaseTimer: 0
};

export default function LogisticsSimulationPage({ onNavigate }) {
  const { lang } = useLanguage();
  const {
    state,
    metrics,
    strategy,
    setStrategy,
    simulationSpeed,
    setSpeed,
    resetSimulation,
    freightDemandMultiplier = 1.0,
    setFreightDemandMultiplier,
    triggerLogisticsScenario
  } = useSimulation();

  const [isPaused, setIsPaused] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [activeScenario, setActiveScenario] = useState('normal');

  const flattenedCars = useMemo(
    () =>
      Object.entries(state?.cars || {}).flatMap(([lane, laneCars]) =>
        laneCars.map(car => ({
          ...car,
          lane
        }))
      ),
    [state?.cars]
  );

  const localCommercialVehicles = useMemo(() => {
    return flattenedCars.filter(c => c.isCommercial);
  }, [flattenedCars]);

  const corridorFreight = state?.corridorFreight;
  const allCommercialVehicles = useMemo(() => {
    if (corridorFreight?.allCommercialVehicles && corridorFreight.allCommercialVehicles.length > 0) {
      return corridorFreight.allCommercialVehicles;
    }
    return localCommercialVehicles;
  }, [corridorFreight?.allCommercialVehicles, localCommercialVehicles]);

  const activeFreightCount = corridorFreight?.activeFreightCount ?? allCommercialVehicles.length;
  const deliveryVansCount = corridorFreight?.vansCount ?? allCommercialVehicles.filter(c => c.type === 'delivery_van').length;
  const freightTrucksCount = corridorFreight?.trucksCount ?? allCommercialVehicles.filter(c => c.type === 'freight_truck' || c.type === 'truck').length;

  const totalCargoTonnage = useMemo(() => {
    if (typeof corridorFreight?.totalCargoTonnage === 'number') {
      return corridorFreight.totalCargoTonnage;
    }
    return Number(
      allCommercialVehicles.reduce((sum, v) => sum + (v.cargoTonnage || (v.type === 'freight_truck' ? 8.5 : 1.2)), 0).toFixed(1)
    );
  }, [corridorFreight?.totalCargoTonnage, allCommercialVehicles]);

  const totalFreightPcu = useMemo(() => {
    if (typeof corridorFreight?.totalFreightPcu === 'number') {
      return corridorFreight.totalFreightPcu;
    }
    return Number(
      allCommercialVehicles.reduce((sum, v) => sum + (v.pcuEquivalent || (v.type === 'freight_truck' ? 2.5 : 1.5)), 0).toFixed(1)
    );
  }, [corridorFreight?.totalFreightPcu, allCommercialVehicles]);

  // Selected vehicle object
  const selectedVehicle = useMemo(() => {
    if (selectedVehicleId) {
      const foundInCommercial = allCommercialVehicles.find(c => c.id === selectedVehicleId);
      if (foundInCommercial) return foundInCommercial;
      const foundInCompleted = (state?.completedDeliveries || []).find(c => c.vehicleId === selectedVehicleId || c.id === selectedVehicleId);
      if (foundInCompleted) {
        return {
          id: foundInCompleted.vehicleId,
          type: foundInCompleted.vehicleType,
          isCommercial: true,
          cargoTonnage: foundInCompleted.cargoTonnage,
          destinationHubId: foundInCompleted.hubId,
          deliveryStatus: 'COMPLETED',
          completionTime: foundInCompleted.completionTime,
          lane: foundInCompleted.hub || 'HUB'
        };
      }
      const found = flattenedCars.find(c => c.id === selectedVehicleId);
      if (found) return found;
    }
    return allCommercialVehicles[0] || localCommercialVehicles[0] || null;
  }, [allCommercialVehicles, localCommercialVehicles, flattenedCars, selectedVehicleId, state?.completedDeliveries]);

  // Active freight green wave decision for selected or leading approach
  const activeFreightDecisions = state?.freightGreenWaveDecisions || [];
  const activeDecision = useMemo(() => {
    if (selectedVehicle) {
      const match = activeFreightDecisions.find(d => d.vehicleId === selectedVehicle.id || d.approach === selectedVehicle.lane);
      if (match) return match;
    }
    return activeFreightDecisions[0] || null;
  }, [activeFreightDecisions, selectedVehicle]);

  const hubs = state?.logisticsHubs || [];
  const freightTelemetry = state?.freightTelemetry || {};

  const corridorData = useMemo(() => {
    // 1. Live J3 Node using actual simulation demand & signal
    // Because the simulation engine does not export a live average physical velocity,
    // J3's speedKmph cannot be derived from live throughput. It falls back to explicitly modeled 35 km/h.
    const liveN = state?.queues?.N || 0;
    const liveS = state?.queues?.S || 0;
    const liveE = state?.queues?.E || 0;
    const liveW = state?.queues?.W || 0;
    const j3LiveState = {
      id: 'J3',
      totalPcu: liveN + liveS + liveE + liveW,
      approachData: {
        N: { pcu: liveN, speedKmph: 35 },
        S: { pcu: liveS, speedKmph: 35 },
        E: { pcu: liveE, speedKmph: 35 },
        W: { pcu: liveW, speedKmph: 35 }
      },
      activePhase: (state?.signal === 'N' || state?.signal === 'S') ? 'NS' : 'EW',
      phaseTimer: state?.signal_timer || 0
    };

    // 2. Modeled Baseline Nodes J1, J2, J4
    const j1ModeledState = { ...MODELED_CORRIDOR_BASELINE, id: 'J1' };
    const j2ModeledState = { ...MODELED_CORRIDOR_BASELINE, id: 'J2' };
    const j4ModeledState = { ...MODELED_CORRIDOR_BASELINE, id: 'J4' };

    const macroJunctions = [j1ModeledState, j2ModeledState, j3LiveState, j4ModeledState];

    return computeCorridorCoordination(macroJunctions, CORRIDORS[0], true);
  }, [state?.queues, state?.signal, state?.signal_timer]);

  // Handle Scenario Switch
  const handleScenarioChange = (scenarioKey) => {
    setActiveScenario(scenarioKey);
    if (triggerLogisticsScenario) {
      triggerLogisticsScenario(scenarioKey);
    }
  };

  return (
    <div
      data-page="logistics-simulation"
      className="logistics-page max-w-[1520px] mx-auto px-4 sm:px-8 space-y-6 pb-12"
      style={{ fontFamily: "'Noto Sans', 'Noto Sans Devanagari', system-ui, -apple-system, sans-serif" }}
    >
      {/* 1. Page Header & Operational Badges */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#0A1F44] text-[#F5A623] flex items-center justify-center font-bold shadow-xs">
              <Truck size={22} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-[#0A1F44]">
                  {lang === 'HI' ? 'स्मार्ट लॉजिस्टिक्स एवं माल ढुलाई सिमुलेशन हब' : 'Smart Logistics & Freight Simulation Hub'}
                </h3>
                <span className="text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center space-x-1">
                  <Activity size={10} className="animate-pulse" />
                  <span>{lang === 'HI' ? 'सिमुलेशन सक्रिय' : 'SIMULATION ACTIVE'}</span>
                </span>
              </div>
              <p className="text-xs text-[#475569] mt-0.5">
                {lang === 'HI'
                  ? 'साझा यातायात सिमुलेशन का लॉजिस्टिक्स-केंद्रित परिचालन दृश्य।'
                  : 'Logistics-focused operational view of the shared traffic simulation.'}
              </p>
            </div>
          </div>
        </div>

        {/* Strategy Switcher */}
        <div className="flex items-center space-x-2 bg-[#F8FAFC] p-1.5 rounded-xl border border-[#E2E8F0]">
          <button
            onClick={() => setStrategy('adaptive')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
              strategy === 'adaptive'
                ? 'bg-[#0F2C59] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#0A1F44]'
            }`}
          >
            <Sparkles size={14} className="text-[#F5A623]" />
            <span>{lang === 'HI' ? 'अनुकूली (माल प्राथमिकता)' : 'Adaptive (Freight-Aware)'}</span>
          </button>
          <button
            onClick={() => setStrategy('fixed')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
              strategy === 'fixed'
                ? 'bg-[#0F2C59] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#0A1F44]'
            }`}
          >
            <Clock size={14} />
            <span>{lang === 'HI' ? 'नियत बेसलाइन (IRC-67)' : 'Fixed Baseline (IRC-67)'}</span>
          </button>
        </div>
      </div>

      {/* 2. Simulation Operational Controls & Scenario Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 py-2 px-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
        {/* Left: Engine Controls */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center space-x-1 bg-[#E2E8F0] p-1 rounded-md">
            <button
              onClick={() => {
                if (isPaused) {
                  setSpeed(simulationSpeed || 1.0);
                  setIsPaused(false);
                } else {
                  setSpeed(0);
                  setIsPaused(true);
                }
              }}
              className="px-3 py-1 rounded bg-white text-slate-800 text-xs font-bold shadow-xs hover:bg-slate-50 transition flex items-center space-x-1 cursor-pointer"
            >
              {isPaused ? <Play size={14} className="text-emerald-600" /> : <Pause size={14} className="text-amber-600" />}
              <span>{isPaused ? (lang === 'HI' ? 'जारी रखें' : 'Resume') : (lang === 'HI' ? 'विराम' : 'Pause')}</span>
            </button>
            <button
              onClick={() => {
                resetSimulation();
                setSelectedVehicleId(null);
                setIsPaused(false);
              }}
              className="px-2.5 py-1 rounded text-slate-600 hover:text-[#0A1F44] text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
              title={lang === 'HI' ? 'सिमुलेशन रीसेट करें' : 'Reset Simulation'}
            >
              <RotateCcw size={14} />
              <span>{lang === 'HI' ? 'रीसेट' : 'Reset'}</span>
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center space-x-1 bg-[#E2E8F0] p-1 rounded-md text-xs font-bold">
            <span className="text-[10px] text-[#475569] px-1 uppercase tracking-wider">{lang === 'HI' ? 'गति:' : 'Speed:'}</span>
            {[0.5, 1.0, 2.0, 4.0].map(s => (
              <button
                key={s}
                onClick={() => {
                  setSpeed(s);
                  setIsPaused(false);
                }}
                className={`px-2 py-1 rounded transition cursor-pointer ${
                  simulationSpeed === s && !isPaused
                    ? 'bg-[#0F2C59] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#0A1F44]'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Freight Demand Multiplier */}
          <div className="flex items-center space-x-1 bg-[#E2E8F0] p-1 rounded-md text-xs font-bold">
            <span className="text-[10px] text-[#475569] px-1 uppercase tracking-wider">{lang === 'HI' ? 'माल दर:' : 'Freight Rate:'}</span>
            {[
              { label: lang === 'HI' ? 'निम्न (0.5x)' : 'Low (0.5x)', val: 0.5 },
              { label: lang === 'HI' ? 'सामान्य (1.0x)' : 'Normal (1.0x)', val: 1.0 },
              { label: lang === 'HI' ? 'शीर्ष (1.8x)' : 'Peak (1.8x)', val: 1.8 }
            ].map(d => (
              <button
                key={d.val}
                onClick={() => setFreightDemandMultiplier && setFreightDemandMultiplier(d.val)}
                className={`px-2 py-1 rounded transition cursor-pointer ${
                  freightDemandMultiplier === d.val
                    ? 'bg-[#0F2C59] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#0A1F44]'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Operational Scenario Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-[#475569] uppercase tracking-wider">{lang === 'HI' ? 'परिदृश्य:' : 'Scenario:'}</span>
          <select
            value={activeScenario}
            onChange={(e) => handleScenarioChange(e.target.value)}
            className="bg-white border border-[#CBD5E1] text-[#0A1F44] text-xs font-bold rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs"
          >
            <option value="normal">{lang === 'HI' ? '1. सामान्य मिश्रित यातायात' : '1. Normal Mixed Traffic'}</option>
            <option value="peak_freight">{lang === 'HI' ? '2. शीर्ष माल ढुलाई गलियारा' : '2. Peak Freight Corridor Flow'}</option>
            <option value="hub_congestion">{lang === 'HI' ? '3. लॉजिस्टिक्स हब संतृप्ति' : '3. Logistics Hub Dwell Saturation'}</option>
            <option value="spillback_throttling">{lang === 'HI' ? '4. डाउनस्ट्रीम बैकप्रेशर नियंत्रण' : '4. Downstream Spillback Throttling'}</option>
            <option value="emergency_conflict">{lang === 'HI' ? '5. आपातकालीन बनाम माल प्राथमिकता' : '5. Emergency vs Freight Priority'}</option>
          </select>
        </div>
      </div>

      {/* 3. Real-Time Logistics KPI Metrics Strip (Styled exactly like Dashboard Image 1 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {/* KPI 1: Active Freight */}
        <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#475569]">
            <span className="text-xs font-bold uppercase tracking-wider">
              {lang === 'HI' ? 'सक्रिय माल ढुलाई' : 'Active Freight'}
            </span>
            <Truck size={16} className="text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#0F2942]">
              {activeFreightCount}
            </span>
            <span className="text-xs font-bold text-slate-500">
              ({deliveryVansCount}v / {freightTrucksCount}t)
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            <span className="truncate">{lang === 'HI' ? 'सक्रिय वाणिज्यिक वाहन' : 'Active commercial vehicles en-route'}</span>
          </div>
        </div>

        {/* KPI 2: En-Route Cargo */}
        <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#475569]">
            <span className="text-xs font-bold uppercase tracking-wider">
              {lang === 'HI' ? 'मार्ग में कार्गो' : 'En-Route Cargo'}
            </span>
            <Scale size={16} className="text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#0F2942]">
              {totalCargoTonnage}
            </span>
            <span className="text-xs font-bold text-slate-500">
              {lang === 'HI' ? 'टन' : 'tonnes'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            <span className="truncate">{lang === 'HI' ? 'कुल माल पेलोड भार' : 'Commercial payload weight'}</span>
          </div>
        </div>

        {/* KPI 3: Loading Bays */}
        <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#475569]">
            <span className="text-xs font-bold uppercase tracking-wider">
              {lang === 'HI' ? 'लोडिंग बे' : 'Loading Bays'}
            </span>
            <Warehouse size={16} className="text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#0F2942]">
              {hubs.reduce((acc, h) => acc + (typeof h.occupiedBays === 'number' ? h.occupiedBays : (h.bays || []).filter(b => b.status === 'DWELLING' || b.status === 'OCCUPIED').length), 0)}
            </span>
            <span className="text-xs font-bold text-slate-500">
              / {hubs.reduce((acc, h) => acc + (h.totalBays || (h.bays ? h.bays.length : 3)), 0)} {lang === 'HI' ? 'सक्रिय' : 'active'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            <span className="truncate">{lang === 'HI' ? 'हब संतृप्ति निगरानी' : 'Hub dwell saturation monitor'}</span>
          </div>
        </div>

        {/* KPI 4: Freight Demand */}
        <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#475569]">
            <span className="text-xs font-bold uppercase tracking-wider">
              {lang === 'HI' ? 'माल ढुलाई मांग' : 'Freight Demand'}
            </span>
            <Activity size={16} className="text-purple-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#0F2942]">
              {totalFreightPcu}
            </span>
            <span className="text-xs font-bold text-slate-500">
              PCUs
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            <span className="truncate">{lang === 'HI' ? 'गतिशील भारित पीसीयू प्रभाव' : 'Weighted corridor approach impact'}</span>
          </div>
        </div>

        {/* KPI 5: Green-Wave Grants */}
        <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#475569]">
            <span className="text-xs font-bold uppercase tracking-wider">
              {lang === 'HI' ? 'ग्रीन-वेव अनुदान' : 'Green-Wave Grants'}
            </span>
            <ShieldCheck size={16} className="text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-700">
              {freightTelemetry.greenWaveGranted || 0}
            </span>
            <span className="text-xs font-bold text-slate-500">
              ({freightTelemetry.greenWaveOpportunities > 0 ? `${Math.round(((freightTelemetry.greenWaveGranted || 0) / freightTelemetry.greenWaveOpportunities) * 100)}%` : '—'})
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            <span className="truncate">{lang === 'HI' ? 'गलियारा प्राथमिकता निकासी' : 'Corridor priority clearance'}</span>
          </div>
        </div>

        {/* KPI 6: Projected Delay Reduction */}
        <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#475569]">
            <span className="text-xs font-bold uppercase tracking-wider">
              {lang === 'HI' ? 'विलंब में कमी' : 'Delay Reduction'}
            </span>
            <TrendingDown size={16} className="text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-400">
              {lang === 'HI' ? 'अनुपलब्ध' : 'Unavailable'}
            </span>
            <span className="text-xs font-bold text-slate-400">
              ({lang === 'HI' ? 'बेसलाइन' : 'Baseline'})
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            <span className="truncate">{lang === 'HI' ? 'लाइव लॉजिस्टिक्स बेसलाइन' : 'Live logistics baseline'}</span>
          </div>
        </div>
      </div>

      {/* Urban Resource Pressure & Response Engine */}
      <UrbanResourcePressurePanel />

      {/* 4. Main Two-Column Operational Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mb-6">
        {/* LEFT COLUMN: 2D Simulation Canvas & Freight Arrival Slot Control (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <LogisticsIntersectionVisualizer
            state={state}
            selectedVehicleId={selectedVehicle?.id}
            onSelectVehicle={(veh) => setSelectedVehicleId(veh ? veh.id : null)}
            strategy={strategy}
          />

          <FreightSlotManagerPanel
            slotState={state?.freightSlotState}
            selectedVehicle={selectedVehicle}
            hubs={hubs}
            activeScenario={activeScenario}
            onSelectVehicle={(veh) => setSelectedVehicleId(veh ? veh.id : null)}
          />
        </div>

        {/* RIGHT COLUMN: Hubs, Selected Vehicle Inspector & Green-Wave Coordinator (5 Cols) */}
        <div className="lg:col-span-5 space-y-6 flex flex-col">
          <LogisticsHubPanel
            hubs={hubs}
            telemetry={state?.logisticsTelemetry}
          />

          <LogisticsVehicleInspector
            selectedVehicle={selectedVehicle}
            activeFreightDecision={activeDecision}
            allCommercialVehicles={allCommercialVehicles}
            completedDeliveries={state?.completedDeliveries || []}
            onSelectVehicle={(veh) => setSelectedVehicleId(veh ? veh.id : null)}
          />

          <FreightGreenWavePanel
            activeDecision={activeDecision}
            telemetry={freightTelemetry}
            strategy={strategy}
          />
        </div>
      </div>

      {/* 5. Corridor Progression View (Bottom Full-Width) */}
      <div className="w-full">
        <CorridorProgressionView
          corridorData={corridorData}
          activeVehicles={flattenedCars}
          strategy={strategy}
        />
      </div>
    </div>
  );
}
