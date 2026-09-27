import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Siren,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
  Layers,
  ArrowRight,
  ShieldAlert,
  Sliders,
  Warehouse,
  Truck,
  Car
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useSimulation } from '../context/SimulationContext';

// Color themes based on pressure level
const LEVEL_CONFIG = {
  STABLE: {
    label: 'STABLE',
    labelHi: 'स्थिर',
    textColor: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
    barColor: 'bg-emerald-500',
    dotColor: 'bg-emerald-500',
    pillClass: 'bg-emerald-100 text-emerald-800 border-emerald-300'
  },
  ELEVATED: {
    label: 'ELEVATED',
    labelHi: 'बढ़ा हुआ',
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    barColor: 'bg-blue-500',
    dotColor: 'bg-blue-500',
    pillClass: 'bg-blue-100 text-blue-800 border-blue-300'
  },
  HIGH: {
    label: 'HIGH',
    labelHi: 'उच्च',
    textColor: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    barColor: 'bg-amber-500',
    dotColor: 'bg-amber-500',
    pillClass: 'bg-amber-100 text-amber-800 border-amber-300'
  },
  CRITICAL: {
    label: 'CRITICAL',
    labelHi: 'गंभीर',
    textColor: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-400',
    barColor: 'bg-rose-600',
    dotColor: 'bg-rose-600',
    pillClass: 'bg-rose-100 text-rose-800 border-rose-300'
  },
  UNAVAILABLE: {
    label: 'UNAVAILABLE',
    labelHi: 'अनुपलब्ध',
    textColor: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-300',
    barColor: 'bg-slate-400',
    dotColor: 'bg-slate-400',
    pillClass: 'bg-slate-100 text-slate-700 border-slate-300'
  }
};

