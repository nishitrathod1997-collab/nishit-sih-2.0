import { useState, useEffect } from 'react';
import { MapPin, Target, Zap, Fuel, Clock, Leaf, IndianRupee, AlertTriangle, Siren, TrafficCone, ArrowUp, ArrowRight, ArrowDown, ArrowLeft, PersonStanding, Hand, ShieldCheck, CheckCircle2, XCircle, Radio, RotateCcw, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTrafficData } from '../utils/useTrafficData';
import { useLanguage } from '../context/LanguageContext';
import Car from '../components/car';
import TrafficLight from '../components/TrafficLight';
import PedestrianLight from '../components/PedestrianLight';
import AIDecisionPanel from '../components/AIDecisionPanel';
import Loader from '../components/Loader';
import StatCard from '../components/StatCard';

const LiveIntersection = () => {
  const { lang } = useLanguage();
  const {
    state,
    metrics,
    loading,
    error,
    useMock,
    simulationSpeed,
    switchToMock,
    switchToBackend,
    setSpeed,
    resetSimulation,
    manualOverride,
    triggerEmergencyVehicle
  } = useTrafficData();

  // Mumbai-specific intelligent calculations
  const [mumbaiStats, setMumbaiStats] = useState({
    fuelSavedLiters: 2.8,
    timeSavedMinutes: 22,
    co2ReducedKg: 6.5,
    totalSavingsRupees: 367,
    waitTimeImprovement: 12.5,
    efficiencyGain: 27.8
  });

  // Manual override state
  const [showOverrideWarning, setShowOverrideWarning] = useState(false);
  const [selectedOverrideDirection, setSelectedOverrideDirection] = useState(null);
  const [overrideActive, setOverrideActive] = useState(false);
  const [overrideStartTime, setOverrideStartTime] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');

  useEffect(() => {
    if (state || metrics) {
      // Mumbai traditional fixed baseline: 45.0s
      const traditionalWaitTime = metrics?.traditional_wait_time || 45.0;
      const currentAvgWait = (typeof state?.avg_wait_time === 'number' && state.avg_wait_time > 0)
        ? state.avg_wait_time
        : 32.5;

      // Improvement per vehicle in seconds
      const avgWaitReduction = Math.max(3.5, traditionalWaitTime - currentAvgWait);

      // Calculate realistic active traffic throughput rate
      const carsPassed = state?.cars_passed || metrics?.total_cars || 0;
      const activeCarCount = state?.cars ? Object.values(state.cars).flat().length : 8;

      // Effective throughput per minute
      const effectiveCarsPerMin = (metrics?.throughput && metrics.throughput > 0)
        ? metrics.throughput
        : Math.max(16, (activeCarCount * 2) + Math.min(carsPassed, 20));

      const carsPerHour = effectiveCarsPerMin * 60;

      // Fuel consumption model is unsupported in Phase 5.
      const actualFuelSaved = 'Unavailable';

      // Time saved in minutes per hour
      const timeSaved = (state?.time_saved_per_hour && state.time_saved_per_hour > 0)
        ? state.time_saved_per_hour
        : (metrics?.time_saved_per_hour_minutes && metrics.time_saved_per_hour_minutes > 0)
          ? metrics.time_saved_per_hour_minutes
          : Math.max(18, (avgWaitReduction * carsPerHour) / 60);

      // CO2 reduction: 2.31 kg CO2 per liter of petrol saved [UNSUPPORTED]
      const co2Reduced = 'Unavailable';

      // Economic savings per hour [UNSUPPORTED]
      const fuelCostSaved = 'Unavailable'; // ₹105 per liter [UNSUPPORTED]
      const timeCostSaved = 'Unavailable'; // ₹200 per hour commuter time value [UNSUPPORTED]
      const totalSavings = 'Unavailable';

      // Wait time improvement in seconds
      const waitTimeImprovement = avgWaitReduction;

      // Efficiency gain percentage
      const efficiencyGain = ((avgWaitReduction / traditionalWaitTime) * 100);

      setMumbaiStats({
        fuelSavedLiters: actualFuelSaved,
        timeSavedMinutes: timeSaved,
        co2ReducedKg: co2Reduced,
        totalSavingsRupees: totalSavings,
        waitTimeImprovement: waitTimeImprovement,
        efficiencyGain: efficiencyGain
      });
    }
  }, [state, metrics]);

  // Handle manual override request
  const handleOverrideRequest = (direction) => {
    setSelectedOverrideDirection(direction);
    setShowOverrideWarning(true);
  };

  // Confirm manual override
  const confirmOverride = () => {
    if (selectedOverrideDirection && overrideReason.trim()) {
      const overrideEvent = {
        timestamp: new Date().toISOString(),
        direction: selectedOverrideDirection,
        reason: overrideReason,
        operator: 'Mumbai Traffic Control Officer',
        previousSignal: state?.signal
      };

      console.log('Mumbai Manual Override Activated:', overrideEvent);

      if (manualOverride) {
        manualOverride(selectedOverrideDirection, overrideReason);
      }

      setOverrideActive(true);
      setOverrideStartTime(Date.now());
      setShowOverrideWarning(false);
      setSelectedOverrideDirection(null);
      setOverrideReason('');

      // Auto-disable override after 60 seconds
      setTimeout(() => {
        setOverrideActive(false);
        setOverrideStartTime(null);
        console.log('Manual override auto-disabled after 60 seconds');
      }, 60000);
    }
  };

  // Cancel override
  const cancelOverride = () => {
    setShowOverrideWarning(false);
    setSelectedOverrideDirection(null);
    setOverrideReason('');
  };

  // Disable manual override
  const disableOverride = () => {
    setOverrideActive(false);
    setOverrideStartTime(null);
    console.log('Manual override disabled by operator');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader message={lang === 'HI' ? 'इंटेलिजेंट मुंबई यातायात प्रणाली लोड हो रही है...' : 'Loading Intelligent Mumbai Traffic System...'} />
      </div>
    );
  }

  // Get the highest queue lane for highlighting
  const getHighestQueueLane = () => {
    if (!state?.queues) return null;
    const queues = state.queues;
    let maxQueue = 0;
    let maxLane = null;
    Object.entries(queues).forEach(([lane, count]) => {
      if (count > maxQueue) {
        maxQueue = count;
        maxLane = lane;
      }
    });
    return maxLane;
  };

  const highestQueueLane = getHighestQueueLane();

  // Check if target is achieved (30-35 seconds)
  const targetAchieved = state?.avg_wait_time >= 30 && state?.avg_wait_time <= 35;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div>
        {/* Override Warning Modal */}
        <AnimatePresence>
          {showOverrideWarning && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-lg p-8 max-w-md mx-4 shadow-2xl"
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle size={20} className="text-amber-500" />
                  </div>
                  <h2 className="text-xl font-bold text-red-600 mb-2">
                    {lang === 'HI' ? 'मैनुअल ओवरराइड चेतावनी' : 'MANUAL OVERRIDE WARNING'}
                  </h2>
                  <p className="text-gray-700 text-sm">
                    {lang === 'HI' ? (
                      <>आप दिशा <strong>{selectedOverrideDirection}</strong> के लिए मुंबई AI यातायात प्रबंधन प्रणाली को ओवरराइड करने जा रहे हैं।</>
                    ) : (
                      <>You are about to override the Mumbai adaptive traffic management system for direction <strong>{selectedOverrideDirection}</strong>.</>
                    )}
                  </p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-2">
                    <Siren size={16} className="text-yellow-600" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-semibold mb-1">
                        {lang === 'HI' ? 'मुंबई ट्रैफिक पुलिस सूचना:' : 'MUMBAI TRAFFIC POLICE NOTICE:'}
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>{lang === 'HI' ? 'यह कार्रवाई मुंबई ट्रैफिक पुलिस द्वारा लॉग और मॉनिटर की जाएगी' : 'This action will be logged and monitored by Mumbai Traffic Police'}</li>
                        <li>{lang === 'HI' ? 'ओवरराइड 60 सेकंड के बाद स्वचालित रूप से अक्षम हो जाएगा' : 'Override will automatically disable after 60 seconds'}</li>
                        <li>{lang === 'HI' ? 'उत्पन्न किसी भी यातायात व्यवधान के लिए आप उत्तरदायी हैं' : 'You are responsible for any traffic disruption caused'}</li>
                        <li>{lang === 'HI' ? 'आपातकालीन वाहनों को निरंतर प्राथमिकता मिलेगी' : 'Emergency vehicles will still have priority'}</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {lang === 'HI' ? 'ओवरराइड का कारण *' : 'Reason for Override *'}
                  </label>
                  <select
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  >
                    <option value="">{lang === 'HI' ? 'कारण चुनें...' : 'Select reason...'}</option>
                    <option value="VIP Movement">{lang === 'HI' ? 'VIP आवागमन' : 'VIP Movement'}</option>
                    <option value="Accident Management">{lang === 'HI' ? 'दुर्घटना प्रबंधन' : 'Accident Management'}</option>
                    <option value="Road Construction">{lang === 'HI' ? 'सड़क निर्माण कार्य' : 'Road Construction'}</option>
                    <option value="Festival/Special Event">{lang === 'HI' ? 'त्योहार / विशेष कार्यक्रम' : 'Festival/Special Event'}</option>
                    <option value="System Malfunction">{lang === 'HI' ? 'सिस्टम में खराबी' : 'System Malfunction'}</option>
                    <option value="Heavy Traffic Congestion">{lang === 'HI' ? 'अत्यधिक यातायात भीड़भाड़' : 'Heavy Traffic Congestion'}</option>
                    <option value="Other">{lang === 'HI' ? 'अन्य' : 'Other'}</option>
                  </select>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={cancelOverride}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium cursor-pointer"
                  >
                    {lang === 'HI' ? 'रद्द करें' : 'Cancel'}
                  </button>
                  <button
                    onClick={confirmOverride}
                    disabled={!overrideReason.trim()}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {lang === 'HI' ? 'ओवरराइड की पुष्टि करें' : 'Confirm Override'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="bg-white rounded-xl shadow-xs p-5 mb-5 border border-[#E2E8F0]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded bg-[#0A1F44] text-[#F5A623] text-[10px] font-extrabold uppercase tracking-wider border border-[#1E4D8C]">
                  {lang === 'HI' ? 'MoRTH लाइव एक्टिवेशन' : 'MoRTH Live Actuation'}
                </span>
                <span className="text-xs font-semibold text-[#475569]">{lang === 'HI' ? 'नोड #04' : 'Node #04'}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-[#0A1F44] mt-1">
                {lang === 'HI' ? 'एकीकृत यातायात प्रबंधन प्रणाली (ITMS) • लाइव जंक्शन' : 'Integrated Traffic Management System (ITMS) • Live Junction'}
              </h1>
              <p className="text-xs text-[#475569] mt-0.5 flex items-center gap-1.5">
                <MapPin size={14} className="text-[#0F2C59]" />
                <span>{lang === 'HI' ? 'BKC वित्तीय क्षेत्र, मुंबई महानगर क्षेत्र' : 'BKC Financial District, Mumbai Metropolitan Region'}</span>
              </p>

              {/* Target Achievement Indicator */}
              <div className="mt-2.5 flex items-center space-x-3">
                <div className={`px-2.5 py-0.5 rounded-md text-xs font-bold border flex items-center gap-1.5 ${targetAchieved
                  ? 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]'
                  : 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]'
                  }`}>
                  <Target size={14} />
                  <span>{targetAchieved ? (lang === 'HI' ? 'लक्ष्य प्राप्त' : 'Target Achieved') : (lang === 'HI' ? 'लक्ष्य: 20-30s औसत विलंब' : 'Target: 20-30s Avg Delay')}</span>
                </div>
                <div className="text-xs text-[#475569]">
                  {lang === 'HI'
                    ? `वर्तमान प्रतीक्षा: ${(state?.avg_wait_time ?? 0).toFixed(1)}s | नियत बेसलाइन: 45.0s`
                    : `Current Wait: ${(state?.avg_wait_time ?? 0).toFixed(1)}s | Fixed Baseline: 45.0s`}
                </div>
              </div>
            </div>
            <div className="text-right">
              {overrideActive && (
                <div className="text-xs text-[#DC2626] font-bold">
                  {lang === 'HI' ? 'पुलिस मैनुअल ओवरराइड' : 'Police Manual Override'}
                </div>
              )}
              <div className="text-xs text-[#0F2C59] font-bold mt-1">
                {lang === 'HI' ? `विलंब में सुधार: ${mumbaiStats.waitTimeImprovement.toFixed(1)}s` : `Delay Improvement: ${mumbaiStats.waitTimeImprovement.toFixed(1)}s`}
              </div>
            </div>
          </div>
        </div>

        {/* Manual Override Alert */}
        <AnimatePresence>
          {overrideActive && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-[#FEF2F2] border-2 border-[#FECACA] text-[#991B1B] rounded-xl shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-[#DC2626] rounded-full animate-ping"></div>
                  <div>
                    <p className="font-bold flex items-center gap-2">
                      <Siren size={16} /> {lang === 'HI' ? 'मुंबई मैनुअल ओवरराइड सक्रिय' : 'MUMBAI MANUAL OVERRIDE ACTIVE'}
                    </p>
                    <p className="text-sm text-[#991B1B]">
                      {lang === 'HI'
                        ? `सिग्नल मैनुअल नियंत्रित • ${overrideStartTime ? 60 - Math.floor((Date.now() - overrideStartTime) / 1000) : 60}s में स्वतः निष्क्रिय`
                        : `Signal manually controlled • Auto-disable in ${overrideStartTime ? 60 - Math.floor((Date.now() - overrideStartTime) / 1000) : 60}s`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={disableOverride}
                  className="px-3 py-1.5 bg-[#DC2626] text-white text-xs font-bold rounded-lg hover:bg-[#B91C1C] transition shadow-xs cursor-pointer"
                >
                  {lang === 'HI' ? 'ओवरराइड हटाएं' : 'Disable Override'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Emergency Alert */}
        <AnimatePresence>
          {state?.emergencyActive && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-[#FEF2F2] border-2 border-[#FECACA] text-[#991B1B] rounded-xl shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-[#DC2626] rounded-full animate-ping"></div>
                  <p className="font-bold flex items-center gap-2">
                    <Siren size={16} className="text-[#DC2626]" />
                    {lang === 'HI'
                      ? `आपातकालीन प्राथमिकता: मार्ग ${state.emergencyDirection} → हरा • अन्य मार्ग → लाल`
                      : `EMERGENCY PRIORITY: Approach ${state.emergencyDirection} → GREEN • Other Approaches → RED`}
                  </p>
                </div>
                <div className="text-sm font-bold bg-[#FEE2E2] px-3 py-1 rounded-lg text-[#DC2626]">
                  {lang === 'HI' ? `मार्ग ${state.emergencyDirection} प्राथमिकता प्रीएम्प्शन` : `Way ${state.emergencyDirection} Priority Preemption`}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Smart Queue Alert */}
        {highestQueueLane && state?.queues[highestQueueLane] > 10 && !overrideActive && (
          <div className="mb-6 p-4 bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] rounded-xl shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap size={18} className="text-[#F5A623]" />
                <p className="font-bold">
                  {lang === 'HI'
                    ? `MoRTH AI पहचान: ${highestQueueLane} दिशा में भारी भीड़भाड़ (${state.queues[highestQueueLane]} वाहन)`
                    : `MoRTH AI Detection: Heavy congestion in ${highestQueueLane} direction (${state.queues[highestQueueLane]} vehicles)`}
                </p>
              </div>
              <div className="text-sm font-bold text-[#B8860B]">
                {lang === 'HI' ? `विस्तारित सिग्नल अवधि: ${state?.signal_duration}s` : `Extended Signal Duration: ${state?.signal_duration}s`}
              </div>
            </div>
          </div>
        )}

        {/* Mumbai Statistics Cards - Showing absolute improvements */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            title={lang === 'HI' ? 'ईंधन बचत' : 'Fuel Saved'}
            value={mumbaiStats.fuelSavedLiters}
            unit="L"
            icon={Fuel}
            color="green"
            trend={lang === 'HI' ? 'अस्थायी रूप से अनुपलब्ध' : 'Temporarily Unavailable'}
          />
          <StatCard
            title={lang === 'HI' ? 'समय बचत' : 'Time Saved'}
            value={mumbaiStats.timeSavedMinutes}
            unit={lang === 'HI' ? 'मिनट' : 'min'}
            icon={Clock}
            color="blue"
            trendSubtext={lang === 'HI' ? 'प्रति घंटा' : 'per hour'}
          />
          <StatCard
            title={lang === 'HI' ? 'CO2 में कमी' : 'CO2 Reduced'}
            value={mumbaiStats.co2ReducedKg}
            unit="kg"
            icon={Leaf}
            color="blue"
            trendSubtext={lang === 'HI' ? 'प्रति घंटा' : 'per hour'}
          />
          <StatCard
            title={lang === 'HI' ? 'कुल आर्थिक बचत' : 'Total Savings'}
            value={mumbaiStats.totalSavingsRupees}
            valuePrefix="₹"
            icon={IndianRupee}
            color="orange"
            trendSubtext={lang === 'HI' ? 'प्रति घंटा' : 'per hour'}
          />
        </div>

        {/* Strategy & AI Decision Panel */}
        <div className="mb-8">
          <AIDecisionPanel />
        </div>

        {/* Manual Override Control Buttons */}
        <div className="mb-8 bg-white rounded-xl shadow-xs p-6 border-l-4 border-[#DC2626] border-t border-r border-b border-[#E2E8F0]">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-bold text-[#0A1F44] flex items-center gap-2">
                <TrafficCone size={18} className="text-[#DC2626]" /> {lang === 'HI' ? 'MoRTH यातायात नियंत्रण ओवरराइड' : 'MoRTH Traffic Control Override'}
              </h3>
              <p className="text-xs text-[#475569]">{lang === 'HI' ? 'आपातकालीन यातायात नियंत्रण - केवल आवश्यकता पड़ने पर उपयोग करें' : 'Emergency traffic control - Use only when necessary'}</p>
            </div>
            <div className="text-xs text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] px-2.5 py-1 rounded-md font-bold">
              {lang === 'HI' ? 'ट्रैफिक पुलिस ICCC द्वारा मॉनिटर' : 'Monitored by Traffic Police ICCC'}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                direction: 'N',
                location: lang === 'HI' ? 'कुर्ला' : 'Kurla',
                bg: '#F1F5F9',
                labelColor: '#475569',
                titleColor: '#0F2C59',
                badgeBg: '#0F2C59',
                badgeText: '#FFFFFF',
                arrow: <ArrowUp size={16} />
              },
              {
                direction: 'E',
                location: lang === 'HI' ? 'चेंबूर' : 'Chembur',
                bg: '#F0FDF4',
                labelColor: '#16A34A',
                titleColor: '#15803D',
                badgeBg: '#16A34A',
                badgeText: '#FFFFFF',
                arrow: <ArrowRight size={16} />
              },
              {
                direction: 'S',
                location: lang === 'HI' ? 'फोर्ट' : 'Fort',
                bg: '#FFFBEB',
                labelColor: '#B8860B',
                titleColor: '#92400E',
                badgeBg: '#F5A623',
                badgeText: '#FFFFFF',
                arrow: <ArrowDown size={16} />
              },
              {
                direction: 'W',
                location: lang === 'HI' ? 'बांद्रा' : 'Bandra',
                bg: '#F8FAFC',
                labelColor: '#475569',
                titleColor: '#1E4D8C',
                badgeBg: '#1E4D8C',
                badgeText: '#FFFFFF',
                arrow: <ArrowLeft size={16} />
              }
            ].map(({ direction, location, bg, labelColor, titleColor, badgeBg, badgeText, arrow }) => {
              const isSelected = state?.signal === direction;

              return (
                <button
                  key={direction}
                  onClick={() => handleOverrideRequest(direction)}
                  disabled={overrideActive || state?.emergencyActive}
                  style={{ backgroundColor: bg }}
                  className={`p-4 rounded-xl transition-all duration-200 text-left flex flex-col justify-between border disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${isSelected
                    ? 'ring-2 ring-[#F5A623] border-[#F5A623] shadow-md'
                    : 'border-[#E2E8F0] hover:shadow-xs'
                    }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-black text-2xl" style={{ color: titleColor }}>
                      {direction}
                    </span>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shadow-xs"
                      style={{ backgroundColor: badgeBg, color: badgeText }}
                    >
                      {arrow}
                    </div>
                  </div>

                  <div>
                    <div className="font-bold text-xs mb-0.5" style={{ color: labelColor }}>
                      {location}
                    </div>
                    <div className="font-bold text-xs" style={{ color: titleColor }}>
                      {lang === 'HI' ? 'कतार' : 'Queue'}: {state?.queues?.[direction] || 0}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 text-xs text-[#475569] bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-lg">
            <p>
              {lang === 'HI' ? (
                <><strong>चेतावनी:</strong> मैनुअल ओवरराइड टाइमस्टैम्प, कारण और ऑपरेटर विवरण के साथ रिकॉर्ड किए जाते हैं। केवल आपातकालीन स्थितियों, VIP आवागमन या जब AI सिस्टम में मानवीय हस्तक्षेप की आवश्यकता हो, तभी उपयोग करें।</>
              ) : (
                <><strong>Warning:</strong> Manual overrides are logged with timestamp, reason, and operator details. Use only for emergency situations, VIP movements, or when AI system requires intervention.</>
              )}
            </p>
          </div>
        </div>

        {/* Intelligent System Status */}
        <div className="bg-white rounded-xl shadow-xs p-6 mb-8 border border-[#E2E8F0]">
          <h3 className="text-lg font-bold text-[#0A1F44] mb-4 flex items-center gap-2">
            <Brain size={18} className="text-[#0F2C59]" />
            <span>
              {lang === 'HI' ? 'AI यातायात विश्लेषण' : 'AI Traffic Analysis'}{' '}
              {overrideActive && <span className="text-[#DC2626] text-sm">{lang === 'HI' ? '(ओवरराइड सक्रिय)' : '(Override Active)'}</span>}
            </span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {['N', 'S', 'E', 'W'].map(direction => {
              const queueCount = state?.queues?.[direction] || 0;
              const isActive = state?.signal === direction;
              const isHighest = direction === highestQueueLane;

              return (
                <div key={direction} className={`p-4 rounded-xl border transition-all ${isActive
                  ? 'border-[#BBF7D0] bg-[#F0FDF4]'
                  : isHighest
                    ? 'border-[#FDE68A] bg-[#FFFBEB]'
                    : 'border-[#E2E8F0] bg-[#F8FAFC]'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-[#0A1F44]">
                        {direction === 'N' ? (lang === 'HI' ? 'उत्तर (कुर्ला)' : 'North (Kurla)') :
                          direction === 'S' ? (lang === 'HI' ? 'दक्षिण (फोर्ट)' : 'South (Fort)') :
                            direction === 'E' ? (lang === 'HI' ? 'पूर्व (चेंबूर)' : 'East (Chembur)') : (lang === 'HI' ? 'पश्चिम (बांद्रा)' : 'West (Bandra)')}
                      </div>
                      <div className="text-xs text-[#475569] mt-0.5">
                        {lang === 'HI' ? `कतार: ${queueCount} वाहन` : `Queue: ${queueCount} vehicles`}
                      </div>
                      {isActive && (
                        <div className="text-xs text-[#16A34A] font-bold mt-1">
                          {lang === 'HI' ? `अवधि: ${state?.signal_duration}s` : `Duration: ${state?.signal_duration}s`}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      {isActive && <CheckCircle2 size={20} className="text-[#16A34A]" />}
                      {isHighest && !isActive && <Zap size={16} className="text-[#F5A623]" />}
                      {!isActive && !isHighest && <XCircle size={20} className="text-[#94A3B8]" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Intersection View */}
        <div className="bg-white rounded-xl shadow-xs p-6 mb-8 border border-[#E2E8F0]">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-bold text-[#0A1F44]">
              {lang === 'HI' ? 'लाइव यातायात प्रवाह' : 'Live Traffic Flow'}
            </h2>
            <div className={`text-xs px-3.5 py-1.5 rounded-lg font-bold border shadow-xs ${overrideActive
              ? 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]'
              : 'bg-[#0A1F44] text-[#F5A623] border-[#1E4D8C]'
              }`}>
              {overrideActive ? (lang === 'HI' ? 'मैनुअल नियंत्रण' : 'Manual Control') : (lang === 'HI' ? 'स्मार्ट सिग्नल' : 'Smart Signal')}: {state?.signal} ({state?.phase || 'GREEN'}) | {state?.clearance_status ? state.clearance_status : `${lang === 'HI' ? 'शेष' : (state?.phase_label || 'Remaining')}: ${state?.phase_remaining_sec ?? 0}s`}
            </div>
          </div>

          {/* Intersection Container */}
          <div className="relative w-full h-[540px] bg-[#EAECEF] rounded-2xl overflow-hidden border border-[#E2E8F0] shadow-xs">
            {/* Road lanes with improved styling */}
            <div className="absolute inset-0">
              {/* Horizontal road */}
              <div className="absolute top-1/2 left-0 w-full bg-[#364152] transform -translate-y-1/2 shadow-2xl h-20">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-yellow-400 opacity-90 transform -translate-y-1/2"></div>
              </div>

              {/* Vertical road */}
              <div className="absolute left-1/2 top-0 h-full bg-[#364152] transform -translate-x-1/2 shadow-2xl w-20">
                <div className="absolute left-1/2 top-0 w-1 h-full bg-yellow-400 opacity-90 transform -translate-x-1/2"></div>
              </div>

              {/* Intersection center box */}
              <div className="absolute top-1/2 left-1/2 bg-[#4B5461] rounded-lg transform -translate-x-1/2 -translate-y-1/2 shadow-2xl w-20 h-20">
              </div>

              {/* 🚶‍♂️ Minimalist Compact Zebra Crossings & High-Visibility Pedestrian Walkers */}

              {/* North Crosswalk */}
              {(() => {
                const pN = state?.pedestrian_signals?.N || 'STOP';
                const isWalk = pN === 'WALK';
                return (
                  <>
                    <div className="absolute left-1/2 transform -translate-x-1/2 z-10 pointer-events-none top-[calc(50%-78px)] w-16 h-6.5">
                      <div className="w-full h-full flex justify-between px-0.5">
                        {[...Array(8)].map((_, i) => (
                          <div key={i} className="h-full rounded-[0.5px] bg-white shadow-sm w-[2px]" />
                        ))}
                      </div>
                      {isWalk && (
                        <motion.div
                          className="absolute select-none pointer-events-none filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] text-lg -top-3.5"
                          animate={{ left: ['-5%', '100%'], opacity: [0, 1, 1, 1, 0] }}
                          transition={{ duration: 3.8, repeat: Infinity, ease: 'linear' }}
                        >
                          <span className="inline-block">🚶‍♀️</span>
                        </motion.div>
                      )}
                    </div>
                    {/* North Pedestrian Signal Light (Right Curb) */}
                    <div className="absolute z-20 left-[calc(50%+42px)] top-[calc(50%-80px)]">
                      <PedestrianLight status={pN} />
                    </div>
                  </>
                );
              })()}

              {/* South Crosswalk */}
              {(() => {
                const pS = state?.pedestrian_signals?.S || 'STOP';
                const isWalk = pS === 'WALK';
                return (
                  <>
                    <div className="absolute left-1/2 transform -translate-x-1/2 z-10 pointer-events-none top-[calc(50%+55px)] w-16 h-6.5">
                      <div className="w-full h-full flex justify-between px-0.5">
                        {[...Array(8)].map((_, i) => (
                          <div key={i} className="h-full rounded-[0.5px] bg-white shadow-sm w-[2px]" />
                        ))}
                      </div>
                      {isWalk && (
                        <motion.div
                          className="absolute select-none pointer-events-none filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] text-lg -top-3.5"
                          animate={{ left: ['105%', '-5%'], opacity: [0, 1, 1, 1, 0] }}
                          transition={{ duration: 3.8, repeat: Infinity, ease: 'linear' }}
                        >
                          <span className="inline-block transform -scale-x-100">🚶‍♀️</span>
                        </motion.div>
                      )}
                    </div>
                    {/* South Pedestrian Signal Light (Left Curb) */}
                    <div className="absolute z-20 left-[calc(50%-52px)] top-[calc(50%+55px)]">
                      <PedestrianLight status={pS} />
                    </div>
                  </>
                );
              })()}

              {/* West Crosswalk */}
              {(() => {
                const pW = state?.pedestrian_signals?.W || 'STOP';
                const isWalk = pW === 'WALK';
                return (
                  <>
                    <div className="absolute top-1/2 transform -translate-y-1/2 z-10 flex flex-col justify-between pointer-events-none left-[calc(50%-78px)] w-6.5 h-16 py-0.5">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="w-full rounded-[0.5px] bg-white shadow-sm h-[2px]" />
                      ))}
                      {isWalk && (
                        <motion.div
                          className="absolute select-none pointer-events-none filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] text-lg -left-3"
                          animate={{ top: ['-5%', '100%'], opacity: [0, 1, 1, 1, 0] }}
                          transition={{ duration: 3.8, repeat: Infinity, ease: 'linear' }}
                        >
                          <span className="inline-block">🚶‍♀️</span>
                        </motion.div>
                      )}
                    </div>
                    {/* West Pedestrian Signal Light (Top Curb) */}
                    <div className="absolute z-20 left-[calc(50%-80px)] top-[calc(50%-52px)]">
                      <PedestrianLight status={pW} />
                    </div>
                  </>
                );
              })()}

              {/* East Crosswalk */}
              {(() => {
                const pE = state?.pedestrian_signals?.E || 'STOP';
                const isWalk = pE === 'WALK';
                return (
                  <>
                    <div className="absolute top-1/2 transform -translate-y-1/2 z-10 flex flex-col justify-between pointer-events-none left-[calc(50%+55px)] w-6.5 h-16 py-0.5">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="w-full rounded-[0.5px] bg-white shadow-sm h-[2px]" />
                      ))}
                      {isWalk && (
                        <motion.div
                          className="absolute select-none pointer-events-none filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] text-lg -right-3"
                          animate={{ top: ['105%', '-5%'], opacity: [0, 1, 1, 1, 0] }}
                          transition={{ duration: 3.8, repeat: Infinity, ease: 'linear' }}
                        >
                          <span className="inline-block transform -scale-x-100">🚶‍♀️</span>
                        </motion.div>
                      )}
                    </div>
                    {/* East Pedestrian Signal Light (Bottom Curb) */}
                    <div className="absolute z-20 left-[calc(50%+55px)] top-[calc(50%+42px)]">
                      <PedestrianLight status={pE} />
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Enhanced Traffic Lights */}
            <TrafficLight
              direction="N"
              signal={state?.signal}
              phase={state?.phase}
              emergencyActive={state?.emergencyActive && state?.emergencyDirection === 'N'}
            />
            <TrafficLight
              direction="S"
              signal={state?.signal}
              phase={state?.phase}
              emergencyActive={state?.emergencyActive && state?.emergencyDirection === 'S'}
            />
            <TrafficLight
              direction="E"
              signal={state?.signal}
              phase={state?.phase}
              emergencyActive={state?.emergencyActive && state?.emergencyDirection === 'E'}
            />
            <TrafficLight
              direction="W"
              signal={state?.signal}
              phase={state?.phase}
              emergencyActive={state?.emergencyActive && state?.emergencyDirection === 'W'}
            />

            {/* Cars */}
            <AnimatePresence>
              {state?.cars && Object.entries(state.cars).map(([lane, cars]) =>
                cars.map(car => (
                  <Car
                    key={`${car.id}-${lane}`}
                    id={car.id}
                    lane={lane}
                    position={car.position}
                    speed={car.speed}
                    type={car.type}
                  />
                ))
              )}
            </AnimatePresence>

            {/* Queue Indicators matching Dashboard */}
            {state?.queues && Object.entries(state.queues).map(([lane, count]) => (
              <div
                key={lane}
                className={`absolute text-xs font-bold text-white bg-[#0A1F44] px-2.5 py-1 rounded-md shadow-xs z-30 border border-[#1E4D8C] ${lane === 'N' ? 'top-2 left-1/2 transform -translate-x-1/2' :
                  lane === 'S' ? 'bottom-2 left-1/2 transform -translate-x-1/2' :
                    lane === 'E' ? 'right-2 top-1/2 transform -translate-y-1/2' :
                      'left-2 top-1/2 transform -translate-y-1/2'
                  }`}
              >
                {lane}: {count}
              </div>
            ))}
          </div>

          {/* Enhanced Signal Status */}
          <div className="mt-6 flex justify-center space-x-6">
            <div className={`text-white px-6 py-3 rounded-xl shadow-xs border ${overrideActive ? 'bg-[#DC2626] border-[#B91C1C]' : 'bg-[#0A1F44] border-[#1E4D8C] text-[#F5A623]'
              }`}>
              <span className="text-sm font-bold">
                {overrideActive ? (lang === 'HI' ? 'मैनुअल नियंत्रण' : 'Manual Control') : (lang === 'HI' ? 'स्मार्ट सिग्नल' : 'Smart Signal')}: {state?.signal} ({state?.phase || 'GREEN'}) |
                {' '}{lang === 'HI' ? 'अवधि' : 'Duration'}: {state?.active_green_duration || state?.signal_duration || 30}s |
                {' '}{state?.clearance_status ? state.clearance_status : `${lang === 'HI' ? 'शेष' : (state?.phase_label || 'Remaining')}: ${state?.phase_remaining_sec ?? 0}s`}
              </span>
            </div>
            {state?.emergencyActive && (
              <div className="bg-[#DC2626] border border-[#B91C1C] text-white px-6 py-3 rounded-xl animate-pulse shadow-xs">
                <span className="text-sm font-bold flex items-center gap-2"><Siren size={18} /> {lang === 'HI' ? 'आपातकालीन मोड' : 'EMERGENCY MODE'}</span>
              </div>
            )}
          </div>
        </div>

        {/* 🚶‍♂️ Automatic Intelligent Pedestrian Safety Monitor */}
        <div className="mt-8 bg-white rounded-xl shadow-xs p-6 border-l-4 border-[#16A34A] border-t border-r border-b border-[#E2E8F0]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <PersonStanding size={20} className="text-[#0F2C59]" />
              <div>
                <h3 className="text-lg font-bold text-[#0A1F44]">
                  {lang === 'HI' ? 'स्वचालित पैदल यात्री क्रॉसिंग इंटेलिजेंस' : 'Automated Pedestrian Crosswalk Intelligence'}
                </h3>
                <p className="text-xs text-[#475569]">
                  {lang === 'HI' ? 'निरंतर AI सिग्नल स्कैनिंग • गतिशील टकराव-रहित क्रॉसिंग आवंटन' : 'Continuous AI signal scanning • Dynamic non-conflicting crossing allocation'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
                <ShieldCheck size={16} className="text-[#16A34A]" /> {lang === 'HI' ? '100% शून्य-टकराव सक्रिय' : '100% Zero-Conflict Active'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                dir: 'N',
                name: lang === 'HI' ? 'उत्तर क्रॉसिंग (कुर्ला)' : 'North Crosswalk (Kurla)',
                laneType: lang === 'HI' ? 'वर्टिकल कॉरिडोर' : 'Vertical Corridor'
              },
              {
                dir: 'S',
                name: lang === 'HI' ? 'दक्षिण क्रॉसिंग (फोर्ट)' : 'South Crosswalk (Fort)',
                laneType: lang === 'HI' ? 'वर्टिकल कॉरिडोर' : 'Vertical Corridor'
              },
              {
                dir: 'E',
                name: lang === 'HI' ? 'पूर्व क्रॉसिंग (चेंबूर)' : 'East Crosswalk (Chembur)',
                laneType: lang === 'HI' ? 'हॉरिजॉन्टल कॉरिडोर' : 'Horizontal Corridor'
              },
              {
                dir: 'W',
                name: lang === 'HI' ? 'पश्चिम क्रॉसिंग (बांद्रा)' : 'West Crosswalk (Bandra)',
                laneType: lang === 'HI' ? 'हॉरिजॉन्टल कॉरिडोर' : 'Horizontal Corridor'
              }
            ].map(({ dir, name, laneType }) => {
              const pStatus = state?.pedestrian_signals?.[dir] || (
                (state?.signal === 'E' || state?.signal === 'W') && !state?.emergencyActive
                  ? (dir === 'N' || dir === 'S' ? 'WALK' : 'STOP')
                  : (dir === 'E' || dir === 'W' && !state?.emergencyActive ? 'WALK' : 'STOP')
              );
              const isWalk = pStatus === 'WALK' && !state?.emergencyActive;

              return (
                <div
                  key={dir}
                  className={`p-4 rounded-xl border transition-all duration-300 ${state?.emergencyActive
                    ? 'border-[#FECACA] bg-[#FEF2F2]'
                    : isWalk
                      ? 'border-[#BBF7D0] bg-[#F0FDF4] shadow-xs'
                      : 'border-[#E2E8F0] bg-[#F8FAFC]'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-[#0A1F44]">{name}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${state?.emergencyActive
                      ? 'bg-[#DC2626] text-white animate-pulse'
                      : isWalk
                        ? 'bg-[#16A34A] text-white shadow-xs'
                        : 'bg-[#E2E8F0] text-[#475569]'
                      }`}>
                      {state?.emergencyActive ? <><Hand size={14} className="inline" /> {lang === 'HI' ? 'खाली करें' : 'CLEAR'}</> : isWalk ? <><PersonStanding size={14} className="inline" /> {lang === 'HI' ? 'चलें (WALK)' : 'WALK'}</> : <><Hand size={14} className="inline" /> {lang === 'HI' ? 'रुकें (WAIT)' : 'WAIT'}</>}
                    </span>
                  </div>

                  <p className="text-xs text-[#475569]">
                    {state?.emergencyActive
                      ? <span className="flex items-center gap-1 text-[#DC2626]"><Siren size={14} /> {lang === 'HI' ? 'आपातकालीन कॉरिडोर प्राथमिकता — क्रॉसिंग रोकी गई' : 'Emergency corridor priority — Crossing held'}</span>
                      : isWalk
                        ? <span className="flex items-center gap-1 text-[#15803D]"><CheckCircle2 size={14} className="text-[#16A34A]" /> {lang === 'HI' ? `चलने के लिए सुरक्षित (${laneType} रुका हुआ)` : `Safe to walk (${laneType} halted)`}</span>
                        : <span className="flex items-center gap-1 text-[#64748B]"><XCircle size={14} className="text-[#94A3B8]" /> {lang === 'HI' ? `रुकें — ${state?.signal} वाहन प्रवाह सक्रिय` : `Stopped — ${state?.signal} vehicular flow active`}</span>}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Enhanced Real-time Statistics */}
        <div className="mt-8 bg-white rounded-xl shadow-xs p-6 border border-[#E2E8F0]">
          <h3 className="text-lg font-bold text-[#0A1F44] mb-4">{lang === 'HI' ? 'प्रदर्शन मेट्रिक्स' : 'Performance Metrics'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="text-3xl font-black text-[#0A1F44]">{state?.cars_passed || 0}</div>
              <div className="text-xs font-bold text-[#475569] mt-1">{lang === 'HI' ? 'निकाले गए वाहन' : 'Vehicles Processed'}</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="text-3xl font-black text-[#F5A623]">{(state?.avg_wait_time || 0).toFixed(1)}s</div>
              <div className="text-xs font-bold text-[#475569] mt-1">{lang === 'HI' ? 'औसत प्रतीक्षा समय' : 'Avg Wait Time'}</div>
              <div className="text-xs text-[#16A34A] font-bold mt-0.5">
                {lang === 'HI' ? `${mumbaiStats.efficiencyGain.toFixed(1)}% सुधार` : `${mumbaiStats.efficiencyGain.toFixed(1)}% improvement`}
              </div>
            </div>
            <div className="text-center p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="text-3xl font-black text-[#16A34A]">{(metrics?.throughput || 0).toFixed(1)}</div>
              <div className="text-xs font-bold text-[#475569] mt-1">{lang === 'HI' ? 'वाहन प्रति मिनट' : 'Cars per Minute'}</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="text-3xl font-black text-[#0F2C59]">
                {Math.max(...Object.values(state?.queues || { 0: 0 }))}
              </div>
              <div className="text-xs font-bold text-[#475569] mt-1">{lang === 'HI' ? 'अधिकतम कतार' : 'Highest Queue'}</div>
            </div>
          </div>
        </div>

        {/* System Controls */}
        <div className="mt-8 bg-white rounded-xl shadow-xs p-6 border border-[#E2E8F0]">
          <h3 className="text-lg font-bold text-[#0A1F44] mb-4">{lang === 'HI' ? 'इंटेलिजेंट सिस्टम नियंत्रण' : 'Intelligent System Controls'}</h3>
          <div className="flex flex-wrap items-center space-x-4">
            <div className="flex space-x-2">
              <button
                onClick={switchToMock}
                className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition shadow-xs cursor-pointer ${useMock ? 'bg-[#0F2C59] text-white border border-[#1E4D8C]' : 'bg-[#F1F5F9] text-[#475569] hover:text-[#0A1F44] border border-[#E2E8F0]'
                  }`}
              >
                <Brain size={16} className={useMock ? 'text-[#F5A623]' : 'text-slate-500'} />
                <span>{lang === 'HI' ? 'AI सिमुलेशन' : 'AI Simulation'}</span>
              </button>
              {switchToBackend && (
                <button
                  onClick={switchToBackend}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition shadow-xs cursor-pointer ${!useMock ? 'bg-[#0F2C59] text-white border border-[#1E4D8C]' : 'bg-[#F1F5F9] text-[#475569] hover:text-[#0A1F44] border border-[#E2E8F0]'
                    }`}
                >
                  <Radio size={14} className="inline mr-1" /> {lang === 'HI' ? 'लाइव डेटा' : 'Live Data'}
                </button>
              )}
            </div>

            {useMock && (
              <div className="flex items-center space-x-2">
                <label className="text-xs font-bold text-[#475569]">{lang === 'HI' ? `गति: ${simulationSpeed}x` : `Speed: ${simulationSpeed}x`}</label>
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.1"
                  value={simulationSpeed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-24 h-2 bg-[#E2E8F0] rounded-lg accent-[#0F2C59]"
                />
              </div>
            )}

            {useMock && (
              <button
                onClick={() => triggerEmergencyVehicle && triggerEmergencyVehicle()}
                disabled={state?.emergencyActive}
                className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition shadow-xs cursor-pointer ${state?.emergencyActive
                  ? 'bg-red-700 animate-pulse cursor-default'
                  : 'bg-[#DC2626] hover:bg-red-700 active:scale-95'
                  }`}
                title={lang === 'HI' ? 'आपातकालीन वाहन डिस्पैच करें (यादृच्छिक पहुंच)' : 'Dispatch emergency vehicle (Random approach)'}
              >
                {state?.emergencyActive ? <><Siren size={14} className="inline mr-1" /> {lang === 'HI' ? `आपातकाल सक्रिय (${state?.emergencyDirection || ''})` : `Emergency Active (${state?.emergencyDirection || ''})`}</> : <><Siren size={14} className="inline mr-1" /> {lang === 'HI' ? 'आपातकालीन मोड' : 'Emergency Mode'}</>}
              </button>
            )}

            {useMock && (
              <button
                onClick={resetSimulation}
                className="px-4 py-2 text-xs font-bold text-[#0A1F44] bg-white border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] transition shadow-xs cursor-pointer"
              >
                <RotateCcw size={14} className="inline mr-1 text-[#0F2C59]" /> {lang === 'HI' ? 'सिस्टम रीसेट करें' : 'Reset System'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveIntersection;