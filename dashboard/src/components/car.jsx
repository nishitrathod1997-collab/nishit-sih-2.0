import React from 'react';
import { motion } from 'framer-motion';
import Bike from './Bike';

// Deterministic hash helper from id string
const getDeterministicHash = (str = '') => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

// Clean sedan palettes matching reference screenshot (Blue, White, Orange/Red, Light Blue, Slate)
const SEDAN_PALETTES = [
  { body: '#2563EB', roof: '#1D4ED8', window: '#BFDBFE' }, // Blue
  { body: '#FFFFFF', roof: '#E2E8F0', window: '#94A3B8' }, // White
  { body: '#EA580C', roof: '#C2410C', window: '#FED7AA' }, // Orange
  { body: '#3B82F6', roof: '#1D4ED8', window: '#DBEAFE' }, // Light Blue
  { body: '#475569', roof: '#334155', window: '#CBD5E1' }, // Slate
];

// Motorcycle color variations
const BIKE_PALETTES = [
  { color: '#0284C7', helmet: '#F8FAFC' },
  { color: '#DC2626', helmet: '#1E293B' },
  { color: '#16A34A', helmet: '#FEF08A' },
  { color: '#EA580C', helmet: '#F8FAFC' },
  { color: '#0F172A', helmet: '#EF4444' },
];

// 1. Sleek, Compact Top-Down Sedan SVG
const SedanSVG = ({ colorIndex = 0 }) => {
  const palette = SEDAN_PALETTES[colorIndex % SEDAN_PALETTES.length];
  const isWhite = palette.body === '#FFFFFF';

  return (
    <svg
      viewBox="0 0 24 40"
      className="w-full h-full select-none"
      style={{ filter: 'drop-shadow(0 1.5px 2px rgba(0,0,0,0.35))' }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 4 Wheels */}
      <rect x="0.5" y="6" width="2.4" height="5" rx="0.8" fill="#1E293B" />
      <rect x="21.1" y="6" width="2.4" height="5" rx="0.8" fill="#1E293B" />
      <rect x="0.5" y="29" width="2.4" height="5" rx="0.8" fill="#1E293B" />
      <rect x="21.1" y="29" width="2.4" height="5" rx="0.8" fill="#1E293B" />

      {/* Main Body */}
      <rect
        x="2.5"
        y="2"
        width="19"
        height="36"
        rx="4.5"
        fill={palette.body}
        stroke={isWhite ? '#CBD5E1' : '#0F172A'}
        strokeWidth="0.7"
      />

      {/* Side Mirrors */}
      <rect x="0.8" y="11.5" width="1.8" height="2.5" rx="0.6" fill={palette.body} />
      <rect x="21.4" y="11.5" width="1.8" height="2.5" rx="0.6" fill={palette.body} />

      {/* Front Windshield */}
      <rect x="4.5" y="9.5" width="15" height="5.5" rx="1.2" fill={palette.window} stroke="#334155" strokeWidth="0.4" />

      {/* Roof Section */}
      <rect x="5.2" y="15" width="13.6" height="10.5" rx="0.8" fill={palette.roof} />

      {/* Rear Window */}
      <rect x="4.5" y="25.5" width="15" height="4.2" rx="1.2" fill={palette.window} stroke="#334155" strokeWidth="0.4" />

      {/* Headlights (Front / Top) */}
      <circle cx="5" cy="3.5" r="1.1" fill="#FEF08A" />
      <circle cx="19" cy="3.5" r="1.1" fill="#FEF08A" />

      {/* Taillights (Rear / Bottom) */}
      <rect x="4" y="36.5" width="2.8" height="1.2" rx="0.4" fill="#EF4444" />
      <rect x="17.2" y="36.5" width="2.8" height="1.2" rx="0.4" fill="#EF4444" />
    </svg>
  );
};