export default function UrbanResourcePressurePanel({ pressure = null }) {
  const { lang } = useLanguage();
  const simContext = useSimulation();

  // Support passed prop or grab directly from simulation context
  const pressureData = pressure ||
    simContext?.urbanResourcePressure ||
    simContext?.state?.urbanResourcePressure ||
    null;

  if (!pressureData || pressureData.overallLevel === 'UNAVAILABLE') {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="text-slate-400" size={20} />
            <h3 className="font-bold text-[#0A1F44] text-base">
              {lang === 'HI' ? 'शहरी संसाधन दबाव और प्रतिक्रिया प्रणाली' : 'Urban Resource Pressure'}
            </h3>
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              UNAVAILABLE
            </span>
          </div>
          <span className="text-xs text-slate-400">Waiting for live simulation telemetry...</span>
        </div>
      </div>
    );
  }

  const {
    overallPressureIndex = 0,
    overallLevel = 'STABLE',
    priorityState = null,
    categories = {},
    contributingFactors = [],
    primaryRecommendation = null,
    secondaryRecommendations = [],
    recentEvents = []
  } = pressureData;

  const levelConf = LEVEL_CONFIG[overallLevel] || LEVEL_CONFIG.STABLE;
  const isEmergency = priorityState === 'EMERGENCY OVERRIDE';

  const categoryItems = [
    {
      id: 'roadNetwork',
      title: lang === 'HI' ? 'सड़क नेटवर्क दबाव' : 'Road Network Pressure',
      weight: '35%',
      icon: Car,
      data: categories.roadNetwork || { score: 0, level: 'STABLE', contributingFactors: [], sourceMetrics: {} }
    },
    {
      id: 'intersection',
      title: lang === 'HI' ? 'चौराहा दबाव' : 'Intersection Pressure',
      weight: '25%',
      icon: Sliders,
      data: categories.intersection || { score: 0, level: 'STABLE', contributingFactors: [], sourceMetrics: {} }
    },
    {
      id: 'curbHub',
      title: lang === 'HI' ? 'कर्ब व हब दबाव' : 'Curb & Hub Pressure',
      weight: '25%',
      icon: Warehouse,
      data: categories.curbHub || { score: 0, level: 'STABLE', contributingFactors: [], sourceMetrics: {} }
    },
    {
      id: 'freightSystem',
      title: lang === 'HI' ? 'माल ढुलाई प्रणाली दबाव' : 'Freight System Pressure',
      weight: '15%',
      icon: Truck,
      data: categories.freightSystem || { score: 0, level: 'STABLE', contributingFactors: [], sourceMetrics: {} }
    }
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all duration-300">
      {/* Header bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0A1F44] text-[#F5A623] flex items-center justify-center font-black shadow-xs">
                <Activity size={18} />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-[#0A1F44] text-base tracking-tight">
                    {lang === 'HI' ? 'शहरी संसाधन दबाव और प्रतिक्रिया प्रणाली' : 'Urban Resource Pressure'}
                  </h3>
                  {isEmergency && (
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-gradient-to-r from-red-600 to-purple-600 text-white animate-pulse shadow-xs flex items-center space-x-1">
                      <Siren size={11} className="inline mr-1" />
                      EMERGENCY OVERRIDE
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#475569] mt-0.5">
                  {lang === 'HI'
                    ? 'सड़कों, चौराहों, कर्ब स्पेस और माल ढुलाई बुनियादी ढांचे पर समग्र लाइव दबाव सूचकांक'
                    : 'Live pressure across roads, intersections, curb space and freight infrastructure'}
                </p>
              </div>
            </div>
          </div>

          {/* Overall Pressure Score Badge */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-xs font-bold text-[#475569] uppercase tracking-wider">
                {lang === 'HI' ? 'दबाव सूचकांक' : 'OVERALL PRESSURE'}
              </div>
              <div className="flex items-center space-x-1.5 justify-end mt-1">
                <span className={`text-3xl font-black ${levelConf.textColor}`}>
                  {overallPressureIndex}
                </span>
                <span className="text-xs font-semibold text-slate-400">/100</span>
              </div>
            </div>

            <div className={`px-3 py-1.5 rounded-lg border text-xs font-black uppercase tracking-wider shadow-xs flex items-center space-x-1.5 ${levelConf.pillClass}`}>
              <span className={`w-2 h-2 rounded-full ${levelConf.dotColor} animate-pulse`} />
              <span>{lang === 'HI' ? levelConf.labelHi : levelConf.label}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-5">
        {/* Four Category Pressure Cards (Matching Dashboard sizing & styling) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categoryItems.map(item => {
            const catLevel = LEVEL_CONFIG[item.data.level] || LEVEL_CONFIG.STABLE;
            const ItemIcon = item.icon;
            return (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] shadow-xs hover:border-[#94A3B8] transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2.5">
                    <ItemIcon size={18} className="text-[#0A1F44]" />
                    <span className="text-sm sm:text-base font-bold text-[#0A1F44]">{item.title}</span>
                    <span className="text-xs font-semibold text-slate-500">({item.weight})</span>
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <span className={`text-2xl sm:text-3xl font-black ${catLevel.textColor}`}>
                      {item.data.score}
                    </span>
                    <span className="text-xs font-bold text-slate-400">/100</span>
                    <span className={`text-xs font-extrabold uppercase px-2 py-0.5 rounded border ${catLevel.pillClass}`}>
                      {item.data.level}
                    </span>
                  </div>
                </div>

                {/* Progress track */}
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden mt-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${catLevel.barColor}`}
                    style={{ width: `${Math.min(100, Math.max(0, item.data.score))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Primary Recommended Response Card (Matching Dashboard sizing & styling) */}
        {primaryRecommendation && (
          <div className="rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] p-5 shadow-xs relative overflow-hidden space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center flex-wrap gap-2.5">
                <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded bg-blue-100 text-blue-900 border border-blue-300">
                  {lang === 'HI' ? 'प्राथमिक प्रतिक्रिया' : 'PRIMARY RECOMMENDED RESPONSE'}
                </span>
                <span className="text-base sm:text-lg font-black text-[#0A1F44] tracking-wide">
                  {primaryRecommendation.action}
                </span>
              </div>

              <div className="flex items-center space-x-2.5">
                <span className="text-xs sm:text-sm font-bold text-slate-600">
                  {primaryRecommendation.affectedLocation}
                </span>
                <span className="text-slate-300 font-bold">•</span>
                <span
                  className={`text-xs font-extrabold uppercase px-2.5 py-1 rounded border shadow-xs ${
                    primaryRecommendation.status === 'EXECUTED IN SIMULATION'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}
                >
                  {primaryRecommendation.status}
                </span>
              </div>
            </div>

            <p className="text-sm sm:text-base text-[#0F2942] font-semibold leading-relaxed bg-white p-3.5 rounded-lg border border-slate-200">
              "{primaryRecommendation.reason}"
            </p>

            {/* Secondary Recommendations if available */}
            {secondaryRecommendations.length > 0 && (
              <div className="pt-3 border-t border-[#E2E8F0] space-y-2">
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  {lang === 'HI' ? 'द्वितीयक हस्तक्षेप:' : 'Secondary Interventions:'}
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {secondaryRecommendations.map((sec, idx) => (
                    <div
                      key={idx}
                      className="text-xs sm:text-sm bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs flex items-center space-x-2"
                    >
                      <ArrowRight size={13} className="text-slate-500" />
                      <span className="font-bold text-slate-800">{sec.action}</span>
                      <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {sec.status === 'EXECUTED IN SIMULATION' ? (lang === 'HI' ? 'निष्पादित' : 'EXECUTED') : (lang === 'HI' ? 'परामर्श' : 'ADVISORY')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Top Contributing Factors */}
        <div>
          <div className="text-xs sm:text-sm font-bold text-[#475569] uppercase tracking-wider mb-2.5 flex items-center space-x-2">
            <Info size={16} className="text-slate-500" />
            <span>{lang === 'HI' ? 'प्रमुख योगदान कारक' : 'TOP CONTRIBUTING FACTORS'}</span>
          </div>
          <div className="space-y-2">
            {contributingFactors.slice(0, 3).map((factor, idx) => (
              <div
                key={idx}
                className="flex items-start space-x-3 text-sm sm:text-base text-[#0F2942] font-semibold bg-[#F8FAFC] p-3.5 sm:p-4 rounded-xl border border-[#CBD5E1] shadow-xs"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                <span className="leading-snug">{factor}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
