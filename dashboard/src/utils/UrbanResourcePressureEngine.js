/**
 * UrbanResourcePressureEngine.js
 * Urban Resource Pressure & Response Engine
 *
 * Core Responsibilities:
 * 1. Combines live telemetry across J1–J4 intersections, physical corridor links,
 *    logistics loading hubs, smart curb queues, freight arrival slots, and emergency preemption.
 * 2. Computes four transparent, rule-based pressure category indices (0–100):
 *    - Road Network Pressure
 *    - Intersection Pressure
 *    - Curb & Hub Pressure
 *    - Freight System Pressure
 * 3. Derives an Overall City Pressure Index using configurable weights.
 * 4. Generates human-readable, explainable contributing factors from actual live state.
 * 5. Recommends targeted, module-specific operational interventions.
 * 6. Maintains a bounded (max 10) Operations Event Log for meaningful state transitions.
 * 7. Strictly avoids fabricated values, fake percentages, or black-box claims.
 */

export const DEFAULT_PRESSURE_CONFIG = {
  WEIGHTS: {
    roadNetwork: 0.35,
    intersection: 0.25,
    curbHub: 0.25,
    freightSystem: 0.15
  },
  THRESHOLDS: {
    STABLE: 39,
    ELEVATED: 64,
    HIGH: 84
    // 85-100: CRITICAL
  },
  STABILIZATION_SECONDS: 5.0,
  HYSTERESIS_POINTS: 3,
  MAX_EVENTS: 10
};

export const PRESSURE_LEVELS = {
  STABLE: 'STABLE',
  ELEVATED: 'ELEVATED',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
  UNAVAILABLE: 'UNAVAILABLE'
};

export const RECOMMENDATIONS = {
  CONTINUE_NORMAL_OPERATION: 'CONTINUE_NORMAL_OPERATION',
  ACTIVATE_ADAPTIVE_SIGNAL_RESPONSE: 'ACTIVATE_ADAPTIVE_SIGNAL_RESPONSE',
  HOLD_FREIGHT_UPSTREAM: 'HOLD_FREIGHT_UPSTREAM',
  RELEASE_STAGED_FREIGHT: 'RELEASE_STAGED_FREIGHT',
  RESTRICT_CURB_ENTRY: 'RESTRICT_CURB_ENTRY',
  PRIORITIZE_EMERGENCY_CORRIDOR: 'PRIORITIZE_EMERGENCY_CORRIDOR',
  MONITOR_HUB_DWELL_TIME: 'MONITOR_HUB_DWELL_TIME',
  REDUCE_FREIGHT_RELEASE_RATE: 'REDUCE_FREIGHT_RELEASE_RATE',
  CLEAR_DOWNSTREAM_SPILLBACK: 'CLEAR_DOWNSTREAM_SPILLBACK'
};

export function getPressureLevel(
  score,
  thresholds = DEFAULT_PRESSURE_CONFIG.THRESHOLDS,
  currentLevel = null,
  hysteresis = 0
) {
  if (typeof score !== 'number' || isNaN(score)) return PRESSURE_LEVELS.UNAVAILABLE;

  // Standard threshold evaluation if hysteresis is disabled or currentLevel is not established
  if (!currentLevel || currentLevel === PRESSURE_LEVELS.UNAVAILABLE || hysteresis <= 0) {
    if (score <= thresholds.STABLE) return PRESSURE_LEVELS.STABLE;
    if (score <= thresholds.ELEVATED) return PRESSURE_LEVELS.ELEVATED;
    if (score <= thresholds.HIGH) return PRESSURE_LEVELS.HIGH;
    return PRESSURE_LEVELS.CRITICAL;
  }

  // 3-point hysteresis deadband evaluation
  // Rising transitions require crossing the standard upper threshold.
  // Falling transitions require dropping below (threshold - hysteresis).
  const stableUpper = thresholds.STABLE; // 39
  const elevatedUpper = thresholds.ELEVATED; // 64
  const highUpper = thresholds.HIGH; // 84

  const criticalLower = (highUpper + 1) - hysteresis; // 85 - 3 = 82
  const highLower = (elevatedUpper + 1) - hysteresis; // 65 - 3 = 62
  const elevatedLower = (stableUpper + 1) - hysteresis; // 40 - 3 = 37

  if (currentLevel === PRESSURE_LEVELS.CRITICAL) {
    if (score < criticalLower) {
      if (score < highLower) {
        if (score < elevatedLower) {
          return PRESSURE_LEVELS.STABLE;
        }
        return PRESSURE_LEVELS.ELEVATED;
      }
      return PRESSURE_LEVELS.HIGH;
    }
    return PRESSURE_LEVELS.CRITICAL;
  }

  if (currentLevel === PRESSURE_LEVELS.HIGH) {
    if (score > highUpper) {
      return PRESSURE_LEVELS.CRITICAL;
    }
    if (score < highLower) {
      if (score < elevatedLower) {
        return PRESSURE_LEVELS.STABLE;
      }
      return PRESSURE_LEVELS.ELEVATED;
    }
    return PRESSURE_LEVELS.HIGH;
  }

  if (currentLevel === PRESSURE_LEVELS.ELEVATED) {
    if (score > highUpper) {
      return PRESSURE_LEVELS.CRITICAL;
    }
    if (score > elevatedUpper) {
      return PRESSURE_LEVELS.HIGH;
    }
    if (score < elevatedLower) {
      return PRESSURE_LEVELS.STABLE;
    }
    return PRESSURE_LEVELS.ELEVATED;
  }

  if (currentLevel === PRESSURE_LEVELS.STABLE) {
    if (score > highUpper) {
      return PRESSURE_LEVELS.CRITICAL;
    }
    if (score > elevatedUpper) {
      return PRESSURE_LEVELS.HIGH;
    }
    if (score > stableUpper) {
      return PRESSURE_LEVELS.ELEVATED;
    }
    return PRESSURE_LEVELS.STABLE;
  }

  return PRESSURE_LEVELS.STABLE;
}