// 2. Clean Top-Down Bus / Van SVG
const BusSVG = () => {
  return (
    <svg
      viewBox="0 0 24 42"
      className="w-full h-full select-none"
      style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))' }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0.5" y="5" width="2.4" height="5" rx="0.8" fill="#1E293B" />
      <rect x="21.1" y="5" width="2.4" height="5" rx="0.8" fill="#1E293B" />
      <rect x="0.5" y="31" width="2.4" height="5" rx="0.8" fill="#1E293B" />
      <rect x="21.1" y="31" width="2.4" height="5" rx="0.8" fill="#1E293B" />

      <rect
        x="2.5"
        y="1.5"
        width="19"
        height="39"
        rx="3.5"
        fill="#10B981"
        stroke="#065F46"
        strokeWidth="0.7"
      />

      {/* Front Windshield */}
      <rect x="4.5" y="4.5" width="15" height="5.5" rx="1.2" fill="#E2E8F0" stroke="#065F46" strokeWidth="0.4" />
      {/* Roof Body */}
      <rect x="5" y="11.5" width="14" height="21" rx="1" fill="#059669" />
      {/* Rear Window */}
      <rect x="4.5" y="34" width="15" height="3.5" rx="1" fill="#E2E8F0" stroke="#065F46" strokeWidth="0.4" />

      <circle cx="4.8" cy="2.8" r="1.1" fill="#FEF08A" />
      <circle cx="19.2" cy="2.8" r="1.1" fill="#FEF08A" />
      <rect x="4" y="38.8" width="2.6" height="1.1" rx="0.4" fill="#EF4444" />
      <rect x="17.4" y="38.8" width="2.6" height="1.1" rx="0.4" fill="#EF4444" />
    </svg>
  );
};

