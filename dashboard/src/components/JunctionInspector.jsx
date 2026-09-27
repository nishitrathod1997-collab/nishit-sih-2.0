import React, { useEffect, useRef } from 'react';
import { 
  Video, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight
} from 'lucide-react';
import { useTraffic } from '../context/TrafficContext';
import { useLanguage } from '../context/LanguageContext';

export const JunctionInspector = () => {
  const { selectedJunction } = useTraffic();
  const { lang } = useLanguage();
  const canvasRef = useRef(null);

  // Simulated YOLOv8 Bounding Box Stream with ROI Lane Counting Lines
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const boxes = [
      { id: 1, label: 'car 0.98', color: '#F5A623', x: 30, y: 35, w: 60, h: 36, vx: 0.5, vy: 0.2 },
      { id: 2, label: 'bike 0.94', color: '#16A34A', x: 110, y: 75, w: 26, h: 20, vx: -0.4, vy: 0.3 },
      { id: 3, label: 'bus 0.96', color: '#1E4D8C', x: 155, y: 25, w: 75, h: 42, vx: 0.3, vy: -0.2 },
      { id: 4, label: 'car 0.95', color: '#F5A623', x: 65, y: 90, w: 55, h: 30, vx: -0.5, vy: -0.2 }
    ];

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Matte dark asphalt
      ctx.fillStyle = '#0A1F44';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // ROI Lane Counting Boundary Lines (Yellow dashed)
      ctx.strokeStyle = 'rgba(245, 166, 35, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(10, 45); ctx.lineTo(canvas.width - 10, 45);
      ctx.moveTo(10, 85); ctx.lineTo(canvas.width - 10, 85);
      ctx.stroke();
      ctx.setLineDash([]);

      if (selectedJunction.cameraStatus !== 'online') {
        ctx.fillStyle = '#DC2626';
        ctx.font = '10px monospace';
        ctx.fillText('[CAMERA STREAM OFFLINE - FAILSAFE ACTIVE]', 15, canvas.height / 2);
        return;
      }

      // Detection Bounding Boxes
      boxes.forEach(box => {
        box.x += box.vx;
        box.y += box.vy;

        if (box.x < 5 || box.x + box.w > canvas.width - 5) box.vx *= -1;
        if (box.y < 5 || box.y + box.h > canvas.height - 5) box.vy *= -1;

        ctx.strokeStyle = box.color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(box.x, box.y, box.w, box.h);

        // Header Tag Label
        ctx.fillStyle = box.color;
        ctx.fillRect(box.x, box.y - 11, box.label.length * 6, 11);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '8px monospace';
        ctx.fillText(box.label, box.x + 2, box.y - 3);
      });

      // Camera HUD Header Overlay
      ctx.fillStyle = 'rgba(10, 31, 68, 0.85)';
      ctx.fillRect(0, 0, canvas.width, 18);
      ctx.fillStyle = '#E2E8F0';
      ctx.font = '9px monospace';
      ctx.fillText(`CAM-01 // ${selectedJunction.code} • ${selectedJunction.fps} FPS • ${selectedJunction.inferenceMs}ms • ROI-ACTIVE`, 6, 12);

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [selectedJunction]);

  const approaches = [
    { dir: 'N', name: lang === 'HI' ? 'उत्तर पहुंच' : 'N-Approach', icon: ArrowUp, data: selectedJunction.approachData.N },
    { dir: 'S', name: lang === 'HI' ? 'दक्षिण पहुंच' : 'S-Approach', icon: ArrowDown, data: selectedJunction.approachData.S },
    { dir: 'E', name: lang === 'HI' ? 'पूर्व पहुंच' : 'E-Approach', icon: ArrowRight, data: selectedJunction.approachData.E },
    { dir: 'W', name: lang === 'HI' ? 'पश्चिम पहुंच' : 'W-Approach', icon: ArrowLeft, data: selectedJunction.approachData.W }
  ];

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl flex flex-col h-full overflow-hidden shadow-xs">
      {/* Header */}
      <div className="px-3.5 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Video className="w-3.5 h-3.5 text-[#0F2C59]" />
          <span className="text-xs font-bold text-[#0A1F44] uppercase tracking-wider">
            {lang === 'HI' ? 'CCTV / कंप्यूटर विजन HUD' : 'CCTV / Computer Vision HUD'} [{selectedJunction.code}]
          </span>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-[#64748B] text-[10px]">{lang === 'HI' ? 'चरण:' : 'PHASE:'}</span>
          <span className="font-bold text-[#16A34A]">{selectedJunction.activePhase}</span>
          <span className="px-1.5 py-0.2 rounded bg-[#F1F5F9] border border-[#E2E8F0] text-[#0A1F44] font-bold text-[10px]">
            {selectedJunction.phaseTimer}s
          </span>
        </div>
      </div>

      <div className="p-3 flex-1 flex flex-col justify-between space-y-3">
        
        {/* Compact Camera Feed Container */}
        <div className="rounded-lg border border-[#E2E8F0] bg-[#0A1F44] overflow-hidden shadow-xs">
          <canvas
            ref={canvasRef}
            width={320}
            height={115}
            className="w-full h-[115px] block"
          />
        </div>

        {/* Approach Lane ROI & PCU Matrix */}
        <div className="grid grid-cols-4 gap-1.5 font-mono text-[10px]">
          {approaches.map(app => {
            const isApproachGreen = (app.dir === 'N' || app.dir === 'S') 
              ? selectedJunction.activePhase === 'NS' 
              : selectedJunction.activePhase === 'EW';

            return (
              <div
                key={app.dir}
                className={`p-1.5 rounded-lg border text-center transition-all ${
                  isApproachGreen
                    ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]'
                    : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#475569]'
                }`}
              >
                <div className="flex items-center justify-center space-x-1 mb-0.5">
                  <span className="font-bold text-[#0A1F44]">{app.dir}</span>
                  <span className={`text-[8px] font-bold px-1 py-0.2 rounded ${
                    isApproachGreen ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#FEE2E2] text-[#DC2626]'
                  }`}>
                    {isApproachGreen ? (lang === 'HI' ? 'हरा' : 'GRN') : (lang === 'HI' ? 'लाल' : 'RED')}
                  </span>
                </div>
                <div className="font-bold text-[#0A1F44] text-xs tabular-nums">
                  {app.data.pcu} <span className="text-[8px] font-normal text-[#64748B]">PCU</span>
                </div>
                <div className="text-[9px] text-[#64748B] mt-0.5">
                  {app.data.count} {lang === 'HI' ? 'वाहन' : 'veh'} ({app.data.queueMeters}m)
                </div>
              </div>
            );
          })}
        </div>

        {/* Webster Timing & Split Bar */}
        <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] text-[#64748B]">{lang === 'HI' ? 'एडेप्टिव ग्रीन:' : 'ADAPTIVE GREEN:'}</span>
            <span className="font-bold text-[#16A34A]">{selectedJunction.dynamicGreenTime}s</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] text-[#64748B]">{lang === 'HI' ? 'फिक्स्ड योजना:' : 'FIXED PLAN:'}</span>
            <span className="font-bold text-[#475569]">{selectedJunction.fixedGreenTime}s</span>
          </div>
          <div className="text-[#16A34A] font-bold text-[10px]">
            Δ -{Math.max(0, (selectedJunction.baselineWaitTimeSec - selectedJunction.averageWaitTimeSec).toFixed(1))}s
          </div>
        </div>

      </div>
    </div>
  );
};