export class UrbanResourcePressureEngine {
  constructor(customConfig = {}) {
    this.config = {
      ...DEFAULT_PRESSURE_CONFIG,
      ...customConfig,
      WEIGHTS: {
        ...DEFAULT_PRESSURE_CONFIG.WEIGHTS,
        ...(customConfig.WEIGHTS || {})
      },
      THRESHOLDS: {
        ...DEFAULT_PRESSURE_CONFIG.THRESHOLDS,
        ...(customConfig.THRESHOLDS || {})
      },
      STABILIZATION_SECONDS: customConfig.STABILIZATION_SECONDS !== undefined
        ? customConfig.STABILIZATION_SECONDS
        : DEFAULT_PRESSURE_CONFIG.STABILIZATION_SECONDS,
      HYSTERESIS_POINTS: customConfig.HYSTERESIS_POINTS !== undefined
        ? customConfig.HYSTERESIS_POINTS
        : DEFAULT_PRESSURE_CONFIG.HYSTERESIS_POINTS
    };

    this.events = [];
    this.lastState = null;
    this.confirmedLevel = null;
    this.pendingLevel = null;
    this.pendingLevelStartTime = null;
    this.previousLevel = null;
    this.previousPrimaryAction = null;
    this.previousEmergencyState = false;
    this.previousSpilloverState = false;
    this.lastEventSignature = null;
  }

  /**
   * Resets all history, previous state baselines, and events.
   */
  reset() {
    this.events = [];
    this.lastState = null;
    this.confirmedLevel = null;
    this.pendingLevel = null;
    this.pendingLevelStartTime = null;
    this.previousLevel = null;
    this.previousPrimaryAction = null;
    this.previousEmergencyState = false;
    this.previousSpilloverState = false;
    this.lastEventSignature = null;
  }

