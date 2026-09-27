/**
 * CorridorCoordinator.js
 * Multi-Intersection Traffic Coordination & Predictive Signal Control Engine
 * 
 * Core Capabilities:
 * 1. Corridor topology & road link modeling with real geographic coordinates (Mumbai).
 * 2. Real-time approach congestion classification (NORMAL, SLOW, HEAVY, TRAFFIC JAM).
 * 3. Inter-junction traffic flow prediction (platoon propagation, ETA calculation, volume surge).
 * 4. Coordinated signal timing recommendations (green wave offsets, proactive green extensions).
 */

export const CORRIDORS = [
  {
    id: 'corridor-bkc-arterial',
    name: 'BKC - Western Express Arterial Corridor',
    nameHi: 'बीकेसी - वेस्टर्न एक्सप्रेस मुख्य कॉरिडोर',
    description: 'Vital 13.4 km transit artery connecting South Mumbai through Dadar to BKC and Western Express Highway.',
    junctionIds: ['J1', 'J2', 'J3', 'J4'],
    center: { lat: 19.055, lng: 72.848 },
    zoom: 13,
    links: [
      {
        from: 'J1',
        to: 'J2',
        fromName: 'Worli Sea Link Interchange',
        toName: 'Dadar TT Circle Hub',
        distanceKm: 3.4,
        freeFlowSpeedKmph: 45,
        targetApproach: 'W', // arrives at J2 from West
        sourceApproach: 'N', // departs J1 heading North
        corridorDirection: 'Northbound'
      },
      {
        from: 'J2',
        to: 'J3',
        fromName: 'Dadar TT Circle Hub',
        toName: 'BKC Central Plaza',
        distanceKm: 4.2,
        freeFlowSpeedKmph: 40,
        targetApproach: 'S', // arrives at J3 from South
        sourceApproach: 'N', // departs J2 heading North/East
        corridorDirection: 'Northbound'
      },
      {
        from: 'J3',
        to: 'J4',
        fromName: 'BKC Central Plaza',
        toName: 'Andheri WEH Flyover',
        distanceKm: 5.8,
        freeFlowSpeedKmph: 50,
        targetApproach: 'S', // arrives at J4 from South
        sourceApproach: 'N', // departs J3 heading North
        corridorDirection: 'Northbound'
      }
    ]
  },
  {
    id: 'corridor-coastal-connector',
    name: 'South Coast Connector Corridor',
    nameHi: 'दक्षिण तटीय कनेक्टर कॉरिडोर',
    description: 'Arterial link managing traffic between Worli coastline and central business districts.',
    junctionIds: ['J1', 'J2', 'J3'],
    center: { lat: 19.038, lng: 72.842 },
    zoom: 13,
    links: [
      {
        from: 'J1',
        to: 'J2',
        fromName: 'Worli Sea Link Interchange',
        toName: 'Dadar TT Circle Hub',
        distanceKm: 3.4,
        freeFlowSpeedKmph: 45,
        targetApproach: 'W',
        sourceApproach: 'N',
        corridorDirection: 'Inbound'
      },
      {
        from: 'J2',
        to: 'J3',
        fromName: 'Dadar TT Circle Hub',
        toName: 'BKC Central Plaza',
        distanceKm: 4.2,
        freeFlowSpeedKmph: 40,
        targetApproach: 'S',
        sourceApproach: 'N',
        corridorDirection: 'Inbound'
      }
    ]
  }
];

// Geographic coordinates for Mumbai junctions
export const JUNCTION_COORDINATES = {
  J1: { lat: 19.0178, lng: 72.8174, name: 'Worli Sea Link Interchange', code: 'WSL-01' },
  J2: { lat: 19.0182, lng: 72.8432, name: 'Dadar TT Circle Hub', code: 'DDR-02' },
  J3: { lat: 19.0620, lng: 72.8680, name: 'BKC Central Plaza', code: 'BKC-03' },
  J4: { lat: 19.1197, lng: 72.8468, name: 'Andheri WEH Flyover', code: 'AND-04' }
};

