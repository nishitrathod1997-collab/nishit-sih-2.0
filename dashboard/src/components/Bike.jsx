import React from 'react';

/**
 * Bike component - A high-detail top-down 2D vector motorcycle with rider.
 * Matches the visual design system of car.jsx and emergency vehicles.
 *
 * @param {string} color - Primary paint color for motorcycle body/fairing/tank
 * @param {string} helmetColor - Rider's full-face helmet color
 * @param {number|string} width - Display width in pixels or Tailwind units
 * @param {number|string} height - Display height in pixels or Tailwind units
 * @param {string} className - Additional CSS/Tailwind classes
 */
const Bike = ({
  color = '#0284C7',
  helmetColor = '#F8FAFC',
  width,
  height,
  className = '',
  ...props
}) => {
  return (
    <svg
      viewBox="0 0 100 200"
      {...(width ? { width } : {})}
      {...(height ? { height } : {})}
      className={`w-full h-full select-none drop-shadow-sm ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        {/* Headlight illumination glow */}
        <radialGradient
          id="bikeHeadlightGlow"
          cx="50%"
          cy="0%"
          r="100%"
          fx="50%"
          fy="0%"
        >
          <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#FEF08A" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#FEF08A" stopOpacity="0" />
        </radialGradient>

        {/* Ambient shadow gradient */}
        <radialGradient id="bikeShadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0F172A" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
        </radialGradient>

        {/* Metallic gradient for exhaust pipe */}
        <linearGradient id="bikeExhaustGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="45%" stopColor="#94A3B8" />
          <stop offset="80%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>

        {/* Mirror glass gradient */}
        <linearGradient id="bikeMirrorGlass" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>
      </defs>

      {/* 1. Ground Shadow */}
      <ellipse cx="50" cy="105" rx="20" ry="78" fill="url(#bikeShadow)" />

      {/* 2. Headlight Light Beam Cone */}
      <polygon
        points="50,22 25,0 75,0"
        fill="url(#bikeHeadlightGlow)"
        opacity="0.8"
      />

      {/* 3. Front Tire & Rim */}
      <rect x="44" y="6" width="12" height="34" rx="6" fill="#0F172A" stroke="#334155" strokeWidth="0.8" />
      {/* Front Tire Center Tread Line */}
      <line x1="50" y1="8" x2="50" y2="38" stroke="#1E293B" strokeWidth="1.2" strokeDasharray="3 2" />

      {/* 4. Rear Tire & Rim */}
      <rect x="43" y="136" width="14" height="42" rx="7" fill="#0F172A" stroke="#334155" strokeWidth="0.8" />
      {/* Rear Tire Center Tread Line */}
      <line x1="50" y1="138" x2="50" y2="176" stroke="#1E293B" strokeWidth="1.5" strokeDasharray="4 2" />
      <circle cx="50" cy="158" r="2.5" fill="#334155" />
      <circle cx="50" cy="167" r="1.8" fill="#1E293B" />

      {/* 5. Right-Side Exhaust Pipe */}
      <rect x="58" y="116" width="5.5" height="42" rx="2.5" fill="url(#bikeExhaustGrad)" stroke="#1E293B" strokeWidth="0.6" />
      <circle cx="60.75" cy="154.5" r="1.6" fill="#0F172A" />

      {/* 6. Front Mudguard / Fairing */}
      <path
        d="M42 20 Q50 14 58 20 L56 38 Q50 36 44 38 Z"
        fill={color}
        stroke="#0F172A"
        strokeWidth="0.8"
      />

      {/* 7. Headlight Assembly (Yellow LED + Golden Rim) */}
      <ellipse cx="50" cy="19" rx="8" ry="3" fill="#EAB308" stroke="#CA8A04" strokeWidth="0.6" />
      <ellipse cx="50" cy="18" rx="6" ry="2.2" fill="#FEF08A" />

      {/* 8. Handlebars, Levers & Grips */}
      {/* Main Handlebar Tube */}
      <path
        d="M16 38 C28 40, 38 37, 50 37 C62 37, 72 40, 84 38"
        stroke="#1E293B"
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Left Hand Grip */}
      <rect x="15" y="35" width="8" height="6" rx="2" fill="#0F172A" stroke="#334155" strokeWidth="0.6" />
      <rect x="12" y="36.5" width="3" height="3" rx="1" fill="#475569" />
      {/* Right Hand Grip */}
      <rect x="77" y="35" width="8" height="6" rx="2" fill="#0F172A" stroke="#334155" strokeWidth="0.6" />
      <rect x="85" y="36.5" width="3" height="3" rx="1" fill="#475569" />

      {/* Brake / Clutch Levers */}
      <path d="M15 37 Q22 34 27 36" stroke="#94A3B8" strokeWidth="1" strokeLinecap="round" fill="none" />
      <path d="M85 37 Q78 34 73 36" stroke="#94A3B8" strokeWidth="1" strokeLinecap="round" fill="none" />

      {/* Dual Side Mirrors */}
      {/* Left Mirror */}
      <line x1="18" y1="36" x2="11" y2="30" stroke="#1E293B" strokeWidth="1.2" />
      <rect x="7" y="28" width="6.5" height="11" rx="2.5" fill="#0F172A" stroke="#334155" strokeWidth="0.6" />
      <rect x="8" y="29.2" width="4.5" height="8.6" rx="1.5" fill="url(#bikeMirrorGlass)" />

      {/* Right Mirror */}
      <line x1="82" y1="36" x2="89" y2="30" stroke="#1E293B" strokeWidth="1.2" />
      <rect x="86.5" y="28" width="6.5" height="11" rx="2.5" fill="#0F172A" stroke="#334155" strokeWidth="0.6" />
      <rect x="87.5" y="29.2" width="4.5" height="8.6" rx="1.5" fill="url(#bikeMirrorGlass)" />

      {/* Digital Dashboard Gauge */}
      <rect x="44" y="36" width="12" height="6" rx="1.5" fill="#0F172A" stroke="#38BDF8" strokeWidth="0.6" />
      <rect x="46" y="37.5" width="8" height="3" rx="0.5" fill="#0284C7" opacity="0.8" />

      {/* 9. Fuel Tank & Bodywork */}
      <path
        d="M34 48 C30 60, 30 76, 36 88 L64 88 C70 76, 70 60, 66 48 C62 43, 38 43, 34 48 Z"
        fill={color}
        stroke="#0F172A"
        strokeWidth="1"
      />
      {/* Center Racing Stripe on Fuel Tank */}
      <rect x="47.5" y="44" width="5" height="44" fill="#FFFFFF" opacity="0.9" />
      {/* Chrome Fuel Cap */}
      <circle cx="50" cy="56" r="3.5" fill="#CBD5E1" stroke="#0F172A" strokeWidth="0.8" />
      <circle cx="50" cy="56" r="1.4" fill="#64748B" />

      {/* 10. Rider's Arms (extending to handlebars) */}
      {/* Left Arm */}
      <path
        d="M29 74 C20 62, 17 48, 20 38"
        stroke="#0F172A"
        strokeWidth="6.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Right Arm */}
      <path
        d="M71 74 C80 62, 83 48, 80 38"
        stroke="#0F172A"
        strokeWidth="6.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* 11. Rider's Torso & Jacket */}
      <path
        d="M26 73 C26 65, 74 65, 74 73 L67 114 C60 116, 40 116, 33 114 Z"
        fill="#0F172A"
        stroke="#1E293B"
        strokeWidth="1"
      />
      {/* Hi-Vis Safety Shoulder/Back Accents (#FDE047) */}
      <path d="M30 86 L43 112" stroke="#FDE047" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M70 86 L57 112" stroke="#FDE047" strokeWidth="2.2" strokeLinecap="round" />

      {/* 12. Full-Face Helmet & Visor */}
      {/* Helmet Outer Shell */}
      <ellipse cx="50" cy="76" rx="14" ry="17" fill={helmetColor} stroke="#0F172A" strokeWidth="1.2" />
      {/* Helmet Aerodynamic Top Stripe */}
      <line x1="50" y1="67" x2="50" y2="87" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
      {/* Helmet Tinted Visor */}
      <path
        d="M39 71 Q50 67 61 71 Q50 75 39 71 Z"
        fill="#0F172A"
        stroke="#1E293B"
        strokeWidth="0.8"
      />
      {/* Visor Glare / Highlight Accent */}
      <path d="M42 70 Q50 68 58 70" stroke="#60A5FA" strokeWidth="0.7" fill="none" opacity="0.7" />

      {/* 13. Motorcycle Seat & Tail Section */}
      <path
        d="M35 114 L65 114 L62 142 L38 142 Z"
        fill="#0F172A"
        stroke={color}
        strokeWidth="1.2"
      />
      {/* Seat Center Cushion Texture */}
      <path d="M38 116 L62 116 L59 138 L41 138 Z" fill="#1E293B" />

      {/* 14. Rear Tail Lamp & Reflector */}
      <rect x="42" y="142" width="16" height="4.5" rx="2" fill="#EF4444" stroke="#991B1B" strokeWidth="0.6" />
      {/* License Plate Bracket */}
      <rect x="45" y="148" width="10" height="3" rx="0.5" fill="#F8FAFC" stroke="#0F172A" strokeWidth="0.5" />
    </svg>
  );
};

export default Bike;