  /**
   * Evaluates live city state and computes complete pressure telemetry.
   *
   * @param {Object} input - Live simulation context
   * @returns {Object} Structured pressure report
   */
  evaluate(input = {}) {
    // Check for missing data
    if (!input || (!input.junctions && !input.state && !input.vehicleManager)) {
      return {
        overallPressureIndex: null,
        overallLevel: PRESSURE_LEVELS.UNAVAILABLE,
        priorityState: null,
        status: 'UNAVAILABLE',
        provenance: 'UNAVAILABLE',
        reason: 'Required network simulation data is unavailable.',
        categories: {
          roadNetwork: { score: 0, level: PRESSURE_LEVELS.UNAVAILABLE, contributingFactors: [], sourceMetrics: {} },
          intersection: { score: 0, level: PRESSURE_LEVELS.UNAVAILABLE, contributingFactors: [], sourceMetrics: {} },
          curbHub: { score: 0, level: PRESSURE_LEVELS.UNAVAILABLE, contributingFactors: [], sourceMetrics: {} },
          freightSystem: { score: 0, level: PRESSURE_LEVELS.UNAVAILABLE, contributingFactors: [], sourceMetrics: {} }
        },
        contributingFactors: ['Required simulation inputs are unavailable.'],
        primaryRecommendation: null,
        secondaryRecommendations: [],
        recentEvents: [...this.events],
        calculationTimestamp: 0
      };
    }

    const simTime = typeof input.simTime === 'number' ? input.simTime : (input.currentSimTime || 0);

    // 1. Extract inputs safely across direct managers or state snapshots
    const junctions = input.junctions || input.state?.corridor?.junctions || {};
    const linkManager = input.linkManager || null;
    const logisticsHubManager = input.logisticsHubManager || null;
    const freightSlotManager = input.freightSlotManager || null;
    const isEmergencyActive = !!(
      input.isEmergencyActive ||
      input.state?.emergencyActive ||
      (input.vehicleManager && input.vehicleManager.emergencyActive) ||
      (input.signalManager && input.signalManager.emergency_active) ||
      Object.values(junctions).some(j => (j.vehicleManager?.emergencyActive || j.signalManager?.emergency_active || j.emergencyActive))
    );

    // ----------------------------------------------------
    // CATEGORY A: ROAD NETWORK PRESSURE (0–100)
    // ----------------------------------------------------
    const roadMetrics = this._extractRoadMetrics(input, junctions, linkManager, logisticsHubManager);
    const roadCalc = this._calculateRoadPressure(roadMetrics);

    // ----------------------------------------------------
    // CATEGORY B: INTERSECTION PRESSURE (0–100)
    // ----------------------------------------------------
    const intersectionMetrics = this._extractIntersectionMetrics(input, junctions, isEmergencyActive);
    const intersectionCalc = this._calculateIntersectionPressure(intersectionMetrics);

    // ----------------------------------------------------
    // CATEGORY C: CURB & HUB PRESSURE (0–100)
    // ----------------------------------------------------
    const curbMetrics = this._extractCurbMetrics(input, logisticsHubManager);
    const curbCalc = this._calculateCurbPressure(curbMetrics);

    // ----------------------------------------------------
    // CATEGORY D: FREIGHT SYSTEM PRESSURE (0–100)
    // ----------------------------------------------------
    const freightMetrics = this._extractFreightMetrics(input, freightSlotManager, curbMetrics, isEmergencyActive);
    const freightCalc = this._calculateFreightPressure(freightMetrics);

    // ----------------------------------------------------
    // OVERALL CITY PRESSURE INDEX
    // ----------------------------------------------------
    const weights = this.config.WEIGHTS;
    const rawOverall = (
      roadCalc.score * weights.roadNetwork +
      intersectionCalc.score * weights.intersection +
      curbCalc.score * weights.curbHub +
      freightCalc.score * weights.freightSystem
    );

    const overallPressureIndex = Math.min(100, Math.max(0, Math.round(rawOverall)));

    // ----------------------------------------------------
    // 3-POINT HYSTERESIS AROUND THRESHOLDS
    // ----------------------------------------------------
    const candidateLevel = getPressureLevel(
      overallPressureIndex,
      this.config.THRESHOLDS,
      this.confirmedLevel,
      this.config.HYSTERESIS_POINTS
    );

    // ----------------------------------------------------
    // 5-SIMULATION-SECOND STABILIZATION PERIOD
    // ----------------------------------------------------
    if (this.confirmedLevel === null) {
      // First tick baseline
      this.confirmedLevel = candidateLevel;
      this.pendingLevel = null;
      this.pendingLevelStartTime = null;
    } else if (candidateLevel === this.confirmedLevel) {
      this.pendingLevel = null;
      this.pendingLevelStartTime = null;
    } else {
      if (this.pendingLevel !== candidateLevel) {
        this.pendingLevel = candidateLevel;
        this.pendingLevelStartTime = simTime;
      } else {
        const elapsed = (typeof simTime === 'number' && typeof this.pendingLevelStartTime === 'number')
          ? (simTime - this.pendingLevelStartTime)
          : 0;

        if (elapsed >= (this.config.STABILIZATION_SECONDS !== undefined ? this.config.STABILIZATION_SECONDS : 5.0)) {
          this.confirmedLevel = candidateLevel;
          this.pendingLevel = null;
          this.pendingLevelStartTime = null;
        }
      }
    }

    const overallLevel = this.confirmedLevel;

    // Emergency priority state
    const priorityState = isEmergencyActive ? 'EMERGENCY OVERRIDE' : null;

    // Combine top contributing factors across categories
    const allFactors = [
      ...roadCalc.contributingFactors,
      ...intersectionCalc.contributingFactors,
      ...curbCalc.contributingFactors,
      ...freightCalc.contributingFactors
    ];
    // Select top 3 most prominent factors
    const topThreeFactors = allFactors.slice(0, 3);
    if (topThreeFactors.length === 0) {
      topThreeFactors.push('Network traffic and loading bays are operating within nominal thresholds.');
    }

    // ----------------------------------------------------
    // RESPONSE RECOMMENDATION ENGINE
    // ----------------------------------------------------
    const recommendations = this._generateRecommendations({
      isEmergencyActive,
      curbCalc,
      roadCalc,
      intersectionCalc,
      freightCalc,
      curbMetrics,
      freightMetrics,
      roadMetrics,
      strategy: input.strategy || input.state?.strategy || 'adaptive'
    });

    const primaryRec = recommendations.primary;
    const secondaryRecs = recommendations.secondary;

    // ----------------------------------------------------
    // OPERATIONS EVENT LOG (Latest 10)
    // ----------------------------------------------------
    const currentSpillover = curbMetrics.laneBlockedCount > 0;
    this._trackEvents({
      simTime,
      currentLevel: overallLevel,
      currentPrimaryAction: primaryRec ? primaryRec.action : null,
      isEmergencyActive,
      currentSpillover,
      majorCause: topThreeFactors[0] || 'Nominal flow',
      affectedLocation: primaryRec ? primaryRec.affectedLocation : 'City Network'
    });

    const result = {
      overallPressureIndex,
      overallLevel,
      priorityState,
      categories: {
        roadNetwork: {
          score: roadCalc.score,
          level: getPressureLevel(roadCalc.score, this.config.THRESHOLDS),
          contributingFactors: roadCalc.contributingFactors,
          sourceMetrics: roadMetrics
        },
        intersection: {
          score: intersectionCalc.score,
          level: getPressureLevel(intersectionCalc.score, this.config.THRESHOLDS),
          contributingFactors: intersectionCalc.contributingFactors,
          sourceMetrics: intersectionMetrics
        },
        curbHub: {
          score: curbCalc.score,
          level: getPressureLevel(curbCalc.score, this.config.THRESHOLDS),
          contributingFactors: curbCalc.contributingFactors,
          sourceMetrics: curbMetrics
        },
        freightSystem: {
          score: freightCalc.score,
          level: getPressureLevel(freightCalc.score, this.config.THRESHOLDS),
          contributingFactors: freightCalc.contributingFactors,
          sourceMetrics: freightMetrics
        }
      },
      contributingFactors: topThreeFactors,
      allContributingFactors: allFactors,
      primaryRecommendation: primaryRec,
      secondaryRecommendations: secondaryRecs,
      recentEvents: [...this.events],
      provenance: 'DERIVED',
      calculationTimestamp: simTime
    };

    this.lastState = result;
    return result;
  }

