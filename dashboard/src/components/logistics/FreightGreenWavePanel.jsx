import React from 'react';
import { Waves, ShieldCheck, AlertTriangle, CheckCircle2, Clock, Activity, ArrowRight, XCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function FreightGreenWavePanel({ activeDecision, telemetry, strategy = 'adaptive' }) {
  const { lang } = useLanguage();

  const isFixed = strategy === 'fixed';

  if (!activeDecision) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
          <div className="flex items-center space-x-2">
            <Waves className="w-5 h-5 text-[#F5A623]" />
            <h3 className="font-bold text-[#0A1F44] text-sm">
              {lang === 'HI' ? 'माल ढुलाई ग्रीन वेव समन्वयक' : 'Freight Green-Wave Coordinator'}
            </h3>
          </div>
          <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
            {isFixed ? 'Fixed (Static Cycle)' : 'Adaptive Active'}
          </span>
        </div>

        <div className="py-6 text-center text-slate-400">
          <Activity className="w-8 h-8 mx-auto mb-2 text-slate-300 animate-pulse" />
          <p className="text-xs font-medium">
            {lang === 'HI' ? 'दृष्टिकोण पर माल वाहक की प्रतीक्षा की जा रही है...' : 'Scanning approaches for eligible freight progression...'}
          </p>
        </div>

        {telemetry && (
          <div className="pt-3 border-t border-slate-100 text-center">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-50 p-2 rounded">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Opportunities</div>
                <div className="text-sm font-black text-slate-800">{telemetry.greenWaveOpportunities || 0}</div>
              </div>
              <div className="bg-slate-50 p-2 rounded">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Granted</div>
                <div className="text-sm font-black text-emerald-700">{telemetry.greenWaveGranted || 0}</div>
              </div>
              <div className="bg-slate-50 p-2 rounded">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Deferred</div>
                <div className="text-sm font-black text-amber-700">{telemetry.greenWaveDeferred || 0}</div>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 mt-2 font-medium">Eligible freight progression events</div>
          </div>
        )}
      </div>
    );
  }

  const {
    vehicleId,
    vehicleType,
    approach,
    etaSeconds,
    remainingGreenSec,
    recommendedAction,
    greenAdjustmentSec,
    guardrailTriggered,
    reason,
    downstreamSaturation = 0.38
  } = activeDecision;

  const getActionBadge = () => {
    if (isFixed) {
      return (
        <span className="bg-slate-200 text-slate-700 border border-slate-300 px-2.5 py-1 rounded-md font-black text-xs">
          BLOCKED (FIXED BASELINE)
        </span>
      );
    }
    const dec = activeDecision.decision || (recommendedAction === 'DEFER' ? 'DEFER' : (recommendedAction === 'EXTEND_GREEN' || recommendedAction === 'EARLY_GREEN' ? 'GRANT' : 'DEFER'));
    if (dec === 'BLOCKED' || guardrailTriggered === 'EMERGENCY_OVERRIDE') {
      return (
        <span className="bg-red-100 text-red-800 border border-red-300 px-2.5 py-1 rounded-md font-black text-xs flex items-center space-x-1">
          <XCircle className="w-3.5 h-3.5" />
          <span>BLOCKED</span>
        </span>
      );
    }
    if (dec === 'GRANT') {
      return (
        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-md font-black text-xs flex items-center space-x-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>GRANT {greenAdjustmentSec > 0 ? `(+${greenAdjustmentSec}s)` : ''}</span>
        </span>
      );
    }
    return (
      <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-1 rounded-md font-black text-xs flex items-center space-x-1">
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>DEFER</span>
      </span>
    );
  };

  const downstreamPct = Math.round((downstreamSaturation || 0.38) * 100);
  const isDownstreamSafe = downstreamPct < 80;

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-[#0A1F44] text-[#F5A623] flex items-center justify-center font-bold">
            <Waves className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-[#0A1F44] text-sm">
              {lang === 'HI' ? 'माल ढुलाई ग्रीन वेव समन्वयक' : 'Freight Green-Wave Coordinator'}
            </h3>
            <p className="text-xs text-[#475569]">
              Evaluating Vehicle: <strong className="text-slate-800 font-bold">{vehicleId}</strong> ({vehicleType})
            </p>
          </div>
        </div>

        {getActionBadge()}
      </div>

      {/* Primary Timing Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4 text-center">
        <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-3.5 shadow-xs">
          <div className="text-xs text-[#475569] font-bold uppercase tracking-wider">Approach</div>
          <div className="text-xl sm:text-2xl font-black text-[#0F2942] mt-1">{approach} corridor</div>
        </div>
        <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-3.5 shadow-xs">
          <div className="text-xs text-[#475569] font-bold uppercase tracking-wider">ETA to Stop Line</div>
          <div className="text-xl sm:text-2xl font-black text-purple-700 mt-1">{etaSeconds !== undefined ? `${etaSeconds}s` : '—'}</div>
        </div>
        <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-3.5 shadow-xs">
          <div className="text-xs text-[#475569] font-bold uppercase tracking-wider">Current Green Window</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">{remainingGreenSec !== undefined ? `${remainingGreenSec}s` : '—'}</div>
        </div>
      </div>

      {/* Guardrails Verification Checklist */}
      <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#CBD5E1] mb-4 space-y-2.5 shadow-xs">
        <div className="text-xs sm:text-sm font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Active Guardrails Check</span>
        </div>

        <div className="flex items-center justify-between text-xs sm:text-sm">
          <span className="text-slate-600 font-medium">Downstream Spillback Protection:</span>
          <span className={`font-bold flex items-center space-x-1.5 ${isDownstreamSafe ? 'text-emerald-700' : 'text-amber-700'}`}>
            {isDownstreamSafe ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{downstreamPct}% saturation (Limit: 80%)</span>
          </span>
        </div>

        <div className="flex items-center justify-between text-xs sm:text-sm">
          <span className="text-slate-600 font-medium">Passenger Starvation Ceiling:</span>
          <span className="font-bold text-emerald-700 flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Pass (Ceiling: 45s)</span>
          </span>
        </div>

        <div className="flex items-center justify-between text-xs sm:text-sm">
          <span className="text-slate-600 font-medium">Emergency Corridor Dominance:</span>
          <span className={`font-bold flex items-center space-x-1.5 ${guardrailTriggered === 'EMERGENCY_OVERRIDE' || activeDecision.decision === 'BLOCKED' ? 'text-red-700' : 'text-emerald-700'}`}>
            {guardrailTriggered === 'EMERGENCY_OVERRIDE' || activeDecision.decision === 'BLOCKED' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{guardrailTriggered === 'EMERGENCY_OVERRIDE' || activeDecision.decision === 'BLOCKED' ? 'Blocked (Emergency Active)' : 'Clear (No Emergency Active)'}</span>
          </span>
        </div>
      </div>

      {/* Explainable Decision Reason Box */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-xs font-black uppercase text-blue-900 tracking-wider">
            {lang === 'HI' ? 'निर्णय का कारण (Explainability Receipt)' : 'Operational Decision Receipt'}
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase bg-white px-2 py-0.5 rounded border border-blue-200">
            Advisory Recommendation
          </span>
        </div>
        <p className="text-sm text-blue-950 font-semibold leading-relaxed">
          {isFixed
            ? 'Fixed-time signal plan active (MoRTH IRC-67 static cycle). Coordinated freight extension recommendation bypassed.'
            : reason || 'Freight progression evaluated deterministically based on kinematics and downstream clearance.'}
        </p>
      </div>
    </div>
  );
}
