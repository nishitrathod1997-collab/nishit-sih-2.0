import React from 'react';
import { 
  CheckCircle2, 
  Terminal 
} from 'lucide-react';
import { useTraffic } from '../context/TrafficContext';
import { useLanguage } from '../context/LanguageContext';

export const IncidentStream = () => {
  const { incidentLogs, acknowledgeIncident } = useTraffic();
  const { lang } = useLanguage();

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          badge: 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]',
          border: 'border-[#FECACA]'
        };
      case 'WARN':
      case 'WARNING':
        return {
          badge: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
          border: 'border-[#FDE68A]'
        };
      default:
        return {
          badge: 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]',
          border: 'border-[#E2E8F0]'
        };
    }
  };

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl flex flex-col h-full overflow-hidden shadow-xs">
      {/* Header */}
      <div className="px-3.5 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Terminal className="w-3.5 h-3.5 text-[#0F2C59]" />
          <span className="text-xs font-bold text-[#0A1F44] uppercase tracking-wider">
            {lang === 'HI' ? 'विसंगति एवं घटना स्ट्रीम' : 'Anomaly & Event Stream'}
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F1F5F9] border border-[#E2E8F0] text-[#0A1F44] font-bold">
          {incidentLogs.filter(i => !i.acknowledged).length} {lang === 'HI' ? 'लंबित' : 'PENDING'}
        </span>
      </div>

      {/* Terminal-Style Event Stream */}
      <div className="p-2.5 flex-1 overflow-y-auto space-y-2 font-mono text-xs max-h-[320px] bg-white">
        {incidentLogs.length === 0 ? (
          <div className="text-center py-4 text-[#94A3B8] text-xs">
            {lang === 'HI' ? '[लॉग स्ट्रीम निष्क्रिय - कोई विसंगति नहीं]' : '[LOG STREAM IDLE - NO ANOMALIES]'}
          </div>
        ) : (
          incidentLogs.map((incident) => {
            const style = getSeverityStyle(incident.severity);

            return (
              <div
                key={incident.id}
                className={`p-2.5 rounded-lg border bg-[#F8FAFC] ${
                  incident.acknowledged ? 'opacity-50 border-[#E2E8F0]' : style.border
                }`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-[#94A3B8] tabular-nums">
                        {incident.timestamp}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${style.badge}`}>
                        {incident.severity}
                      </span>
                      <span className="text-[10px] font-bold text-[#0F2C59]">
                        [{incident.junctionId}]
                      </span>
                      <span className="text-[#0A1F44] text-[11px] font-semibold">
                        {incident.type}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#475569] leading-tight">
                      {incident.message}
                    </p>
                  </div>

                  {!incident.acknowledged ? (
                    <button
                      onClick={() => acknowledgeIncident(incident.id)}
                      className="px-2.5 py-1 rounded bg-[#0F2C59] hover:bg-[#163A6B] text-[10px] font-bold text-white transition-all cursor-pointer whitespace-nowrap shadow-xs"
                    >
                      {lang === 'HI' ? 'पुष्टि' : 'ACK'}
                    </button>
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-1" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
