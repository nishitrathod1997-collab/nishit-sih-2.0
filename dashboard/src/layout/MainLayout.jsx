import { useState, useEffect, useRef } from 'react';
import { Shield, Bell, ChevronDown, Activity, Globe, Eye, Download, CheckCircle2, ChevronRight, Clock, UserCheck, LayoutDashboard, TrafficCone, Video, LineChart, Landmark, MapPin, RefreshCw, Truck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useSimulation } from '../context/SimulationContext';

const MainLayout = ({ children, currentPage = 'dashboard', onNavigate }) => {
  const [timeString, setTimeString] = useState('');
  const [dateString, setDateString] = useState('');
  const { lang, setLang } = useLanguage();
  const simContext = useSimulation();
  const selectedZone = simContext?.selectedZone || 'Mumbai BKC Corridor — Jn 04';
  const switchZone = simContext?.switchZone;
  const zoneNotification = simContext?.zoneNotification;

  const [fontSizeClass, setFontSizeClass] = useState(() => {
    try {
      return localStorage.getItem('stms_font_size') || 'font-size-normal';
    } catch {
      return 'font-size-normal';
    }
  });
  const [isZoneMenuOpen, setIsZoneMenuOpen] = useState(false);

  const zoneMenuRef = useRef(null);

  // Sync font size class to document.documentElement for universal rem scaling
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('font-size-sm', 'font-size-normal', 'font-size-lg');
    root.classList.add(fontSizeClass);
    try {
      localStorage.setItem('stms_font_size', fontSizeClass);
    } catch {
      // ignore storage error
    }
  }, [fontSizeClass]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
      setDateString(now.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle click outside to close dropdown menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (zoneMenuRef.current && !zoneMenuRef.current.contains(event.target)) {
        setIsZoneMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { id: 'dashboard', label: lang === 'HI' ? 'डैशबोर्ड' : 'Dashboard', icon: LayoutDashboard },
    { id: 'logistics-simulation', label: lang === 'HI' ? 'लॉजिस्टिक्स व माल ढुलाई' : 'Logistics & Freight', icon: Truck },
    { id: 'traffic-intelligence', label: lang === 'HI' ? 'कैमरा एआई ग्रिड' : 'Camera AI Grid', icon: Video },
    { id: 'analytics', label: lang === 'HI' ? 'शहर एनालिटिक्स व कार्बन' : 'City Analytics & Carbon', icon: LineChart },
    { id: 'about', label: lang === 'HI' ? 'हमारे बारे में' : 'About Us', icon: Landmark }
  ];

  const zones = [
    'Mumbai BKC Corridor — Jn 04',
    'Pune Shivaji Nagar — Node 02'
  ];

  return (
    <div className={`min-h-screen flex flex-col font-sans ${fontSizeClass}`} style={{ backgroundColor: '#F4F6F9', color: '#0A1F44' }}>
      {/* 1. National Tricolor Strip */}
      <div className="gov-tricolor-strip" style={{ height: '4px' }} />

      {/* 2. GIGW Top Government Utility Bar (Spacious, Clear Hierarchy) */}
      <div className="bg-[#0A1F44] text-slate-200 text-xs py-2 px-4 sm:px-8 border-b border-[#1E4D8C]/40 select-none">
        <div className="max-w-[1520px] mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Left: Ministry Identification */}
          <div className="flex items-center space-x-3 text-slate-300">
            <span className="font-bold text-[#F5A623] text-xs sm:text-sm">भारत सरकार</span>
            <span className="text-slate-500">|</span>
            <span className="font-semibold text-slate-100 hidden sm:inline">GOVERNMENT OF INDIA</span>
            <span className="text-slate-500 hidden sm:inline">•</span>
            <span className="text-slate-300 font-medium hidden md:inline">सड़क परिवहन एवं राजमार्ग मंत्रालय (MoRTH)</span>
          </div>

          {/* Right: Accessibility & Language */}
          <div className="flex items-center space-x-4">
            {/* Language Toggle */}
            <button
              onClick={() => setLang(prev => prev === 'EN' ? 'HI' : 'EN')}
              className="flex items-center space-x-1.5 text-slate-200 hover:text-white px-2.5 py-1 rounded-md border border-slate-700 bg-slate-800/90 cursor-pointer text-xs font-bold transition hover:bg-slate-700"
              title="Toggle Language"
            >
              <Globe size={13} className="text-[#F5A623]" />
              <span>{lang === 'EN' ? 'हिन्दी' : 'English'}</span>
            </button>

            {/* GIGW Font Size Accessibility Controls */}
            <div className="flex items-center space-x-1.5 bg-slate-800/90 px-2.5 py-1 rounded-md border border-slate-700 text-xs font-bold">
              <button
                onClick={() => setFontSizeClass('font-size-sm')}
                className={`px-1 hover:text-[#F5A623] cursor-pointer transition ${fontSizeClass === 'font-size-sm' ? 'text-[#F5A623] font-black' : 'text-slate-400'}`}
                title={lang === 'HI' ? 'छोटा फ़ॉन्ट आकार (A-)' : 'Decrease Font Size (A-)'}
                aria-label={lang === 'HI' ? 'छोटा फ़ॉन्ट आकार' : 'Decrease Font Size'}
              >
                A-
              </button>
              <span className="text-slate-600">|</span>
              <button
                onClick={() => setFontSizeClass('font-size-normal')}
                className={`px-1 hover:text-[#F5A623] cursor-pointer transition ${fontSizeClass === 'font-size-normal' ? 'text-[#F5A623] font-black' : 'text-slate-400'}`}
                title={lang === 'HI' ? 'सामान्य फ़ॉन्ट आकार (A)' : 'Standard Font Size (A)'}
                aria-label={lang === 'HI' ? 'सामान्य फ़ॉन्ट आकार' : 'Standard Font Size'}
              >
                A
              </button>
              <span className="text-slate-600">|</span>
              <button
                onClick={() => setFontSizeClass('font-size-lg')}
                className={`px-1 hover:text-[#F5A623] cursor-pointer transition ${fontSizeClass === 'font-size-lg' ? 'text-[#F5A623] font-black' : 'text-slate-400'}`}
                title={lang === 'HI' ? 'बड़ा फ़ॉन्ट आकार (A+)' : 'Increase Font Size (A+)'}
                aria-label={lang === 'HI' ? 'बड़ा फ़ॉन्ट आकार' : 'Increase Font Size'}
              >
                A+
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Official Ministry Portal Main Masthead (Spacious, Un-congested, Dignified) */}
      <header className="bg-white border-b border-[#E2E8F0] shadow-xs sticky top-0 z-50">
        <div className="max-w-[1520px] mx-auto px-4 sm:px-8 py-3.5">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            
            {/* Left: MARG-DRISHTI Official Logo & Ministry Branding */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* MARG-DRISHTI Logo */}
              <div
                className="h-13 sm:h-14 w-auto flex items-center justify-center cursor-pointer select-none rounded-xl overflow-hidden bg-white border border-slate-200/90 shadow-xs hover:border-[#1E4D8C] transition p-0.5 flex-shrink-0"
                onClick={() => onNavigate && onNavigate('dashboard')}
                title="मार्ग-दृष्टि • MARG-DRISHTI"
              >
                <img
                  src="/marg_drishti_logo.jpg"
                  alt="MARG-DRISHTI Logo"
                  className="h-full w-auto object-contain"
                />
              </div>

              {/* Ministry Titles with Clean Hierarchy */}
              <div className="cursor-pointer select-none" onClick={() => onNavigate && onNavigate('dashboard')}>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-black text-lg sm:text-xl tracking-tight text-[#0A1F44] leading-snug">
                    {lang === 'HI' ? 'मार्ग-दृष्टि (MARG-DRISHTI)' : 'MARG-DRISHTI'}
                  </h1>
                </div>
                <p className="text-xs text-[#475569] font-medium mt-0.5 flex flex-wrap items-center gap-2">
                  <span>{lang === 'HI' ? 'राष्ट्रीय शहरी परिवहन नियंत्रण • सड़क परिवहन एवं राजमार्ग मंत्रालय' : 'National Urban Transport Control • Ministry of Road Transport & Highways'}</span>
                </p>
              </div>
            </div>

            {/* Right: Corridor Selector + Live Clock */}
            <div className="flex items-center flex-wrap gap-4 w-full lg:w-auto justify-between lg:justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
              {/* Corridor / Zone Selector Dropdown */}
              <div className="relative pr-4 lg:border-r border-[#E2E8F0]" ref={zoneMenuRef}>
                <button
                  onClick={() => setIsZoneMenuOpen(prev => !prev)}
                  className="flex items-center space-x-2 px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-slate-100 text-xs font-bold text-[#0A1F44] transition shadow-xs cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="truncate max-w-[190px]">
                    {lang === 'HI' && selectedZone.includes('Mumbai BKC')
                      ? 'मुंबई बीकेसी कॉरिडोर — Jn 04'
                      : lang === 'HI' && selectedZone.includes('Pune Shivaji')
                        ? 'पुणे शिवाजी नगर — Node 02'
                        : selectedZone}
                  </span>
                  <ChevronDown size={14} className="text-slate-500" />
                </button>

                {isZoneMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-xl shadow-xl py-1.5 z-50 bg-white border border-[#E2E8F0]">
                    <div className="px-3.5 py-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      {lang === 'HI' ? 'सक्रिय स्मार्ट सिटी कॉरिडोर' : 'Active Smart City Corridors'}
                    </div>
                    {zones.map((zone) => {
                      const zoneLabel = lang === 'HI' && zone.includes('Mumbai BKC')
                        ? 'मुंबई बीकेसी कॉरिडोर — Jn 04'
                        : lang === 'HI' && zone.includes('Pune Shivaji')
                          ? 'पुणे शिवाजी नगर — Node 02'
                          : zone;
                      return (
                        <button
                          key={zone}
                          onClick={() => {
                            if (switchZone) {
                              switchZone(zone);
                            }
                            setIsZoneMenuOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2.5 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                            selectedZone === zone ? 'bg-[#0F2C59]/10 text-[#0F2C59] font-bold' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <MapPin size={12} className={selectedZone === zone ? 'text-[#FF671F]' : 'text-slate-400'} />
                            <span>{zoneLabel}</span>
                          </div>
                          {selectedZone === zone && <CheckCircle2 size={14} className="text-[#0F2C59]" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. Live Indian Standard Time (IST) Clock */}
              <div className="flex flex-col text-right leading-tight select-none">
                <div className="flex items-center space-x-1.5 text-xs font-black text-[#0A1F44] font-mono">
                  <Clock size={13} className="text-[#0F2C59]" />
                  <span>{timeString}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-semibold mt-0.5">{dateString} (IST)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Official Ministry Horizontal Navigation Bar (Spacious & Clean) */}
        <div className="bg-[#0A1F44] border-t border-[#1E4D8C]">
          <div className="max-w-[1520px] mx-auto px-4 sm:px-8">
            <nav className="flex space-x-2 overflow-x-auto py-1 no-scrollbar">
              {navItems.map((item) => {
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate && onNavigate(item.id)}
                    className={`flex items-center space-x-2 px-5 py-2.5 rounded-t-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-[#0A1F44] shadow-sm border-t-2 border-[#F5A623]'
                        : 'text-slate-200 hover:bg-[#163A6B]/60 hover:text-white'
                    }`}
                  >
                    <item.icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* 5. Main Content Area */}
      <main className="flex-1 w-full py-6">
        {zoneNotification && (
          <div className="max-w-[1520px] mx-auto px-4 sm:px-8 mb-4">
            <div className="bg-[#0A1F44] border-l-4 border-[#FF671F] text-white px-4 py-2.5 rounded-lg shadow-md flex items-center justify-between text-xs font-bold animate-fadeIn">
              <div className="flex items-center space-x-2">
                <RefreshCw size={14} className="text-[#F5A623] animate-spin" />
                <span>{zoneNotification}</span>
              </div>
              <span className="text-[10px] font-mono text-slate-300 uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded">
                Telemetry Reset
              </span>
            </div>
          </div>
        )}
        {children}
      </main>

      {/* 6. Government of India Footer */}
      <footer className="mt-auto bg-[#0A1F44] text-slate-400 border-t border-[#1E4D8C]/60 py-6 text-xs">
        <div className="max-w-[1520px] mx-auto px-4 sm:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-white border border-[#1E4D8C]/60 flex items-center justify-center p-0.5 overflow-hidden flex-shrink-0 shadow-xs">
                <img src="/marg_drishti_logo.jpg" alt="MARG-DRISHTI Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="font-bold text-slate-200">
                  {lang === 'HI' ? 'मार्ग-दृष्टि (MARG-DRISHTI) • राष्ट्रीय सूचना विज्ञान केंद्र (NIC) पोर्टल' : 'MARG-DRISHTI • National Informatics Centre (NIC) Portal'}
                </span>
                <p className="text-[11px] text-slate-400">
                  {lang === 'HI' ? 'सड़क परिवहन एवं राजमार्ग मंत्रालय (MoRTH), भारत सरकार' : 'Ministry of Road Transport & Highways (MoRTH), Government of India'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-300">
              <span className="px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700">{lang === 'HI' ? 'GIGW अनुपालन' : 'GIGW Compliant'}</span>
              <span className="px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700">{lang === 'HI' ? 'NCAP कार्बन ऑडिटेड' : 'NCAP Carbon Audited'}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
            <div>
              {lang === 'HI'
                ? '© 2026 भारत सरकार • सामग्री स्वामित्व एवं रखरखाव MoRTH एकीकृत कमान एवं नियंत्रण केंद्र द्वारा'
                : '© 2026 Government of India • Content Owned & Maintained by MoRTH Integrated Command & Control Center.'}
            </div>
            <div>
              {lang === 'HI'
                ? 'स्मार्ट गतिशीलता व विकसित भारत @ 2047 के लिए संकल्पित'
                : 'Designed for Smart Mobility & Viksit Bharat @ 2047'}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;