import React from 'react';

/**
 * Authentic Official Government of India / MoRTH Shield Vector Logo
 * Zero AI artifacts, precision SVG geometry with Ashoka Emblem & Tricolour Sash.
 */
export const MargDrishtiEmblem = ({ className = "w-12 h-14", style = {} }) => {
  return (
    <svg
      viewBox="0 0 400 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.25))', ...style }}
    >
      <defs>
        {/* Gold Metallic Gradient */}
        <linearGradient id="mdGoldOuter" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FCEE21" />
          <stop offset="25%" stopColor="#D4AF37" />
          <stop offset="50%" stopColor="#AA771C" />
          <stop offset="75%" stopColor="#FDF0A6" />
          <stop offset="100%" stopColor="#8B6508" />
        </linearGradient>

        <linearGradient id="mdGoldInner" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F5D77F" />
          <stop offset="50%" stopColor="#C59B27" />
          <stop offset="100%" stopColor="#84590A" />
        </linearGradient>

        <linearGradient id="mdNavyShield" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0F2B5C" />
          <stop offset="100%" stopColor="#061226" />
        </linearGradient>

        {/* Signal Green Glow */}
        <radialGradient id="mdSignalGreen" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4ADE80" />
          <stop offset="40%" stopColor="#16A34A" />
          <stop offset="85%" stopColor="#15803D" />
          <stop offset="100%" stopColor="#052E16" />
        </radialGradient>

        {/* Road Grey */}
        <linearGradient id="mdRoadGrey" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>
      </defs>

      {/* 1. MAIN OUTER SHIELD */}
      <path
        d="M 200 15 L 370 65 V 230 C 370 345 200 475 200 475 C 200 475 30 345 30 230 V 65 Z"
        fill="url(#mdGoldOuter)"
        stroke="#684505"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Bevel Inner Highlight */}
      <path
        d="M 200 24 L 358 70 V 228 C 358 335 200 458 200 458 C 200 458 42 335 42 228 V 70 Z"
        fill="none"
        stroke="#FFF7C2"
        strokeWidth="2"
      />

      {/* 2. SHIELD INTERIOR (Deep Royal Navy #0A1F44) */}
      <path
        d="M 200 32 L 350 75 V 225 C 350 325 200 442 200 442 C 200 442 50 325 50 225 V 75 Z"
        fill="url(#mdNavyShield)"
        stroke="#D4AF37"
        strokeWidth="3.5"
      />

      {/* 3. ASHOKA LION CAPITAL SILHOUETTE */}
      <g transform="translate(200, 72) scale(0.65)">
        <path
          d="M -22 -40 C -22 -48 -14 -54 0 -54 C 14 -54 22 -48 22 -40 C 22 -35 18 -30 14 -26 C 24 -24 30 -16 30 -6 C 30 4 22 10 16 12 C 18 16 18 24 14 30 L -14 30 C -18 24 -18 16 -16 12 C -22 10 -30 4 -30 -6 C -30 -16 -24 -24 -14 -26 C -18 -30 -22 -35 -22 -40 Z"
          fill="url(#mdGoldInner)"
        />
        <rect x="-34" y="30" width="68" height="8" rx="2" fill="url(#mdGoldInner)" />
        <circle cx="0" cy="34" r="3.5" fill="#0A1F44" stroke="#FFF7C2" strokeWidth="1" />
        <text
          x="0"
          y="47"
          fill="#FCEE21"
          fontSize="9"
          fontWeight="700"
          textAnchor="middle"
          letterSpacing="1"
        >
          सत्यमेव जयते
        </text>
      </g>

      {/* 4. TITLE BANNER HEADER: MARG-DRISHTI */}
      <path
        d="M 58 132 L 200 114 L 342 132 L 334 175 L 200 158 L 66 175 Z"
        fill="#071731"
        stroke="url(#mdGoldOuter)"
        strokeWidth="2.5"
      />
      <text
        x="200"
        y="152"
        fill="url(#mdGoldOuter)"
        fontFamily="sans-serif"
        fontSize="28"
        fontWeight="900"
        textAnchor="middle"
        letterSpacing="2.5"
      >
        MARG-DRISHTI
      </text>

      {/* 5. 4-WAY HIGHWAY INTERSECTION (X-Crossroad) */}
      <g>
        <polygon points="76,192 130,192 324,350 270,350" fill="url(#mdRoadGrey)" stroke="#D4AF37" strokeWidth="2" />
        <line x1="103" y1="192" x2="297" y2="350" stroke="#FFFFFF" strokeWidth="2.5" strokeDasharray="8 6" />
        <line x1="88" y1="192" x2="282" y2="350" stroke="#F5A623" strokeWidth="1.5" />
        <line x1="118" y1="192" x2="312" y2="350" stroke="#F5A623" strokeWidth="1.5" />

        <polygon points="324,192 270,192 76,350 130,350" fill="url(#mdRoadGrey)" stroke="#D4AF37" strokeWidth="2" />
        <line x1="297" y1="192" x2="103" y2="350" stroke="#FFFFFF" strokeWidth="2.5" strokeDasharray="8 6" />
        <line x1="312" y1="192" x2="118" y2="350" stroke="#F5A623" strokeWidth="1.5" />
        <line x1="282" y1="192" x2="88" y2="350" stroke="#F5A623" strokeWidth="1.5" />

        {/* Lane Directional Indicators */}
        <g fill="#FCEE21" stroke="#AA771C" strokeWidth="0.5">
          <polygon points="120,215 130,225 125,225 125,235 115,235 115,225 110,225" />
          <polygon points="280,215 290,225 285,225 285,235 275,235 275,225 270,225" />
          <polygon points="115,310 125,310 125,320 130,320 120,330 110,320 115,320" />
          <polygon points="275,310 285,310 285,320 290,320 280,330 270,320 275,320" />
        </g>
      </g>

      {/* 6. CENTRAL DRISHTI APERTURE & SIGNAL BEACON */}
      <circle cx="200" cy="271" r="38" fill="url(#mdGoldOuter)" stroke="#5C3B00" strokeWidth="2" />
      <circle cx="200" cy="271" r="30" fill="#0A1F44" stroke="#FFF7C2" strokeWidth="2" />
      <circle cx="200" cy="271" r="23" fill="url(#mdSignalGreen)" stroke="#4ADE80" strokeWidth="2" />
      <ellipse cx="193" cy="262" rx="8" ry="4" fill="#FFFFFF" opacity="0.6" transform="rotate(-30 193 262)" />

      {/* 7. INDIAN TRICOLOUR SASH BANNER */}
      <g id="mdTricolourBanner">
        <path d="M 50 310 Q 120 370 200 370 Q 280 370 350 310 L 350 326 Q 280 386 200 386 Q 120 386 50 326 Z" fill="#FF9933" />
        <path d="M 50 326 Q 120 386 200 386 Q 280 386 350 326 L 350 342 Q 280 402 200 402 Q 120 402 50 342 Z" fill="#FFFFFF" />
        <path d="M 50 342 Q 120 402 200 402 Q 280 402 350 342 L 350 358 Q 280 418 200 418 Q 120 418 50 358 Z" fill="#138808" />
        <path d="M 50 310 Q 120 370 200 370 Q 280 370 350 310 L 350 358 Q 280 418 200 418 Q 120 418 50 358 Z" fill="none" stroke="url(#mdGoldOuter)" strokeWidth="2" />

        {/* Ashoka Chakra (24 Spokes) */}
        <g transform="translate(200, 394)">
          <circle cx="0" cy="0" r="11" fill="#FFFFFF" stroke="#000080" strokeWidth="1.8" />
          <circle cx="0" cy="0" r="2.5" fill="#000080" />
          <g stroke="#000080" strokeWidth="0.8">
            <line x1="0" y1="-11" x2="0" y2="11" />
            <line x1="-11" y1="0" x2="11" y2="0" />
            <line x1="-7.78" y1="-7.78" x2="7.78" y2="7.78" />
            <line x1="-7.78" y1="7.78" x2="7.78" y2="-7.78" />
            <line x1="-3.76" y1="-10.33" x2="3.76" y2="10.33" />
            <line x1="3.76" y1="-10.33" x2="-3.76" y2="10.33" />
            <line x1="-10.33" y1="-3.76" x2="10.33" y2="3.76" />
            <line x1="-10.33" y1="3.76" x2="10.33" y2="-3.76" />
            <line x1="-5.88" y1="-9.27" x2="5.88" y2="9.27" />
            <line x1="5.88" y1="-9.27" x2="-5.88" y2="9.27" />
            <line x1="-9.27" y1="-5.88" x2="9.27" y2="5.88" />
            <line x1="-9.27" y1="5.88" x2="9.27" y2="-5.88" />
          </g>
        </g>
      </g>

      {/* 8. BOTTOM CURVED SUBTITLE */}
      <path id="mdTextPathBottom" d="M 80 430 Q 200 480 320 430" fill="none" />
      <text fill="url(#mdGoldOuter)" fontFamily="sans-serif" fontSize="11.5" fontWeight="800" letterSpacing="2">
        <textPath href="#mdTextPathBottom" startOffset="50%" textAnchor="middle">
          TRAFFIC COMMAND & CONTROL CENTRE
        </textPath>
      </text>
    </svg>
  );
};

export default MargDrishtiEmblem;
