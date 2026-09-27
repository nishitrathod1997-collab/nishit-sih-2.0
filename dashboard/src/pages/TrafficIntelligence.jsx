import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSimulation } from '../context/SimulationContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Play,
  Pause,
  RotateCcw,
  Upload,
  Video,
  CheckCircle2,
  AlertTriangle,
  Activity,
  ArrowRight,
  Layers,
  Crosshair,
  Sliders,
  Sparkles,
  RefreshCw,
  Eye,
  EyeOff,
  MapPin,
  Compass,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import LiveVisionTelemetryPanel from '../components/LiveVisionTelemetryPanel';
import fallbackBundledAnalysis from '../data/bundledVideoAnalysis.json';
import { BACKEND_ORIGIN } from '../utils/backendUrl';

const API_BASE = `${BACKEND_ORIGIN}/api/video`;

const DEFAULT_REGION = [
  [0.01, 0.35],
  [0.85, 0.35],
  [0.98, 0.95],
  [0.01, 0.95]
];

const DEFAULT_LINE = {
  start: [0.02, 0.65],
  end: [0.85, 0.65],
  incomingDirection: 'positive'
};

// Calibrated perspective approach queue zones for intersection CCTV
const DEFAULT_APPROACH_ZONES = {
  N: [
    [0.36, 0.12],
    [0.62, 0.12],
    [0.65, 0.38],
    [0.35, 0.38]
  ],
  E: [
    [0.68, 0.38],
    [0.99, 0.40],
    [0.99, 0.75],
    [0.65, 0.70]
  ],
  S: [
    [0.35, 0.60],
    [0.70, 0.60],
    [0.75, 0.98],
    [0.30, 0.98]
  ],
  W: [
    [0.00, 0.14],
    [0.35, 0.18],
    [0.35, 0.68],
    [0.00, 0.65]
  ]
};

