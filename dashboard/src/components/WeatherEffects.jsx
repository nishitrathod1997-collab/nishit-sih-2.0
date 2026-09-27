import React, { useEffect, useRef } from 'react';

/**
 * WeatherEffects Component
 * 
 * Independent, highly-optimized visual layer for realistic Rain and Fog effects
 * inside the Live Intersection Simulation viewport.
 * 
 * Supports 3 states:
 * - 'normal' | 'clear' : Clear skies (no effects, 0 CPU).
 * - 'rain' : Subtle slanted animated raindrops with splashes, overcast grading, and wet road sheen.
 * - 'fog'  : Soft radial perimeter haze with clear intersection center and gentle drifting mist.
 */
export const WeatherEffects = ({ weatherMode = 'normal', isFullscreen = false }) => {
  const mode = (weatherMode || 'normal').toLowerCase();
  const isRain = mode === 'rain';
  const isFog = mode === 'fog';

  if (!isRain && !isFog) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-25 overflow-hidden transition-all duration-500">
      {isRain && <RainEffect isFullscreen={isFullscreen} />}
      {isFog && <FogEffect isFullscreen={isFullscreen} />}
    </div>
  );
};

/**
 * RainEffect: High-performance HTML5 canvas rain with realistic angle,
 * varying speed/transparency, micro-ripples, and wet road surface reflection.
 */
const RainEffect = ({ isFullscreen }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId;
    let width = (canvas.width = canvas.offsetWidth || 800);
    let height = (canvas.height = canvas.offsetHeight || 380);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth || 800;
      height = canvas.height = canvas.offsetHeight || 380;
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas);

    // Rain drop pool: ~70 drops for normal mode, ~120 for fullscreen
    const dropCount = isFullscreen ? 120 : 70;
    const drops = Array.from({ length: dropCount }).map(() => ({
      x: Math.random() * (width * 1.3) - width * 0.15,
      y: Math.random() * height,
      len: (Math.random() * 10 + 12) * (isFullscreen ? 1.4 : 1),
      speed: (Math.random() * 7 + 13) * (isFullscreen ? 1.3 : 1),
      slant: 2.2 * (isFullscreen ? 1.2 : 1), // Subtle natural ~79-degree wind angle
      alpha: Math.random() * 0.3 + 0.35,
    }));

    // Micro splash ripples (pool of 8)
    const ripples = [];
    const spawnRipple = (x, y) => {
      if (ripples.length < 8 && Math.random() > 0.45) {
        ripples.push({
          x,
          y,
          r: 1,
          maxR: Math.random() * 4 + 3,
          alpha: 0.35,
        });
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw raindrops
      ctx.lineWidth = isFullscreen ? 1.4 : 1.1;
      ctx.lineCap = 'round';

      for (let i = 0; i < drops.length; i++) {
        const d = drops[i];
        ctx.strokeStyle = `rgba(215, 230, 248, ${d.alpha})`;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + d.slant, d.y + d.len);
        ctx.stroke();

        d.x += d.slant;
        d.y += d.speed;

        if (d.y > height) {
          spawnRipple(d.x, height - Math.random() * 25);
          d.y = -d.len - Math.random() * 25;
          d.x = Math.random() * (width * 1.3) - width * 0.15;
        }
      }

      // Draw splash ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rip = ripples[i];
        ctx.strokeStyle = `rgba(225, 238, 252, ${rip.alpha})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(rip.x, rip.y, rip.r, rip.r * 0.35, 0, 0, Math.PI * 2);
        ctx.stroke();

        rip.r += 0.4;
        rip.alpha -= 0.025;

        if (rip.alpha <= 0 || rip.r >= rip.maxR) {
          ripples.splice(i, 1);
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
    };
  }, [isFullscreen]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* 1. Subtle overcast atmosphere (cool dark tint & slight brightness reduction) */}
      <div
        className="absolute inset-0 bg-[#0F172A]/15 backdrop-brightness-[0.93] transition-opacity duration-500"
        style={{ mixBlendMode: 'multiply' }}
      />

      {/* 2. Wet road specular sheen (glossy reflections along road surfaces) */}
      <div
        className="absolute inset-0 opacity-35 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `
            linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0) 100%),
            radial-gradient(ellipse at 50% 50%, rgba(186, 230, 253, 0.15) 0%, rgba(186, 230, 253, 0) 70%)
          `
        }}
      />

      {/* 3. HTML5 Canvas for ultra-smooth raindrops & ripples */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
    </div>
  );
};

/**
 * FogEffect: Soft radial perimeter haze leaving the center intersection clearly visible,
 * combined with gentle drifting volumetric mist layers.
 */
const FogEffect = ({ isFullscreen }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden transition-opacity duration-700">
      {/* 1. Radial Perimeter Fog: Clear center for signals/vehicles, denser mist towards outer edges */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(
            circle at 50% 50%,
            rgba(226, 232, 240, 0.05) 0%,
            rgba(226, 232, 240, 0.18) 25%,
            rgba(218, 226, 236, 0.42) 55%,
            rgba(203, 213, 225, 0.68) 85%,
            rgba(195, 206, 220, 0.78) 100%
          )`,
          backdropFilter: 'blur(1.2px)',
          WebkitBackdropFilter: 'blur(1.2px)'
        }}
      />

      {/* 2. Soft drifting volumetric mist cloud layer 1 */}
      <div
        className="absolute -inset-x-1/4 -inset-y-1/4 opacity-30 pointer-events-none animate-fog-drift-1"
        style={{
          background: `radial-gradient(
            ellipse at 35% 40%,
            rgba(255, 255, 255, 0.45) 0%,
            rgba(241, 245, 249, 0.25) 45%,
            transparent 75%
          )`,
          filter: 'blur(20px)',
        }}
      />

      {/* 3. Soft drifting volumetric mist cloud layer 2 */}
      <div
        className="absolute -inset-x-1/4 -inset-y-1/4 opacity-25 pointer-events-none animate-fog-drift-2"
        style={{
          background: `radial-gradient(
            ellipse at 65% 60%,
            rgba(255, 255, 255, 0.4) 0%,
            rgba(226, 232, 240, 0.2) 50%,
            transparent 80%
          )`,
          filter: 'blur(24px)',
        }}
      />

      {/* 4. Soft atmospheric ambient signal halo */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full pointer-events-none opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.5) 0%, transparent 70%)',
          filter: 'blur(12px)',
        }}
      />
    </div>
  );
};

export default WeatherEffects;