/**
 * Congestion Thresholds based on PCU and average approach speed
 */
export const CLASSIFICATION_THRESHOLDS = {
  SPEED_HEAVY_BELOW: 20, // km/h
  SPEED_SLOW_BELOW: 35,  // km/h
  PCU_HEAVY_ABOVE: 45,
  PCU_SLOW_ABOVE: 25
};

/**
 * Classify road congestion state for a given approach or junction
 * Returns: { level: 'NORMAL' | 'SLOW' | 'HEAVY' | 'JAM', color: string, badgeBg: string, label: string }
 */
export function classifyCongestion(pcu = 0, speedKmph = 40) {
  if (speedKmph <= 12 || pcu >= 55) {
    return {
      level: 'JAM',
      label: 'TRAFFIC JAM',
      labelHi: 'भीषण जाम',
      color: '#991B1B', // Red 800
      badgeBg: 'bg-red-900/20 text-red-700 border-red-300',
      dotColor: '#DC2626',
      iconType: 'critical'
    };
  }
  if (speedKmph <= CLASSIFICATION_THRESHOLDS.SPEED_HEAVY_BELOW || pcu >= CLASSIFICATION_THRESHOLDS.PCU_HEAVY_ABOVE) {
    return {
      level: 'HEAVY',
      label: 'HEAVY CONGESTION',
      labelHi: 'भारी जाम',
      color: '#DC2626', // Red 600
      badgeBg: 'bg-red-100 text-red-800 border-red-200',
      dotColor: '#DC2626',
      iconType: 'heavy'
    };
  }
  if (speedKmph <= CLASSIFICATION_THRESHOLDS.SPEED_SLOW_BELOW || pcu >= CLASSIFICATION_THRESHOLDS.PCU_SLOW_ABOVE) {
    return {
      level: 'SLOW',
      label: 'SLOW TRAFFIC',
      labelHi: 'धीमा यातायात',
      color: '#D97706', // Amber 600
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
      dotColor: '#F5A623',
      iconType: 'slow'
    };
  }
  return {
    level: 'NORMAL',
    label: 'FREE FLOW',
    labelHi: 'सामान्य प्रवाह',
    color: '#16A34A', // Green 600
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dotColor: '#16A34A',
    iconType: 'normal'
  };
}

/**
 * Compute multi-intersection coordination predictions and recommended actions
 * 
 * @param {Array} junctions - Current junction states from TrafficContext
 * @param {Object} corridor - Active corridor definition
 * @param {boolean} coordinationActive - Whether multi-junction coordination mode is enabled
 * @returns {Object} { junctionStates, corridorStatus, corridorMetrics, activePredictions }
 */