  getState() {
    if (this.lastState) return this.lastState;
    return this.evaluate();
  }

  // ----------------------------------------------------
  // METRIC EXTRACTION & CALCULATION HELPERS
  // ----------------------------------------------------

  _extractRoadMetrics(input, junctions, linkManager, logisticsHubManager) {
    let totalQueuedPCU = 0;
    let totalStoppedCars = 0;
    let maxPassengerWaitSec = 0;
    let maxApproachQueue = 0;

    // From junctions
    const junctionList = Object.values(junctions);
    if (junctionList.length > 0) {
      junctionList.forEach(j => {
        const vm = j.vehicleManager || j;
        if (vm.getQueuedPCUs) {
          const pcus = vm.getQueuedPCUs();
          Object.values(pcus).forEach(v => { totalQueuedPCU += (v || 0); });
        } else if (j.queues) {
          Object.values(j.queues).forEach(v => { totalQueuedPCU += (v || 0); });
        }

        if (vm.getStoppedQueues) {
          const stopped = vm.getStoppedQueues();
          Object.values(stopped).forEach(v => { totalStoppedCars += (v || 0); });
        }

        if (vm.getOldestWaitTimes) {
          const waitTimes = vm.getOldestWaitTimes();
          Object.values(waitTimes).forEach(w => {
            if (w > maxPassengerWaitSec) maxPassengerWaitSec = w;
          });
        } else if (j.avg_wait_time) {
          if (j.avg_wait_time > maxPassengerWaitSec) maxPassengerWaitSec = j.avg_wait_time;
        }

        if (vm.getQueueLengths) {
          const qLengths = vm.getQueueLengths();
          Object.values(qLengths).forEach(q => {
            if (q > maxApproachQueue) maxApproachQueue = q;
          });
        } else if (j.queues) {
          Object.values(j.queues).forEach(q => {
            if (q > maxApproachQueue) maxApproachQueue = q;
          });
        }
      });
    } else if (input.vehicleManager) {
      const vm = input.vehicleManager;
      const pcus = vm.getQueuedPCUs ? vm.getQueuedPCUs() : {};
      Object.values(pcus).forEach(v => { totalQueuedPCU += (v || 0); });
      const stopped = vm.getStoppedQueues ? vm.getStoppedQueues() : {};
      Object.values(stopped).forEach(v => { totalStoppedCars += (v || 0); });
      const waits = vm.getOldestWaitTimes ? vm.getOldestWaitTimes() : {};
      Object.values(waits).forEach(w => { if (w > maxPassengerWaitSec) maxPassengerWaitSec = w; });
    }

    // Link in-transit vehicle count
    let totalInTransit = 0;
    if (linkManager && typeof linkManager.getTotalInTransitCount === 'function') {
      totalInTransit = linkManager.getTotalInTransitCount();
    } else if (input.state?.corridor?.links) {
      Object.values(input.state.corridor.links).forEach(l => {
        totalInTransit += (l.vehicleCount || 0);
      });
    }

    // Curb spillover capacity reduction
    let laneBlockedCount = 0;
    let curbSpilloverHub = null;
    if (logisticsHubManager) {
      const hubs = typeof logisticsHubManager.getAllHubs === 'function'
        ? logisticsHubManager.getAllHubs()
        : Object.values(logisticsHubManager.hubs || {});
      hubs.forEach(h => {
        if (h.laneBlocked) {
          laneBlockedCount++;
          curbSpilloverHub = h.name || h.hubId;
        }
      });
    } else if (input.state?.logisticsHubs) {
      input.state.logisticsHubs.forEach(h => {
        if (h.laneBlocked) {
          laneBlockedCount++;
          curbSpilloverHub = h.name || h.hubId;
        }
      });
    }

    return {
      totalQueuedPCU: Number(totalQueuedPCU.toFixed(1)),
      totalStoppedCars,
      maxPassengerWaitSec: Math.round(maxPassengerWaitSec),
      totalInTransit,
      maxApproachQueue,
      laneBlockedCount,
      curbSpilloverHub,
      hasCurbSpillover: laneBlockedCount > 0
    };
  }

