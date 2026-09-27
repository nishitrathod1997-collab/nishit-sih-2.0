import React from 'react';
import { LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLanguage } from '../context/LanguageContext';

const LANE_COLORS = {
  N: '#D97706', // Saffron / Amber
  E: '#003366', // Ashoka Blue
  S: '#15803D', // India Green
  W: '#0284C7'  // Sky Blue
};

const ChartPanel = ({ metrics, state }) => {
  const { lang } = useLanguage();

  if (!metrics && !state) {
    return (
      <div className="space-y-4">
        <div className="bg-slate-50 p-4 rounded-lg text-center border border-slate-200">
          <p className="text-slate-400 text-xs font-semibold">
            {lang === 'HI' ? 'ICCC टेलीमेट्री लोड हो रही है...' : 'Loading ICCC telemetry...'}
          </p>
        </div>
      </div>
    );
  }

  const currentWait = Number(state?.avg_wait_time ?? metrics?.current_avg_wait_time ?? metrics?.avg_wait_time ?? 0);

  // 1. Prepare dynamic wait time history data (last 15 chronological points)
  const rawWaitHistory = metrics?.wait_time_history || state?.wait_time_history || [];
  const waitTimeData = React.useMemo(() => {
    if (rawWaitHistory && rawWaitHistory.length > 0) {
      const formatted = rawWaitHistory.slice(-15).map((item, idx) => {
        let timeLabel = item.time || '';
        if (timeLabel.includes(':')) {
          const parts = timeLabel.split(':');
          if (parts.length === 3) timeLabel = `${parts[1]}:${parts[2]}`;
          else if (parts.length === 2) timeLabel = `${parts[0]}:${parts[1]}`;
        }
        const val = Number(item.wait_time ?? currentWait);
        return {
          time: timeLabel || `${idx * 2}s`,
          wait_time: isNaN(val) ? 0 : Number(val.toFixed(1))
        };
      });

      return formatted.length > 0 ? formatted : [{ time: '00:00', wait_time: 0 }];
    }

    return [{ time: '00:00', wait_time: 0 }];
  }, [rawWaitHistory, currentWait]);

  const displayWaitData = waitTimeData;

  // Compute adaptive Y-domain for wait time
  const waitValues = displayWaitData.map((d) => d.wait_time);
  const minWaitVal = 0;
  const maxWaitVal = Math.max(15, Math.ceil(Math.max(...waitValues, 0) * 1.25));

  // 2. Prepare live queue data for bar chart
  const lanesOrder = ['N', 'E', 'S', 'W'];
  const liveQueues = state?.queues || metrics?.queues || metrics?.queue_lengths || {};

  const queueChartData = lanesOrder.map((lane) => {
    const fromQueue = liveQueues[lane];
    const fromCars = Array.isArray(state?.cars?.[lane]) ? state.cars[lane].length : 0;
    const count = Math.max(0, Number(fromQueue !== undefined ? fromQueue : fromCars) || 0);

    return {
      lane,
      count,
      color: LANE_COLORS[lane] || '#003366'
    };
  });

  const maxQueueCount = Math.max(5, ...queueChartData.map((d) => d.count));
  const queueYMax = Math.ceil(maxQueueCount * 1.25);

  return (
    <div className="space-y-3">
      {/* 1. Average Wait Time Chart */}
      <div className="rounded-lg p-3 bg-[#F8FAFC] border border-[#CBD5E1]">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold text-[#0F2942]">
            {lang === 'HI' ? 'औसत प्रतीक्षा समय (IRC:106)' : 'Average Wait Time (IRC:106)'}
          </h4>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-[#CBD5E1] text-[#475569]">
            {lang === 'HI' ? 'लाइव ट्रेंड' : 'Live Trend'}
          </span>
        </div>
        <div className="h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={displayWaitData} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#94A3B8"
                tick={{ fill: '#475569', fontSize: 9, fontFamily: "'Noto Sans', sans-serif" }}
                minTickGap={20}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#94A3B8"
                tick={{ fill: '#475569', fontSize: 9, fontFamily: "'Noto Sans', sans-serif" }}
                domain={[minWaitVal, maxWaitVal]}
                width={28}
                tickFormatter={(val) => `${Math.round(val)}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(15,41,66,0.08)',
                  fontSize: '11px',
                  fontFamily: "'Noto Sans', sans-serif",
                  padding: '4px 8px',
                  color: '#0F2942'
                }}
                formatter={(value) => [`${value} sec`, lang === 'HI' ? 'औसत विलंब' : 'Avg Delay']}
              />
              <Line
                type="monotone"
                dataKey="wait_time"
                stroke="#003366"
                strokeWidth={2}
                isAnimationActive={false}
                dot={{ fill: '#003366', strokeWidth: 1, r: 2.5 }}
                activeDot={{ r: 5, fill: '#D97706', stroke: '#FFFFFF', strokeWidth: 2 }}
                connectNulls={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Current Queue Lengths Chart */}
      <div className="rounded-lg p-3 bg-[#F8FAFC] border border-[#CBD5E1]">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold text-[#0F2942]">
            {lang === 'HI' ? 'पहुंच कतार की लंबाई' : 'Approach Queue Lengths'}
          </h4>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-[#CBD5E1] text-[#475569]">
            {lang === 'HI' ? 'लाइव वाहन' : 'Live Vehicles'}
          </span>
        </div>
        <div className="h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={queueChartData} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="lane"
                stroke="#94A3B8"
                tick={{ fill: '#0F2942', fontSize: 10, fontWeight: 700, fontFamily: "'Noto Sans', sans-serif" }}
              />
              <YAxis
                stroke="#94A3B8"
                tick={{ fill: '#475569', fontSize: 9, fontFamily: "'Noto Sans', sans-serif" }}
                domain={[0, queueYMax]}
                allowDecimals={false}
                width={26}
                tickFormatter={(val) => `${Math.round(val)}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(15,41,66,0.08)',
                  fontSize: '11px',
                  padding: '4px 8px',
                  color: '#0F2942'
                }}
                formatter={(value, name, props) => [
                  `${value} ${lang === 'HI' ? 'वाहन' : 'vehicles'}`,
                  `${lang === 'HI' ? 'पहुंच' : 'Approach'} ${props.payload.lane}`
                ]}
              />
              <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false}>
                {queueChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ChartPanel;