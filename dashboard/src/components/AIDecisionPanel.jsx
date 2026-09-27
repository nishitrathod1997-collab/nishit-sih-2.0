import React from 'react';
import { Cpu, Layers, AlertCircle, Clock, Database, PlayCircle, Info, CheckCircle2, ArrowRight, Activity } from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { useLanguage } from '../context/LanguageContext';

export const AIDecisionPanel = ({ showAllocationDetails = true, ...props }) => {
  const { lang } = useLanguage();
  const {
    state,
    strategy,
    setStrategy,
    useMock,
    trafficSource,
    setTrafficSource,
    activatePredictivePuneDemo,
    historicalReplayStats
  } = useSimulation();

  const {
    signal,
    pending_signal,
    phase,
    active_green_duration,
    pending_green_duration,
    phase_remaining_sec,
    phase_label,
    clearance_status,
    decision,
    queued_pcus,
    stopped_queues
  } = state || {};

  const stagedStrategy = state?.staged_strategy || strategy;
  const isStaged = stagedStrategy !== strategy;

  // Max PCU for relative progress bar scaling
  const maxPcu = Math.max(5, ...Object.values(queued_pcus || {}).map(v => Number(v) || 0));

  return (
    <div
      className="rounded-xl p-5 shadow-xs select-none mb-4 bg-white border border-[#E2E8F0]"
    >
      {/* 1. Header & Quick SIH Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center space-x-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#0A1F44', border: '1px solid #1E4D8C' }}
          >
            <Cpu className="w-5 h-5 text-[#F5A623]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-[#0A1F44]">
                {lang === 'HI' ? 'MoRTH अनुकूली सिग्नल नियंत्रक एवं मांग अनुकूलन' : 'MoRTH Adaptive Signal Controller & Demand Optimization'}
              </h3>
            </div>
            <p className="text-xs text-[#475569]">
              {lang === 'HI' ? 'रीयल-टाइम PCU मांग आवंटन, 35s स्टार्वेशन सुरक्षा एवं गतिशील मौसम निकासी' : 'Real-time PCU demand allocation, 35s starvation protection & dynamic weather clearance'}
            </p>
          </div>
        </div>

        {/* Predict & Optimize Button matching screenshot */}
        <button
          onClick={activatePredictivePuneDemo}
          className="flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-lg text-white shadow-xs transition-all hover:bg-[#163A6B] active:scale-95 cursor-pointer bg-[#0F2C59] border border-[#1E4D8C]"
          title={lang === 'HI' ? 'प्रीसेट: ट्रैफिक स्रोत को पुणे ऐतिहासिक और रणनीति को प्रिडिक्टिव एडेप्टिव पर सेट करें' : 'Preset: Set Traffic Source to Pune Historical & Strategy to Predictive Adaptive'}
        >
          <PlayCircle className="w-4 h-4 text-[#F5A623]" />
          <span>{lang === 'HI' ? 'पूर्वानुमान एवं अनुकूलन' : 'Predict & Optimize'}</span>
          <span className="text-xs text-[#F5A623]">▶</span>
        </button>
      </div>

      {/* 2. Dual Control Bars (Optimization Mode + Demand Source) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 py-2 px-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
        {/* Optimization Mode */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-[#475569]">
            {lang === 'HI' ? 'अनुकूलन मोड:' : 'Optimization Mode:'}
          </span>
          <div className="flex items-center space-x-1 p-1 rounded-md bg-[#E2E8F0]">
            {[
              { id: 'fixed', label: lang === 'HI' ? 'स्थिर' : 'Fixed' },
              { id: 'adaptive', label: lang === 'HI' ? 'अनुकूली' : 'Adaptive' }
            ].map(({ id, label }) => {
              const isActive = strategy === id;
              return (
                <button
                  key={id}
                  onClick={() => setStrategy(id)}
                  className={`px-3.5 py-1 text-xs font-bold rounded transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#0F2C59] text-white shadow-xs'
                      : 'text-slate-600 hover:text-[#0A1F44]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Demand Source */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-[#475569]">
            {lang === 'HI' ? 'मांग स्रोत:' : 'Demand Source:'}
          </span>
          <div className="flex items-center space-x-1 p-1 rounded-md bg-[#E2E8F0]">
            <button
              onClick={() => setTrafficSource('simulation')}
              className={`px-3 py-1 text-xs font-bold rounded transition-all cursor-pointer ${
                trafficSource === 'simulation'
                  ? 'bg-[#0F2C59] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#0A1F44]'
              }`}
            >
              {lang === 'HI' ? 'सिंथेटिक' : 'Synthetic'}
            </button>
            <button
              onClick={() => setTrafficSource('pune_historical')}
              className={`px-3 py-1 text-xs font-bold rounded transition-all cursor-pointer ${
                trafficSource === 'pune_historical'
                  ? 'bg-[#0F2C59] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#0A1F44]'
              }`}
            >
              {lang === 'HI' ? 'पुणे 17 जन' : 'Pune Jan 17'}
            </button>
            {trafficSource === 'recorded_video' && (
              <span className="px-3 py-1 text-xs font-bold rounded bg-[#F5A623] text-white">
                {lang === 'HI' ? 'रिकॉर्डेड वीडियो' : 'Recorded Video'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Pune Historical Status Banner */}
      {trafficSource === 'pune_historical' && (
        <div className="mb-3 text-[11px] px-3.5 py-2 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 bg-[#F0FDF4] border border-[#BBF7D0] text-[#16A34A]">
          <div className="flex items-center space-x-2">
            <Database className="w-3.5 h-3.5 text-[#16A34A]" />
            <span className="font-bold">{lang === 'HI' ? 'ट्रैफिक स्रोत: पुणे ऐतिहासिक रीप्ले (नियत)' : 'Traffic Source: Pune Historical Replay (Deterministic)'}</span>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-[#DCFCE7] text-[#15803D]">
              {lang === 'HI' ? '17 जन, 2023' : 'Jan 17, 2023'} ({state?.predictiveTimestamp || '09:00:00'})
            </span>
          </div>
          <div className="text-[10px] font-mono flex items-center space-x-2 text-[#15803D]">
            <span>{lang === 'HI' ? 'देय:' : 'Due:'} {historicalReplayStats?.scheduledDue ?? 0}</span>
            <span>{lang === 'HI' ? 'स्वीकृत:' : 'Accepted:'} {historicalReplayStats?.accepted ?? 0}</span>
            <span className="text-[#94A3B8]">
              ({lang === 'HI' ? 'सड़क:' : 'Road:'} {historicalReplayStats?.currentlyOnRoad ?? 0}, {lang === 'HI' ? 'बैकलॉग:' : 'Backlog:'} {historicalReplayStats?.pendingBacklog ?? 0}, {lang === 'HI' ? 'बाहर निकले:' : 'Exited:'} {historicalReplayStats?.completed ?? 0})
            </span>
            <span className="font-bold px-1.5 rounded text-[#16A34A] bg-[#F0FDF4]">{lang === 'HI' ? 'नुकसान: 0' : 'Loss: 0'}</span>
          </div>
        </div>
      )}

      {/* Predictive Demand Indicator */}
      {strategy === 'predictive' && (
        <div className="mb-3 text-[11px] px-3.5 py-2 rounded-xl flex items-center justify-between bg-[#FFFBEB] border border-[#FDE68A] text-[#B8860B]">
          <div className="flex items-center space-x-2">
            <span
              className={`w-2 h-2 rounded-full ${state?.predictiveStatus === 'fallback' ? 'bg-[#F59E0B]' : 'bg-[#F5A623] animate-pulse'}`}
            />
            <span className="font-semibold">
              {state?.predictiveStatus === 'fallback'
                ? (lang === 'HI' ? 'पूर्वानुमानित मांग: वर्तमान PCU पर फॉलबैक' : 'Predictive Demand: Fallback to Current PCU')
                : (lang === 'HI' ? 'पूर्वानुमानित मांग: सक्रिय फ्यूजन मॉडल' : 'Predictive Demand: Active Fusion Model')}
            </span>
          </div>
          {state?.predictiveTimestamp && (
            <span className="text-[10px] font-mono text-[#B8860B]">
              {state.predictiveDemoDate || '2023-01-17'} {state.predictiveTimestamp}
            </span>
          )}
        </div>
      )}

      {/* Staged strategy warning */}
      {isStaged && (
        <div className="mb-3 text-[11px] px-3.5 py-2 rounded-xl flex items-center space-x-2 bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E]">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-[#F5A623]" />
          <span>{lang === 'HI' ? <>रणनीति परिवर्तन <strong>{stagedStrategy}</strong> तैयार; अगले चरण पर लागू होगा।</> : <>Strategy change to <strong>{stagedStrategy}</strong> staged; applying at next phase boundary.</>}</span>
        </div>
      )}

      {/* Extended Clearance status warning */}
      {clearance_status && (
        <div className="mb-3 text-[11px] px-3.5 py-2 rounded-xl flex items-center space-x-2 animate-pulse bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B]">
          <Clock className="w-3.5 h-3.5 flex-shrink-0 text-[#DC2626]" />
          <span>{clearance_status}</span>
        </div>
      )}

      {/* Backend mode warning */}
      {!useMock && (
        <div className="mb-3 text-[11px] px-3.5 py-2 rounded-xl flex items-center space-x-2 bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F2C59]">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-[#0F2C59]" />
          <span>{lang === 'HI' ? 'बैकएंड मोड सक्रिय है। स्थानीय अनुमानी रणनीति नियंत्रण अक्षम हैं।' : 'Backend mode active. Local heuristic strategy controls are disabled.'}</span>
        </div>
      )}

      {/* 3. 4 Signal Status Cards matching screenshot sizing */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Active Signal */}
        <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#475569]">
            <span className="text-xs font-bold uppercase tracking-wider">{lang === 'HI' ? 'सक्रिय सिग्नल' : 'Active Signal'}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-[#0F2942]">
              {lang === 'HI'
                ? (signal === 'N' ? 'उत्तर (N)' : signal === 'S' ? 'दक्षिण (S)' : signal === 'E' ? 'पूर्व (E)' : signal === 'W' ? 'पश्चिम (W)' : signal)
                : (signal || 'E')}
            </span>
            <span
              className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border"
              style={{
                backgroundColor: phase === 'GREEN' ? '#DCFCE7' : phase === 'YELLOW' ? '#FEF3C7' : '#FEE2E2',
                color: phase === 'GREEN' ? '#15803D' : phase === 'YELLOW' ? '#B45309' : '#DC2626',
                borderColor: phase === 'GREEN' ? '#86EFAC' : phase === 'YELLOW' ? '#FDE68A' : '#FECACA'
              }}
            >
              {phase === 'GREEN' ? (lang === 'HI' ? 'हरा' : 'GREEN') : phase === 'YELLOW' ? (lang === 'HI' ? 'पीला' : 'YELLOW') : (lang === 'HI' ? 'लाल' : 'RED')}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
            <span 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: phase === 'GREEN' ? '#22C55E' : phase === 'YELLOW' ? '#F59E0B' : '#EF4444' }} 
            />
            <span>
              {phase === 'GREEN' ? (lang === 'HI' ? 'राइट-ऑफ-वे सक्रिय' : 'Right-of-way active') : phase === 'YELLOW' ? (lang === 'HI' ? 'क्लियरेंस अंतराल' : 'Clearance interval') : (lang === 'HI' ? 'स्टॉप अंतराल' : 'Stop interval')}
            </span>
          </div>
        </div>

        {/* Clearance / Green Remaining */}
        <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#475569]">
            <span className="text-xs font-bold uppercase tracking-wider">
              {phase_label ? (lang === 'HI' ? 'शेष समय' : phase_label) : (lang === 'HI' ? 'शेष समय' : 'Yellow Clearance')}
            </span>
            <Clock size={16} className="text-[#003366]" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-black font-mono text-[#0F2942]">
              {clearance_status ? (lang === 'HI' ? 'साफ़' : 'Clear') : `${phase_remaining_sec ?? 2}s`}
            </span>
            <span className="text-xs font-bold text-slate-500">
              / {active_green_duration || 26}{lang === 'HI' ? 's चक्र' : 's cycle'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <span>{lang === 'HI' ? 'गतिशील समय आवंटन' : 'Dynamic split duration active'}</span>
          </div>
        </div>

        {/* Next Pending */}
        <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#475569]">
            <span className="text-xs font-bold uppercase tracking-wider">{lang === 'HI' ? 'अगला लंबित' : 'Next Pending'}</span>
            <ArrowRight size={16} className="text-purple-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-[#0F2942]">
              {lang === 'HI'
                ? ((pending_signal || signal) === 'N' ? 'उत्तर (N)' : (pending_signal || signal) === 'S' ? 'दक्षिण (S)' : (pending_signal || signal) === 'E' ? 'पूर्व (E)' : (pending_signal || signal) === 'W' ? 'पश्चिम (W)' : (pending_signal || signal))
                : (pending_signal || signal || 'E')}
            </span>
            <span className="text-xs font-bold text-purple-700">
              ({pending_green_duration || 36}s)
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <span>{lang === 'HI' ? 'कतार मांग द्वारा अनुसूचित' : 'Scheduled by queue demand'}</span>
          </div>
        </div>

        {/* Strategy Mode */}
        <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#475569]">
            <span className="text-xs font-bold uppercase tracking-wider">{lang === 'HI' ? 'रणनीति मोड' : 'Strategy Mode'}</span>
            <Activity size={16} className="text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-[#0F2942] capitalize">
              {strategy === 'fixed' ? (lang === 'HI' ? 'स्थिर' : 'Fixed') : (lang === 'HI' ? 'अनुकूली' : 'Adaptive')}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-800 font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{lang === 'HI' ? 'सक्रिय अनुकूलन इंजन' : 'Active Optimization Engine'}</span>
          </div>
        </div>
      </div>

      {/* 4. Approach Demand (PCU) Cards matching screenshot */}
      <div className="mb-4">
        <span className="text-xs font-bold uppercase tracking-wider block mb-2 text-[#475569]">
          {lang === 'HI' ? 'पहुंच मांग (PCU) / वाहन मैपिंग • अपस्ट्रीम बैकलॉग' : 'Approach Demand (PCU) / Vehicle Mapping • Upstream Backlog'}
        </span>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {['N', 'S', 'E', 'W'].map(dir => {
            const backlog = state?.backlog_queues?.[dir] || 0;
            const visibleStopped = state?.visible_stopped_queues?.[dir] !== undefined
              ? state.visible_stopped_queues[dir]
              : Math.max(0, (stopped_queues?.[dir] || 0) - backlog);
            const pcuVal = Number(queued_pcus?.[dir] ?? 0);
            const isActive = signal === dir;
            const progressPercent = pcuVal > 0 ? Math.min(100, Math.max(8, (pcuVal / maxPcu) * 100)) : 0;
            const dirLabel = dir === 'N' ? (lang === 'HI' ? 'उत्तर' : 'North')
              : dir === 'S' ? (lang === 'HI' ? 'दक्षिण' : 'South')
              : dir === 'E' ? (lang === 'HI' ? 'पूर्व' : 'East')
              : (lang === 'HI' ? 'पश्चिम' : 'West');

            return (
              <div
                key={dir}
                className={`rounded-xl p-4 shadow-xs transition-all duration-200 ${
                  isActive
                    ? 'bg-[#003366]/5 border-2 border-[#003366] shadow-sm ring-1 ring-[#003366]/20'
                    : 'bg-[#F8FAFC] border border-[#CBD5E1]'
                }`}
              >
                <div className="flex items-center justify-between text-[#475569]">
                  <span className="text-xs font-bold uppercase tracking-wider">{dirLabel} ({dir})</span>
                  <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                    isActive 
                      ? 'bg-[#003366] text-white border-[#003366]' 
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {isActive ? (lang === 'HI' ? 'सक्रिय' : 'ACTIVE') : (lang === 'HI' ? 'कतार' : 'QUEUE')}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black font-mono text-[#0F2942]">
                    {pcuVal.toFixed(1)}
                  </span>
                  <span className="text-xs font-bold text-slate-500">PCU</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-500 truncate">
                  ({visibleStopped} {lang === 'HI' ? 'वाहन मैप' : 'vehicles mapped'}{backlog > 0 ? ` + ${backlog} b/l` : ''})
                </div>
                {/* Horizontal Progress Bar */}
                <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${isActive ? 'bg-[#003366]' : 'bg-slate-500'}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showAllocationDetails && (
        <>
          {/* 5. Allocation Snapshot Strip matching screenshot */}
          <div className="mb-2 text-xs rounded-xl p-2.5 flex items-center space-x-2 bg-[#F8FAFC] border border-[#E2E8F0]">
            <Info className="w-4 h-4 text-[#0F2C59] flex-shrink-0" />
            <div className="truncate">
              <span className="font-bold text-[#0A1F44] mr-1.5">{lang === 'HI' ? 'आवंटन स्नैपशॉट:' : 'Allocation Snapshot:'}</span>
              <span className="font-mono text-[#0F2C59]">
                {decision?.allocationExplanation || (lang === 'HI' ? '0 PCU से आवंटित: 10s बेस ग्रीन आवंटन (अनुकूली चक्र प्रारंभ)।' : 'Allocated from 0 PCU: 10s base green allocation (Adaptive cycle initialized).')}
              </span>
            </div>
          </div>

          {/* 6. Recommendation Reason Strip matching screenshot */}
          <div className="text-xs rounded-xl p-2.5 flex items-center space-x-2 bg-[#F0FDF4] border border-[#DCFCE7]">
            <CheckCircle2 className="w-4 h-4 text-[#16A34A] flex-shrink-0" />
            <div className="truncate">
              <span className="font-bold text-[#0A1F44] mr-1.5">{lang === 'HI' ? 'सिफारिश का कारण:' : 'Recommendation Reason:'}</span>
              <span className="text-[#475569]">
                {decision?.reason || (lang === 'HI' ? 'अनुकूली मोड सक्रिय: सभी पहुंच मार्गों पर रीयल-टाइम कतारों की निगरानी।' : 'Adaptive mode active: Monitoring real-time arrival queues across all approaches.')}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AIDecisionPanel;
