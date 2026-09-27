import React from 'react';
import tree1 from '../assets/trees/tree1.png';
import tree2 from '../assets/trees/tree2.png';
import tree3 from '../assets/trees/tree3.png';
import tree4 from '../assets/trees/tree4.png';
import tree5 from '../assets/trees/tree5.png';

export const ParkEnvironment = ({ isFullscreen = false }) => {
  // Road width & center box dimensions
  // Normal: road width 80px (w-20), center box is 80px x 80px -> quadrants span 0 to calc(50% - 40px)
  // Fullscreen: road width 160px (w-40), center box is 160px x 160px -> quadrants span 0 to calc(50% - 80px)
  const roadHalf = isFullscreen ? '80px' : '40px';

  // Sidewalk dimensions scaled proportionally:
  // Normal: 14px (w-3.5), corner 20px (w-5)
  // Fullscreen (2x): 28px (w-7), corner 40px (w-10)
  const sidewalkWidth = isFullscreen ? 'w-7' : 'w-3.5';
  const sidewalkHeight = isFullscreen ? 'h-7' : 'h-3.5';
  const cornerSize = isFullscreen ? 'w-10 h-10' : 'w-5 h-5';
  const cornerRadiusTL = isFullscreen ? 'rounded-br-3xl' : 'rounded-br-2xl';
  const cornerRadiusTR = isFullscreen ? 'rounded-bl-3xl' : 'rounded-bl-2xl';
  const cornerRadiusBL = isFullscreen ? 'rounded-tr-3xl' : 'rounded-tr-2xl';
  const cornerRadiusBR = isFullscreen ? 'rounded-tl-3xl' : 'rounded-tl-2xl';

  // Tree sizes scaled proportionally (maintains exact ~48% road width ratio):
  // Normal: Big ~38px (w-9.5), Medium-Small ~28px (w-7), Small ~24px (w-6)
  // Fullscreen (2x): Big ~80px (w-20), Medium-Small ~56px (w-14), Small ~48px (w-12)
  const bigTreeClass = isFullscreen ? 'w-20 h-20' : 'w-9.5 h-9.5';
  const mediumSmallTreeClass = isFullscreen ? 'w-14 h-14' : 'w-7 h-7';
  const smallTreeClass = isFullscreen ? 'w-12 h-12' : 'w-6 h-6';

  // Proportional horizontal distance of East & West trees from intersection center:
  // Normal: 240px (~57% of quadrant length)
  // Fullscreen: 480px (~55% of quadrant length)
  const horizontalDist = isFullscreen ? '480px' : '240px';

  // Distance of big trees from the horizontal road curb:
  // Normal: 12px
  // Fullscreen: 24px
  const roadMargin = isFullscreen ? '24px' : '12px';

  // Coordinates for the small trees along vertical roads:
  // First tree:
  const t1Offset = isFullscreen ? '90px' : '44px';
  const t1Curb = isFullscreen ? '48px' : '24px';
  // Second tree:
  const t2Offset = isFullscreen ? '150px' : '72px';
  const t2Curb = isFullscreen ? '52px' : '26px';
  // Bottom-right tree:
  const brOffset = isFullscreen ? '110px' : '56px';
  const brCurb = isFullscreen ? '48px' : '24px';

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-0 bg-[#D9DEE3]">

      {/* 🏙️ 1. TOP-LEFT QUADRANT */}
      <div
        className="absolute top-0 left-0 overflow-hidden bg-[#D9DEE3]"
        style={{
          width: `calc(50% - ${roadHalf})`,
          height: `calc(50% - ${roadHalf})`
        }}
      >
        {/* Sidewalks along road edges */}
        <div className={`absolute right-0 top-0 ${sidewalkWidth} h-full bg-[#CBD2D9] border-l border-[#B4BDC5]`} />
        <div className={`absolute bottom-0 left-0 w-full ${sidewalkHeight} bg-[#CBD2D9] border-t border-[#B4BDC5]`} />
        <div className={`absolute bottom-0 right-0 ${cornerSize} bg-[#CBD2D9] ${cornerRadiusTL}`} />

        {/* Big Tree along West road */}
        <img
          src={tree1}
          alt=""
          style={{ right: horizontalDist, bottom: roadMargin }}
          className={`absolute object-contain select-none pointer-events-none ${bigTreeClass}`}
        />

        {/* Two small trees beside it along North road */}
        <img
          src={tree4}
          alt=""
          style={{ bottom: t1Offset, right: t1Curb }}
          className={`absolute object-contain select-none pointer-events-none ${mediumSmallTreeClass}`}
        />
        <img
          src={tree4}
          alt=""
          style={{ bottom: t2Offset, right: t2Curb }}
          className={`absolute object-contain select-none pointer-events-none ${smallTreeClass}`}
        />
      </div>

      {/* 🏙️ 2. TOP-RIGHT QUADRANT */}
      <div
        className="absolute top-0 right-0 overflow-hidden bg-[#D9DEE3]"
        style={{
          width: `calc(50% - ${roadHalf})`,
          height: `calc(50% - ${roadHalf})`
        }}
      >
        {/* Sidewalks along road edges */}
        <div className={`absolute left-0 top-0 ${sidewalkWidth} h-full bg-[#CBD2D9] border-r border-[#B4BDC5]`} />
        <div className={`absolute bottom-0 right-0 w-full ${sidewalkHeight} bg-[#CBD2D9] border-t border-[#B4BDC5]`} />
        <div className={`absolute bottom-0 left-0 ${cornerSize} bg-[#CBD2D9] ${cornerRadiusTR}`} />

        {/* Tree along East road */}
        <img
          src={tree2}
          alt=""
          style={{ left: horizontalDist, bottom: roadMargin }}
          className={`absolute object-contain select-none pointer-events-none ${bigTreeClass}`}
        />
      </div>

      {/* 🏙️ 3. BOTTOM-LEFT QUADRANT */}
      <div
        className="absolute bottom-0 left-0 overflow-hidden bg-[#D9DEE3]"
        style={{
          width: `calc(50% - ${roadHalf})`,
          height: `calc(50% - ${roadHalf})`
        }}
      >
        {/* Sidewalks along road edges */}
        <div className={`absolute right-0 bottom-0 ${sidewalkWidth} h-full bg-[#CBD2D9] border-l border-[#B4BDC5]`} />
        <div className={`absolute top-0 left-0 w-full ${sidewalkHeight} bg-[#CBD2D9] border-b border-[#B4BDC5]`} />
        <div className={`absolute top-0 right-0 ${cornerSize} bg-[#CBD2D9] ${cornerRadiusBL}`} />

        {/* Big Tree along West road */}
        <img
          src={tree3}
          alt=""
          style={{ right: horizontalDist, top: roadMargin }}
          className={`absolute object-contain select-none pointer-events-none ${bigTreeClass}`}
        />

        {/* Two small trees beside it along South road */}
        <img
          src={tree4}
          alt=""
          style={{ top: t1Offset, right: t1Curb }}
          className={`absolute object-contain select-none pointer-events-none ${mediumSmallTreeClass}`}
        />
        <img
          src={tree4}
          alt=""
          style={{ top: t2Offset, right: t2Curb }}
          className={`absolute object-contain select-none pointer-events-none ${smallTreeClass}`}
        />
      </div>

      {/* 🏙️ 4. BOTTOM-RIGHT QUADRANT */}
      <div
        className="absolute bottom-0 right-0 overflow-hidden bg-[#D9DEE3]"
        style={{
          width: `calc(50% - ${roadHalf})`,
          height: `calc(50% - ${roadHalf})`
        }}
      >
        {/* Sidewalks along road edges */}
        <div className={`absolute left-0 bottom-0 ${sidewalkWidth} h-full bg-[#CBD2D9] border-r border-[#B4BDC5]`} />
        <div className={`absolute top-0 right-0 w-full ${sidewalkHeight} bg-[#CBD2D9] border-b border-[#B4BDC5]`} />
        <div className={`absolute top-0 left-0 ${cornerSize} bg-[#CBD2D9] ${cornerRadiusBR}`} />

        {/* Small tree along South road */}
        <img
          src={tree5}
          alt=""
          style={{ top: brOffset, left: brCurb }}
          className={`absolute object-contain select-none pointer-events-none ${smallTreeClass}`}
        />

        {/* Tree along East road */}
        <img
          src={tree2}
          alt=""
          style={{ left: horizontalDist, top: roadMargin }}
          className={`absolute object-contain select-none pointer-events-none ${bigTreeClass}`}
        />
      </div>

    </div>
  );
};

export default ParkEnvironment;
