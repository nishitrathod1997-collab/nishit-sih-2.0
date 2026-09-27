import React from 'react';
import { motion } from 'framer-motion';
import { Car, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const StatCard = ({
  title = '',
  value = 0,
  unit = '',
  valuePrefix = '',
  icon: Icon = Car,
  trend = '',
  trendSubtext,
  color = 'blue',
  showTrend = true
}) => {
  const { lang } = useLanguage();
  const resolvedTrendSubtext = trendSubtext !== undefined
    ? (trendSubtext === 'vs. last 5 minutes' && lang === 'HI' ? 'पिछले 5 मिनट की तुलना में' : trendSubtext)
    : (lang === 'HI' ? 'पिछले 5 मिनट की तुलना में' : 'vs. last 5 minutes');
  // Determine trend text & color if not explicitly provided
  const titleLower = title.toLowerCase().trim();
  const shouldShowTrend = Boolean(showTrend && trend !== null && trend !== false);

  let defaultTrend = trend;
  let trendColor = '#16A34A'; // green by default
  let TrendIcon = null;
  let trendText = '';

  if (shouldShowTrend) {
    if (!defaultTrend) {
      if (titleLower.includes('passed')) {
        defaultTrend = '+12%';
        trendColor = '#16A34A';
        TrendIcon = TrendingUp;
      } else if (titleLower.includes('wait')) {
        defaultTrend = '-18%';
        trendColor = '#16A34A';
        TrendIcon = TrendingDown;
      } else if (titleLower.includes('throughput')) {
        defaultTrend = '+6%';
        trendColor = '#16A34A';
        TrendIcon = TrendingUp;
      } else if (titleLower.includes('emergency')) {
        defaultTrend = '0%';
        trendColor = '#64748B';
        TrendIcon = Minus;
      }
    } else if (typeof defaultTrend === 'string') {
      // Parse passed-in trend string for icon and text
      if (defaultTrend.startsWith('↑') || defaultTrend.startsWith('+')) {
        TrendIcon = TrendingUp;
        trendText = defaultTrend.replace(/^[↑\s]+/, '');
        defaultTrend = trendText;
      } else if (defaultTrend.startsWith('↓') || defaultTrend.startsWith('-')) {
        TrendIcon = TrendingDown;
        trendText = defaultTrend.replace(/^[↓\s]+/, '');
        defaultTrend = trendText;
      } else if (defaultTrend.startsWith('—') || defaultTrend.startsWith('0')) {
        TrendIcon = Minus;
        trendText = defaultTrend.replace(/^[—\s]+/, '');
        defaultTrend = trendText;
      }
    }
  }

  // Icon badge colors matching design palette
  let iconBg = '#F1F5F9';
  let iconColor = '#0F2C59';

  if (titleLower.includes('passed') || color === 'blue') {
    iconBg = '#F1F5F9';
    iconColor = '#0F2C59';
  } else if (titleLower.includes('wait') || color === 'orange' || color === 'yellow') {
    iconBg = '#FFFBEB';
    iconColor = '#F5A623';
  } else if (titleLower.includes('throughput') || color === 'green') {
    iconBg = '#F0FDF4';
    iconColor = '#16A34A';
  } else if (titleLower.includes('emergency') || color === 'purple' || color === 'red') {
    iconBg = '#FEF2F2';
    iconColor = '#DC2626';
  }

  let actualValue = value;
  let finalPrefix = valuePrefix;
  let finalUnit = unit;

  if (actualValue && typeof actualValue === 'object') {
    if (actualValue.status === 'unavailable') {
      actualValue = 'Unavailable';
      finalPrefix = '';
      finalUnit = '';
    } else {
      actualValue = actualValue.value;
    }
  } else if (actualValue === 'Unavailable') {
    finalPrefix = '';
    finalUnit = '';
  }

  const numValue = Number(actualValue);
  const formattedValue = isNaN(numValue)
    ? (actualValue ?? '0')
    : Number.isInteger(numValue)
      ? numValue.toString()
      : numValue.toFixed(1);

  return (
    <motion.div
      className="bg-white rounded-xl p-4 shadow-xs border border-[#E2E8F0] transition-all duration-200"
      whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(10,31,68,0.08)' }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-center space-x-2.5 mb-2">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center text-xs flex-shrink-0 border border-[#E2E8F0]"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          {React.isValidElement(Icon) ? (
            Icon
          ) : typeof Icon === 'string' ? (
            <span className="text-base">{Icon}</span>
          ) : (
            <Icon size={20} />
          )}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#475569]">
          {title}
        </span>
      </div>

      <div className={`flex items-baseline space-x-1.5 ${shouldShowTrend ? 'mb-1.5' : 'mb-0'}`}>
        <span
          className="text-3xl font-black tracking-tight"
          style={{
            color: titleLower.includes('wait') ? '#F5A623' : '#0A1F44'
          }}
        >
          {finalPrefix}{formattedValue}
        </span>
        {finalUnit && (
          <span className="text-xs font-bold text-[#64748B]">
            {finalUnit}
          </span>
        )}
      </div>

      {shouldShowTrend && (defaultTrend || (trendSubtext && trendSubtext !== 'vs. last 5 minutes') || lang === 'HI') && (
        <div className="flex items-center space-x-1.5 text-xs">
          {TrendIcon && <TrendIcon size={12} style={{ color: trendColor }} />}
          {defaultTrend && (
            <span className="font-bold" style={{ color: trendColor }}>
              {defaultTrend}
            </span>
          )}
          <span className="text-[11px] text-[#94A3B8]">
            {resolvedTrendSubtext}
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default StatCard;