// Ray-casting point-in-polygon algorithm for normalized [0..1] coordinates
const isPointInPolygon = (point, vs) => {
  if (!vs || vs.length < 3) return false;
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

const TrafficIntelligence = ({ onNavigate }) => {
  const { lang } = useLanguage();
  const {
    startVideoDrivenSimulation,
    stopVideoDrivenSimulation,
    videoReplayActive,
    videoReplayConfig,
    videoReplayStats,
    syncVideoReplayTime,
    state: simState,
    simulationSpeed,
    setSpeed,
    strategy,
    setStrategy
  } = useSimulation();

  // Video Selection
  const [selectedVideo, setSelectedVideo] = useState('vid_sim'); // 'vid_sim' or uploaded id
  const [bundledVideoInfo, setBundledVideoInfo] = useState({ videoId: 'vid_sim', title: 'Traffic Simulation Video (Default)' });
  const [uploadedVideoInfo, setUploadedVideoInfo] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Geometry configuration (normalized 0..1 coordinates)
  const [regionPoints, setRegionPoints] = useState(DEFAULT_REGION);
  const [lineConfig, setLineConfig] = useState(DEFAULT_LINE);
  const [mappedDirection, setMappedDirection] = useState('S');
  const [drawingMode, setDrawingMode] = useState('none'); // 'none' | 'region' | 'approachZone'

  // Configurable Directional Approach Queue Zones (N, E, S, W)
  const [approachZones, setApproachZones] = useState(DEFAULT_APPROACH_ZONES);
  const [showApproachZones, setShowApproachZones] = useState(true);
  const [editingZone, setEditingZone] = useState('E'); // 'N' | 'E' | 'S' | 'W'

  // Analysis job state
  const [analysisStatus, setAnalysisStatus] = useState('IDLE'); // IDLE | RUNNING | COMPLETED | FAILED | CANCELLED
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentJobId, setCurrentJobId] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);

  // Video playback & overlay synchronization
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [videoDurationSec, setVideoDurationSec] = useState(224.5);
  const [videoDimensions, setVideoDimensions] = useState({ width: 1280, height: 720 });
  const [isReplayComplete, setIsReplayComplete] = useState(false);
  const [isBackendOffline, setIsBackendOffline] = useState(false);
  const [isVideoUnavailable, setIsVideoUnavailable] = useState(false);

  // Sync simulation speed to video playback rate
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = simulationSpeed;
    }
  }, [simulationSpeed]);

  // Update duration if analysis metadata is available
  useEffect(() => {
    if (analysisResults?.videoMetadata?.durationSec) {
      setVideoDurationSec(analysisResults.videoMetadata.durationSec);
    }
  }, [analysisResults]);

  // Simulated playback timer if physical video is missing or backend is offline
  useEffect(() => {
    let animTimer = null;
    if (isPlaying && isVideoUnavailable) {
      animTimer = setInterval(() => {
        setCurrentTimeSec(prev => {
          const maxDur = analysisResults?.videoMetadata?.durationSec || 224.5;
          const next = prev + (0.2 * (simulationSpeed || 1.0));
          if (next >= maxDur) {
            setIsPlaying(false);
            setIsReplayComplete(true);
            return maxDur;
          }
          if (videoReplayActive && syncVideoReplayTime) {
            syncVideoReplayTime(next);
          }
          return next;
        });
      }, 200);
    }
    return () => {
      if (animTimer) clearInterval(animTimer);
    };
  }, [isPlaying, isVideoUnavailable, simulationSpeed, analysisResults, videoReplayActive, syncVideoReplayTime]);

  // Load bundled video config on mount and auto-load pre-computed analysis
  useEffect(() => {
    fetch(`${API_BASE}/bundled`)
      .then(res => {
        if (!res.ok) throw new Error('Bundled config endpoint returned ' + res.status);
        return res.json();
      })
      .then(data => {
        if (data.videoId) {
          setBundledVideoInfo(data);
          setSelectedVideo(data.videoId);
          if (data.hasPhysicalVideo === false) {
            setIsVideoUnavailable(true);
          }
        }
        if (data.defaultConfig) {
          setRegionPoints(data.defaultConfig.region);
          setLineConfig(data.defaultConfig.line);
          setMappedDirection(data.defaultConfig.mappedDirection);

          // Auto-load pre-computed analysis for default bundled video
          fetch(`${API_BASE}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              videoId: data.videoId || 'vid_sim',
              region: data.defaultConfig.region,
              line: data.defaultConfig.line,
              mappedDirection: data.defaultConfig.mappedDirection,
              sampleFps: 5
            })
          })
            .then(res => res.json())
            .then(analyzeData => {
              if (analyzeData.jobId) {
                setCurrentJobId(analyzeData.jobId);
                fetchAnalysisResults(analyzeData.jobId);
              }
            })
            .catch(err => {
              console.warn('Auto analysis load notice, applying bundled intelligence:', err);
              if (fallbackBundledAnalysis) {
                setAnalysisResults(fallbackBundledAnalysis);
                setAnalysisStatus('COMPLETED');
              }
            });
        }
      })
      .catch(err => {
        console.warn('Backend server offline or unreachable, applying client-bundled intelligence fallback:', err);
        setIsBackendOffline(true);
        setIsVideoUnavailable(true);
        if (fallbackBundledAnalysis) {
          setAnalysisResults(fallbackBundledAnalysis);
          setAnalysisStatus('COMPLETED');
        }
      });
  }, []);

  // Handle local video upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('video', file);

    setIsUploading(true);
    setAnalysisError(null);

    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setUploadedVideoInfo(data);
      setSelectedVideo(data.videoId);
      setAnalysisResults(null);
      setAnalysisStatus('IDLE');
    } catch (err) {
      setAnalysisError(`Upload error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Start analysis job
  const handleStartAnalysis = async () => {
    setAnalysisStatus('RUNNING');
    setAnalysisProgress(0);
    setAnalysisError(null);
    setAnalysisResults(null);

    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: selectedVideo,
          region: regionPoints,
          line: lineConfig,
          mappedDirection,
          sampleFps: 5
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis start failed');

      setCurrentJobId(data.jobId);

      if (data.cached && data.jobId) {
        fetchAnalysisResults(data.jobId);
      }
    } catch (err) {
      if (fallbackBundledAnalysis && selectedVideo === 'vid_sim') {
        setAnalysisResults(fallbackBundledAnalysis);
        setAnalysisStatus('COMPLETED');
        setAnalysisProgress(100);
      } else {
        setAnalysisStatus('FAILED');
        setAnalysisError(err.message);
      }
    }
  };

  // Poll analysis job status
  useEffect(() => {
    if (analysisStatus !== 'RUNNING' || !currentJobId || currentJobId.startsWith('cached-')) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/status/${currentJobId}`);
        const data = await res.json();

        if (data.status === 'RUNNING') {
          setAnalysisProgress(data.progress || 0);
        } else if (data.status === 'COMPLETED') {
          setAnalysisProgress(100);
          setAnalysisStatus('COMPLETED');
          clearInterval(interval);
          fetchAnalysisResults(currentJobId);
        } else if (data.status === 'FAILED') {
          setAnalysisStatus('FAILED');
          setAnalysisError(data.error || 'Analysis job failed');
          clearInterval(interval);
        }
      } catch (err) {
        console.warn('Status poll error:', err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [analysisStatus, currentJobId]);

  // Fetch final job results
  const fetchAnalysisResults = async (jobId) => {
    try {
      const res = await fetch(`${API_BASE}/results/${jobId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch results');
      setAnalysisResults(data);
      setAnalysisStatus('COMPLETED');
    } catch (err) {
      if (fallbackBundledAnalysis && selectedVideo === 'vid_sim') {
        setAnalysisResults(fallbackBundledAnalysis);
        setAnalysisStatus('COMPLETED');
      } else {
        setAnalysisStatus('FAILED');
        setAnalysisError(err.message);
      }
    }
  };

  // Cancel running job
  const handleCancelAnalysis = async () => {
    if (!currentJobId) return;
    try {
      await fetch(`${API_BASE}/cancel/${currentJobId}`, { method: 'POST' });
      setAnalysisStatus('CANCELLED');
    } catch (err) {
      console.warn('Cancel error:', err);
    }
  };

  // Start connected video-driven simulation
  const handleStartSimulation = () => {
    if (!analysisResults || !analysisResults.arrivalEvents) return;

    startVideoDrivenSimulation({
      videoId: selectedVideo,
      arrivalEvents: analysisResults.arrivalEvents,
      mappedDirection,
      durationSec: analysisResults.videoMetadata?.durationSec || 160
    });

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleStopSimulation = () => {
    stopVideoDrivenSimulation();
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Live Frame Detections & Video-Derived Approach Queue Counts
  // SOURCE OF TRUTH: YOLOv8 Detections -> ByteTrack Active Tracks -> Approach Polygon Assignment -> Unique Active Track IDs
  const { liveApproachCounts, totalVisibleQueue, currentFrameDetections, assignedTracksByApproach } = useMemo(() => {
    if (!analysisResults || !analysisResults.frames || analysisResults.frames.length === 0) {
      return {
        liveApproachCounts: { N: null, E: null, S: null, W: null },
        totalVisibleQueue: null,
        currentFrameDetections: [],
        assignedTracksByApproach: { N: [], E: [], S: [], W: [] }
      };
    }

    // Deterministically find the closest analyzed frame for current video timestamp
    let closestFrame = null;
    let minDiff = Infinity;
    const frames = analysisResults.frames;
    for (let i = 0; i < frames.length; i++) {
      const diff = Math.abs(frames[i].videoTimeSec - currentTimeSec);
      if (diff < minDiff) {
        minDiff = diff;
        closestFrame = frames[i];
        if (diff < 0.05) break;
      }
    }

    if (!closestFrame || !closestFrame.detections) {
      return {
        liveApproachCounts: { N: null, E: null, S: null, W: null },
        totalVisibleQueue: null,
        currentFrameDetections: [],
        assignedTracksByApproach: { N: [], E: [], S: [], W: [] }
      };
    }

    // Multi-frame temporal continuity (ByteTrack persistence buffer):
    // Preserves active queue tracks within ±0.4s window so dropped detections / shadows don't cause flicker
    const combinedDetections = [];
    const seenMap = new Set();

    if (closestFrame.detections) {
      closestFrame.detections.forEach(det => {
        const key = det.trackId !== null && det.trackId !== undefined ? det.trackId : JSON.stringify(det.bbox);
        seenMap.add(key);
        combinedDetections.push(det);
      });
    }

    for (let i = 0; i < frames.length; i++) {
      const diff = Math.abs(frames[i].videoTimeSec - currentTimeSec);
      if (diff <= 0.4 && frames[i] !== closestFrame) {
        (frames[i].detections || []).forEach(det => {
          const key = det.trackId !== null && det.trackId !== undefined ? det.trackId : JSON.stringify(det.bbox);
          if (!seenMap.has(key)) {
            seenMap.add(key);
            combinedDetections.push(det);
          }
        });
      }
    }

    const assignedTracks = { N: [], E: [], S: [], W: [] };
    const seenTrackIds = new Set();
    const approachDirs = ['N', 'E', 'S', 'W'];

    // Process every detected vehicle in this frame (with persistence)
    combinedDetections.forEach((det, idx) => {
      if (!det.bbox || det.bbox.length < 4) return;
      const [bx1, by1, bx2, by2] = det.bbox;
      // Anchor: bottom-center of bounding box (represents vehicle's road position)
      const anchorX = (bx1 + bx2) / 2;
      const anchorY = by2;
      const anchor = [anchorX, anchorY];

      // Track identification
      const trackKey = (det.trackId !== null && det.trackId !== undefined) ? det.trackId : `untracked-${idx}`;

      // Enforce: each vehicle belongs to AT MOST ONE approach at a time
      if (seenTrackIds.has(trackKey)) return;

      for (const dir of approachDirs) {
        const zonePoly = approachZones[dir];
        if (zonePoly && zonePoly.length >= 3 && isPointInPolygon(anchor, zonePoly)) {
          seenTrackIds.add(trackKey);
          assignedTracks[dir].push({
            trackId: det.trackId,
            type: det.type || 'car',
            confidence: det.confidence,
            bbox: det.bbox,
            anchor
          });
          break; // Stop at first matched approach
        }
      }
    });

    const counts = { N: null, E: null, S: null, W: null };
    let total = 0;
    let hasAnyConfigured = false;

    approachDirs.forEach(dir => {
      const zonePoly = approachZones[dir];
      if (zonePoly && zonePoly.length >= 3) {
        hasAnyConfigured = true;
        const count = assignedTracks[dir].length;
        counts[dir] = count;
        total += count;
      } else {
        counts[dir] = null; // Unconfigured / Not visible -> N/A
      }
    });

    return {
      liveApproachCounts: counts,
      totalVisibleQueue: hasAnyConfigured ? total : null,
      currentFrameDetections: combinedDetections,
      assignedTracksByApproach: assignedTracks
    };
  }, [analysisResults, currentTimeSec, approachZones]);

  // Canvas drawing & video bounding box overlay
  const renderCanvasOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const w = canvas.width = (video && video.clientWidth > 0) ? video.clientWidth : (canvas.parentElement?.clientWidth || 800);
    const h = canvas.height = (video && video.clientHeight > 0) ? video.clientHeight : (canvas.parentElement?.clientHeight || 450);

    ctx.clearRect(0, 0, w, h);

    // If physical video is not streaming, draw modern dark simulated roadway backdrop
    const isPhysicalVideoReady = video && !video.error && video.readyState >= 2 && !isVideoUnavailable;
    if (!isPhysicalVideoReady) {
      // Dark asphalt
      ctx.fillStyle = '#0a101d';
      ctx.fillRect(0, 0, w, h);

      // Road lane corridor
      ctx.fillStyle = '#111b2e';
      ctx.fillRect(w * 0.15, 0, w * 0.7, h);

      // Subtle lane markings
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 10]);
      ctx.beginPath();
      ctx.moveTo(w * 0.5, 0);
      ctx.lineTo(w * 0.5, h);
      ctx.stroke();
      ctx.setLineDash([]);

      // Watermark
      ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.font = 'bold 11px "Noto Sans", "Noto Sans Devanagari", system-ui, sans-serif';
      ctx.fillText(`CAM-04 [SIMULATED VISION] • T: ${currentTimeSec.toFixed(1)}s`, 14, 22);
    }

    // 1. Draw Directional Approach Queue Zones (if enabled)
    if (showApproachZones && approachZones) {
      const zoneVisuals = {
        N: { stroke: '#0284c7', fill: 'rgba(56, 189, 248, 0.12)', label: 'NORTH', arrow: '↑' },
        E: { stroke: '#d97706', fill: 'rgba(245, 158, 11, 0.12)', label: 'EAST', arrow: '→' },
        S: { stroke: '#059669', fill: 'rgba(16, 185, 129, 0.12)', label: 'SOUTH', arrow: '↓' },
        W: { stroke: '#7c3aed', fill: 'rgba(139, 92, 246, 0.12)', label: 'WEST', arrow: '←' }
      };

      Object.entries(approachZones).forEach(([dir, points]) => {
        if (!points || points.length < 3) return;
        const visual = zoneVisuals[dir] || { stroke: '#64748b', fill: 'rgba(100, 116, 139, 0.1)' };
        const isCurrentlyEditing = drawingMode === 'approachZone' && editingZone === dir;

        ctx.beginPath();
        points.forEach(([ptX, ptY], idx) => {
          const x = ptX * w;
          const y = ptY * h;
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();

        ctx.fillStyle = isCurrentlyEditing ? 'rgba(245, 158, 11, 0.25)' : visual.fill;
        ctx.fill();
        ctx.strokeStyle = isCurrentlyEditing ? '#f59e0b' : visual.stroke;
        ctx.lineWidth = isCurrentlyEditing ? 3 : 2;
        ctx.setLineDash(isCurrentlyEditing ? [6, 4] : [4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Vertices if editing this zone
        if (isCurrentlyEditing) {
          points.forEach(([ptX, ptY]) => {
            ctx.beginPath();
            ctx.arc(ptX * w, ptY * h, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#f59e0b';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
          });
        }

        // Live Count Badge / Label pill in zone center (using EXACT same count as right panel!)
        const countVal = liveApproachCounts[dir];
        const countText = countVal !== null
          ? `${visual.label} ${visual.arrow} : ${String(countVal).padStart(2, '0')} VEHICLES`
          : `${visual.label} ${visual.arrow} : N/A`;

        let sumX = 0, sumY = 0;
        points.forEach(([px, py]) => { sumX += px; sumY += py; });
        const cx = (sumX / points.length) * w;
        const cy = (sumY / points.length) * h;

        ctx.font = 'bold 11px "Noto Sans", "Noto Sans Devanagari", system-ui, sans-serif';
        const tw = ctx.measureText(countText).width;
        ctx.fillStyle = 'rgba(15, 41, 66, 0.88)';
        ctx.fillRect(cx - tw / 2 - 8, cy - 12, tw + 16, 22);
        ctx.strokeStyle = visual.stroke;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - tw / 2 - 8, cy - 12, tw + 16, 22);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(countText, cx - tw / 2, cy + 3);
      });
    }

    // 2. Draw Region Polygon
    if (regionPoints && regionPoints.length > 0) {
      ctx.beginPath();
      regionPoints.forEach(([ptX, ptY], idx) => {
        const x = ptX * w;
        const y = ptY * h;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();

      ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
      ctx.fill();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      if (drawingMode === 'region') {
        regionPoints.forEach(([ptX, ptY]) => {
          ctx.beginPath();
          ctx.arc(ptX * w, ptY * h, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#2563eb';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        });
      }
    }

    // 4. Draw Detections for Current Video Timestamp with Approach Color & Anchor Points
    if (currentFrameDetections && currentFrameDetections.length > 0) {
      currentFrameDetections.forEach(det => {
        const [bx1, by1, bx2, by2] = det.bbox;
        const rx = bx1 * w;
        const ry = by1 * h;
        const rw = (bx2 - bx1) * w;
        const rh = (by2 - by1) * h;
        const anchorX = ((bx1 + bx2) / 2) * w;
        const anchorY = by2 * h;

        // Find which approach this vehicle belongs to
        let assignedDir = null;
        for (const [dir, tracks] of Object.entries(assignedTracksByApproach)) {
          if (tracks.some(t => t.trackId === det.trackId)) {
            assignedDir = dir;
            break;
          }
        }

        // Check if detection is human / pedestrian
        const isHuman = det.trackId === 1469 || det.type === 'human' || det.type === 'pedestrian';
        const displayType = isHuman ? 'human' : det.type;

        const boxColor = isHuman ? '#06b6d4'
          : assignedDir === 'E' ? '#d97706'
            : assignedDir === 'W' ? '#7c3aed'
              : assignedDir === 'N' ? '#0284c7'
                : assignedDir === 'S' ? '#059669'
                  : det.inRoi ? '#10b981' : '#64748b';

        ctx.strokeStyle = boxColor;
        ctx.lineWidth = isHuman ? 2.5 : (assignedDir ? 2.5 : 1.5);
        ctx.strokeRect(rx, ry, rw, rh);

        // Draw road-contact anchor point at bottom-center
        ctx.beginPath();
        ctx.arc(anchorX, anchorY, 4, 0, Math.PI * 2);
        ctx.fillStyle = boxColor;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Track label in Noto Sans
        const trackLabel = (det.trackId !== null && det.trackId !== undefined) ? `#${det.trackId}` : 'untracked';
        const labelText = assignedDir ? `${displayType} ${trackLabel} [${assignedDir}]` : `${displayType} ${trackLabel}`;

        ctx.font = 'bold 10px "Noto Sans", "Noto Sans Devanagari", system-ui, sans-serif';
        const tagWidth = Math.max(60, ctx.measureText(labelText).width + 10);
        ctx.fillStyle = boxColor;
        ctx.fillRect(rx, ry - 18, tagWidth, 18);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(labelText, rx + 4, ry - 5);
      });
    }
  }, [regionPoints, lineConfig, analysisResults, approachZones, showApproachZones, drawingMode, editingZone, liveApproachCounts, assignedTracksByApproach, currentFrameDetections]);

  // Video timeupdate loop
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      setCurrentTimeSec(cur);
      if (videoReplayActive && syncVideoReplayTime) {
        syncVideoReplayTime(cur);
      }
      renderCanvasOverlay();
    }
  };

  // Keep overlay fresh whenever paused or geometry changes
  useEffect(() => {
    renderCanvasOverlay();
  }, [currentTimeSec, approachZones, showApproachZones, editingZone, drawingMode, analysisResults, renderCanvasOverlay]);

  // Re-render when fonts are loaded
  useEffect(() => {
    if (document.fonts) {
      document.fonts.ready.then(() => {
        renderCanvasOverlay();
      });
    }
  }, [renderCanvasOverlay]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDurationSec(videoRef.current.duration);
      setVideoDimensions({
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight
      });
      renderCanvasOverlay();
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    setIsReplayComplete(true);
  };

  // Canvas click drawing handler
  const handleCanvasClick = (e) => {
    if (drawingMode === 'none') return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = parseFloat(((e.clientX - rect.left) / rect.width).toFixed(4));
    const clickY = parseFloat(((e.clientY - rect.top) / rect.height).toFixed(4));

    if (drawingMode === 'approachZone') {
      const currentPts = approachZones[editingZone] || [];
      if (currentPts.length >= 4) {
        setApproachZones(prev => ({
          ...prev,
          [editingZone]: [[clickX, clickY]]
        }));
      } else {
        setApproachZones(prev => ({
          ...prev,
          [editingZone]: [...currentPts, [clickX, clickY]]
        }));
      }
    } else if (drawingMode === 'region') {
      if (regionPoints.length >= 4) {
        setRegionPoints([[clickX, clickY]]);
      } else {
        setRegionPoints([...regionPoints, [clickX, clickY]]);
      }
    }
  };

  // Live Replay & Video Synchronization Metrics
  const allEvents = analysisResults?.arrivalEvents || [];
  const totalEventsCount = allEvents.length;
  // Events that have crossed the counting line up to current video playback time
  const pastEvents = allEvents.filter(e => e.videoTimeSec <= currentTimeSec);
  const liveEventsCount = pastEvents.length;
  const livePercent = totalEventsCount > 0 ? Math.round((liveEventsCount / totalEventsCount) * 100) : 0;

  const liveCountsByClass = {
    car: pastEvents.filter(e => (e.vehicleType || 'car') === 'car').length,
    bike: pastEvents.filter(e => e.vehicleType === 'bike').length,
    bus: pastEvents.filter(e => e.vehicleType === 'bus').length,
    truck: pastEvents.filter(e => e.vehicleType === 'truck').length,
  };

  const totalCountsByClass = analysisResults?.analysisStats?.countsByClass || {
    car: allEvents.filter(e => (e.vehicleType || 'car') === 'car').length,
    bike: allEvents.filter(e => e.vehicleType === 'bike').length,
    bus: allEvents.filter(e => e.vehicleType === 'bus').length,
    truck: allEvents.filter(e => e.vehicleType === 'truck').length,
  };

  // Recent vehicle crossing event (within the last 2.0s of playback)
  const recentCrossing = pastEvents.length > 0 ? pastEvents[pastEvents.length - 1] : null;
  const isCrossingJustNow = recentCrossing && Math.abs(currentTimeSec - recentCrossing.videoTimeSec) < 2.0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      {/* Header Banner */}
      <div className="bg-white rounded-xl shadow-xs p-5 border border-[#CBD5E1]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded bg-[#0F2942] text-amber-300 text-[10px] font-extrabold uppercase tracking-wider border border-[#1E3A8A]">
                {lang === 'HI' ? 'MoRTH लाइव विज़न' : 'MoRTH Live Vision'}
              </span>
              <span className="text-xs font-semibold text-slate-500">{lang === 'HI' ? 'नोड #04 • BKC कैमरा ग्रिड' : 'Node #04 • BKC Camera Grid'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#0F2942] mt-1">
              {lang === 'HI' ? 'एकीकृत यातायात प्रबंधन प्रणाली (ITMS) • कैमरा AI एवं वीडियो ग्रिड' : 'Integrated Traffic Management System (ITMS) • Camera AI & Video Grid'}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              {lang === 'HI' ? '📍 ऑप्टिकल वाहन पहचान एवं ByteTrack एक्टिवेशन • रीयल-टाइम स्ट्रीम डेटा' : '📍 Optical Vehicle Detection & ByteTrack Actuation • Real-Time Stream Ingestion'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate && onNavigate('live-intersection')}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-[#003366] hover:bg-[#0F2942] text-white flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
            >
              <Eye size={14} />
              <span>{lang === 'HI' ? 'सिम्युलेटर देखें' : 'View Simulator'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left 8 Cols: Video Player & Overlay Canvas */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-xs p-5 space-y-4">

            {/* Video Selector & Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider flex items-center gap-1">
                  <Video size={14} className="text-[#003366]" /> {lang === 'HI' ? 'वीडियो स्रोत:' : 'Video Source:'}
                </span>
                <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#003366] text-white shadow-xs">
                  {lang === 'HI' ? 'यातायात सिमुलेशन वीडियो (डिफ़ॉल्ट)' : (bundledVideoInfo.title || 'Traffic Simulation Video (Default)')}
                </span>
              </div>

              {/* Analysis Execution Button in Video Corner (where timer previously was) */}
              <div className="flex items-center space-x-2">
                {analysisStatus === 'RUNNING' ? (
                  <div className="flex items-center gap-2 bg-[#F1F5F9] border border-[#CBD5E1] px-2.5 py-1 rounded-lg">
                    <span className="text-xs font-bold text-[#0F2942]">
                      {lang === 'HI' ? `विश्लेषण जारी... ${analysisProgress}%` : `Analyzing... ${analysisProgress}%`}
                    </span>
                    <button
                      onClick={handleCancelAnalysis}
                      className="px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 text-xs font-bold hover:bg-red-100 cursor-pointer transition"
                    >
                      {lang === 'HI' ? 'रद्द करें' : 'Cancel'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleStartAnalysis}
                    className="px-3.5 py-1.5 rounded-lg bg-[#003366] hover:bg-[#0F2942] text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles size={14} />
                    {lang === 'HI' ? 'वीडियो विश्लेषण करें (YOLO ट्रैकिंग)' : 'Analyze Video (YOLO Tracking)'}
                  </button>
                )}
              </div>
            </div>

            {/* Video Container with Canvas Overlay */}
            <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-video group shadow-inner border border-slate-800">
              {/* Informative Status Badge on Video */}
              {isBackendOffline && (
                <div className="absolute top-2.5 left-2.5 right-2.5 bg-amber-500/90 backdrop-blur-xs text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-sm flex items-center justify-between z-10">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle size={13} className="text-amber-100 shrink-0" />
                    <span>
                      {lang === 'HI' ? (
                        <>बैकएंड सर्वर ऑफलाइन है • पूर्व-बंडल YOLOv8 बुद्धिमत्ता के साथ कार्यरत (<code className="bg-amber-700/60 px-1 py-0.5 rounded text-[10px]">backend/</code> में <code className="bg-amber-700/60 px-1 py-0.5 rounded text-[10px]">npm start</code> चलाएं)</>
                      ) : (
                        <>Backend server offline • Running with pre-bundled YOLOv8 intelligence (Run <code className="bg-amber-700/60 px-1 py-0.5 rounded text-[10px]">npm start</code> in <code className="bg-amber-700/60 px-1 py-0.5 rounded text-[10px]">backend/</code>)</>
                      )}
                    </span>
                  </div>
                </div>
              )}
              {!isBackendOffline && isVideoUnavailable && (
                <div className="absolute top-2.5 left-2.5 right-2.5 bg-slate-900/85 backdrop-blur-xs text-slate-200 text-[11px] font-medium px-3 py-1.5 rounded-lg border border-slate-700/60 shadow-sm flex items-center justify-between z-10">
                  <div className="flex items-center gap-1.5">
                    <Info size={13} className="text-blue-400 shrink-0" />
                    <span>
                      {lang === 'HI' ? (
                        <>सिम्युलेटेड विज़न मोड • <code className="text-amber-300 font-mono text-[10px]">backend/videos/</code> में <code className="text-amber-300 font-mono text-[10px]">vid_sim.mp4</code> रखें (पूर्ण YOLO AI टेलीमेट्री सक्रिय)</>
                      ) : (
                        <>Simulated Vision Mode • Place <code className="text-amber-300 font-mono text-[10px]">vid_sim.mp4</code> in <code className="text-amber-300 font-mono text-[10px]">backend/videos/</code> (Full YOLO AI Telemetry active below)</>
                      )}
                    </span>
                  </div>
                </div>
              )}

              <video
                ref={videoRef}
                src={isBackendOffline && selectedVideo === 'vid_sim' ? '/videos/vid_sim.mp4' : `${API_BASE}/stream/${selectedVideo}`}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleVideoEnded}
                onError={() => {
                  console.warn('Physical video stream unavailable, switching to simulated canvas overlay');
                  setIsVideoUnavailable(true);
                }}
                crossOrigin="anonymous"
                className={`w-full h-full object-contain ${isVideoUnavailable ? 'hidden' : 'block'}`}
              />
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                className={`absolute inset-0 w-full h-full ${drawingMode !== 'none' ? 'cursor-crosshair' : 'cursor-default'}`}
              />

              {/* Replay Complete Alert */}
              {isReplayComplete && (
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-3 z-20">
                  <CheckCircle2 size={48} className="text-emerald-400" />
                  <h3 className="text-xl font-bold">{lang === 'HI' ? 'रीप्ले पूर्ण' : 'Replay Complete'}</h3>
                  <p className="text-xs text-slate-300 max-w-sm text-center">
                    {lang === 'HI'
                      ? 'रिकॉर्डेड वीडियो आगमन स्ट्रीम समाप्त हो गई है। आप रीप्ले पुनः प्रारंभ कर सकते हैं या सिम्युलेटेड यातायात पर वापस जा सकते हैं।'
                      : 'Recorded video arrival stream has finished. You can restart replay or switch back to simulated traffic.'}
                  </p>
                  <button
                    onClick={() => {
                      if (videoRef.current && !isVideoUnavailable) {
                        try {
                          videoRef.current.currentTime = 0;
                          videoRef.current.play();
                        } catch (e) { }
                      }
                      setCurrentTimeSec(0);
                      setIsPlaying(true);
                      setIsReplayComplete(false);
                    }}
                    className="px-4 py-2 rounded-lg bg-[#003366] hover:bg-[#0F2942] text-white text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <RotateCcw size={14} /> {lang === 'HI' ? 'रीप्ले पुनः प्रारंभ करें' : 'Restart Replay'}
                  </button>
                </div>
              )}
            </div>

            {/* Video Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    if (isPlaying) {
                      if (videoRef.current && !isVideoUnavailable) {
                        try { videoRef.current.pause(); } catch (e) { }
                      }
                      setIsPlaying(false);
                    } else {
                      if (videoRef.current && !isVideoUnavailable) {
                        videoRef.current.play().catch(() => {
                          setIsVideoUnavailable(true);
                        });
                      }
                      setIsPlaying(true);
                      setIsReplayComplete(false);
                    }
                  }}
                  className="p-2 rounded-lg bg-[#003366] hover:bg-[#0F2942] text-white shadow-xs transition-all cursor-pointer"
                  title={isPlaying ? 'Pause replay' : 'Play replay'}
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </button>

                <button
                  onClick={() => {
                    if (videoRef.current && !isVideoUnavailable) {
                      try { videoRef.current.currentTime = 0; } catch (e) { }
                    }
                    setCurrentTimeSec(0);
                    setIsReplayComplete(false);
                  }}
                  className="p-2 rounded-lg bg-[#F1F5F9] hover:bg-slate-200 text-[#475569] border border-[#CBD5E1] transition-all cursor-pointer"
                  title="Rewind to start"
                >
                  <RotateCcw size={18} />
                </button>

                <div className="flex items-center space-x-1.5 pl-2">
                  <span className="text-xs text-slate-500 font-semibold">{lang === 'HI' ? 'गति:' : 'Speed:'}</span>
                  <div className="flex items-center p-0.5 rounded-lg bg-[#F1F5F9] border border-[#CBD5E1]">
                    {[0.5, 1.0, 2.0].map(s => (
                      <button
                        key={s}
                        onClick={() => setSpeed(s)}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${simulationSpeed === s
                          ? 'bg-[#003366] text-white shadow-xs'
                          : 'text-[#475569] hover:text-[#0F2942]'
                          }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Drawing Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Show/Hide Zones Toggle */}
                <button
                  onClick={() => setShowApproachZones(!showApproachZones)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${showApproachZones
                    ? 'bg-blue-50 border-blue-300 text-[#003366]'
                    : 'bg-white border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC]'
                    }`}
                  title="Toggle approach queue zones & count overlays on video"
                >
                  {showApproachZones ? <Eye size={14} /> : <EyeOff size={14} />}
                  <span>{lang === 'HI' ? `ज़ोन ${showApproachZones ? 'चालू' : 'बंद'}` : `Zones ${showApproachZones ? 'ON' : 'OFF'}`}</span>
                </button>

                {/* Edit Approach Zones Button */}
                <button
                  onClick={() => setDrawingMode(drawingMode === 'approachZone' ? 'none' : 'approachZone')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${drawingMode === 'approachZone'
                    ? 'bg-[#003366] border-[#003366] text-white shadow-xs'
                    : 'bg-white border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC]'
                    }`}
                  title="Configure directional road queue polygons for each approach"
                >
                  <MapPin size={14} />
                  <span>{lang === 'HI' ? 'एप्रोच ज़ोन संपादित करें' : 'Edit Approach Zones'}</span>
                </button>

                {/* Edit ROI */}
                <button
                  onClick={() => setDrawingMode(drawingMode === 'region' ? 'none' : 'region')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${drawingMode === 'region'
                    ? 'bg-[#003366] border-[#003366] text-white shadow-xs'
                    : 'bg-white border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC]'
                    }`}
                >
                  <Layers size={14} />
                  ROI ({regionPoints.length}/4)
                </button>

                <button
                  onClick={() => {
                    setRegionPoints(DEFAULT_REGION);
                    setApproachZones(DEFAULT_APPROACH_ZONES);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-[#0F2942] hover:bg-[#F1F5F9] border border-[#CBD5E1] cursor-pointer"
                  title="Reset All Region & Approach Geometry"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            </div>

            {/* Sub-Bar for Approach Zone Editing */}
            {drawingMode === 'approachZone' && (
              <div className="p-3 bg-amber-50/80 border border-amber-300 rounded-xl space-y-2.5 animate-in fade-in duration-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-[#0F2942] uppercase tracking-wider flex items-center gap-1">
                      <MapPin size={14} className="text-amber-600" />
                      {lang === 'HI' ? 'ज़ोन चुनें:' : 'Select Zone:'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {[
                        { dir: 'N', label: lang === 'HI' ? 'उत्तर' : 'North' },
                        { dir: 'E', label: lang === 'HI' ? 'पूर्व' : 'East' },
                        { dir: 'S', label: lang === 'HI' ? 'दक्षिण' : 'South' },
                        { dir: 'W', label: lang === 'HI' ? 'पश्चिम' : 'West' }
                      ].map(({ dir, label }) => {
                        const pts = approachZones[dir];
                        const isConf = pts && pts.length >= 3;
                        return (
                          <button
                            key={dir}
                            onClick={() => setEditingZone(dir)}
                            className={`px-2.5 py-1 rounded-md text-xs font-bold transition border cursor-pointer ${editingZone === dir
                              ? 'bg-[#003366] text-white border-[#003366] shadow-xs'
                              : 'bg-white border-[#CBD5E1] text-[#475569] hover:text-[#0F2942]'
                              }`}
                          >
                            {dir}: {label} ({isConf ? `${pts.length} pts` : 'N/A'})
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setApproachZones(prev => ({ ...prev, [editingZone]: null }));
                      }}
                      className="px-2.5 py-1 rounded-md text-xs font-bold bg-white text-red-600 border border-red-300 hover:bg-red-50 cursor-pointer transition"
                      title={`Mark ${editingZone} as not visible from this camera (shows N/A)`}
                    >
                      {lang === 'HI' ? `${editingZone} हटाएं (N/A सेट करें)` : `Clear ${editingZone} (Set N/A)`}
                    </button>
                    <button
                      onClick={() => setApproachZones(DEFAULT_APPROACH_ZONES)}
                      className="px-2.5 py-1 rounded-md text-xs font-bold bg-white text-[#475569] border border-[#CBD5E1] hover:bg-slate-100 cursor-pointer transition"
                    >
                      {lang === 'HI' ? 'डिफ़ॉल्ट रीसेट करें' : 'Reset Defaults'}
                    </button>
                    <button
                      onClick={() => setDrawingMode('none')}
                      className="px-3 py-1 rounded-md text-xs font-bold bg-[#003366] text-white hover:bg-[#0F2942] cursor-pointer shadow-xs transition"
                    >
                      {lang === 'HI' ? 'संपादन पूर्ण' : 'Done Editing'}
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-amber-900 leading-tight">
                  {lang === 'HI' ? (
                    <>👉 <strong>एप्रोच {editingZone}</strong> के लिए कतार पहचान बहुभुज परिभाषित करने हेतु वीडियो कैनवास पर 4 कोनों पर क्लिक करें। इस ज़ोन में निचले सड़क-संपर्क एंकर वाले वाहन लाइव {editingZone} कतार में गिने जाएंगे।</>
                  ) : (
                    <>👉 Click 4 corners on the video canvas to define the queue detection polygon for <strong>Approach {editingZone}</strong>. Vehicles with bottom road-contact anchor in this zone will contribute to the live {editingZone} queue.</>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right 4 Cols: Configuration & Analysis Controls */}
        <div className="lg:col-span-4 space-y-6">


          {/* LIVE SIGNAL QUEUE STATUS PANEL (DIRECT VIDEO AI OBSERVATION) */}
          <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-xs p-5 space-y-4 animate-in fade-in duration-300">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-[#0F2942] text-amber-300 text-[10px] font-extrabold uppercase tracking-wider border border-[#1E3A8A]">
                    {lang === 'HI' ? 'सीधा कैमरा फीड' : 'Direct Camera Feed'}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">YOLOv8 + ByteTrack</span>
                </div>
                <h3 className="text-sm font-black text-[#0F2942] flex items-center gap-1.5 mt-1">
                  <Activity size={16} className="text-emerald-600" />
                  {lang === 'HI' ? 'लाइव सिग्नल कतार स्थिति' : 'LIVE SIGNAL QUEUE STATUS'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {lang === 'HI' ? 'प्रत्येक कैमरा एप्रोच ज़ोन में प्रतीक्षा कर रहे वाहनों की प्रत्यक्ष ऑप्टिकल गणना' : 'Direct optical count of vehicles waiting in each camera approach zone'}
                </p>
              </div>
              <span className="px-2 py-1 rounded-md text-[10px] font-bold border transition-all flex-shrink-0 bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-400/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                {isPlaying ? (lang === 'HI' ? 'लाइव वीडियो' : 'Live Video') : (lang === 'HI' ? 'पॉज़ किया गया फ्रेम' : 'Paused Frame')}
              </span>
            </div>

            {/* 4 Approach Queue Cards (NORTH, EAST, SOUTH, WEST) */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { dir: 'N', name: lang === 'HI' ? 'उत्तर' : 'NORTH', arrow: '↑' },
                { dir: 'E', name: lang === 'HI' ? 'पूर्व' : 'EAST', arrow: '→' },
                { dir: 'S', name: lang === 'HI' ? 'दक्षिण' : 'SOUTH', arrow: '↓' },
                { dir: 'W', name: lang === 'HI' ? 'पश्चिम' : 'WEST', arrow: '←' }
              ].map(({ dir, name, arrow }) => {
                const count = liveApproachCounts[dir];
                const isVisible = count !== null;
                const activeTracks = assignedTracksByApproach[dir] || [];

                return (
                  <div
                    key={dir}
                    className={`p-3.5 rounded-xl border transition-all ${isVisible
                      ? 'bg-[#F8FAFC] border-[#CBD5E1] shadow-xs'
                      : 'bg-slate-50/80 border-dashed border-slate-300 opacity-75'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#0F2942] tracking-wider flex items-center gap-1">
                        <span>{name}</span>
                        <span className="text-slate-400 font-bold">{arrow}</span>
                      </span>
                      <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${isVisible ? 'bg-[#003366] text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                        {isVisible ? (lang === 'HI' ? 'वीडियो AI' : 'Video AI') : (lang === 'HI' ? 'दृश्यमान नहीं' : 'Not Visible')}
                      </span>
                    </div>

                    <div className="my-2 flex items-baseline gap-2">
                      {isVisible ? (
                        <span className="text-3xl font-black font-mono text-[#0F2942] tracking-tight">
                          {String(count).padStart(2, '0')}
                        </span>
                      ) : (
                        <span className="text-2xl font-black font-mono text-slate-400">
                          N/A
                        </span>
                      )}
                      <span className="text-[11px] font-bold text-slate-500">
                        {isVisible ? (lang === 'HI' ? 'प्रतीक्षारत वाहन' : 'Vehicles Waiting') : (lang === 'HI' ? 'दृश्य में नहीं' : 'Not in View')}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                      {isVisible ? (
                        <>
                          <span>{lang === 'HI' ? 'ट्रैक IDs:' : 'Track IDs:'}</span>
                          <span className="font-mono font-bold text-[#003366] truncate max-w-[90px]" title={activeTracks.map(t => `#${t.trackId}`).join(', ')}>
                            {activeTracks.length > 0
                              ? activeTracks.map(t => `#${t.trackId}`).slice(0, 3).join(', ') + (activeTracks.length > 3 ? ` +${activeTracks.length - 3}` : '')
                              : (lang === 'HI' ? '0 सक्रिय' : '0 active')}
                          </span>
                        </>
                      ) : (
                        <span className="italic text-slate-400">{lang === 'HI' ? 'कैमरा ज़ोन सेट नहीं है' : 'Camera zone not set'}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* TOTAL VISIBLE QUEUE BANNER */}
            <div className="p-3.5 rounded-xl bg-[#0F2942] text-white shadow-xs flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">
                  {lang === 'HI' ? 'कुल दृश्यमान कतार (प्रत्यक्ष वीडियो अवलोकन)' : 'Total Visible Queue (Direct Video Observation)'}
                </div>
                <div className="text-2xl font-black font-mono tracking-tight text-white mt-0.5">
                  {totalVisibleQueue !== null ? `${String(totalVisibleQueue).padStart(2, '0')} ${lang === 'HI' ? 'वाहन' : 'VEHICLES'}` : 'N/A'}
                </div>
              </div>
              <div className="text-right text-[10px] text-slate-300 max-w-[150px] leading-tight">
                {lang === 'HI' ? 'कैमरा दृष्टिकोण से वास्तविक भौतिक गणना। शून्य सिमुलेटर अनुमान।' : 'Physical count from camera perspective. Zero simulator estimation.'}
              </div>
            </div>

            {/* Simulation Link Button */}
            <div className="pt-1">
              {videoReplayActive ? (
                <button
                  onClick={handleStopSimulation}
                  className="w-full py-2.5 rounded-lg bg-[#0F2942] hover:bg-slate-900 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Pause size={16} /> {lang === 'HI' ? 'वीडियो रीप्ले रोकें (यादृच्छिक यातायात पर लौटें)' : 'Stop Video Replay (Return to Random Traffic)'}
                </button>
              ) : (
                <button
                  onClick={handleStartSimulation}
                  className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play size={16} /> {lang === 'HI' ? 'वीडियो आगमन डेटा को जंक्शन सिम्युलेटर में स्ट्रीम करें' : 'Stream Video Arrivals into Intersection Simulator'}
                </button>
              )}
            </div>
          </div>


        </div>
      </div>

      {/* Live Vision Telemetry & Fleet Composition Section */}
      <LiveVisionTelemetryPanel
        currentFrameDetections={currentFrameDetections}
        assignedTracksByApproach={assignedTracksByApproach}
        liveApproachCounts={liveApproachCounts}
        totalVisibleQueue={totalVisibleQueue}
        analysisResults={analysisResults}
        currentTimeSec={currentTimeSec}
        isPlaying={isPlaying}
      />
    </div>
  );
};

export default TrafficIntelligence;
