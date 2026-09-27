import React from 'react';
import { 
  BarChart2, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus, 
  Info, 
  ShieldAlert,
  Sliders,
  Database,
  Layers,
  Cpu,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const BenchmarkComparison = ({ 
  data = null, 
  status = 'IDLE', 
  error = null,
  onRerun = null,
  isLiveRun = false 
}) => {
  const { lang } = useLanguage();

  // Empty IDLE state without silent fallback
  if (status === 'IDLE' && !data) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <BarChart2 size={14} /> {lang === 'HI' ? 'संगणित सिमुलेशन तुलना' : 'Computed Simulation Comparison'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-bold">
                {lang === 'HI' ? 'निष्क्रिय (IDLE)' : 'IDLE'}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-2">
              {lang === 'HI' ? 'फिक्स्ड 45s बनाम एडेप्टिव तुलना इंजन' : 'Fixed 45s vs Adaptive Comparison Engine'}
            </h2>
          </div>

          {onRerun && (
            <button
              onClick={() => onRerun?.()}
              className="px-4 py-2.5 rounded-2xl bg-[#0F2C59] hover:bg-[#163A6B] text-white font-bold text-xs flex items-center gap-2 transition shadow-xs cursor-pointer shrink-0"
            >
              <Play size={14} /> {lang === 'HI' ? 'तुलना चलाएं' : 'Run Comparison'}
            </button>
          )}
        </div>

        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#0A1F44]/5 border border-[#0F2C59]/20 flex items-center justify-center mx-auto text-[#0F2C59]">
            <BarChart2 size={24} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {lang === 'HI' ? 'कोई तुलना रन शुरू नहीं हुआ' : 'No Comparison Run Initiated'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {lang === 'HI' ? (
                <>समान-यातायात फिक्स्ड 45s बनाम एडेप्टिव मेट्रिक्स की गणना के लिए <strong className="text-slate-700">ट्रैफिक इंटेलिजेंस</strong> में वीडियो-आधारित विश्लेषण चुनें या लोड करें, या <strong>तुलना चलाएं</strong> पर क्लिक करें।</>
              ) : (
                <>Select or load a video-driven analysis in <strong className="text-slate-700">Traffic Intelligence</strong> to automatically compute identical-traffic Fixed 45s vs Adaptive metrics, or click <strong>Run Comparison</strong>.</>
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // FAILED state with error message
  if (status === 'FAILED' && !data) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <BarChart2 size={14} /> {lang === 'HI' ? 'संगणित सिमुलेशन तुलना' : 'Computed Simulation Comparison'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300 text-[11px] font-bold">
                {lang === 'HI' ? 'विफल (FAILED)' : 'FAILED'}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-2">
              {lang === 'HI' ? 'तुलना निष्पादन त्रुटि' : 'Comparison Execution Error'}
            </h2>
          </div>

          {onRerun && (
            <button
              onClick={() => onRerun?.()}
              className="px-4 py-2.5 rounded-2xl bg-[#0F2C59] hover:bg-[#163A6B] text-white font-bold text-xs flex items-center gap-2 transition shadow-xs cursor-pointer shrink-0"
            >
              <RefreshCw size={14} /> {lang === 'HI' ? 'तुलना पुनः चलाएं' : 'Retry Comparison'}
            </button>
          )}
        </div>

        <div className="p-6 rounded-2xl bg-red-50/80 border border-red-200 text-red-900 space-y-2">
          <div className="font-bold flex items-center gap-2 text-sm text-red-950">
            <AlertCircle size={18} className="text-red-600 shrink-0" />
            {lang === 'HI' ? 'तुलना इंजन त्रुटि' : 'Comparison Engine Error'}
          </div>
          <p className="text-xs text-red-900 leading-relaxed font-medium">
            {error || (lang === 'HI' ? 'कोई मान्य विश्लेषित वीडियो डेटा उपलब्ध नहीं है। कृपया पहले ट्रैफिक इंटेलिजेंस में वीडियो विश्लेषण लोड या चुनें।' : 'No valid analyzed video data available. Please load or select a video analysis job in Traffic Intelligence first.')}
          </p>
        </div>
      </div>
    );
  }

  const activeResult = data;
  if (!activeResult || !activeResult.fixedResults || !activeResult.adaptiveResults) {
    return null;
  }

  const { metadata, fixedResults, adaptiveResults } = activeResult;

  // Helper for computing percentage change and direction from RAW values before rounding
  const computeChange = (fixedVal, adaptiveVal, lowerIsBetter = false) => {
    if (typeof fixedVal !== 'number' || typeof adaptiveVal !== 'number' || fixedVal === 0) {
      return { pctStr: 'N/A', isImprovement: false, isDeterioration: false, isUnchanged: true, textLabel: 'N/A' };
    }

    const diff = adaptiveVal - fixedVal;
    const pct = (diff / fixedVal) * 100;
    const absPctStr = `${Math.abs(pct).toFixed(1)}%`;
    const formattedPct = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;

    if (Math.abs(pct) < 0.05) {
      return { pctStr: '0.0%', isImprovement: false, isDeterioration: false, isUnchanged: true, textLabel: lang === 'HI' ? '0.0% (अपरिवर्तित)' : '0.0% (Unchanged)' };
    }

    let isImprovement = false;
    let isDeterioration = false;

    if (lowerIsBetter) {
      isImprovement = diff < 0;
      isDeterioration = diff > 0;
    } else {
      isImprovement = diff > 0;
      isDeterioration = diff < 0;
    }

    const statusText = lang === 'HI' 
      ? (isImprovement ? 'सुधार' : isDeterioration ? 'वृद्धि' : 'अपरिवर्तित')
      : (isImprovement ? 'Improved' : isDeterioration ? 'Deteriorated' : 'Unchanged');
    const directionText = lang === 'HI' 
      ? (diff > 0 ? 'वृद्धि' : 'कमी')
      : (diff > 0 ? 'increase' : 'decrease');

    return {
      rawDiff: diff,
      rawPct: pct,
      formattedPct,
      isImprovement,
      isDeterioration,
      isUnchanged: !isImprovement && !isDeterioration,
      textLabel: `${absPctStr} ${directionText} (${statusText})`
    };
  };

  // Helper for formatting average waiting
  const formatAvgWaiting = (val, acceptedArrivals) => {
    if (status === 'RUNNING' && (!acceptedArrivals || acceptedArrivals === 0)) {
      return lang === 'HI' ? 'डेटा संकलन जारी' : 'Collecting data';
    }
    if (val === null || val === undefined) {
      return acceptedArrivals === 0 ? (lang === 'HI' ? 'कोई आगमन नहीं' : 'No arrivals') : 'N/A';
    }
    return `${val.toFixed(2)} s/veh`;
  };

  // 1. Overall Metrics Rows
  const fixedTotalRemaining = (fixedResults.totalVisibleCarsRemaining || 0) + (fixedResults.totalBacklogCarsRemaining || 0);
  const adaptiveTotalRemaining = (adaptiveResults.totalVisibleCarsRemaining || 0) + (adaptiveResults.totalBacklogCarsRemaining || 0);

  const comparisonRows = [
    {
      id: 'averageWaitingAccruedPerAdmitted',
      metric: lang === 'HI' ? 'औसत उपचित प्रतीक्षा समय (s/वाहन)' : 'Average waiting accrued (s/vehicle)',
      explanation: lang === 'HI' 
        ? 'प्राथमिक मेट्रिक: कुल संचित प्रतीक्षा (वाहन-सेकंड) को स्वीकृत आगमनों से विभाजित। इसमें पूर्ण प्रस्थान, दृश्यमान कारें और अपस्ट्रीम बैकलाग शामिल हैं।'
        : 'Primary metric: Total accumulated waiting (veh-s) divided by accepted arrivals. Includes waiting accrued so far by completed departures, visible cars, and upstream backlog.',
      fixed: formatAvgWaiting(fixedResults.averageWaitingAccruedPerAdmitted, fixedResults.totalAcceptedArrivals),
      adaptive: formatAvgWaiting(adaptiveResults.averageWaitingAccruedPerAdmitted, adaptiveResults.totalAcceptedArrivals),
      unit: 's/veh',
      lowerIsBetter: true,
      change: computeChange(fixedResults.averageWaitingAccruedPerAdmitted, adaptiveResults.averageWaitingAccruedPerAdmitted, true)
    },
    {
      id: 'departedVehiclesAvgWaiting',
      metric: lang === 'HI' ? 'प्रस्थान वाहनों का औसत प्रतीक्षा समय' : 'Departed-vehicles average waiting',
      explanation: lang === 'HI'
        ? 'द्वितीयक मेट्रिक: केवल पूर्ण प्रस्थानों का औसत प्रतीक्षा समय।'
        : 'Secondary metric: Average waiting time of completed departures only.',
      fixed: fixedResults.departedVehiclesAvgWaiting !== null ? `${fixedResults.departedVehiclesAvgWaiting}s (${fixedResults.departedSampleCount} ${lang === 'HI' ? 'नमूना' : 'sample'})` : 'N/A',
      adaptive: adaptiveResults.departedVehiclesAvgWaiting !== null ? `${adaptiveResults.departedVehiclesAvgWaiting}s (${adaptiveResults.departedSampleCount} ${lang === 'HI' ? 'नमूना' : 'sample'})` : 'N/A',
      unit: 's',
      lowerIsBetter: true,
      change: computeChange(fixedResults.departedVehiclesAvgWaiting, adaptiveResults.departedVehiclesAvgWaiting, true)
    },
    {
      id: 'acceptedArrivals',
      metric: lang === 'HI' ? 'स्वीकृत आगमन' : 'Accepted arrivals',
      explanation: lang === 'HI'
        ? 'इंटरसेक्शन या बैकलाग में स्वीकृत कुल वाहन आगमन।'
        : 'Total vehicle arrivals admitted into the intersection or backlog.',
      fixed: fixedResults.totalAcceptedArrivals,
      adaptive: adaptiveResults.totalAcceptedArrivals,
      unit: lang === 'HI' ? 'कारें' : 'cars',
      lowerIsBetter: false,
      change: computeChange(fixedResults.totalAcceptedArrivals, adaptiveResults.totalAcceptedArrivals, false)
    },
    {
      id: 'completedDepartures',
      metric: lang === 'HI' ? 'पूर्ण प्रस्थान' : 'Completed departures',
      explanation: lang === 'HI'
        ? 'वे वाहन जिन्होंने सफलतापूर्वक निकास सीमा पार की।'
        : 'Vehicles that successfully crossed the exit threshold.',
      fixed: fixedResults.totalDepartures,
      adaptive: adaptiveResults.totalDepartures,
      unit: lang === 'HI' ? 'कारें' : 'cars',
      lowerIsBetter: false,
      change: computeChange(fixedResults.totalDepartures, adaptiveResults.totalDepartures, false)
    },
    {
      id: 'totalAccumulatedWaitSec',
      metric: lang === 'HI' ? 'कुल संचित प्रतीक्षा समय' : 'Total accumulated waiting time',
      explanation: lang === 'HI'
        ? 'दृश्यमान कारों और बैकलाग में रुके हुए वाहन-सेकंड का समय-एकीकृत योग।'
        : 'Time-integrated sum of stopped vehicle seconds across visible cars and backlog.',
      fixed: `${(fixedResults.totalAccumulatedWaitSec || 0).toLocaleString()} veh-s`,
      adaptive: `${(adaptiveResults.totalAccumulatedWaitSec || 0).toLocaleString()} veh-s`,
      unit: 'veh-s',
      lowerIsBetter: true,
      change: computeChange(fixedResults.totalAccumulatedWaitSec, adaptiveResults.totalAccumulatedWaitSec, true)
    },
    {
      id: 'timeWeightedAvgStoppedQueue',
      metric: lang === 'HI' ? 'समय-भारित औसत रुकी हुई कतार' : 'Time-weighted average stopped queue',
      explanation: lang === 'HI'
        ? 'सिमुलेशन अवधि के दौरान बैकलाग सहित रुके हुए वाहनों की औसत संख्या।'
        : 'Mean number of stopped vehicles including backlog over simulation duration.',
      fixed: `${fixedResults.timeWeightedAvgStoppedQueue} ${lang === 'HI' ? 'वाहन' : 'vehicles'}`,
      adaptive: `${adaptiveResults.timeWeightedAvgStoppedQueue} ${lang === 'HI' ? 'वाहन' : 'vehicles'}`,
      unit: 'vehicles',
      lowerIsBetter: true,
      change: computeChange(fixedResults.timeWeightedAvgStoppedQueue, adaptiveResults.timeWeightedAvgStoppedQueue, true)
    },
    {
      id: 'maxStoppedQueue',
      metric: lang === 'HI' ? 'अधिकतम रुकी हुई कतार' : 'Maximum stopped queue',
      explanation: lang === 'HI'
        ? 'चरम तात्कालिक रुकी हुई वाहन संख्या (दृश्य + बैकलाग)।'
        : 'Peak instantaneous stopped vehicle count (visible + backlog).',
      fixed: `${fixedResults.maxStoppedQueue} ${lang === 'HI' ? 'वाहन' : 'vehicles'}`,
      adaptive: `${adaptiveResults.maxStoppedQueue} ${lang === 'HI' ? 'वाहन' : 'vehicles'}`,
      unit: 'vehicles',
      lowerIsBetter: true,
      change: computeChange(fixedResults.maxStoppedQueue, adaptiveResults.maxStoppedQueue, true)
    },
    {
      id: 'totalRemainingVehicles',
      metric: lang === 'HI' ? 'कुल शेष वाहन (दृश्य + बैकलाग)' : 'Total remaining vehicles (visible + backlog)',
      explanation: lang === 'HI'
        ? 'परिदृश्य समाप्त होने पर दृश्यमान सड़क या बैकलाग में शेष वाहन।'
        : 'Vehicles remaining on visible road or in backlog at scenario end.',
      fixed: `${fixedTotalRemaining} ${lang === 'HI' ? 'वाहन' : 'vehicles'} (${fixedResults.totalVisibleCarsRemaining} ${lang === 'HI' ? 'दृश्य' : 'vis'} + ${fixedResults.totalBacklogCarsRemaining} ${lang === 'HI' ? 'बैक' : 'back'})`,
      adaptive: `${adaptiveTotalRemaining} ${lang === 'HI' ? 'वाहन' : 'vehicles'} (${adaptiveResults.totalVisibleCarsRemaining} ${lang === 'HI' ? 'दृश्य' : 'vis'} + ${adaptiveResults.totalBacklogCarsRemaining} ${lang === 'HI' ? 'बैक' : 'back'})`,
      unit: 'vehicles',
      lowerIsBetter: true,
      change: computeChange(fixedTotalRemaining, adaptiveTotalRemaining, true)
    }
  ];

  // 2. Per-Approach Trade-Off Data
  const approaches = ['N', 'E', 'S', 'W'];
  const approachNames = { 
    N: lang === 'HI' ? 'उत्तर (North)' : 'North', 
    E: lang === 'HI' ? 'पूर्व (East)' : 'East', 
    S: lang === 'HI' ? 'दक्षिण (South - वीडियो)' : 'South (Video)', 
    W: lang === 'HI' ? 'पश्चिम (West)' : 'West' 
  };

  const approachTradeOffs = approaches.map(dir => {
    const fApp = (fixedResults.perApproach && fixedResults.perApproach[dir]) || {};
    const aApp = (adaptiveResults.perApproach && adaptiveResults.perApproach[dir]) || {};
    const change = computeChange(fApp.accumulatedWaitSec, aApp.accumulatedWaitSec, true);

    return {
      dir,
      name: approachNames[dir],
      fixedDepartures: fApp.departures || 0,
      adaptiveDepartures: aApp.departures || 0,
      fixedWaitSec: fApp.accumulatedWaitSec || 0,
      adaptiveWaitSec: aApp.accumulatedWaitSec || 0,
      change
    };
  });

  // Dynamic Narrative Generation
  const improvedDirs = approachTradeOffs.filter(a => a.change.isImprovement).map(a => `${a.name} (${a.change.formattedPct})`);
  const deterioratedDirs = approachTradeOffs.filter(a => a.change.isDeterioration).map(a => `${a.name} (${a.change.formattedPct})`);
  const unchangedDirs = approachTradeOffs.filter(a => a.change.isUnchanged).map(a => `${a.name} (${a.change.formattedPct})`);

  let dynamicTradeOffText = '';
  if (lang === 'HI') {
    if (improvedDirs.length > 0) {
      dynamicTradeOffText += `एडेप्टिव नियंत्रण ने ${improvedDirs.join(', ')} पर प्रतीक्षा समय कम किया। `;
    }
    if (unchangedDirs.length > 0) {
      dynamicTradeOffText += `${unchangedDirs.join(', ')} अपरिवर्तित रहे। `;
    }
    if (deterioratedDirs.length > 0) {
      dynamicTradeOffText += `${deterioratedDirs.join(', ')} पर, प्रतीक्षा समय बढ़ा क्योंकि एडेप्टिव नियंत्रण ने हल्की मांग की तुलना में भारी कतार वाले मार्गों को प्राथमिकता दी।`;
    }
  } else {
    if (improvedDirs.length > 0) {
      dynamicTradeOffText += `Adaptive control reduced waiting time on ${improvedDirs.join(', ')}. `;
    }
    if (unchangedDirs.length > 0) {
      dynamicTradeOffText += `${unchangedDirs.join(', ')} remained unchanged. `;
    }
    if (deterioratedDirs.length > 0) {
      dynamicTradeOffText += `On ${deterioratedDirs.join(', ')}, waiting time increased because adaptive control dynamically prioritized heavy queue approaches over light demand.`;
    }
  }

  const completionTimeStr = metadata.completionTime || metadata.timestamp ? new Date(metadata.completionTime || metadata.timestamp).toLocaleString() : 'N/A';

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-8">
      
      {/* ── Section Header ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-[#0A1F44]/5 border border-[#0F2C59]/20 text-[#0F2C59] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <BarChart2 size={14} /> {lang === 'HI' ? 'संगणित सिमुलेशन तुलना' : 'Computed Simulation Comparison'}
            </span>

            {/* Status Badges */}
            {status === 'COMPLETED' && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold flex items-center gap-1">
                <CheckCircle2 size={12} /> {lang === 'HI' ? 'पूर्ण' : 'Completed'}
              </span>
            )}
            {status === 'RUNNING' && (
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold flex items-center gap-1 animate-pulse">
                <Clock size={12} /> {lang === 'HI' ? 'पिछला रन (अपडेट जारी...)' : 'Previous run (updating...)'}
              </span>
            )}
            {status === 'STALE' && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold flex items-center gap-1">
                <AlertCircle size={12} /> {lang === 'HI' ? 'पुराने इनपुट्स' : 'Stale Inputs'}
              </span>
            )}
            {status === 'FAILED' && (
              <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[11px] font-bold flex items-center gap-1">
                <AlertCircle size={12} /> {lang === 'HI' ? 'रन त्रुटि' : 'Run Error'}
              </span>
            )}

            <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-mono font-medium">
              Run ID: {metadata.runId || 'N/A'}
            </span>
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-2">
            {lang === 'HI' ? 'संगणित सिमुलेशन तुलना — समान यातायात इनपुट' : 'Computed simulation comparison — identical traffic inputs'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {metadata.scenarioLabel || (lang === 'HI' ? 'लघु-अवधि तुलना (~159s क्लिप; पूर्ण फिक्स्ड चक्र में क्लीयरेंस सहित ~196s लगते हैं)' : 'Short-run comparison (~159s clip; full Fixed cycle takes ~196s including clearance)')}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {onRerun && (
            <button
              onClick={() => onRerun?.()}
              disabled={status === 'RUNNING'}
              className="px-4 py-2.5 rounded-2xl bg-[#0F2C59] hover:bg-[#163A6B] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 transition shadow-xs cursor-pointer"
            >
              <RefreshCw size={14} className={status === 'RUNNING' ? 'animate-spin' : ''} />
              {status === 'RUNNING' ? (lang === 'HI' ? 'गणना जारी...' : 'Computing...') : (lang === 'HI' ? 'तुलना पुनः चलाएं' : 'Rerun Comparison')}
            </button>
          )}

          <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs text-slate-600 font-mono">
            <Database size={15} className="text-[#0F2C59] shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block font-sans uppercase font-bold">{lang === 'HI' ? 'फिंगरप्रिंट' : 'Fingerprint'}</span>
              <span className="font-bold text-slate-800">{(metadata.timelineFingerprint || '').slice(0, 16)}...</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error alert if rerun failed but previous data is displayed */}
      {status === 'FAILED' && error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center justify-between gap-2 font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-600 shrink-0" />
            <span>{lang === 'HI' ? 'पुनः रन विफल:' : 'Rerun failed:'} {error}</span>
          </div>
        </div>
      )}

      {/* ── 1. Overall Metrics Comparison Table ─────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Layers size={16} className="text-[#0F2C59]" />
          {lang === 'HI' ? 'समग्र सत्र तुलना' : 'Overall Session Comparison'}
        </h3>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px] text-slate-500">
                <th className="py-3.5 px-4">{lang === 'HI' ? 'मेट्रिक' : 'Metric'}</th>
                <th className="py-3.5 px-4 bg-slate-100/50">{lang === 'HI' ? 'फिक्स्ड (45s बेसलाइन)' : 'Fixed (45s Baseline)'}</th>
                <th className="py-3.5 px-4 bg-[#0A1F44]/5 text-[#0A1F44]">{lang === 'HI' ? 'एडेप्टिव (ह्यूरिस्टिक)' : 'Adaptive (Heuristic)'}</th>
                <th className="py-3.5 px-4">{lang === 'HI' ? 'परिवर्तन' : 'Change'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {comparisonRows.map(row => {
                const c = row.change;
                return (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{row.metric}</div>
                      {row.explanation && (
                        <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">{row.explanation}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 bg-slate-50/30 font-mono text-slate-700">{row.fixed}</td>
                    <td className="py-3.5 px-4 bg-[#0A1F44]/5 font-mono font-bold text-[#0A1F44]">{row.adaptive}</td>
                    <td className="py-3.5 px-4">
                      {c.isUnchanged && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-bold text-[11px]">
                          <Minus size={12} /> {c.textLabel}
                        </span>
                      )}
                      {c.isImprovement && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                          <ArrowDownRight size={14} className="text-emerald-600" /> {c.textLabel}
                        </span>
                      )}
                      {c.isDeterioration && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px]">
                          <ArrowUpRight size={14} className="text-amber-600" /> {c.textLabel}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 2. Per-Direction Trade-Offs Section ───────────────── */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Sliders size={16} className="text-[#0F2C59]" />
            {lang === 'HI' ? 'प्रति-पहुंच ट्रेड-ऑफ विश्लेषण' : 'Per-Approach Trade-Off Analysis'}
          </h3>
          <span className="text-[11px] text-slate-500 italic">
            {lang === 'HI' ? 'दृश्य ट्रेड-ऑफ संरक्षित' : 'Visible trade-offs preserved'}
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px] text-slate-500">
                <th className="py-3 px-4">{lang === 'HI' ? 'पहुंच' : 'Approach'}</th>
                <th className="py-3 px-4">{lang === 'HI' ? 'फिक्स्ड प्रस्थान' : 'Fixed Departures'}</th>
                <th className="py-3 px-4">{lang === 'HI' ? 'एडेप्टिव प्रस्थान' : 'Adaptive Departures'}</th>
                <th className="py-3 px-4">{lang === 'HI' ? 'फिक्स्ड प्रतीक्षा (वाहन-सेकंड)' : 'Fixed Wait (veh-s)'}</th>
                <th className="py-3 px-4">{lang === 'HI' ? 'एडेप्टिव प्रतीक्षा (वाहन-सेकंड)' : 'Adaptive Wait (veh-s)'}</th>
                <th className="py-3 px-4">{lang === 'HI' ? 'प्रतीक्षा समय परिवर्तन' : 'Waiting Time Change'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium font-mono">
              {approachTradeOffs.map(app => {
                const c = app.change;
                return (
                  <tr key={app.dir} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-sans font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-extrabold text-slate-700">
                        {app.dir}
                      </span>
                      <span>{app.name}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{app.fixedDepartures}</td>
                    <td className="py-3 px-4 font-bold text-[#0A1F44]">{app.adaptiveDepartures}</td>
                    <td className="py-3 px-4 text-slate-700">{(app.fixedWaitSec || 0).toLocaleString()}s</td>
                    <td className="py-3 px-4 font-bold text-[#0A1F44]">{(app.adaptiveWaitSec || 0).toLocaleString()}s</td>
                    <td className="py-3 px-4 font-sans">
                      {c.isUnchanged && (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[11px]">
                          {lang === 'HI' ? '0.0% (अपरिवर्तित)' : '0.0% (Unchanged)'}
                        </span>
                      )}
                      {c.isImprovement && (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[11px]">
                          {c.formattedPct} ({lang === 'HI' ? 'सुधार' : 'Improved'})
                        </span>
                      )}
                      {c.isDeterioration && (
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[11px]">
                          {c.formattedPct} ({lang === 'HI' ? 'वृद्धि' : 'Deteriorated'})
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-4 rounded-2xl bg-[#0A1F44]/5 border border-[#0F2C59]/15 text-xs text-[#0A1F44] space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-[#0A1F44]">
            <Cpu size={14} /> {lang === 'HI' ? 'नियंत्रक ट्रेड-ऑफ अवलोकन' : 'Controller Trade-Off Observation'}
          </div>
          <p className="text-[11px] leading-relaxed text-slate-700">
            {dynamicTradeOffText || (lang === 'HI' ? 'समान यातायात सिमुलेशन पूर्ण।' : 'Identical traffic simulation complete.')}
          </p>
        </div>
      </div>

      {/* ── 3. Scenario Details & Mandatory Notice ────────────── */}
      <div className="pt-4 border-t border-slate-100 space-y-4">
        <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Info size={14} /> {lang === 'HI' ? 'परिदृश्य पैरामीटर एवं स्रोत' : 'Scenario Parameters & Provenance'}
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div>
            <span className="text-[10px] text-slate-400 block font-bold uppercase">{lang === 'HI' ? 'परिदृश्य अवधि' : 'Scenario Duration'}</span>
            <span className="font-semibold text-slate-800">{metadata.actualDurationSec || 158.63}s</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-bold uppercase">{lang === 'HI' ? 'रैंडम सीड' : 'Random Seed'}</span>
            <span className="font-mono font-semibold text-slate-800">Seed {metadata.randomSeed || 42}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-bold uppercase">{lang === 'HI' ? 'पूर्ण होने का समय' : 'Completion Time'}</span>
            <span className="font-semibold text-slate-800">{completionTimeStr}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-bold uppercase">{lang === 'HI' ? 'प्रारंभिक स्थितियां' : 'Initial Conditions'}</span>
            <span className="font-semibold text-slate-800">{lang === 'HI' ? 'खाली सड़कें (0 दृश्य / 0 बैकलाग)' : 'Empty Roads (0 Visible / 0 Backlog)'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-bold uppercase">{lang === 'HI' ? 'दक्षिण पहुंच' : 'South Approach'}</span>
            <span className="font-semibold text-blue-700">{lang === 'HI' ? 'वीडियो आगमन घटनाएं' : 'Video Arrival Events'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-bold uppercase">{lang === 'HI' ? 'उत्तर / पूर्व / पश्चिम पहुंच' : 'N / E / W Approaches'}</span>
            <span className="font-semibold text-slate-800">{lang === 'HI' ? 'उत्पन्न अनुसूची (Seed 42)' : 'Generated Schedule (Seed 42)'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-bold uppercase">{lang === 'HI' ? 'मांग गुणक' : 'Demand Multiplier'}</span>
            <span className="font-mono font-semibold text-[#0F2C59]">
              {metadata?.inputConfig?.demandMultiplier !== undefined
                ? `${metadata.inputConfig.demandMultiplier}× (${metadata.inputConfig.demandMultiplier === 0.5 ? (lang === 'HI' ? 'मध्यम' : 'Moderate') : (lang === 'HI' ? 'पीक समय' : 'Peak Time')})`
                : (lang === 'HI' ? '0.5× (मध्यम)' : '0.5× (Moderate)')}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-bold uppercase">{lang === 'HI' ? 'फिक्स्ड योजना' : 'Fixed Plan'}</span>
            <span className="font-mono text-slate-700">{metadata.fixedPlanLabel || (lang === 'HI' ? 'एकसमान फिक्स्ड बेसलाइन — 45s प्रति दिशा' : 'Uniform Fixed Baseline — 45s per direction')}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-bold uppercase">{lang === 'HI' ? 'सब-स्टेप डेल्टा' : 'Sub-step Delta'}</span>
            <span className="font-mono text-slate-700">max 0.05s</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-amber-900">
            <ShieldAlert size={15} className="text-amber-600" /> {lang === 'HI' ? 'लघु-अवधि परिदृश्य दायरा सूचना' : 'Short-Run Scenario Scope Notice'}
          </div>
          <p className="text-[11px] leading-relaxed text-amber-800 font-medium">
            {lang === 'HI' 
              ? 'यह लघु-अवधि तुलना लगभग 159 सेकंड को कवर करती है। एक पूर्ण समान फिक्स्ड सिग्नल चक्र में 196 सेकंड (4 × 45s ग्रीन + 4 × 4s क्लीयरेंस) लगते हैं। लघु परिदृश्य विशिष्ट चरण सीमा स्थितियों को दर्शाते हैं और दीर्घकालिक नेटवर्क यातायात संचालन के लिए सामान्यीकृत नहीं होते हैं।'
              : 'This short-run comparison covers approximately 159 seconds. A full uniform Fixed signal cycle takes 196 seconds (4 × 45s green + 4 × 4s clearance). Short scenarios reflect specific phase boundary conditions and do not generalize to long-term network traffic operations.'}
          </p>
        </div>
      </div>

    </div>
  );
};