  _calculateRoadPressure(m) {
    // 0-120 PCU normal range across 4 junctions (30 PCU / junction ceiling)
    const pcuScore = Math.min(100, (m.totalQueuedPCU / 100) * 100);
    // 0-80 stopped cars
    const stoppedScore = Math.min(100, (m.totalStoppedCars / 70) * 100);
    // 0-60s wait time limit
    const waitScore = Math.min(100, (m.maxPassengerWaitSec / 50) * 100);
    // 0-25 link density
    const linkScore = Math.min(100, (m.totalInTransit / 25) * 100);
    // Curb spillover reduces effective capacity by 33%
    const spilloverPenalty = m.hasCurbSpillover ? 25 : 0;

    const raw = (
      pcuScore * 0.35 +
      stoppedScore * 0.25 +
      waitScore * 0.20 +
      linkScore * 0.10 +
      spilloverPenalty * 0.10
    );

    const score = Math.min(100, Math.max(0, Math.round(raw)));
    const factors = [];

    if (m.hasCurbSpillover) {
      factors.push(`Curb spillover at ${m.curbSpilloverHub || 'depot'} reduced effective road capacity by 33%.`);
    }
    if (m.maxPassengerWaitSec >= 40) {
      factors.push(`Passenger approach delay reached ${m.maxPassengerWaitSec}s, approaching starvation limit.`);
    }
    if (m.totalQueuedPCU >= 40) {
      factors.push(`Corridor queuing pressure elevated across J1–J4 (${m.totalQueuedPCU} queued PCUs).`);
    }
    if (m.totalInTransit >= 6) {
      factors.push(`${m.totalInTransit} vehicles actively traversing corridor links.`);
    }

    return { score, contributingFactors: factors };
  }

  _extractIntersectionMetrics(input, junctions, isEmergencyActive) {
    let maxQueue = 0;
    let congestedApproachCount = 0;
    let minApproachQueue = 999;
    let maxRedWaitSec = 0;
    let worstJunctionId = 'J3';

    const junctionList = Object.entries(junctions);
    if (junctionList.length > 0) {
      junctionList.forEach(([jId, j]) => {
        const vm = j.vehicleManager || j;
        const qLengths = vm.getQueueLengths ? vm.getQueueLengths() : (j.queues || {});
        let jMax = 0;
        let jMin = 999;

        Object.entries(qLengths).forEach(([, q]) => {
          const val = q || 0;
          if (val > maxQueue) {
            maxQueue = val;
            worstJunctionId = jId;
          }
          if (val > jMax) jMax = val;
          if (val < jMin) jMin = val;
          if (val >= 10) congestedApproachCount++;
        });

        if (jMin < minApproachQueue) minApproachQueue = jMin;

        if (vm.getOldestWaitTimes) {
          const waits = vm.getOldestWaitTimes();
          Object.values(waits).forEach(w => {
            if (w > maxRedWaitSec) maxRedWaitSec = w;
          });
        } else if (j.avg_wait_time && j.avg_wait_time > maxRedWaitSec) {
          maxRedWaitSec = j.avg_wait_time;
        }
      });
    } else if (input.vehicleManager) {
      const qLengths = input.vehicleManager.getQueueLengths ? input.vehicleManager.getQueueLengths() : {};
      Object.values(qLengths).forEach(q => {
        const val = q || 0;
        if (val > maxQueue) maxQueue = val;
        if (val >= 10) congestedApproachCount++;
      });
      const waits = input.vehicleManager.getOldestWaitTimes ? input.vehicleManager.getOldestWaitTimes() : {};
      Object.values(waits).forEach(w => { if (w > maxRedWaitSec) maxRedWaitSec = w; });
    }

    if (minApproachQueue === 999) minApproachQueue = 0;
    const queueImbalance = Math.max(0, maxQueue - minApproachQueue);

    return {
      maxQueue,
      congestedApproachCount,
      queueImbalance,
      maxRedWaitSec: Math.round(maxRedWaitSec),
      worstJunctionId,
      isEmergencyActive
    };
  }

  _calculateIntersectionPressure(m) {
    // 0-35 max queue on single approach
    const queueScore = Math.min(100, (m.maxQueue / 30) * 100);
    // 0-8 congested approaches (>= 10 cars)
    const congestedScore = Math.min(100, (m.congestedApproachCount / 6) * 100);
    // 0-25 queue imbalance
    const imbalanceScore = Math.min(100, (m.queueImbalance / 20) * 100);
    // 0-50s red wait
    const waitScore = Math.min(100, (m.maxRedWaitSec / 45) * 100);

    const raw = (
      queueScore * 0.35 +
      congestedScore * 0.25 +
      imbalanceScore * 0.20 +
      waitScore * 0.20
    );

    const score = Math.min(100, Math.max(0, Math.round(raw)));
    const factors = [];

    if (m.isEmergencyActive) {
      factors.push('Emergency corridor preemption active, overriding nominal signal timing.');
    }
    if (m.maxQueue >= 15) {
      factors.push(`Severe queue buildup at ${m.worstJunctionId} (${m.maxQueue} queued vehicles on lead approach).`);
    }
    if (m.queueImbalance >= 12) {
      factors.push(`Signal phase demand imbalance detected across approaches (delta: ${m.queueImbalance} vehicles).`);
    }
    if (m.maxRedWaitSec >= 35) {
      factors.push(`Red-phase vehicle waiting time exceeded ${m.maxRedWaitSec} seconds.`);
    }

    return { score, contributingFactors: factors };
  }