// 3. Ambulance SVG
const AmbulanceSVG = () => {
  return (
    <svg
      viewBox="0 0 24 40"
      className="w-full h-full select-none"
      style={{ filter: 'drop-shadow(0 2px 4px rgba(239,68,68,0.3))' }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0.5" y="5.5" width="2.4" height="5" rx="0.8" fill="#1E293B" />
      <rect x="21.1" y="5.5" width="2.4" height="5" rx="0.8" fill="#1E293B" />
      <rect x="0.5" y="29" width="2.4" height="5" rx="0.8" fill="#1E293B" />
      <rect x="21.1" y="29" width="2.4" height="5" rx="0.8" fill="#1E293B" />

      <rect
        x="2.5"
        y="1.5"
        width="19"
        height="37"
        rx="4.5"
        fill="#FFFFFF"
        stroke="#CBD5E1"
        strokeWidth="0.7"
      />

      {/* Flashing Light Bar */}
      <rect x="6" y="2.5" width="12" height="3" rx="1" fill="#1E293B" />
      <circle cx="8.5" cy="4" r="1.2" fill="#EF4444">
        <animate attributeName="opacity" values="1;0.2;1" dur="0.4s" repeatCount="indefinite" />
      </circle>
      <circle cx="15.5" cy="4" r="1.2" fill="#3B82F6">
        <animate attributeName="opacity" values="0.2;1;0.2" dur="0.4s" repeatCount="indefinite" />
      </circle>

      <rect x="4.5" y="7" width="15" height="5" rx="1.2" fill="#93C5FD" stroke="#3B82F6" strokeWidth="0.4" />
      
      {/* Red Cross */}
      <rect x="7" y="16.5" width="10" height="2.8" rx="0.5" fill="#EF4444" />
      <rect x="10.6" y="13" width="2.8" height="10" rx="0.5" fill="#EF4444" />

      <rect x="3.8" y="37.2" width="2.4" height="1" rx="0.4" fill="#EF4444" />
      <rect x="17.8" y="37.2" width="2.4" height="1" rx="0.4" fill="#EF4444" />
    </svg>
  );
};

// 4. Fire Truck SVG
const FireTruckSVG = () => {
  return (
    <svg
      viewBox="0 0 24 42"
      className="w-full h-full select-none"
      style={{ filter: 'drop-shadow(0 2px 4px rgba(220,38,38,0.3))' }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0.5" y="5" width="2.4" height="5" rx="0.8" fill="#1E293B" />
      <rect x="21.1" y="5" width="2.4" height="5" rx="0.8" fill="#1E293B" />
      <rect x="0.5" y="31" width="2.4" height="5" rx="0.8" fill="#1E293B" />
      <rect x="21.1" y="31" width="2.4" height="5" rx="0.8" fill="#1E293B" />

      <rect
        x="2.5"
        y="1.5"
        width="19"
        height="39"
        rx="4"
        fill="#DC2626"
        stroke="#991B1B"
        strokeWidth="0.7"
      />

      <rect x="5.5" y="2.5" width="13" height="3" rx="1" fill="#1E293B" />
      <circle cx="8" cy="4" r="1.2" fill="#EF4444">
        <animate attributeName="opacity" values="1;0.2;1" dur="0.3s" repeatCount="indefinite" />
      </circle>
      <circle cx="16" cy="4" r="1.2" fill="#F59E0B">
        <animate attributeName="opacity" values="0.2;1;0.2" dur="0.3s" repeatCount="indefinite" />
      </circle>

      <rect x="4.5" y="6.5" width="15" height="5" rx="1.2" fill="#93C5FD" stroke="#1E40AF" strokeWidth="0.4" />
      {/* Ladder Marking */}
      <rect x="8" y="14" width="8" height="19" rx="0.5" fill="#E2E8F0" stroke="#64748B" strokeWidth="0.4" />
      <line x1="8" y1="18" x2="16" y2="18" stroke="#64748B" strokeWidth="0.6" />
      <line x1="8" y1="22" x2="16" y2="22" stroke="#64748B" strokeWidth="0.6" />
      <line x1="8" y1="26" x2="16" y2="26" stroke="#64748B" strokeWidth="0.6" />
      <line x1="8" y1="30" x2="16" y2="30" stroke="#64748B" strokeWidth="0.6" />
    </svg>
  );
};

// 5. Police Car SVG
const PoliceSVG = () => {
  return (
    <svg
      viewBox="0 0 24 40"
      className="w-full h-full select-none"
      style={{ filter: 'drop-shadow(0 2px 4px rgba(37,99,235,0.3))' }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0.5" y="6" width="2.4" height="5" rx="0.8" fill="#1E293B" />
      <rect x="21.1" y="6" width="2.4" height="5" rx="0.8" fill="#1E293B" />
      <rect x="0.5" y="29" width="2.4" height="5" rx="0.8" fill="#1E293B" />
      <rect x="21.1" y="29" width="2.4" height="5" rx="0.8" fill="#1E293B" />

      <rect x="2.5" y="2" width="19" height="36" rx="4.5" fill="#FFFFFF" stroke="#0F172A" strokeWidth="0.7" />
      {/* Police Blue/Black Doors */}
      <rect x="2.5" y="14" width="3" height="12" fill="#1E293B" />
      <rect x="18.5" y="14" width="3" height="12" fill="#1E293B" />

      {/* Light Bar */}
      <rect x="6.5" y="14" width="11" height="2.8" rx="0.8" fill="#1E293B" />
      <circle cx="8.5" cy="15.4" r="1.1" fill="#EF4444">
        <animate attributeName="opacity" values="1;0.2;1" dur="0.4s" repeatCount="indefinite" />
      </circle>
      <circle cx="15.5" cy="15.4" r="1.1" fill="#3B82F6">
        <animate attributeName="opacity" values="0.2;1;0.2" dur="0.4s" repeatCount="indefinite" />
      </circle>

      <rect x="4.5" y="9.5" width="15" height="5" rx="1.2" fill="#93C5FD" stroke="#334155" strokeWidth="0.4" />
      <rect x="5.5" y="17.5" width="13" height="8" fill="#1E293B" />
      <rect x="4.5" y="26" width="15" height="4" rx="1.2" fill="#93C5FD" stroke="#334155" strokeWidth="0.4" />
    </svg>
  );
};

// 6. Delivery Van SVG (Compact commercial courier/van with cargo roof stripes and amber markers)
const DeliveryVanSVG = ({ colorIndex = 0 }) => {
  const isWhite = colorIndex % 2 === 0;
  return (
    <svg
      viewBox="0 0 24 40"
      className="w-full h-full select-none"
      style={{ filter: 'drop-shadow(0 2px 3px rgba(245,158,11,0.35))' }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 4 Wheels */}
      <rect x="0.5" y="6" width="2.4" height="5" rx="0.8" fill="#1E293B" />
      <rect x="21.1" y="6" width="2.4" height="5" rx="0.8" fill="#1E293B" />
      <rect x="0.5" y="28" width="2.4" height="5" rx="0.8" fill="#1E293B" />
      <rect x="21.1" y="28" width="2.4" height="5" rx="0.8" fill="#1E293B" />

      {/* Van Body */}
      <rect
        x="2.5"
        y="2"
        width="19"
        height="36"
        rx="3.5"
        fill={isWhite ? '#F8FAFC' : '#F59E0B'}
        stroke={isWhite ? '#CBD5E1' : '#D97706'}
        strokeWidth="0.8"
      />

      {/* Front Windshield */}
      <rect x="4.5" y="7" width="15" height="5.5" rx="1.2" fill="#93C5FD" stroke="#334155" strokeWidth="0.4" />

      {/* Cargo Compartment Separator Line */}
      <line x1="3" y1="15" x2="21" y2="15" stroke="#475569" strokeWidth="0.8" />

      {/* Cargo Roof Ribs */}
      <rect x="5.5" y="17" width="13" height="17" rx="1" fill={isWhite ? '#E2E8F0' : '#D97706'} />
      <line x1="7.5" y1="19" x2="7.5" y2="32" stroke="#64748B" strokeWidth="0.6" strokeDasharray="1.5 1" />
      <line x1="12" y1="19" x2="12" y2="32" stroke="#64748B" strokeWidth="0.6" strokeDasharray="1.5 1" />
      <line x1="16.5" y1="19" x2="16.5" y2="32" stroke="#64748B" strokeWidth="0.6" strokeDasharray="1.5 1" />

      {/* Delivery Van Amber Roof Marker */}
      <rect x="9.5" y="4" width="5" height="1.8" rx="0.6" fill="#F59E0B" />

      {/* Headlights */}
      <circle cx="5" cy="3.5" r="1.1" fill="#FEF08A" />
      <circle cx="19" cy="3.5" r="1.1" fill="#FEF08A" />

      {/* Rear Brake Lights */}
      <rect x="4" y="36.5" width="2.8" height="1.2" rx="0.4" fill="#EF4444" />
      <rect x="17.2" y="36.5" width="2.8" height="1.2" rx="0.4" fill="#EF4444" />
    </svg>
  );
};

// 7. Heavy Freight Truck SVG (Dual-axle heavy transport container with cab separation)
const FreightTruckSVG = ({ colorIndex = 0 }) => {
  const isBlue = colorIndex % 2 === 0;
  return (
    <svg
      viewBox="0 0 26 48"
      className="w-full h-full select-none"
      style={{ filter: 'drop-shadow(0 2.5px 4px rgba(15,23,42,0.45))' }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Front Wheels */}
      <rect x="0.5" y="6" width="2.6" height="5.5" rx="1" fill="#0F172A" />
      <rect x="22.9" y="6" width="2.6" height="5.5" rx="1" fill="#0F172A" />

      {/* Dual Rear Axle Wheels */}
      <rect x="0.5" y="30" width="2.6" height="5" rx="1" fill="#0F172A" />
      <rect x="22.9" y="30" width="2.6" height="5" rx="1" fill="#0F172A" />
      <rect x="0.5" y="37" width="2.6" height="5" rx="1" fill="#0F172A" />
      <rect x="22.9" y="37" width="2.6" height="5" rx="1" fill="#0F172A" />

      {/* Front Cab */}
      <rect
        x="3"
        y="2"
        width="20"
        height="12"
        rx="2.5"
        fill={isBlue ? '#1E3A8A' : '#7C2D12'}
        stroke="#0F172A"
        strokeWidth="0.8"
      />
      {/* Cab Windshield */}
      <rect x="5.5" y="5" width="15" height="5" rx="1.2" fill="#BAE6FD" stroke="#0F172A" strokeWidth="0.4" />
      {/* Cab Sun Visor */}
      <rect x="5" y="3" width="16" height="1.5" rx="0.5" fill="#F59E0B" />

      {/* Articulation Hitch Gap */}
      <rect x="10" y="14" width="6" height="2" fill="#334155" />

      {/* Heavy Cargo Container Body */}
      <rect
        x="2.5"
        y="16"
        width="21"
        height="30"
        rx="2"
        fill={isBlue ? '#3B82F6' : '#EA580C'}
        stroke="#0F172A"
        strokeWidth="0.8"
      />

      {/* Container Corrugated Ridges */}
      <line x1="3.5" y1="20" x2="22.5" y2="20" stroke="#1E293B" strokeWidth="0.5" />
      <line x1="3.5" y1="25" x2="22.5" y2="25" stroke="#1E293B" strokeWidth="0.5" />
      <line x1="3.5" y1="30" x2="22.5" y2="30" stroke="#1E293B" strokeWidth="0.5" />
      <line x1="3.5" y1="35" x2="22.5" y2="35" stroke="#1E293B" strokeWidth="0.5" />
      <line x1="3.5" y1="40" x2="22.5" y2="40" stroke="#1E293B" strokeWidth="0.5" />

      {/* Rear Container Doors & Latches */}
      <line x1="13" y1="16" x2="13" y2="46" stroke="#0F172A" strokeWidth="0.8" />

      {/* Headlights */}
      <circle cx="5.5" cy="3.5" r="1.2" fill="#FEF08A" />
      <circle cx="20.5" cy="3.5" r="1.2" fill="#FEF08A" />

      {/* Rear Heavy Lights & Reflectors */}
      <rect x="4" y="44.5" width="3.5" height="1.5" rx="0.4" fill="#EF4444" />
      <rect x="18.5" y="44.5" width="3.5" height="1.5" rx="0.4" fill="#EF4444" />
    </svg>
  );
};

const VEHICLE_RENDERERS = {
  car: ({ colorIndex }) => <SedanSVG colorIndex={colorIndex} />,
  bike: ({ colorIndex }) => {
    const palette = BIKE_PALETTES[colorIndex % BIKE_PALETTES.length];
    return <Bike color={palette.color} helmetColor={palette.helmet} />;
  },
  bus: () => <BusSVG />,
  delivery_van: ({ colorIndex }) => <DeliveryVanSVG colorIndex={colorIndex} />,
  freight_truck: ({ colorIndex }) => <FreightTruckSVG colorIndex={colorIndex} />,
  truck: ({ colorIndex }) => <FreightTruckSVG colorIndex={colorIndex} />,
  ambulance: () => <AmbulanceSVG />,
  firetruck: () => <FireTruckSVG />,
  police: () => <PoliceSVG />,
};

const resolveVehicle = (id, type) => {
  const hash = getDeterministicHash(String(id || ''));

  if (['ambulance', 'firetruck', 'police', 'bus', 'bike', 'car', 'delivery_van', 'freight_truck', 'truck'].includes(type)) {
    return { kind: type === 'truck' ? 'freight_truck' : type, colorIndex: hash };
  }

  if (type === 'emergency') {
    const emergencyKinds = ['ambulance', 'firetruck', 'police'];
    return { kind: emergencyKinds[hash % emergencyKinds.length], colorIndex: hash };
  }

  const mod = hash % 10;
  if (mod === 0 || mod === 5) {
    return { kind: 'bus', colorIndex: hash };
  }
  if (mod === 1 || mod === 2 || mod === 6) {
    return { kind: 'bike', colorIndex: hash };
  }

  return { kind: 'car', colorIndex: hash };
};

const Car = ({ id, lane, position, type, isFullscreen = false, onClick = null, isSelected = false }) => {
  const vehicle = resolveVehicle(id, type);
  const isHeavyTruck = vehicle.kind === 'freight_truck';
  const isLarge = vehicle.kind === 'firetruck' || vehicle.kind === 'bus' || isHeavyTruck;
  const isBike = vehicle.kind === 'bike';

  // Compact top-down vehicle dimensions (Cars: 10px x 18px, Bikes: 8.5px x 16px, Bus/Truck: 11-12px x 20-22px)
  const getStyles = () => {
    const baseStyles = {
      position: 'absolute',
      width: isFullscreen
        ? (isHeavyTruck ? '24px' : isLarge ? '22px' : isBike ? '17px' : '20px')
        : (isHeavyTruck ? '12px' : isLarge ? '11px' : isBike ? '8.5px' : '10px'),
      height: isFullscreen
        ? (isHeavyTruck ? '44px' : isLarge ? '40px' : isBike ? '33px' : '36px')
        : (isHeavyTruck ? '22px' : isLarge ? '20px' : isBike ? '16px' : '18px'),
    };

    const laneOffsetPos = isFullscreen ? 'calc(50% + 24px)' : '53%';
    const laneOffsetNeg = isFullscreen ? 'calc(50% - 24px)' : '47%';

    switch (lane) {
      case 'N':
        return {
          ...baseStyles,
          left: laneOffsetPos,
          top: `${position}%`,
          transform: 'translateX(-50%)',
        };
      case 'S':
        return {
          ...baseStyles,
          left: laneOffsetNeg,
          bottom: `${position}%`,
          transform: 'translateX(-50%) rotate(180deg)',
        };
      case 'E':
        return {
          ...baseStyles,
          top: laneOffsetPos,
          right: `${position}%`,
          transform: 'translateY(-50%) rotate(90deg)',
        };
      case 'W':
        return {
          ...baseStyles,
          top: laneOffsetNeg,
          left: `${position}%`,
          transform: 'translateY(-50%) rotate(-90deg)',
        };
      default:
        return baseStyles;
    }
  };

  const renderShape = VEHICLE_RENDERERS[vehicle.kind] || VEHICLE_RENDERERS.car;

  return (
    <motion.div
      initial={getStyles()}
      animate={getStyles()}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'linear' }}
      onClick={onClick ? (e) => { e.stopPropagation(); onClick(id); } : undefined}
      style={{
        transition: 'left 400ms linear, top 400ms linear, right 400ms linear, bottom 400ms linear, transform 400ms linear',
      }}
      className={`flex items-center justify-center z-20 ${
        onClick ? 'pointer-events-auto cursor-pointer hover:scale-125 transition-transform' : 'pointer-events-none'
      }`}
    >
      {renderShape({ colorIndex: vehicle.colorIndex })}
    </motion.div>
  );
};

export default Car;