export function computeCorridorCoordination(junctions = [], corridor = CORRIDORS[0], coordinationActive = true) {
  if (!junctions || junctions.length === 0) {
    return {
      junctionStates: {},
      corridorStatus: 'IDLE',
      corridorMetrics: { totalPcu: 0, avgSpeed: 0, syncEfficiency: 0, delayReducedMin: 0 },
      activePredictions: []
    };
  }

  const junctionMap = {};
  junctions.forEach(j => {
    junctionMap[j.id] = j;
  });

  const junctionStates = {};
  const activePredictions = [];
  let totalCorridorPcu = 0;
  let totalSpeedAccum = 0;
  let approachCount = 0;
  let coordinatedActionsCount = 0;

  // 1. Process each junction's individual approach classification
  corridor.junctionIds.forEach(id => {
    const j = junctionMap[id];
    if (!j) return;

    totalCorridorPcu += j.totalPcu || 0;

    const classifiedApproaches = {};
    if (j.approachData) {
      ['N', 'S', 'E', 'W'].forEach(dir => {
        const app = j.approachData[dir] || {};
        totalSpeedAccum += app.speedKmph || 35;
        approachCount += 1;
        classifiedApproaches[dir] = {
          ...app,
          classification: classifyCongestion(app.pcu, app.speedKmph)
        };
      });
    }

    const overallClassification = classifyCongestion(
      (j.totalPcu || 0) / 4,
      Math.min(
        j.approachData?.N?.speedKmph || 40,
        j.approachData?.S?.speedKmph || 40,
        j.approachData?.E?.speedKmph || 40,
        j.approachData?.W?.speedKmph || 40
      )
    );

    junctionStates[id] = {
      junction: j,
      coords: JUNCTION_COORDINATES[id] || { lat: 19.05, lng: 72.85 },
      classification: overallClassification,
      approaches: classifiedApproaches,
      incomingPredictions: [],
      outgoingFlow: { targetJunctionId: null, volumePcu: 0, speedKmph: 40 },
      coordinationAction: null,
      recommendedAdjustment: null
    };
  });

  // 2. Inter-Junction Link Analysis & Forward Platoon Prediction
  if (corridor.links) {
    corridor.links.forEach(link => {
      const sourceState = junctionStates[link.from];
      const targetState = junctionStates[link.to];

      if (!sourceState || !targetState) return;

      const sourceJunction = sourceState.junction;
      const targetJunction = targetState.junction;

      // Determine outgoing flow from source towards target approach
      const sourceApp = sourceJunction.approachData?.[link.sourceApproach] || { pcu: 20, speedKmph: 35 };
      const currentSpeed = Math.max(10, sourceApp.speedKmph || link.freeFlowSpeedKmph);

      // Effective transit time: distance / speed (in seconds)
      const travelTimeSec = Math.round((link.distanceKm / currentSpeed) * 3600);

      // Volume expected to reach target based on green phase status
      const isSourceApproachGreen = (link.sourceApproach === 'N' || link.sourceApproach === 'S')
        ? sourceJunction.activePhase === 'NS'
        : sourceJunction.activePhase === 'EW';

      // Discharged flow or queued buildup
      const outgoingPcu = Number((sourceApp.pcu * (isSourceApproachGreen ? 0.65 : 0.35)).toFixed(1));

      sourceState.outgoingFlow = {
        targetJunctionId: link.to,
        volumePcu: outgoingPcu,
        speedKmph: currentSpeed,
        linkDistanceKm: link.distanceKm,
        travelTimeSec
      };

      // If volume is substantial or congestion is rising upstream, generate predictive warning
      const isHeavyOrSlow = sourceState.classification.level === 'HEAVY' || sourceState.classification.level === 'JAM';
      const isModerate = sourceState.classification.level === 'SLOW';

      if (outgoingPcu > 15 || isHeavyOrSlow) {
        const arrivalEtaSeconds = Math.max(15, travelTimeSec - ((sourceJunction.phaseTimer || 10) % 60));

        const prediction = {
          fromJunctionId: link.from,
          fromName: link.fromName,
          toJunctionId: link.to,
          toName: link.toName,
          targetApproach: link.targetApproach,
          dispatchedPcu: outgoingPcu,
          etaSeconds: arrivalEtaSeconds,
          speedKmph: currentSpeed,
          distanceKm: link.distanceKm,
          severity: isHeavyOrSlow ? 'HIGH' : (isModerate ? 'MEDIUM' : 'LOW')
        };

        targetState.incomingPredictions.push(prediction);
        activePredictions.push(prediction);

        // 3. Formulate Coordinated Signal Recommendation for Downstream Junction
        if (coordinationActive) {
          coordinatedActionsCount += 1;

          // Determine target junction's phase alignment with the arrival approach
          const targetIsNS = (link.targetApproach === 'N' || link.targetApproach === 'S');
          const targetCurrentIsArrivalGreen = targetIsNS
            ? targetJunction.activePhase === 'NS'
            : targetJunction.activePhase === 'EW';

          let recommendation = {};

          if (arrivalEtaSeconds <= 45 && !targetCurrentIsArrivalGreen) {
            // Traffic wave is arriving soon, but downstream light is currently red for that approach!
            recommendation = {
              type: 'PREPARE_EARLY_SWITCH',
              title: `Advance ${targetIsNS ? 'NS' : 'EW'} Phase`,
              titleHi: `${targetIsNS ? 'उत्तर-दक्षिण' : 'पूर्व-पश्चिम'} चरण शीघ्र सक्रिय करें`,
              action: `Incoming wave (${outgoingPcu} PCU) from ${sourceJunction.code} arriving in ${arrivalEtaSeconds}s. Truncate cross-phase to avoid queuing.`,
              actionHi: `${sourceJunction.code} से आने वाला प्रवाह (${outgoingPcu} PCU) ${arrivalEtaSeconds} से. में पहुंचेगा। कतार रोकने हेतु फेज अग्रिम करें।`,
              greenAdjustmentSec: +14,
              urgency: 'HIGH',
              badge: 'PROACTIVE CLEARANCE'
            };
          } else if (targetCurrentIsArrivalGreen && arrivalEtaSeconds <= 60) {
            // Already green, extend green duration to let the wave pass through without braking
            recommendation = {
              type: 'EXTEND_GREEN_WINDOW',
              title: `Extend ${targetIsNS ? 'NS' : 'EW'} Green Window`,
              titleHi: `${targetIsNS ? 'उत्तर-दक्षिण' : 'पूर्व-पश्चिम'} हरी बत्ती समय बढ़ाएं`,
              action: `Extend active green by +${Math.min(20, Math.round(outgoingPcu * 0.4))}s to maintain unbroken corridor green-wave.`,
              actionHi: `कॉरिडोर ग्रीन-वेव बनाए रखने हेतु हरी बत्ती समय में +${Math.min(20, Math.round(outgoingPcu * 0.4))} सेकंड की वृद्धि करें।`,
              greenAdjustmentSec: Math.min(20, Math.round(outgoingPcu * 0.4)),
              urgency: 'MEDIUM',
              badge: 'GREEN WAVE LOCK'
            };
          } else {
            recommendation = {
              type: 'MONITOR_APPROACH',
              title: `Synchronized Platoon Tracked`,
              titleHi: `समकालिक वाहन समूह ट्रैक किया गया`,
              action: `Wave tracked from ${sourceJunction.code}. Estimated arrival in ~${Math.round(arrivalEtaSeconds / 60)} min. Auto-offset ready.`,
              actionHi: `${sourceJunction.code} से समूह ट्रैक किया गया। आगमन समय ~${Math.round(arrivalEtaSeconds / 60)} मिनट। ऑटो-ऑफ़सेट तैयार।`,
              greenAdjustmentSec: +6,
              urgency: 'LOW',
              badge: 'SYNCHRONIZED'
            };
          }

          targetState.coordinationAction = recommendation;
        }
      }
    });
  }

  // 4. Calculate Aggregate Corridor Metrics
  const avgSpeed = approachCount > 0 ? Math.round(totalSpeedAccum / approachCount) : 32;
  const syncEfficiency = coordinationActive
    ? Math.min(96, Math.max(68, Math.round(82 + (avgSpeed / 45) * 12 - (activePredictions.filter(p => p.severity === 'HIGH').length * 4))))
    : 48; // uncoordinated baseline efficiency is low

  const delayReducedMin = coordinationActive
    ? Number(((totalCorridorPcu * 0.08) * (syncEfficiency / 100)).toFixed(1))
    : 0;

  let corridorStatus = 'ACTIVE';
  if (!coordinationActive) corridorStatus = 'OFFLINE';
  else if (activePredictions.some(p => p.severity === 'HIGH')) corridorStatus = 'CONGESTION_MANAGEMENT';
  else if (activePredictions.length > 0) corridorStatus = 'COORDINATING';
  else corridorStatus = 'OPTIMAL_FLOW';

  return {
    junctionStates,
    corridorStatus,
    corridorMetrics: {
      totalPcu: Math.round(totalCorridorPcu),
      avgSpeedKmph: avgSpeed,
      syncEfficiency,
      delayReducedMin,
      activeCoordinations: coordinatedActionsCount,
      totalJunctions: corridor.junctionIds.length
    },
    activePredictions
  };
}