  _extractCurbMetrics(input, logisticsHubManager) {
    let totalBays = 0;
    let occupiedBays = 0;
    let totalCurbQueue = 0;
    let maxCurbSaturation = 0;
    let laneBlockedCount = 0;
    let totalRemainingDwell = 0;
    let activeDwellingBays = 0;
    let worstHubName = 'BKC Hub';

    const hubs = logisticsHubManager
      ? (typeof logisticsHubManager.getAllHubs === 'function' ? logisticsHubManager.getAllHubs() : Object.values(logisticsHubManager.hubs || {}))
      : (input.state?.logisticsHubs || []);

    if (hubs.length > 0) {
      hubs.forEach(h => {
        const hTotalBays = h.totalBays || (h.bays ? h.bays.length : 3);
        totalBays += hTotalBays;

        const hOccupied = typeof h.occupiedBays === 'number'
          ? h.occupiedBays
          : (h.bays ? h.bays.filter(b => b.status === 'OCCUPIED' || b.status === 'DWELLING').length : 0);
        occupiedBays += hOccupied;

        const hQueue = h.curbQueue ? h.curbQueue.length : (h.queueLength || 0);
        totalCurbQueue += hQueue;

        const hSat = typeof h.curbSaturation === 'number'
          ? h.curbSaturation
          : Math.min(100, Math.round((hQueue / Math.max(1, hTotalBays)) * 100));

        if (hSat > maxCurbSaturation) {
          maxCurbSaturation = hSat;
          worstHubName = h.name || h.hubId;
        }

        if (h.laneBlocked) laneBlockedCount++;

        (h.bays || []).forEach(b => {
          if (b.status === 'DWELLING' || b.status === 'OCCUPIED') {
            totalRemainingDwell += (typeof b.dwellRemainingSec === 'number' ? b.dwellRemainingSec : 45);
            activeDwellingBays++;
          }
        });
      });
    }

    const avgRemainingDwellSec = activeDwellingBays > 0
      ? Math.round(totalRemainingDwell / activeDwellingBays)
      : 0;

    return {
      totalBays: Math.max(1, totalBays),
      occupiedBays,
      totalCurbQueue,
      maxCurbSaturation,
      laneBlockedCount,
      avgRemainingDwellSec,
      worstHubName
    };
  }

  _calculateCurbPressure(m) {
    const bayRatio = Math.min(100, (m.occupiedBays / m.totalBays) * 100);
    const queueRatio = Math.min(100, (m.totalCurbQueue / (m.totalBays || 4)) * 100);
    const saturationScore = Math.min(100, m.maxCurbSaturation);
    const spilloverPenalty = m.laneBlockedCount > 0 ? 100 : 0;
    const dwellScore = Math.min(100, (m.avgRemainingDwellSec / 60) * 100);

    const raw = (
      bayRatio * 0.35 +
      saturationScore * 0.30 +
      spilloverPenalty * 0.20 +
      queueRatio * 0.10 +
      dwellScore * 0.05
    );

    const score = Math.min(100, Math.max(0, Math.round(raw)));
    const factors = [];

    if (bayRatio >= 90) {
      factors.push(`${m.worstHubName} loading bays are 100% occupied (${m.occupiedBays} of ${m.totalBays} bays in use).`);
    } else if (bayRatio >= 50) {
      factors.push(`${m.occupiedBays} of ${m.totalBays} freight loading bays actively occupied.`);
    }

    if (m.totalCurbQueue > 0) {
      factors.push(`${m.totalCurbQueue} freight vehicles waiting in curb queue (saturation: ${m.maxCurbSaturation}%).`);
    }

    if (m.laneBlockedCount > 0) {
      factors.push(`Curb queue spillover actively blocking through travel lane at ${m.worstHubName}.`);
    }

    if (m.avgRemainingDwellSec >= 30) {
      factors.push(`Average remaining loading bay dwell duration is ${m.avgRemainingDwellSec}s.`);
    }

    return { score, contributingFactors: factors };
  }

