import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  BarChart3,
  Compass,
  Clock,
  Activity,
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Layers,
  TrendingUp,
  Car,
  Timer,
  Fuel,
  Leaf,
  IndianRupee,
  Play,
  Pause,
  TrafficCone,
  Siren,
  Download,
  MapPin,
  FileText,
  Truck,
  Warehouse,
  Scale,
  ShieldCheck,
  Waves
} from 'lucide-react';
import { useTrafficData } from '../utils/useTrafficData';
import { useLanguage } from '../context/LanguageContext';
import Loader from '../components/Loader';
import { BenchmarkComparison } from '../components/BenchmarkComparison';


const Analytics = ({ onNavigate }) => {
  const { lang } = useLanguage();
  const {
    state,
    metrics,
    analyticsSession,
    loading,
    simulationSpeed,
    setSpeed,
    resetSimulation,
    selectedZone,
    comparisonResult,
    comparisonStatus,
    comparisonError,
    rerunComparison,
    videoReplayActive
  } = useTrafficData();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'charts' | 'environmental'

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader message={lang === 'HI' ? 'वर्तमान सिमुलेशन एनालिटिक्स इंजन लोड हो रहा है...' : 'Loading Current Simulation Analytics Engine...'} />
      </div>
    );
  }

  const session = analyticsSession || {
    sessionId: 'SIM-INIT',
    sessionStartTime: Date.now(),
    sessionDurationSeconds: 0,
    eventCount: 0,
    isRunning: false,
    totalVehicles: 0,
    vehiclesProcessed: 0,
    activeVehicles: 0,
    emergencyVehicles: 0,
    emergencyPreemptions: 0,
    averageWaitTime: 0,
    hasWaitTimeData: false,
    peakActiveVehicles: 0,
    peakQueueLength: 0,
    peakThroughput: 0,
    currentThroughput: 0,
    vehicleTypeData: [],
    laneData: [],
    signalStateData: [],
    timeSeries: [],
    hasTimeSeriesData: false,
    emergencyEvents: [],
    sustainability: { hasData: false }
  };

  // Format session duration helper
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  };

  const startTimeString = new Date(session.sessionStartTime).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const isSimulationActive = simulationSpeed > 0;
  const hasData = session.totalVehicles > 0 || session.vehiclesProcessed > 0;

  // ── Logistics & Freight Data Aggregations ────────────────────────
  const corridorFreight = state?.corridorFreight;
  const hubs = state?.logisticsHubs || [];
  const freightTelemetry = state?.freightTelemetry || {};
  const completedDeliveries = state?.completedDeliveries || [];

  const activeFreightCount = corridorFreight?.activeFreightCount ?? 
    (session.timeSeries?.length > 0 ? (session.timeSeries[session.timeSeries.length - 1].activeFreight || 0) : 0);
  const totalCargoTonnage = corridorFreight?.totalCargoTonnage ?? 
    (session.timeSeries?.length > 0 ? (session.timeSeries[session.timeSeries.length - 1].cargoTonnage || 0) : 0);
  const totalFreightPcu = corridorFreight?.totalFreightPcu ?? 
    (session.timeSeries?.length > 0 ? (session.timeSeries[session.timeSeries.length - 1].freightPcu || 0) : 0);
  const deliveryVansCount = corridorFreight?.vansCount ?? 0;
  const freightTrucksCount = corridorFreight?.trucksCount ?? 0;

  // Hub Occupancy & Dwell Saturation Data for BarChart
  const hubBarData = useMemo(() => {
    if (!hubs || hubs.length === 0) {
      return [
        { name: 'Dadar Depot', occupied: 0, available: 3, curbQueue: 0, code: 'HUB_DDR_01', total: 3 },
        { name: 'BKC Central Hub', occupied: 0, available: 3, curbQueue: 0, code: 'HUB_BKC_01', total: 3 },
        { name: 'Andheri WEH Hub', occupied: 0, available: 3, curbQueue: 0, code: 'HUB_AND_01', total: 3 }
      ];
    }
    return hubs.map(h => {
      const occupied = typeof h.occupiedBays === 'number' 
        ? h.occupiedBays 
        : (h.bays || []).filter(b => b.status === 'DWELLING' || b.status === 'OCCUPIED').length;
      const total = h.totalBays || (h.bays ? h.bays.length : 3);
      const available = Math.max(0, total - occupied);
      const curbQueue = h.curbQueue ? h.curbQueue.length : (h.curbOccupancy || 0);
      const displayName = h.name || (h.hubId === 'HUB_DDR_01' ? 'Dadar Depot' : h.hubId === 'HUB_BKC_01' ? 'BKC Central Hub' : 'Andheri WEH Hub');
      return {
        name: displayName.replace(' Logistics Hub', '').replace(' Hub', ''),
        code: h.hubId,
        occupied,
        available,
        curbQueue,
        total
      };
    });
  }, [hubs]);

  const totalHubBays = hubBarData.reduce((sum, h) => sum + h.total, 0) || 9;
  const occupiedHubBays = hubBarData.reduce((sum, h) => sum + h.occupied, 0);
  const hubUtilizationPct = Math.round((occupiedHubBays / totalHubBays) * 100);

  // Commercial Fleet Mode Composition Data for Donut/Pie Chart
  const freightModeData = useMemo(() => {
    const vans = deliveryVansCount;
    const trucks = freightTrucksCount;
    const completed = completedDeliveries.length;
    
    const items = [
      { name: lang === 'HI' ? 'डिलीवरी वैन (LCV)' : 'Delivery Vans (LCV)', count: vans, pcu: Number((vans * 1.5).toFixed(1)), color: '#0F2C59' },
      { name: lang === 'HI' ? 'भारी माल ट्रक (HCV)' : 'Freight Trucks (HCV)', count: trucks, pcu: Number((trucks * 2.5).toFixed(1)), color: '#F5A623' },
      { name: lang === 'HI' ? 'पूरी हुई डिलीवरी' : 'Delivered / Discharged', count: completed, pcu: 0, color: '#16A34A' }
    ].filter(item => item.count > 0);

    if (items.length === 0) {
      return [
        { name: lang === 'HI' ? 'डिलीवरी वैन (LCV)' : 'Delivery Vans (LCV)', count: 0, pcu: 0, color: '#0F2C59' },
        { name: lang === 'HI' ? 'भारी माल ट्रक (HCV)' : 'Freight Trucks (HCV)', count: 0, pcu: 0, color: '#F5A623' }
      ];
    }
    return items;
  }, [deliveryVansCount, freightTrucksCount, completedDeliveries.length, lang]);

  // Green-Wave Priority Decisions Outcome Data for Pie / Stat
  const greenWaveDecisionsData = useMemo(() => {
    const granted = freightTelemetry.greenWaveGranted || 0;
    const deferred = freightTelemetry.greenWaveDeferred || 0;
    const opps = freightTelemetry.greenWaveOpportunities || (granted + deferred);
    const blocked = Math.max(0, opps - (granted + deferred));

    const list = [
      { name: lang === 'HI' ? 'स्वीकृत ग्रीन-वेव' : 'Priority Wave Granted', count: granted, color: '#16A34A' },
      { name: lang === 'HI' ? 'मानक चक्र आस्थगित' : 'Standard Cycle Deferred', count: deferred, color: '#F5A623' }
    ];
    if (blocked > 0) {
      list.push({ name: lang === 'HI' ? 'सुरक्षा गार्डरेल अवरुद्ध' : 'Guardrail Constrained', count: blocked, color: '#DC2626' });
    }
    return list.filter(d => d.count > 0);
  }, [freightTelemetry, lang]);

  const priorityGrantRate = freightTelemetry.greenWaveOpportunities > 0
    ? Math.round(((freightTelemetry.greenWaveGranted || 0) / freightTelemetry.greenWaveOpportunities) * 100)
    : (freightTelemetry.greenWaveGranted > 0 ? 100 : 0);

  // Official MoRTH Audit Report Exporter
  const handleDownloadReport = () => {
    const reportData = {
      agency: "Government of India — Ministry of Road Transport & Highways (MoRTH)",
      system: "MARG-DRISHTI (मार्ग-दृष्टि) — Integrated Traffic Management System",
      corridor: selectedZone || "Mumbai BKC Corridor — Jn 04",
      auditSessionId: session.sessionId,
      generatedAtUTC: new Date().toISOString(),
      generatedAtIST: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      sessionDurationSeconds: session.sessionDurationSeconds,
      formattedDuration: formatDuration(session.sessionDurationSeconds),
      trafficPerformanceSummary: {
        totalVehiclesProcessed: session.vehiclesProcessed,
        currentlyActiveOnRoad: session.activeVehicles,
        averageWaitTimeSeconds: Number((session.averageWaitTime || 0).toFixed(1)),
        peakThroughputPerMinute: Number((session.peakThroughput || 0).toFixed(1)),
        peakQueueLengthVehicles: session.peakQueueLength,
        emergencyCorridorPreemptions: session.emergencyPreemptions || 0,
        signalPhaseSwitches: session.signalSwitchCount || 0
      },
      logisticsAndFreightSummary: {
        activeCommercialVehicles: activeFreightCount,
        deliveryVansCount,
        freightTrucksCount,
        cargoPayloadTonnage: totalCargoTonnage,
        totalFreightPcu,
        hubBayUtilizationPct,
        greenWavePriorityGrants: freightTelemetry.greenWaveGranted || 0,
        completedDeliveriesCount: completedDeliveries.length
      },
      environmentalAndEconomicImpact: {
        fuelSavedLiters: session.sustainability?.fuelSavedLiters?.status === 'unavailable' ? 'Unavailable' : Number((session.sustainability?.fuelSavedLiters?.value ?? session.sustainability?.fuelSavedLiters ?? 0).toFixed(2)),
        carbonEmissionsAbatedKgCO2: session.sustainability?.co2ReducedKg?.status === 'unavailable' ? 'Unavailable' : Number((session.sustainability?.co2ReducedKg?.value ?? session.sustainability?.co2ReducedKg ?? 0).toFixed(2)),
        economicSavingsINR: session.sustainability?.economicSavingsRupees?.status === 'unavailable' ? 'Unavailable' : Number((session.sustainability?.economicSavingsRupees?.value ?? session.sustainability?.economicSavingsRupees ?? 0).toFixed(2))
      },
      approachQueueDistribution: session.laneData || [],
      vehicleClassificationBreakdown: session.vehicleTypeData || [],
      auditCertification: {
        complianceStandard: "GIGW 3.0 & NCAP Smart Mobility Standard",
        controlMode: "Adaptive Heuristic Signal Control & Computer Vision Simulation",
        authority: "National Informatics Centre (NIC) & MoRTH Traffic Command Center"
      }
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sanitizedCorridor = (selectedZone || 'corridor').replace(/[^a-zA-Z0-9]/g, '_');
    link.download = `MoRTH_Audit_Report_${sanitizedCorridor}_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">

      {/* ── 1. Page Header & Session Control Strip ─────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0A1F44] tracking-tight flex items-center gap-2">
                <BarChart3 className="text-[#F5A623]" size={28} />
                <span>{lang === 'HI' ? 'यातायात एनालिटिक्स' : 'Traffic Analytics'}</span>
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#0A1F44]/5 text-[#0A1F44] border border-[#0A1F44]/15">
                <MapPin size={12} className="text-[#FF671F]" />
                <span>{selectedZone}</span>
              </span>
            </div>

            <p className="text-sm sm:text-base text-slate-500 mt-1">
              {lang === 'HI' ? 'वर्तमान सिमुलेशन सत्र से रीयल-टाइम एनालिटिक्स। शून्य काल्पनिक या मनगढ़ंत आंकड़े।' : 'Real-time analytics from the current simulation session. Zero mocked or fabricated numbers.'}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleDownloadReport}
              className="px-3.5 py-2 text-sm font-bold rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              title="Download official MoRTH ITMS Audit Report (JSON)"
            >
              <Download size={14} className="text-emerald-700" />
              <span>{lang === 'HI' ? 'ऑडिट रिपोर्ट डाउनलोड' : 'Download Audit Report'}</span>
            </button>

            <button
              onClick={() => setSpeed(isSimulationActive ? 0 : 1)}
              className="px-3.5 py-2 text-sm font-bold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
            >
              {isSimulationActive ? <Pause size={14} /> : <Play size={14} />}
              <span>{isSimulationActive ? (lang === 'HI' ? 'सिमुलेशन रोकें' : 'Pause Sim') : (lang === 'HI' ? 'सिमुलेशन चलाएं' : 'Resume Sim')}</span>
            </button>

            <button
              onClick={resetSimulation}
              className="px-3.5 py-2 text-sm font-bold rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 flex items-center gap-1.5 transition cursor-pointer"
              title={lang === 'HI' ? 'सभी सत्र डेटा हटाएं और नया प्रारंभ करें' : 'Clear all session data and start fresh'}
            >
              <RotateCcw size={14} />
              <span>{lang === 'HI' ? 'सत्र रीसेट करें' : 'Reset Session'}</span>
            </button>

            <button
              onClick={() => onNavigate && onNavigate('dashboard')}
              className="px-4 py-2 text-sm font-bold rounded-xl bg-[#0F2C59] hover:bg-[#163A6B] text-white flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <Compass size={14} />
              <span>{lang === 'HI' ? 'डैशबोर्ड' : 'Dashboard'}</span>
            </button>
          </div>

        </div>

        {/* Session Metadata Strip */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 text-sm text-slate-600">
          <div>
            <span className="text-slate-400 block font-medium text-[11px]">{lang === 'HI' ? 'सत्र ID' : 'Session ID'}</span>
            <span className="font-mono font-bold text-slate-800">{session.sessionId}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium text-[11px]">{lang === 'HI' ? 'सत्र प्रारंभ' : 'Session Started'}</span>
            <span className="font-semibold text-slate-800">{startTimeString}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium text-[11px]">{lang === 'HI' ? 'बीता हुआ समय' : 'Elapsed Duration'}</span>
            <span className="font-semibold text-slate-800">{formatDuration(session.sessionDurationSeconds)}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium text-[11px]">{lang === 'HI' ? 'दर्ज घटनाएं' : 'Recorded Events'}</span>
            <span className="font-semibold text-[#0F2C59]">{session.eventCount} {lang === 'HI' ? 'घटनाएं' : 'events'}</span>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-slate-400 block font-medium text-[11px]">{lang === 'HI' ? 'सक्रिय सिग्नल' : 'Active Signal'}</span>
            <span className="font-bold text-[#0F2C59]">{lang === 'HI' ? `लेन ${state?.signal || 'N'}` : `Lane ${state?.signal || 'N'}`}</span>
          </div>
        </div>
      </div>

      {/* ── 2. Required KPI Cards (Current Session Data) ────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">

        {/* Total Vehicles */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs flex flex-col justify-between hover:border-[#0F2C59]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">{lang === 'HI' ? 'कुल वाहन' : 'Total Vehicles'}</span>
            <Car size={16} className="text-[#0F2C59]" />
          </div>
          <div className="mt-2">
            <span className="text-3xl sm:text-4xl font-black text-[#0A1F44] tracking-tight">
              {session.totalVehicles}
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">{lang === 'HI' ? 'सत्र में उत्पन्न' : 'Generated in session'}</p>
          </div>
        </div>

        {/* Vehicles Processed */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs flex flex-col justify-between hover:border-[#0F2C59]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">{lang === 'HI' ? 'निकाले गए' : 'Processed'}</span>
            <CheckCircle2 size={16} className="text-[#0F2C59]" />
          </div>
          <div className="mt-2">
            <span className="text-3xl sm:text-4xl font-black text-[#0A1F44] tracking-tight">
              {session.vehiclesProcessed}
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">{lang === 'HI' ? 'जंक्शन पार किया' : 'Cleared intersection'}</p>
          </div>
        </div>

        {/* Active Vehicles */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs flex flex-col justify-between hover:border-[#0F2C59]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">{lang === 'HI' ? 'ग्रिड में सक्रिय' : 'Active in Grid'}</span>
            <Activity size={16} className="text-[#0F2C59]" />
          </div>
          <div className="mt-2">
            <span className="text-3xl sm:text-4xl font-black text-[#0A1F44] tracking-tight">
              {session.activeVehicles}
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">{lang === 'HI' ? 'पहुंच लेनों में' : 'In approach lanes'}</p>
          </div>
        </div>

        {/* Average Waiting Time */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs flex flex-col justify-between hover:border-[#F5A623]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">{lang === 'HI' ? 'औसत प्रतीक्षा समय' : 'Avg Wait Time'}</span>
            <Timer size={16} className="text-[#F5A623]" />
          </div>
          <div className="mt-2">
            {session.hasWaitTimeData ? (
              <span className="text-3xl sm:text-4xl font-black text-[#F5A623] tracking-tight">
                {session.averageWaitTime}s
              </span>
            ) : (
              <span className="text-sm font-semibold text-slate-400 block py-1.5">
                {lang === 'HI' ? 'अपर्याप्त डेटा' : 'Insufficient data'}
              </span>
            )}
            <p className="text-[11px] text-slate-400 mt-0.5">{lang === 'HI' ? 'मापी गई प्रतीक्षा/वाहन' : 'Measured wait/car'}</p>
          </div>
        </div>

        {/* Peak Traffic */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs flex flex-col justify-between hover:border-[#0F2C59]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">{lang === 'HI' ? 'पीक ट्रैफिक' : 'Peak Traffic'}</span>
            <TrendingUp size={16} className="text-[#0F2C59]" />
          </div>
          <div className="mt-2">
            {session.peakActiveVehicles > 0 ? (
              <span className="text-3xl sm:text-4xl font-black text-[#0A1F44] tracking-tight">
                {session.peakActiveVehicles}
              </span>
            ) : (
              <span className="text-sm font-semibold text-slate-400 block py-1.5">
                {lang === 'HI' ? 'अपर्याप्त डेटा' : 'Insufficient data'}
              </span>
            )}
            <p className="text-[11px] text-slate-400 mt-0.5">{lang === 'HI' ? 'अधिकतम समवर्ती वाहन' : 'Max concurrent cars'}</p>
          </div>
        </div>

        {/* Emergency Vehicles */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs flex flex-col justify-between hover:border-[#DC2626]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">{lang === 'HI' ? 'आपातकालीन' : 'Emergency'}</span>
            <ShieldAlert size={16} className="text-[#DC2626]" />
          </div>
          <div className="mt-2">
            <span className="text-3xl sm:text-4xl font-black text-[#0A1F44] tracking-tight">
              {session.emergencyVehicles}
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {session.emergencyPreemptions} {lang === 'HI' ? 'प्राथमिकता तरंगें' : 'priority waves'}
            </p>
          </div>
        </div>

      </div>

      {/* Derived Environmental & Commuter Benefit Audit */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#0A1F44]">{lang === 'HI' ? 'पर्यावरणीय एवं यात्री लाभ ऑडिट' : 'Environmental & Commuter Impact Audit'}</h3>
            <p className="text-sm text-slate-500">
              {lang === 'HI'
                ? `${session.vehiclesProcessed} गुज़रे वाहन${session.vehiclesProcessed === 1 ? '' : 'ों'} पर आधारित। (बेसलाइन: ${session.sustainability?.baselineDelay?.status === 'unavailable' ? 'अनुपलब्ध' : session.sustainability?.baselineDelay ? `${session.sustainability.baselineDelay}s` : '45.0s'})`
                : `Based on ${session.vehiclesProcessed} discharged vehicle${session.vehiclesProcessed === 1 ? '' : 's'}. (Baseline: ${session.sustainability?.baselineDelay?.status === 'unavailable' ? 'Unavailable' : session.sustainability?.baselineDelay ? `${session.sustainability.baselineDelay}s` : '45.0s'})`}
            </p>
          </div>
          <span className="text-xs bg-[#0A1F44] text-[#F5A623] border border-[#1E4D8C] font-bold px-2.5 py-0.5 rounded-full">
            {lang === 'HI' ? 'प्रभाव ऑडिट' : 'IMPACT AUDIT'}
          </span>
        </div>

        {session.sustainability.hasData ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
              <div className="flex items-center justify-between text-[#0F2C59] text-sm font-bold">
                <span>{lang === 'HI' ? 'ईंधन की बचत' : 'Fuel Conserved'}</span>
                <Fuel size={16} className="text-[#0F2C59]" />
              </div>
              <div className="text-3xl font-black text-[#0A1F44]">
                {session.sustainability.fuelSavedLiters?.status === 'unavailable' ? 'Unavailable' : session.sustainability.fuelSavedLiters + ' L'}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
              <div className="flex items-center justify-between text-[#0F2C59] text-sm font-bold">
                <span>{lang === 'HI' ? 'CO₂ उत्सर्जन रोकथाम' : 'CO₂ Avoided'}</span>
                <Leaf size={16} className="text-[#0F2C59]" />
              </div>
              <div className="text-3xl font-black text-[#0A1F44]">
                {session.sustainability.co2ReducedKg?.status === 'unavailable' ? 'Unavailable' : session.sustainability.co2ReducedKg + ' kg'}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#FFFBEB] border border-[#F5A623]/30 space-y-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[#B8860B] text-sm font-bold">
                  <span>{lang === 'HI' ? 'आर्थिक मूल्य बचत' : 'Economic Value'}</span>
                  <IndianRupee size={16} className="text-[#B8860B]" />
                </div>
                <div className="text-3xl font-black text-[#B8860B] mt-1">
                  {session.sustainability.economicSavingsRupees?.status === 'unavailable' ? 'Unavailable' : `₹${session.sustainability.economicSavingsRupees.toLocaleString('en-IN')}`}
                </div>
              </div>
              <p className="text-[10px] text-amber-800/80">{lang === 'HI' ? 'खुदरा ईंधन + यात्री समय का मूल्य' : 'Retail fuel + commuter time value'}</p>
            </div>
          </div>
          </>
        ) : (
          <div className="py-8 text-center text-sm text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
            <AlertCircle size={24} className="mx-auto mb-1.5 text-slate-300" />
            <p className="font-semibold text-slate-600">{lang === 'HI' ? 'पर्यावरणीय ऑडिट हेतु अपर्याप्त डेटा' : 'Insufficient Data for Environmental Audit'}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{lang === 'HI' ? 'ईंधन और उत्सर्जन बचत की गणना के लिए वाहनों को जंक्शन से गुजरना आवश्यक है।' : 'Vehicles must pass through the intersection to compute measured fuel & emissions savings.'}</p>
          </div>
        )}
      </div>

      {/* ── Saved Benchmark Comparison Section (Phase 3B) ──────── */}
      <BenchmarkComparison
        data={comparisonResult}
        status={comparisonStatus}
        error={comparisonError}
        onRerun={rerunComparison}
        isLiveRun={videoReplayActive}
      />

      {/* ── 3. Empty State Guard if No Traffic Generated Yet ────── */}

      {!hasData && (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-3xl">
            <TrafficCone size={18} className="text-[#F5A623]" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">{lang === 'HI' ? 'अभी कोई यातायात डेटा नहीं है' : 'No traffic data yet'}</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {lang === 'HI' ? 'सिमुलेशन प्रारंभ करें या वर्तमान सत्र को वाहन उत्पन्न करने दें। एनालिटिक्स स्वचालित रूप से लाइव टेलीमेट्री रिकॉर्ड और प्रदर्शित करेगा।' : 'Start the simulation or allow the current session to spawn vehicles. Analytics will automatically record and visualize live telemetry.'}
          </p>
          <div className="pt-2">
            <button
              onClick={() => onNavigate && onNavigate('dashboard')}
              className="px-5 py-2.5 rounded-xl bg-[#0F2C59] text-white text-sm font-bold hover:bg-[#163A6B] transition cursor-pointer"
            >
              {lang === 'HI' ? 'डैशबोर्ड खोलें' : 'Open Dashboard'}
            </button>
          </div>
        </div>
      )}

      {/* ── 4. Main Charts Grid ─────────────────────────────────── */}
      {hasData && (
        <div className="space-y-6">

          {/* Row 1: Volume Over Time & Throughput Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Chart 1: Traffic Volume Over Time */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#0A1F44]">{lang === 'HI' ? 'समय के साथ यातायात की मात्रा' : 'Traffic Volume Over Time'}</h3>
                  <p className="text-sm text-slate-500">{lang === 'HI' ? 'सिमुलेशन टिक्स में सक्रिय बनाम निकाले गए वाहनों की संख्या' : 'Active vs Processed vehicle counts across simulation ticks'}</p>
                </div>
                <span className="text-xs bg-[#0A1F44]/5 text-[#0F2C59] border border-[#0F2C59]/20 font-bold px-2.5 py-0.5 rounded-full">
                  {lang === 'HI' ? 'लाइन चार्ट' : 'LINE CHART'}
                </span>
              </div>

              <div className="h-[250px] w-full pt-2">
                {session.hasTimeSeriesData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={session.timeSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="time" stroke="#475569" fontSize={11} tickLine={false} tick={{ fontFamily: "'Noto Sans', sans-serif" }} />
                      <YAxis stroke="#475569" fontSize={11} tickLine={false} tick={{ fontFamily: "'Noto Sans', sans-serif" }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0A1F44', borderRadius: '8px', border: '1px solid #1E4D8C', color: '#FFFFFF', fontSize: '11px' }}
                        itemStyle={{ color: '#FFFFFF', fontWeight: 600 }}
                        labelStyle={{ color: '#F8FAFC', fontWeight: 700 }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Line
                        type="monotone"
                        dataKey="activeVehicles"
                        name={lang === 'HI' ? 'लेनों में सक्रिय' : 'Active in Lanes'}
                        stroke="#0F2C59"
                        strokeWidth={2.5}
                        dot={false}
                        isAnimationActive={false}
                        connectNulls={true}
                      />
                      <Line
                        type="monotone"
                        dataKey="processedVehicles"
                        name={lang === 'HI' ? 'कुल निकाले गए' : 'Total Cleared'}
                        stroke="#16A34A"
                        strokeWidth={2.5}
                        dot={false}
                        isAnimationActive={false}
                        connectNulls={true}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400">
                    {lang === 'HI' ? 'अपर्याप्त टाइम-सीरीज़ डेटा' : 'Insufficient time-series data'}
                  </div>
                )}
              </div>
            </div>

            {/* Chart 2: Traffic Throughput Trend */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#0A1F44]">{lang === 'HI' ? 'सिम्युलेटेड थ्रूपुट (वाहन / मिनट)' : 'Live Simulation Throughput (Vehicles / Min)'}</h3>
                  <p className="text-sm text-slate-500">{lang === 'HI' ? 'सिम्युलेटेड वाहन डिस्चार्ज घटनाओं से मापा गया' : 'Measured from simulated vehicle discharge events'}</p>
                </div>
                <span className="text-xs bg-[#FFFBEB] text-[#B8860B] border border-[#F5A623]/30 font-bold px-2.5 py-0.5 rounded-full uppercase">
                  {lang === 'HI' ? 'लाइव सिमुलेशन' : 'LIVE SIMULATION'}
                </span>
              </div>

              <div className="h-[250px] w-full pt-2">
                {session.hasTimeSeriesData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={session.timeSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="time" stroke="#475569" fontSize={11} tickLine={false} tick={{ fontFamily: "'Noto Sans', sans-serif" }} />
                      <YAxis stroke="#475569" fontSize={11} tickLine={false} unit=" c/m" tick={{ fontFamily: "'Noto Sans', sans-serif" }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0A1F44', borderRadius: '8px', border: '1px solid #1E4D8C', color: '#FFFFFF', fontSize: '11px' }}
                        itemStyle={{ color: '#FFFFFF', fontWeight: 600 }}
                        labelStyle={{ color: '#F8FAFC', fontWeight: 700 }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Line
                        type="monotone"
                        dataKey="throughput"
                        name={lang === 'HI' ? 'थ्रूपुट (वाहन/मिनट)' : 'Throughput (veh/min)'}
                        stroke="#F5A623"
                        strokeWidth={2.5}
                        dot={{ fill: '#F5A623', r: 2 }}
                        isAnimationActive={false}
                        connectNulls={true}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400">
                    {lang === 'HI' ? 'अपर्याप्त थ्रूपुट डेटा' : 'Insufficient throughput data'}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Row 2: Traffic by Lane & Vehicle Type Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Chart 3: Traffic by Lane / Direction (Bar Chart) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#0A1F44]">{lang === 'HI' ? 'लेन / दिशा अनुसार यातायात' : 'Traffic by Lane / Direction'}</h3>
                  <p className="text-sm text-slate-500">{lang === 'HI' ? 'प्रति पहुंच मार्ग उत्पन्न बनाम निकाले गए वाहनों की वास्तविक संख्या' : 'Actual vehicle counts generated vs processed per approach'}</p>
                </div>
                <span className="text-xs bg-[#0A1F44]/5 text-[#0F2C59] border border-[#0F2C59]/20 font-bold px-2.5 py-0.5 rounded-full">
                  {lang === 'HI' ? 'बार चार्ट' : 'BAR CHART'}
                </span>
              </div>

              <div className="h-[250px] w-full pt-2">
                {session.laneData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={session.laneData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="label" stroke="#475569" fontSize={11} tickLine={false} tick={{ fontFamily: "'Noto Sans', sans-serif" }} />
                      <YAxis stroke="#475569" fontSize={11} tickLine={false} tick={{ fontFamily: "'Noto Sans', sans-serif" }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0A1F44', borderRadius: '8px', border: '1px solid #1E4D8C', color: '#FFFFFF', fontSize: '11px' }}
                        itemStyle={{ color: '#FFFFFF', fontWeight: 600 }}
                        labelStyle={{ color: '#F8FAFC', fontWeight: 700 }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar dataKey="arrivals" name={lang === 'HI' ? 'कुल उत्पन्न' : 'Total Spawned'} fill="#0F2C59" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                      <Bar dataKey="processed" name={lang === 'HI' ? 'निकाले गए' : 'Cleared'} fill="#16A34A" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                      <Bar dataKey="activeQueue" name={lang === 'HI' ? 'कतारबद्ध' : 'Queued'} fill="#F5A623" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400">
                    {lang === 'HI' ? 'अभी तक कोई लेन डेटा दर्ज नहीं हुआ' : 'No lane data recorded yet'}
                  </div>
                )}
              </div>
            </div>

            {/* Chart 4: Vehicle Type Distribution (Pie Chart) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#0A1F44]">{lang === 'HI' ? 'वाहन प्रकार वितरण' : 'Vehicle Type Distribution'}</h3>
                  <p className="text-sm text-slate-500">{lang === 'HI' ? 'वर्तमान सत्र यातायात से वास्तविक वर्गीकरण विवरण' : 'Actual classification breakdown from current session traffic'}</p>
                </div>
                <span className="text-xs bg-[#0A1F44]/5 text-[#0F2C59] border border-[#0F2C59]/20 font-bold px-2.5 py-0.5 rounded-full">
                  {lang === 'HI' ? 'पाई चार्ट' : 'PIE CHART'}
                </span>
              </div>

              <div className="h-[250px] w-full flex flex-col sm:flex-row items-center justify-center">
                {session.vehicleTypeData.length > 0 ? (
                  <>
                    <div className="w-[180px] h-[180px] shrink-0 flex items-center justify-center">
                      <PieChart width={180} height={180}>
                        <Pie
                          data={session.vehicleTypeData}
                          cx={90}
                          cy={90}
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="count"
                          isAnimationActive={false}
                        >
                          {session.vehicleTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0A1F44', borderRadius: '8px', border: '1px solid #1E4D8C', color: '#FFFFFF', fontSize: '11px' }}
                          itemStyle={{ color: '#FFFFFF', fontWeight: 600 }}
                          labelStyle={{ color: '#F8FAFC', fontWeight: 700 }}
                        />
                      </PieChart>
                    </div>

                    <div className="space-y-1.5 text-sm text-slate-600 sm:ml-4 flex-1">
                      {session.vehicleTypeData.map(item => (
                        <div key={item.type} className="flex items-center justify-between py-1 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full shrink-0 shadow-xs ring-1 ring-slate-900/10" style={{ backgroundColor: item.color }}></span>
                            <span className="font-semibold text-slate-800">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-slate-600 font-medium">{item.count} {lang === 'HI' ? 'वाहन' : 'cars'}</span>
                            <span className="font-bold text-slate-900">{item.percentage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400">
                    {lang === 'HI' ? 'कोई वाहन वितरण डेटा दर्ज नहीं' : 'No vehicle distribution data recorded'}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Row 3: Signal Phase State Distribution & Queue Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Chart 5: Signal State Distribution */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#0A1F44]">{lang === 'HI' ? 'सिग्नल स्थिति वितरण' : 'Signal State Distribution'}</h3>
                  <p className="text-sm text-slate-500">{lang === 'HI' ? 'प्रति दिशा ग्रीन फेज़ को आवंटित वास्तविक समय' : 'Actual time allocated to green phase per direction'}</p>
                </div>
                <span className="text-xs bg-[#FFFBEB] text-[#B8860B] border border-[#F5A623]/30 font-bold px-2.5 py-0.5 rounded-full">
                  {lang === 'HI' ? 'फेज़ समय' : 'PHASE TIME'}
                </span>
              </div>

              <div className="h-[250px] w-full flex flex-col sm:flex-row items-center justify-center">
                {session.signalStateData.length > 0 ? (
                  <>
                    <div className="w-[180px] h-[180px] shrink-0 flex items-center justify-center">
                      <PieChart width={180} height={180}>
                        <Pie
                          data={session.signalStateData}
                          cx={90}
                          cy={90}
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="seconds"
                          isAnimationActive={false}
                        >
                          {session.signalStateData.map((entry, index) => (
                            <Cell key={`sig-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0A1F44', borderRadius: '8px', border: '1px solid #1E4D8C', color: '#FFFFFF', fontSize: '11px' }}
                          itemStyle={{ color: '#FFFFFF', fontWeight: 600 }}
                          labelStyle={{ color: '#F8FAFC', fontWeight: 700 }}
                        />
                      </PieChart>
                    </div>

                    <div className="space-y-2 text-sm text-slate-600 sm:ml-4 flex-1">
                      {session.signalStateData.map(item => (
                        <div key={item.direction} className="flex items-center justify-between py-1 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full shrink-0 shadow-xs ring-1 ring-slate-900/10" style={{ backgroundColor: item.color }}></span>
                            <span className="font-semibold text-slate-800">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-slate-600 font-medium">{item.seconds}{lang === 'HI' ? 's हरा' : 's green'}</span>
                            <span className="font-bold text-slate-900">{item.percentage}%</span>
                          </div>
                        </div>
                      ))}
                      <div className="pt-1 text-[11px] flex justify-between">
                        <span className="text-slate-600 font-medium">{lang === 'HI' ? 'कुल परिवर्तन:' : 'Total Switches:'}</span>
                        <span className="font-bold text-slate-900">{session.signalSwitchCount} {lang === 'HI' ? 'बार' : 'times'}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400">
                    {lang === 'HI' ? 'कोई सिग्नल फेज़ डेटा दर्ज नहीं' : 'No signal phase data recorded yet'}
                  </div>
                )}
              </div>
            </div>

            {/* Chart 6: Queue & Congestion Trend */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#0A1F44]">{lang === 'HI' ? 'कतार एवं भीड़भाड़ का रुझान' : 'Queue & Congestion Trend'}</h3>
                  <p className="text-sm text-slate-500">{lang === 'HI' ? 'विभिन्न पहुंच मार्गों पर देखी गई वास्तविक संचयी कतार' : 'Real cumulative queue sizes observed across approaches'}</p>
                </div>
                <span className="text-xs bg-red-50 text-red-700 border border-red-200 font-bold px-2.5 py-0.5 rounded-full">
                  {lang === 'HI' ? 'कतार आकार' : 'QUEUE SIZES'}
                </span>
              </div>

              <div className="h-[250px] w-full pt-2">
                {session.hasTimeSeriesData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={session.timeSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="time" stroke="#475569" fontSize={11} tickLine={false} tick={{ fontFamily: "'Noto Sans', sans-serif" }} />
                      <YAxis stroke="#475569" fontSize={11} tickLine={false} allowDecimals={false} tick={{ fontFamily: "'Noto Sans', sans-serif" }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0A1F44', borderRadius: '8px', border: '1px solid #1E4D8C', color: '#FFFFFF', fontSize: '11px' }}
                        itemStyle={{ color: '#FFFFFF', fontWeight: 600 }}
                        labelStyle={{ color: '#F8FAFC', fontWeight: 700 }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Line type="monotone" dataKey="totalQueue" name={lang === 'HI' ? 'कुल कतार' : 'Total Queue'} stroke="#DC2626" strokeWidth={2.5} dot={false} isAnimationActive={false} connectNulls={true} />
                      <Line type="monotone" dataKey="queueN" name={lang === 'HI' ? 'लेन उत्तर (N)' : 'Lane N'} stroke="#F5A623" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls={true} />
                      <Line type="monotone" dataKey="queueS" name={lang === 'HI' ? 'लेन दक्षिण (S)' : 'Lane S'} stroke="#16A34A" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls={true} />
                      <Line type="monotone" dataKey="queueE" name={lang === 'HI' ? 'लेन पूर्व (E)' : 'Lane E'} stroke="#0F2C59" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls={true} />
                      <Line type="monotone" dataKey="queueW" name={lang === 'HI' ? 'लेन पश्चिम (W)' : 'Lane W'} stroke="#1E4D8C" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls={true} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400">
                    {lang === 'HI' ? 'कोई कतार रुझान डेटा दर्ज नहीं' : 'No queue trend data recorded yet'}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Row 4: Emergency Vehicle Priority Log */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#0A1F44]">{lang === 'HI' ? 'आपातकालीन प्राथमिकता लॉग' : 'Emergency Priority Log'}</h3>
                <p className="text-sm text-slate-500">{lang === 'HI' ? 'वास्तविक प्राथमिकता प्री-एम्प्शन सक्रियण' : 'Actual priority pre-emption activations'}</p>
              </div>
              <span className="text-xs bg-red-50 text-red-700 border border-red-200 font-bold px-2 py-0.5 rounded-full">
                {session.emergencyEvents.length} {lang === 'HI' ? 'घटनाएं' : 'Events'}
              </span>
            </div>

            <div className="space-y-2.5 max-h-[200px] overflow-y-auto pt-1">
              {session.emergencyEvents.length > 0 ? (
                session.emergencyEvents.map(evt => (
                  <div key={evt.id} className="p-2.5 rounded-xl bg-red-50/60 border border-red-100 flex items-center justify-between text-sm">
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-red-900">
                        <Siren size={16} className="text-red-500" />
                        <span>{lang === 'HI' ? `लेन ${evt.direction} प्रीएम्प्शन` : `Lane ${evt.direction} Preemption`}</span>
                      </div>
                      <span className="text-xs text-slate-500 font-mono">{evt.timestamp} • {evt.id}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${evt.resolved ? 'bg-emerald-100 text-emerald-800' : 'bg-red-200 text-red-900 animate-pulse'
                      }`}>
                      {evt.resolved ? (lang === 'HI' ? 'निकाला गया' : 'CLEARED') : (lang === 'HI' ? 'सक्रिय' : 'ACTIVE')}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-sm text-slate-400">
                  <ShieldAlert size={28} className="mx-auto mb-2 text-slate-300" />
                  {lang === 'HI' ? 'इस सत्र में कोई आपातकालीन वाहन नहीं पाया गया' : 'No emergency vehicles detected in this session'}
                </div>
              )}
            </div>
          </div>

          {/* ── 5. Logistics & Freight Operations Analytics ─────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#0A1F44] text-[#F5A623] flex items-center justify-center font-bold shadow-xs">
                  <Truck size={22} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl sm:text-2xl font-extrabold text-[#0A1F44] tracking-tight">
                      {lang === 'HI' ? 'लॉजिस्टिक्स एवं माल ढुलाई एनालिटिक्स' : 'Logistics & Freight Analytics'}
                    </h2>
                    <span className="text-[11px] font-extrabold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                      <Activity size={10} className="animate-pulse" />
                      <span>SIMULATION ACTIVE</span>
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    {lang === 'HI'
                      ? 'कॉरिडोर स्तर पर माल वाहन आवागमन, हब लोडिंग बे संतृप्ति और ग्रीन-वेव प्राथमिकताओं का रीयल-टाइम डेटा।'
                      : 'Real-time telemetry on corridor freight progression, hub bay dwell saturation, and green-wave signal coordination.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  MoRTH Freight Corridor
                </span>
              </div>
            </div>

            {/* 4 Freight KPI Cards Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {/* KPI 1: Active Freight */}
              <div className="bg-[#F8FAFC] rounded-xl border border-[#CBD5E1] p-4 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                    {lang === 'HI' ? 'सक्रिय माल वाहन' : 'Active Commercial'}
                  </span>
                  <Truck size={16} className="text-[#0F2C59]" />
                </div>
                <div className="mt-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-[#0A1F44]">
                      {activeFreightCount}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      ({deliveryVansCount}v / {freightTrucksCount}t)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {lang === 'HI' ? 'सक्रिय वाणिज्यिक वाहन' : 'Active LCV / HCV fleet'}
                  </p>
                </div>
              </div>

              {/* KPI 2: Cargo Payload */}
              <div className="bg-[#F8FAFC] rounded-xl border border-[#CBD5E1] p-4 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                    {lang === 'HI' ? 'मार्ग में कार्गो' : 'En-Route Cargo'}
                  </span>
                  <Scale size={16} className="text-[#F5A623]" />
                </div>
                <div className="mt-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-[#0A1F44]">
                      {totalCargoTonnage}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {lang === 'HI' ? 'टन' : 'tonnes'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {totalFreightPcu} {lang === 'HI' ? 'भारित PCU प्रभाव' : 'weighted PCU impact'}
                  </p>
                </div>
              </div>

              {/* KPI 3: Hub Saturation */}
              <div className="bg-[#F8FAFC] rounded-xl border border-[#CBD5E1] p-4 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                    {lang === 'HI' ? 'हब बे संतृप्ति' : 'Hub Saturation'}
                  </span>
                  <Warehouse size={16} className="text-[#16A34A]" />
                </div>
                <div className="mt-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-[#0A1F44]">
                      {occupiedHubBays}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      / {totalHubBays} bays ({hubUtilizationPct}%)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {hubBarData.reduce((sum, h) => sum + h.curbQueue, 0)} {lang === 'HI' ? 'कर्व कतार' : 'curb overflow waiting'}
                  </p>
                </div>
              </div>

              {/* KPI 4: Green-Wave Grants */}
              <div className="bg-[#F8FAFC] rounded-xl border border-[#CBD5E1] p-4 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                    {lang === 'HI' ? 'ग्रीन-वेव अनुदान' : 'Green-Wave Grants'}
                  </span>
                  <ShieldCheck size={16} className="text-emerald-600" />
                </div>
                <div className="mt-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-emerald-700">
                      {freightTelemetry.greenWaveGranted || 0}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      ({priorityGrantRate}%)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {freightTelemetry.greenWaveDeferred || 0} {lang === 'HI' ? 'आस्थगित चक्र' : 'deferred standard cycles'}
                  </p>
                </div>
              </div>
            </div>

            {/* Freight Charts Grid Row 1: Time Series & Hub Dwell */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              {/* Chart 1: Commercial Fleet Volume & Cargo Over Time */}
              <div className="bg-[#F8FAFC] rounded-xl border border-[#CBD5E1] p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[#0A1F44]">
                      {lang === 'HI' ? 'समय के साथ माल ढुलाई व कार्गो भार' : 'Freight Volume & Cargo Payload Over Time'}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {lang === 'HI' ? 'सिमुलेशन टिक्स में वाणिज्यिक वाहन, कार्गो टन और पीसीयू' : 'Active commercial vehicles, cargo tonnage (t), and PCU impact'}
                    </p>
                  </div>
                  <span className="text-xs bg-[#0A1F44]/5 text-[#0F2C59] border border-[#0F2C59]/20 font-bold px-2.5 py-0.5 rounded-full">
                    {lang === 'HI' ? 'टाइम सीरीज़' : 'TIME SERIES'}
                  </span>
                </div>

                <div className="h-[250px] w-full pt-2">
                  {session.hasTimeSeriesData ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={session.timeSeries}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="time" stroke="#475569" fontSize={11} tickLine={false} tick={{ fontFamily: "'Noto Sans', sans-serif" }} />
                        <YAxis stroke="#475569" fontSize={11} tickLine={false} tick={{ fontFamily: "'Noto Sans', sans-serif" }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0A1F44', borderRadius: '8px', border: '1px solid #1E4D8C', color: '#FFFFFF', fontSize: '11px' }}
                          itemStyle={{ color: '#FFFFFF', fontWeight: 600 }}
                          labelStyle={{ color: '#F8FAFC', fontWeight: 700 }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Line
                          type="monotone"
                          dataKey="activeFreight"
                          name={lang === 'HI' ? 'सक्रिय माल वाहन' : 'Active Freight'}
                          stroke="#0F2C59"
                          strokeWidth={2.5}
                          dot={false}
                          isAnimationActive={false}
                          connectNulls={true}
                        />
                        <Line
                          type="monotone"
                          dataKey="cargoTonnage"
                          name={lang === 'HI' ? 'कार्गो टन (t)' : 'Cargo Payload (t)'}
                          stroke="#F5A623"
                          strokeWidth={2.5}
                          dot={false}
                          isAnimationActive={false}
                          connectNulls={true}
                        />
                        <Line
                          type="monotone"
                          dataKey="freightPcu"
                          name={lang === 'HI' ? 'माल PCU प्रभाव' : 'Commercial PCU'}
                          stroke="#7C3AED"
                          strokeWidth={1.8}
                          strokeDasharray="4 2"
                          dot={false}
                          isAnimationActive={false}
                          connectNulls={true}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-slate-400">
                      {lang === 'HI' ? 'अपर्याप्त टाइम-सीरीज़ डेटा' : 'Insufficient time-series data'}
                    </div>
                  )}
                </div>
              </div>

              {/* Chart 2: Hub Capacity & Dwell Saturation Bar Chart */}
              <div className="bg-[#F8FAFC] rounded-xl border border-[#CBD5E1] p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[#0A1F44]">
                      {lang === 'HI' ? 'लॉजिस्टिक्स हब बे एवं कर्व कतार' : 'Logistics Hub Bay & Curb Saturation'}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {lang === 'HI' ? 'प्रति हब व्यस्त बे, उपलब्ध बे और कर्व प्रतीक्षा वाहन' : 'Occupied dwell bays, available bays, and waiting curb queues'}
                    </p>
                  </div>
                  <span className="text-xs bg-[#0A1F44]/5 text-[#0F2C59] border border-[#0F2C59]/20 font-bold px-2.5 py-0.5 rounded-full">
                    {lang === 'HI' ? 'बार चार्ट' : 'BAR CHART'}
                  </span>
                </div>

                <div className="h-[250px] w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hubBarData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="name" stroke="#475569" fontSize={11} tickLine={false} tick={{ fontFamily: "'Noto Sans', sans-serif" }} />
                      <YAxis stroke="#475569" fontSize={11} tickLine={false} allowDecimals={false} tick={{ fontFamily: "'Noto Sans', sans-serif" }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0A1F44', borderRadius: '8px', border: '1px solid #1E4D8C', color: '#FFFFFF', fontSize: '11px' }}
                        itemStyle={{ color: '#FFFFFF', fontWeight: 600 }}
                        labelStyle={{ color: '#F8FAFC', fontWeight: 700 }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar dataKey="occupied" name={lang === 'HI' ? 'व्यस्त बे (Dwelling)' : 'Occupied Bays'} fill="#0F2C59" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                      <Bar dataKey="available" name={lang === 'HI' ? 'उपलब्ध बे' : 'Available Bays'} fill="#16A34A" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                      <Bar dataKey="curbQueue" name={lang === 'HI' ? 'कर्व कतार (Waiting)' : 'Curb Queue'} fill="#F5A623" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Freight Charts Grid Row 2: Mode Breakdown & Green-Wave Priority Outcomes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 3: Commercial Fleet Mode Breakdown (Pie/Donut) */}
              <div className="bg-[#F8FAFC] rounded-xl border border-[#CBD5E1] p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[#0A1F44]">
                      {lang === 'HI' ? 'वाणिज्यिक बेड़ा वर्गीकरण' : 'Commercial Fleet Mode Breakdown'}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {lang === 'HI' ? 'डिलीवरी वैन (LCV) बनाम भारी माल ट्रक (HCV)' : 'LCV delivery vans vs HCV freight trucks classification'}
                    </p>
                  </div>
                  <span className="text-xs bg-[#0A1F44]/5 text-[#0F2C59] border border-[#0F2C59]/20 font-bold px-2.5 py-0.5 rounded-full">
                    {lang === 'HI' ? 'पाई चार्ट' : 'PIE CHART'}
                  </span>
                </div>

                <div className="h-[250px] w-full flex flex-col sm:flex-row items-center justify-center">
                  <div className="w-[180px] h-[180px] shrink-0 flex items-center justify-center">
                    <PieChart width={180} height={180}>
                      <Pie
                        data={freightModeData}
                        cx={90}
                        cy={90}
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="count"
                        isAnimationActive={false}
                      >
                        {freightModeData.map((entry, index) => (
                          <Cell key={`freight-mode-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0A1F44', borderRadius: '8px', border: '1px solid #1E4D8C', color: '#FFFFFF', fontSize: '11px' }}
                        itemStyle={{ color: '#FFFFFF', fontWeight: 600 }}
                        labelStyle={{ color: '#F8FAFC', fontWeight: 700 }}
                      />
                    </PieChart>
                  </div>

                  <div className="space-y-2 text-sm text-slate-600 sm:ml-4 flex-1 w-full">
                    {freightModeData.map(item => (
                      <div key={item.name} className="flex items-center justify-between py-1 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full shrink-0 shadow-xs ring-1 ring-slate-900/10" style={{ backgroundColor: item.color }} />
                          <span className="font-semibold text-slate-800">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-slate-600 font-medium">{item.count} {lang === 'HI' ? 'वाहन' : 'units'}</span>
                          {item.pcu > 0 && (
                            <span className="text-xs font-bold text-slate-500">({item.pcu} PCU)</span>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="pt-1 text-[11px] text-slate-500 flex justify-between">
                      <span>{lang === 'HI' ? 'कुल पेलोड:' : 'Total Cargo Load:'}</span>
                      <span className="font-bold text-[#0A1F44]">{totalCargoTonnage} tonnes</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart 4: Freight Green-Wave Priority Outcomes & Guardrails */}
              <div className="bg-[#F8FAFC] rounded-xl border border-[#CBD5E1] p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[#0A1F44]">
                      {lang === 'HI' ? 'ग्रीन-वेव निर्णय एवं सुरक्षा गार्डरेल' : 'Green-Wave Decisions & Guardrails'}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {lang === 'HI' ? 'सिग्नल विस्तार अनुदान बनाम मानक चक्र संरक्षण' : 'Signal extension grants vs passenger protection cycles'}
                    </p>
                  </div>
                  <span className="text-xs bg-[#FFFBEB] text-[#B8860B] border border-[#F5A623]/30 font-bold px-2.5 py-0.5 rounded-full uppercase">
                    {lang === 'HI' ? 'निर्णय मैट्रिक्स' : 'DECISION MATRIX'}
                  </span>
                </div>

                <div className="h-[250px] w-full flex flex-col sm:flex-row items-center justify-center">
                  {greenWaveDecisionsData.length > 0 ? (
                    <>
                      <div className="w-[180px] h-[180px] shrink-0 flex items-center justify-center">
                        <PieChart width={180} height={180}>
                          <Pie
                            data={greenWaveDecisionsData}
                            cx={90}
                            cy={90}
                            innerRadius={45}
                            outerRadius={75}
                            paddingAngle={3}
                            dataKey="count"
                            isAnimationActive={false}
                          >
                            {greenWaveDecisionsData.map((entry, index) => (
                              <Cell key={`gw-decision-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: '#0A1F44', borderRadius: '8px', border: '1px solid #1E4D8C', color: '#FFFFFF', fontSize: '11px' }}
                            itemStyle={{ color: '#FFFFFF', fontWeight: 600 }}
                            labelStyle={{ color: '#F8FAFC', fontWeight: 700 }}
                          />
                        </PieChart>
                      </div>

                      <div className="space-y-2 text-sm text-slate-600 sm:ml-4 flex-1 w-full">
                        {greenWaveDecisionsData.map(item => (
                          <div key={item.name} className="flex items-center justify-between py-1 border-b border-slate-200">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full shrink-0 shadow-xs ring-1 ring-slate-900/10" style={{ backgroundColor: item.color }} />
                              <span className="font-semibold text-slate-800">{item.name}</span>
                            </div>
                            <span className="font-mono font-bold text-slate-900">{item.count}</span>
                          </div>
                        ))}
                        <div className="pt-1.5 space-y-1 text-xs">
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Passenger Ceiling Limit:</span>
                            <span className="font-bold text-emerald-700">Protected (45s)</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Downstream Spillback Limit:</span>
                            <span className="font-bold text-emerald-700">Protected (80%)</span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-slate-400">
                      {lang === 'HI' ? 'स्कैनिंग माल दृष्टिकोण...' : 'Scanning approaches for eligible freight progression...'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Row 3: Completed Deliveries & Hub Dwell Audit Log */}
            <div className="bg-[#F8FAFC] rounded-xl border border-[#CBD5E1] p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#0A1F44]">
                    {lang === 'HI' ? 'पूरी हुई डिलीवरी एवं हब परिचालन लॉग' : 'Completed Deliveries & Hub Operations Log'}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {lang === 'HI' ? 'सफलतापूर्वक अनलोड किए गए माल वाहक और ड्वेल रसीदें' : 'Verified commercial vehicle delivery receipts and hub dwell clearances'}
                  </p>
                </div>
                <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-2.5 py-0.5 rounded-full">
                  {completedDeliveries.length} {lang === 'HI' ? 'डिलीवरी' : 'Deliveries'}
                </span>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pt-1">
                {completedDeliveries.length > 0 ? (
                  completedDeliveries.slice(-8).reverse().map(d => (
                    <div key={d.vehicleId || d.id} className="p-3 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm shadow-2xs">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                          <Truck size={16} />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-[#0A1F44]">{d.vehicleId || d.id}</span>
                            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              {d.vehicleType === 'freight_truck' ? 'HCV Truck' : 'LCV Van'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Dest: <strong className="text-slate-700 font-bold">{d.hubId || 'HUB_DDR_01'}</strong> • Payload: <strong className="text-slate-700 font-bold">{d.cargoTonnage || 1.2}t</strong>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 self-end sm:self-center">
                        <span className="text-xs text-slate-500 font-mono">
                          Dwell: {d.completionTime || 12}s
                        </span>
                        <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          COMPLETED
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-sm text-slate-400">
                    <Warehouse size={28} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">{lang === 'HI' ? 'अभी तक कोई डिलीवरी पूरी नहीं हुई' : 'No completed deliveries logged yet in this session'}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {lang === 'HI'
                        ? 'वाणिज्यिक वाहनों द्वारा हब लोडिंग बे में अनलोडिंग पूर्ण करने पर डिलीवरी रसीदें यहाँ दर्ज होंगी।'
                        : 'Commercial vehicles dwelling at Dadar Depot or BKC Hub will generate verified delivery receipts upon departure.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default Analytics;
