import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Layers, RefreshCw, AlertTriangle, Eye, Compass, ZoomIn, ZoomOut, CheckCircle2, Radio, Navigation, ShieldCheck } from 'lucide-react';
import { loadGoogleMaps } from '../utils/GoogleMapsLoader';
import { JUNCTION_COORDINATES } from '../utils/CorridorCoordinator';

// Clean, high-readability Map Style for traffic operations center
const MAP_STYLES = [
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'transit',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ lightness: 10 }]
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#cadcf8' }]
  }
];

export default function CityCorridorMap({
  corridor,
  junctionStates = {},
  selectedJunctionId,
  onSelectJunction,
  coordinationActive = true,
  lang = 'EN'
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const trafficLayerRef = useRef(null);
  const markersRef = useRef({});
  const polylinesRef = useRef([]);
  const infoWindowRef = useRef(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [isTrafficLayerActive, setIsTrafficLayerActive] = useState(true);
  const [mapType, setMapType] = useState('roadmap'); // 'roadmap' | 'hybrid'

  // Initialize Google Maps
  useEffect(() => {
    let isMounted = true;

    loadGoogleMaps()
      .then((googleMaps) => {
        if (!isMounted || !mapContainerRef.current) return;

        try {
          const defaultCenter = corridor.center || { lat: 19.055, lng: 72.848 };
          const map = new googleMaps.Map(mapContainerRef.current, {
            center: defaultCenter,
            zoom: corridor.zoom || 13,
            mapTypeId: mapType,
            styles: MAP_STYLES,
            disableDefaultUI: true,
            zoomControl: false,
            gestureHandling: 'greedy',
            backgroundColor: '#F8FAFC'
          });

          // Create & attach Traffic Layer
          const trafficLayer = new googleMaps.TrafficLayer();
          trafficLayer.setMap(map);
          trafficLayerRef.current = trafficLayer;

          infoWindowRef.current = new googleMaps.InfoWindow({
            disableAutoPan: false
          });

          mapInstanceRef.current = map;
          setMapLoaded(true);
          setLoadError(null);
        } catch (err) {
          console.error('Error initializing map:', err);
          setLoadError(err.message || 'Failed to initialize Google Maps');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Google Maps load failed:', err.message);
        setLoadError(err.message || 'Unable to connect to Google Maps API');
      });

    return () => {
      isMounted = false;
    };
  }, [corridor.id]);

  // Handle Traffic Layer Toggle
  const toggleTrafficLayer = useCallback(() => {
    if (!trafficLayerRef.current || !mapInstanceRef.current) return;
    if (isTrafficLayerActive) {
      trafficLayerRef.current.setMap(null);
      setIsTrafficLayerActive(false);
    } else {
      trafficLayerRef.current.setMap(mapInstanceRef.current);
      setIsTrafficLayerActive(true);
    }
  }, [isTrafficLayerActive]);

  // Handle Map Type Toggle (Roadmap vs Satellite)
  const toggleMapType = useCallback(() => {
    if (!mapInstanceRef.current) return;
    const nextType = mapType === 'roadmap' ? 'hybrid' : 'roadmap';
    mapInstanceRef.current.setMapTypeId(nextType);
    setMapType(nextType);
  }, [mapType]);

  // Zoom controls
  const handleZoom = useCallback((direction) => {
    if (!mapInstanceRef.current) return;
    const currentZoom = mapInstanceRef.current.getZoom() || 13;
    mapInstanceRef.current.setZoom(direction === 'in' ? currentZoom + 1 : currentZoom - 1);
  }, []);

  // Recenter map on corridor
  const handleRecenter = useCallback(() => {
    if (!mapInstanceRef.current || !corridor) return;
    mapInstanceRef.current.panTo(corridor.center);
    mapInstanceRef.current.setZoom(corridor.zoom || 13);
  }, [corridor]);

  // Update Junction Markers & Corridor Polylines
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !window.google?.maps) return;

    const google = window.google;
    const map = mapInstanceRef.current;

    // 1. Draw/Update Corridor Links (Polylines)
    // Clear old polylines
    polylinesRef.current.forEach((line) => line.setMap(null));
    polylinesRef.current = [];

    if (corridor.links) {
      corridor.links.forEach((link) => {
        const fromCoords = JUNCTION_COORDINATES[link.from];
        const toCoords = JUNCTION_COORDINATES[link.to];
        if (!fromCoords || !toCoords) return;

        const fromState = junctionStates[link.from];
        const isCongested = fromState?.classification?.level === 'HEAVY' || fromState?.classification?.level === 'JAM';
        const isSlow = fromState?.classification?.level === 'SLOW';

        const strokeColor = isCongested ? '#DC2626' : (isSlow ? '#F5A623' : '#10B981');

        // Draw arterial corridor line
        const polyline = new google.maps.Polyline({
          path: [fromCoords, toCoords],
          geodesic: true,
          strokeColor,
          strokeOpacity: 0.85,
          strokeWeight: 5,
          icons: [
            {
              icon: {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 3.5,
                strokeColor: '#FFFFFF',
                strokeWeight: 1.5,
                fillColor: strokeColor,
                fillOpacity: 1
              },
              offset: '50%',
              repeat: '100px'
            }
          ],
          map
        });

        polylinesRef.current.push(polyline);
      });
    }

    // 2. Draw/Update Junction Markers
    corridor.junctionIds.forEach((jId) => {
      const coords = JUNCTION_COORDINATES[jId];
      if (!coords) return;

      const state = junctionStates[jId];
      const junction = state?.junction;
      const classification = state?.classification;
      const isSelected = selectedJunctionId === jId;

      const markerColor = classification?.dotColor || '#16A34A';
      const labelText = jId;

      // Custom SVG Marker Icon with status color ring
      const svgMarker = {
        path: google.maps.SymbolPath.CIRCLE,
        scale: isSelected ? 17 : 14,
        fillColor: markerColor,
        fillOpacity: 1,
        strokeColor: isSelected ? '#F5A623' : '#FFFFFF',
        strokeWeight: isSelected ? 4 : 2.5
      };

      let marker = markersRef.current[jId];

      if (!marker) {
        marker = new google.maps.Marker({
          position: coords,
          map,
          title: coords.name,
          icon: svgMarker,
          label: {
            text: labelText,
            color: '#FFFFFF',
            fontWeight: 'bold',
            fontSize: '11px'
          },
          zIndex: isSelected ? 100 : 10
        });

        marker.addListener('click', () => {
          if (onSelectJunction) onSelectJunction(jId);

          // Build InfoWindow Content
          const currentJunction = junctionStates[jId]?.junction;
          const currentClass = junctionStates[jId]?.classification;
          const incoming = junctionStates[jId]?.incomingPredictions?.[0];

          const contentHtml = `
            <div style="font-family: system-ui, -apple-system, sans-serif; padding: 6px; min-width: 220px; max-width: 280px;">
              <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px; margin-bottom: 8px;">
                <strong style="color: #0A1F44; font-size: 13px;">${coords.name}</strong>
                <span style="font-size: 10px; font-weight: bold; background: #0A1F44; color: #FFF; padding: 2px 6px; rounded: 4px;">${coords.code}</span>
              </div>
              
              <div style="margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${currentClass?.dotColor || '#16A34A'};"></span>
                <span style="font-size: 11px; font-weight: bold; color: ${currentClass?.color || '#16A34A'};">
                  ${currentClass?.label || 'FREE FLOW'}
                </span>
              </div>

              <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">
                Active Phase: <strong>${currentJunction?.activePhase || 'NS'} GREEN</strong> (${currentJunction?.phaseTimer || 0}s remaining)
              </div>
              <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">
                Total Demand: <strong>${currentJunction?.totalPcu || 0} PCU</strong>
              </div>

              ${incoming ? `
                <div style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 6px; padding: 6px; margin-top: 6px;">
                  <div style="font-size: 10px; font-weight: bold; color: #92400E;">⚡ Incoming Wave Detected</div>
                  <div style="font-size: 10px; color: #78350F; margin-top: 2px;">
                    +${incoming.dispatchedPcu} PCU arriving from ${incoming.fromJunctionId} in ~${incoming.etaSeconds}s.
                  </div>
                </div>
              ` : ''}
            </div>
          `;

          if (infoWindowRef.current) {
            infoWindowRef.current.setContent(contentHtml);
            infoWindowRef.current.open(map, marker);
          }
        });

        markersRef.current[jId] = marker;
      } else {
        marker.setPosition(coords);
        marker.setIcon(svgMarker);
        marker.setZIndex(isSelected ? 100 : 10);
      }
    });
  }, [mapLoaded, corridor, junctionStates, selectedJunctionId, onSelectJunction]);

  return (
    <div className="relative w-full h-[480px] lg:h-[540px] rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-md">
      {/* 1. Google Maps Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* 2. Error / Fallback View if Google Maps API doesn't load */}
      {loadError && (
        <div className="absolute inset-0 bg-[#0B1528] text-white p-6 flex flex-col justify-between overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2.5">
              <AlertTriangle className="text-[#F5A623]" size={18} />
              <span className="font-bold text-sm text-slate-200">
                {lang === 'HI' ? 'हाई-प्रिसिजन योजनाबद्ध मानचित्र सक्रिय' : 'High-Precision Schematic View Active'}
              </span>
            </div>
            <span className="text-[11px] bg-slate-800 text-slate-300 font-mono px-2.5 py-1 rounded border border-slate-700">
              API Notice: {loadError}
            </span>
          </div>

          {/* High-Contrast Interactive Schematic Fallback Map */}
          <div className="my-auto py-4">
            <div className="text-center mb-4">
              <p className="text-xs text-slate-400 max-w-lg mx-auto">
                {lang === 'HI'
                  ? 'गूगल मैप्स कुंजी सत्यापन या कनेक्टिविटी समस्या के कारण स्वचालित रूप से वास्तविक समय नोड नेटवर्क मोड में संचालित।'
                  : 'Operating in real-time corridor schematic mode with full live simulation telemetry.'}
              </p>
            </div>

            <div className="relative max-w-2xl mx-auto bg-slate-800/80 rounded-xl p-6 border border-slate-700 shadow-inner">
              <div className="flex items-center justify-between relative">
                {/* Connecting animated line */}
                <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-1.5 bg-slate-700 rounded z-0">
                  <div className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-emerald-500 animate-pulse rounded" />
                </div>

                {corridor.junctionIds.map((id, index) => {
                  const coords = JUNCTION_COORDINATES[id] || {};
                  const state = junctionStates[id];
                  const classification = state?.classification;
                  const isSelected = selectedJunctionId === id;

                  return (
                    <button
                      key={id}
                      onClick={() => onSelectJunction && onSelectJunction(id)}
                      className={`relative z-10 flex flex-col items-center p-3 rounded-xl transition cursor-pointer ${
                        isSelected ? 'bg-[#0A1F44] ring-2 ring-[#F5A623] shadow-lg' : 'bg-slate-900/90 hover:bg-slate-900'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-black text-xs text-white border-2 shadow-md transition-transform hover:scale-110"
                        style={{
                          backgroundColor: classification?.dotColor || '#16A34A',
                          borderColor: isSelected ? '#F5A623' : '#FFFFFF'
                        }}
                      >
                        {id}
                      </div>
                      <span className="text-[11px] font-bold text-slate-200 mt-2 truncate max-w-[100px]">
                        {coords.code || id}
                      </span>
                      <span className="text-[9px] text-slate-400 mt-0.5">
                        {state?.junction?.totalPcu || 0} PCU
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" />
              Real-time multi-intersection telemetry is fully synchronized.
            </span>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 cursor-pointer text-xs font-semibold"
            >
              Retry Maps Load
            </button>
          </div>
        </div>
      )}

      {/* 3. Top-Left Floating Status Badge */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2 pointer-events-auto">
        <div className="bg-[#0A1F44]/90 backdrop-blur-md text-white px-3.5 py-1.5 rounded-lg border border-slate-700 shadow-lg flex items-center space-x-2 text-xs font-bold">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-[#F5A623]">{corridor.name}</span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-200">{corridor.junctionIds.length} Connected Nodes</span>
        </div>

        {/* Multi-Intersection Coordination Active Pill */}
        <div
          className={`px-3 py-1.5 rounded-lg backdrop-blur-md border text-xs font-bold shadow-lg flex items-center space-x-1.5 ${
            coordinationActive
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600'
              : 'bg-slate-800/90 text-slate-400 border-slate-700'
          }`}
        >
          <Radio size={13} className={coordinationActive ? 'animate-pulse text-emerald-400' : ''} />
          <span>
            {coordinationActive
              ? (lang === 'HI' ? 'समन्वय: सक्रिय' : 'COORDINATION: ACTIVE')
              : (lang === 'HI' ? 'समन्वय: निष्क्रिय' : 'COORDINATION: STANDALONE')}
          </span>
        </div>
      </div>

      {/* 4. Top-Right Map Controls Overlay */}
      <div className="absolute top-3 right-3 z-10 flex items-center space-x-1.5 pointer-events-auto">
        {/* Live Google Traffic Layer Toggle Button */}
        <button
          onClick={toggleTrafficLayer}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-md border transition cursor-pointer ${
            isTrafficLayerActive
              ? 'bg-[#1E4D8C] text-white border-blue-400'
              : 'bg-white/90 text-slate-700 border-slate-300 hover:bg-white'
          }`}
          title="Toggle Google Maps Live Traffic Overlay"
        >
          <Layers size={13} />
          <span>{lang === 'HI' ? 'गूगल ट्रैफिक' : 'Google Traffic'}</span>
          <span
            className={`w-2 h-2 rounded-full ${
              isTrafficLayerActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
            }`}
          />
        </button>

        {/* Map Type (Road / Hybrid) */}
        <button
          onClick={toggleMapType}
          className="bg-white/90 hover:bg-white text-slate-800 p-2 rounded-lg border border-slate-300 shadow-md text-xs font-bold transition cursor-pointer"
          title="Switch Map Satellite/Road View"
        >
          <Compass size={14} />
        </button>

        {/* Recenter Corridor */}
        <button
          onClick={handleRecenter}
          className="bg-white/90 hover:bg-white text-slate-800 p-2 rounded-lg border border-slate-300 shadow-md text-xs font-bold transition cursor-pointer"
          title="Recenter on Corridor"
        >
          <Navigation size={14} />
        </button>

        {/* Zoom Controls */}
        <div className="flex flex-col rounded-lg overflow-hidden border border-slate-300 bg-white/90 shadow-md">
          <button
            onClick={() => handleZoom('in')}
            className="p-1.5 hover:bg-slate-100 text-slate-800 border-b border-slate-200 cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={() => handleZoom('out')}
            className="p-1.5 hover:bg-slate-100 text-slate-800 cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
        </div>
      </div>

      {/* 5. Bottom-Left Live Traffic Legend */}
      <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-lg border border-slate-300 shadow-lg text-[10px] text-slate-700 pointer-events-auto">
        <div className="font-extrabold text-[#0A1F44] mb-1 uppercase tracking-wider">
          {lang === 'HI' ? 'लाइव ट्रैफिक स्थिति' : 'Live Traffic Density'}
        </div>
        <div className="flex items-center space-x-3 font-semibold">
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
            <span>Fast / Normal</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F5A623]" />
            <span>Slow</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
            <span>Heavy / Jam</span>
          </div>
        </div>
      </div>

      {/* 6. Bottom-Right Attribution / Info */}
      <div className="absolute bottom-3 right-3 z-10 bg-[#0A1F44]/80 backdrop-blur-md px-2.5 py-1 rounded text-[10px] font-mono text-slate-300 pointer-events-none">
        TrafficLayer API • Mumbai MoRTH GIS
      </div>
    </div>
  );
}