  _extractFreightMetrics(input, freightSlotManager, curbMetrics, isEmergencyActive) {
    let activeFreightCount = 0;
    let freightPcu = 0;
    let enRouteCargo = 0;
    let stagedCount = 0;
    let pendingSlots = 0;
    let deferredCount = 0;

    if (freightSlotManager) {
      const stagedList = freightSlotManager.getStagedVehicles ? freightSlotManager.getStagedVehicles() : [];
      stagedCount = stagedList.length;
      pendingSlots = freightSlotManager.getActiveSlotAssignments ? freightSlotManager.getActiveSlotAssignments().length : 0;
      deferredCount = stagedList.filter(s => s.decision === 'DEFER_EMERGENCY' || s.decision === 'HOLD_AT_ORIGIN').length;
    } else if (input.state?.freightSlotState) {
      const fss = input.state.freightSlotState;
      stagedCount = fss.stagedCount || (fss.stagedVehicles ? fss.stagedVehicles.length : 0);
      pendingSlots = fss.activeSlotCount || (fss.activeSlotAssignments ? fss.activeSlotAssignments.length : 0);
      deferredCount = stagedCount;
    }

    if (input.state?.corridorFreight) {
      const cf = input.state.corridorFreight;
      activeFreightCount = cf.activeFreightCount || (cf.allCommercialVehicles ? cf.allCommercialVehicles.length : 0);
      freightPcu = cf.totalFreightPcu || 0;
      enRouteCargo = cf.totalCargoTonnage || 0;
    }

    return {
      activeFreightCount,
      freightPcu: Number(freightPcu.toFixed(1)),
      enRouteCargo: Number(enRouteCargo.toFixed(1)),
      stagedCount,
      pendingSlots,
      deferredCount,
      isEmergencyActive,
      isHubSaturated: curbMetrics.maxCurbSaturation >= 80 || curbMetrics.laneBlockedCount > 0
    };
  }

  _calculateFreightPressure(m) {
    const volumeScore = Math.min(100, (m.activeFreightCount / 18) * 100);
    const pcuScore = Math.min(100, (m.freightPcu / 30) * 100);
    const stagedScore = Math.min(100, (m.stagedCount / 4) * 100);
    const slotScore = Math.min(100, (m.pendingSlots / 8) * 100);
    const deferredScore = Math.min(100, (m.deferredCount / 3) * 100);

    const raw = (
      volumeScore * 0.25 +
      pcuScore * 0.20 +
      stagedScore * 0.30 +
      deferredScore * 0.15 +
      slotScore * 0.10
    );

    const score = Math.min(100, Math.max(0, Math.round(raw)));
    const factors = [];

    if (m.stagedCount > 0) {
      factors.push(`${m.stagedCount} freight vehicles held at upstream staging areas (J1/J2).`);
    }

    if (m.isEmergencyActive && m.deferredCount > 0) {
      factors.push('Commercial freight departures deferred to preserve emergency corridor priority.');
    }

    if (m.activeFreightCount >= 5) {
      factors.push(`Active commercial fleet: ${m.activeFreightCount} vehicles carrying ${m.enRouteCargo}t cargo.`);
    }

    if (m.pendingSlots > 0) {
      factors.push(`${m.pendingSlots} predictive freight arrival slots actively scheduled.`);
    }

    return { score, contributingFactors: factors };
  }

  // ----------------------------------------------------
  // RESPONSE RECOMMENDATIONS GENERATOR
  // ----------------------------------------------------

  _generateRecommendations(ctx) {
    const primaryRecs = [];
    const secondaryRecs = [];

    // Rule 1: Emergency Active
    if (ctx.isEmergencyActive) {
      primaryRecs.push({
        action: RECOMMENDATIONS.PRIORITIZE_EMERGENCY_CORRIDOR,
        priority: 'PRIMARY',
        reason: 'Emergency corridor priority is active. Preempting signals and deferring upstream commercial departures.',
        affectedLocation: 'Corridor Mainline',
        responsibleModule: 'SignalManager / FreightSlotManager',
        status: 'EXECUTED IN SIMULATION'
      });
    }

    // Rule 2: Curb/hub pressure is CRITICAL (or curb saturation >= 80% / laneBlocked)
    if (ctx.curbCalc.score >= 85 || ctx.curbMetrics.maxCurbSaturation >= 80 || ctx.curbMetrics.laneBlockedCount > 0) {
      const rec = {
        action: RECOMMENDATIONS.HOLD_FREIGHT_UPSTREAM,
        priority: primaryRecs.length === 0 ? 'PRIMARY' : 'SECONDARY',
        reason: `${ctx.curbMetrics.worstHubName} curb saturation reached ${ctx.curbMetrics.maxCurbSaturation}%. Retaining freight at upstream staging points.`,
        affectedLocation: `${ctx.curbMetrics.worstHubName} Corridor`,
        responsibleModule: 'FreightSlotManager',
        status: 'EXECUTED IN SIMULATION'
      };
      if (primaryRecs.length === 0) primaryRecs.push(rec);
      else secondaryRecs.push(rec);
    }

    // Rule 5: Lane blockage is active
    if (ctx.curbMetrics.laneBlockedCount > 0) {
      secondaryRecs.push({
        action: RECOMMENDATIONS.RESTRICT_CURB_ENTRY,
        priority: 'SECONDARY',
        reason: 'Curb queue spillover is reducing through-lane capacity. Meter curb entries.',
        affectedLocation: ctx.curbMetrics.worstHubName,
        responsibleModule: 'LogisticsHubManager',
        status: 'EXECUTED IN SIMULATION'
      });
      secondaryRecs.push({
        action: RECOMMENDATIONS.CLEAR_DOWNSTREAM_SPILLBACK,
        priority: 'SECONDARY',
        reason: 'Downstream curb bottleneck detected; prioritize progression to clear spillback.',
        affectedLocation: `${ctx.curbMetrics.worstHubName} Approach`,
        responsibleModule: 'CorridorCoordinator',
        status: 'ADVISORY'
      });
    }

    // Rule 3: Road or intersection pressure is HIGH or CRITICAL
    if (ctx.roadCalc.score >= 65 || ctx.intersectionCalc.score >= 65) {
      const rec = {
        action: RECOMMENDATIONS.ACTIVATE_ADAPTIVE_SIGNAL_RESPONSE,
        priority: primaryRecs.length === 0 ? 'PRIMARY' : 'SECONDARY',
        reason: `Corridor queuing elevated (${ctx.roadMetrics.totalQueuedPCU} PCUs). Dynamic green phase allocation active.`,
        affectedLocation: `Corridor Nodes (J1–J4)`,
        responsibleModule: 'SignalOptimizer',
        status: ctx.strategy === 'adaptive' ? 'EXECUTED IN SIMULATION' : 'ADVISORY'
      };
      if (primaryRecs.length === 0) primaryRecs.push(rec);
      else if (secondaryRecs.length < 2) secondaryRecs.push(rec);
    }

    // Rule 4: Hub pressure becomes STABLE and staged freight exists
    if (ctx.curbCalc.score <= 39 && ctx.freightMetrics.stagedCount > 0 && !ctx.isEmergencyActive) {
      const rec = {
        action: RECOMMENDATIONS.RELEASE_STAGED_FREIGHT,
        priority: primaryRecs.length === 0 ? 'PRIMARY' : 'SECONDARY',
        reason: `${ctx.curbMetrics.worstHubName} loading capacity recovered to stable. Releasing staged vehicles into scheduled arrival slots.`,
        affectedLocation: 'Upstream Staging Areas (J1/J2)',
        responsibleModule: 'FreightSlotManager',
        status: 'EXECUTED IN SIMULATION'
      };
      if (primaryRecs.length === 0) primaryRecs.push(rec);
      else if (secondaryRecs.length < 2) secondaryRecs.push(rec);
    }

    // Fallback: Nominal operation
    if (primaryRecs.length === 0) {
      primaryRecs.push({
        action: RECOMMENDATIONS.CONTINUE_NORMAL_OPERATION,
        priority: 'PRIMARY',
        reason: 'Corridor traffic and logistics infrastructure operating safely within nominal tolerances.',
        affectedLocation: 'Corridor-Wide',
        responsibleModule: 'SignalManager / LogisticsHubManager',
        status: 'EXECUTED IN SIMULATION'
      });
    }

    return {
      primary: primaryRecs[0],
      secondary: secondaryRecs.slice(0, 2)
    };
  }

  // ----------------------------------------------------
  // EVENT TRACKING (Bounded 10 History)
  // ----------------------------------------------------

  _trackEvents({ simTime, currentLevel, currentPrimaryAction, isEmergencyActive, currentSpillover, majorCause, affectedLocation }) {
    // 1. Establish initial baseline on first tick without creating an event
    if (this.previousLevel === null) {
      this.previousLevel = currentLevel;
      this.previousPrimaryAction = currentPrimaryAction;
      this.previousEmergencyState = isEmergencyActive;
      this.previousSpilloverState = currentSpillover;
      this.lastEventSignature = `${currentLevel}::${currentPrimaryAction || ''}::${Boolean(isEmergencyActive)}::${Boolean(currentSpillover)}`;
      return;
    }

    const levelChanged = this.previousLevel !== currentLevel;
    const actionChanged = this.previousPrimaryAction !== currentPrimaryAction;
    const emergencyChanged = this.previousEmergencyState !== isEmergencyActive;
    const spilloverChanged = this.previousSpilloverState !== currentSpillover;

    // Rule 1: Do not create an event when previousLevel and newLevel are identical unless:
    // - primary recommendation changed,
    // - emergency override started/ended, or
    // - curb spillover started/ended.
    let shouldLog = false;
    if (levelChanged) {
      shouldLog = true;
    } else if (actionChanged || emergencyChanged || spilloverChanged) {
      shouldLog = true;
    }

    if (!shouldLog) {
      return;
    }

    // Rule 2: Deduplicate events using: level + primaryAction + emergencyState + spilloverState
    const currentSignature = `${currentLevel}::${currentPrimaryAction || ''}::${Boolean(isEmergencyActive)}::${Boolean(currentSpillover)}`;
    if (this.lastEventSignature === currentSignature) {
      return;
    }

    const event = {
      id: `evt-${Date.now()}-${this.events.length}`,
      simulationTime: typeof simTime === 'number' ? Number(simTime.toFixed(1)) : 0,
      previousLevel: this.previousLevel,
      newLevel: currentLevel,
      majorCause,
      recommendedAction: currentPrimaryAction,
      affectedLocation,
      isEmergency: isEmergencyActive,
      hasSpillover: currentSpillover
    };

    this.events.unshift(event);
    if (this.events.length > this.config.MAX_EVENTS) {
      this.events.pop();
    }

    // Update state baselines and signature
    this.lastEventSignature = currentSignature;
    this.previousLevel = currentLevel;
    this.previousPrimaryAction = currentPrimaryAction;
    this.previousEmergencyState = isEmergencyActive;
    this.previousSpilloverState = currentSpillover;
  }
}
