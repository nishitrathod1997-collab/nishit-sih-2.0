/**
 * comparisonEngine.js
 * 
 * Browser-compatible, pure JS simulation comparison engine.
 * Runs isolated Fixed 45s vs Adaptive simulation sessions using identical inputs.
 * NO Node.js dependencies (no fs, path, etc.).
 */

import { VehicleManager } from './VehicleManager.js';
import { SignalManager } from './SignalManager.js';
import { SimulationClock } from './SimulationClock.js';
import { TRAFFIC_CONSTANTS } from './constants.js';

export const COMPARISON_ENGINE_VERSION = '2.4.0';

/**
 * Pseudo-random number generator (Mulberry32) for deterministic synthetic schedules.
 */
export function createPRNG(seed = 12345) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates deterministic synthetic arrival schedule for non-video approaches (e.g., N, E, W).
 */
export function generateSyntheticSchedule(seed, maxDurationSec, excludeDirections = ['S'], demandMultiplier = 0.5) {
  const prng = createPRNG(seed);
  const schedule = [];
  const directions = ['N', 'E', 'S', 'W'].filter(d => !excludeDirections.includes(d));
  let idCounter = 1;

  const getRate = (dir, t) => {
    let baseRate = 0.30;
    switch (dir) {
      case 'N': baseRate = 0.30 + 0.25 * Math.sin((2 * Math.PI * t) / 120); break;
      case 'E': baseRate = 0.25 + 0.30 * Math.sin((2 * Math.PI * t) / 150 + Math.PI / 2); break;
      case 'W': baseRate = 0.28 + 0.28 * Math.sin((2 * Math.PI * t) / 200 + Math.PI); break;
      default: baseRate = 0.25;
    }
    const unscaledRate = Math.max(0.08, parseFloat(baseRate.toFixed(3)));
    const mult = typeof demandMultiplier === 'number' && demandMultiplier > 0 ? demandMultiplier : 0.5;
    return parseFloat((unscaledRate * mult).toFixed(4));
  };

  directions.forEach(direction => {
    let t = prng() * 2.0;
    while (t < maxDurationSec) {
      const ratePerSec = getRate(direction, t);
      const dtArrival = -Math.log(1 - Math.min(0.99, prng())) / ratePerSec;
      t += Math.max(0.5, dtArrival);

      if (t >= maxDurationSec) break;

      const r = prng();
      const vType = r < 0.50 ? 'car' : r < 0.72 ? 'bike' : r < 0.88 ? 'bus' : 'truck';

      schedule.push({
        eventId: `synth-${direction}-${idCounter++}`,
        videoTimeSec: parseFloat(t.toFixed(3)),
        vehicleType: vType,
        mappedDirection: direction
      });
    }
  });

  return schedule;
}

/**
 * Computes a deterministic fingerprint from full timeline events & configuration parameters.
 */
export function computeFingerprint(inputConfig, arrivalTimeline = []) {
  const normalizedTimeline = arrivalTimeline.map(e =>
    `${e.eventId || ''}@${e.videoTimeSec || 0}:${e.mappedDirection || 'S'}:${e.vehicleType || 'car'}`
  ).join('|');

  const payloadToHash = {
    ...inputConfig,
    timelineSignature: normalizedTimeline
  };

  const str = JSON.stringify(payloadToHash);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `fp-${Math.abs(hash).toString(16)}-v3`;
}

/**
 * Runs a single isolated simulation session with sub-step precision (<= 0.05s).
 */
export function runSingleSession({ strategy, arrivalTimeline, targetDurationSec, nominalDt = 0.1, weatherMode = 'normal' }) {
  const vm = new VehicleManager();
  vm.reset();

  // Clear all approaches and backlog; set approach sources to recorded_video
  ['N', 'S', 'E', 'W'].forEach(d => {
    vm.setApproachSource(d, 'recorded_video');
    vm.clearApproach(d);
  });

  const sm = new SignalManager(strategy);
  sm.reset();
  sm.setWeather(weatherMode);

  const clock = new SimulationClock(1.0);
  clock.reset();

  let eventCursor = 0;
  const processedEventIds = new Set();

  const queueHistoryPerDir = { N: [], E: [], S: [], W: [], total: [] };
  const waitSecAccumulatorPerDir = { N: 0, E: 0, S: 0, W: 0 };
  const departuresPerDir = { N: 0, E: 0, S: 0, W: 0 };
  const acceptedArrivalsPerDir = { N: 0, E: 0, S: 0, W: 0 };

  let totalQueueTimeIntegral = 0;
  let currentSimTime = 0;

  // Track departed vehicles' total wait times separately
  let departedVehiclesWaitSum = 0;
  let totalDepartures = 0;

  while (currentSimTime < targetDurationSec) {
    const remainingSec = targetDurationSec - currentSimTime;
    const stepDelta = Math.min(nominalDt, remainingSec);

    const tickResult = clock.tick(stepDelta);
    const subSteps = tickResult.subSteps;

    for (let sIdx = 0; sIdx < subSteps.length; sIdx++) {
      const subDt = subSteps[sIdx];
      const subStepEnd = currentSimTime + subDt;

      // Window policy [0, targetDurationSec): dispatch events in [subStepStart, subStepEnd)
      while (
        eventCursor < arrivalTimeline.length &&
        arrivalTimeline[eventCursor].videoTimeSec < subStepEnd + 1e-9 &&
        arrivalTimeline[eventCursor].videoTimeSec < targetDurationSec + 1e-9
      ) {
        const event = arrivalTimeline[eventCursor++];
        if (!processedEventIds.has(event.eventId)) {
          processedEventIds.add(event.eventId);
          const dir = event.mappedDirection || 'S';
          vm.injectExternalArrival(dir, event);
          acceptedArrivalsPerDir[dir] = (acceptedArrivalsPerDir[dir] || 0) + 1;
        }
      }

      const stoppedQueues = vm.getStoppedQueues();
      const queuedPCUs = vm.getQueuedPCUs();
      const oldestWaitTimes = vm.getOldestWaitTimes();
      const isOccupied = vm.isIntersectionOccupied();

      let stepTotalStopped = 0;
      ['N', 'E', 'S', 'W'].forEach(d => {
        const stoppedVisibleCount = (vm.cars[d] || []).filter(c => c.isStopped).length;
        const backlogCount = (vm.backlog[d] || []).length;
        const dirStoppedTotal = stoppedVisibleCount + backlogCount;

        queueHistoryPerDir[d].push(dirStoppedTotal);
        waitSecAccumulatorPerDir[d] += dirStoppedTotal * subDt;
        stepTotalStopped += dirStoppedTotal;
      });

      queueHistoryPerDir.total.push(stepTotalStopped);
      totalQueueTimeIntegral += stepTotalStopped * subDt;

      // Advance signal controller & vehicle physics
      const hasCrossing = typeof vm.hasActiveCrossingVehicles === 'function'
        ? vm.hasActiveCrossingVehicles(sm.currentSignal)
        : false;
      sm.updateSignal(stoppedQueues, stoppedQueues, queuedPCUs, oldestWaitTimes, subDt, isOccupied, hasCrossing);
      const stepUpdate = vm.updateVehicles(sm.currentSignal, sm.phase, subDt);

      // Track departures and departed wait times
      if (stepUpdate && stepUpdate.departedCars) {
        stepUpdate.departedCars.forEach(car => {
          totalDepartures++;
          const dir = car.direction || 'S';
          departuresPerDir[dir] = (departuresPerDir[dir] || 0) + 1;
          if (typeof car.totalWaitTime === 'number') {
            departedVehiclesWaitSum += car.totalWaitTime;
          }
        });
      }

      currentSimTime += subDt;
    }
  }

  // Count remaining vehicles
  let totalVisibleCarsRemaining = 0;
  let totalBacklogCarsRemaining = 0;
  const perDirRemaining = { N: { visible: 0, backlog: 0 }, E: { visible: 0, backlog: 0 }, S: { visible: 0, backlog: 0 }, W: { visible: 0, backlog: 0 } };

  ['N', 'E', 'S', 'W'].forEach(d => {
    const vis = (vm.cars[d] || []).length;
    const back = (vm.backlog[d] || []).length;
    perDirRemaining[d] = { visible: vis, backlog: back };
    totalVisibleCarsRemaining += vis;
    totalBacklogCarsRemaining += back;
  });

  const totalAcceptedArrivals = processedEventIds.size;
  const totalAccumulatedWaitSec = parseFloat(totalQueueTimeIntegral.toFixed(1));
  const timeWeightedAvgStoppedQueue = parseFloat((totalQueueTimeIntegral / (currentSimTime || 1)).toFixed(2));
  const maxStoppedQueue = queueHistoryPerDir.total.length > 0 ? Math.max(...queueHistoryPerDir.total) : 0;

  // Primary metric: total accumulated waiting / accepted arrivals
  const averageWaitingAccruedPerAdmitted = totalAcceptedArrivals > 0
    ? parseFloat((totalAccumulatedWaitSec / totalAcceptedArrivals).toFixed(2))
    : null;

  // Departed-only waiting metric
  const departedVehiclesAvgWaiting = totalDepartures > 0
    ? parseFloat((departedVehiclesWaitSum / totalDepartures).toFixed(2))
    : null;

  // Per approach detailed metrics
  const perApproach = {};
  ['N', 'E', 'S', 'W'].forEach(d => {
    const accWait = parseFloat((waitSecAccumulatorPerDir[d] || 0).toFixed(1));
    const admitted = acceptedArrivalsPerDir[d] || 0;
    perApproach[d] = {
      acceptedArrivals: admitted,
      departures: departuresPerDir[d] || 0,
      accumulatedWaitSec: accWait,
      avgWaitingAccruedPerAdmitted: admitted > 0 ? parseFloat((accWait / admitted).toFixed(2)) : null,
      visibleRemaining: perDirRemaining[d].visible,
      backlogRemaining: perDirRemaining[d].backlog
    };
  });

  return {
    strategy,
    actualDurationSec: parseFloat(currentSimTime.toFixed(2)),
    totalOfferedArrivals: arrivalTimeline.length,
    totalAcceptedArrivals,
    totalDepartures,
    totalVisibleCarsRemaining,
    totalBacklogCarsRemaining,
    totalRemainingVehicles: totalVisibleCarsRemaining + totalBacklogCarsRemaining,
    totalAccumulatedWaitSec,
    averageWaitingAccruedPerAdmitted,
    departedVehiclesAvgWaiting,
    departedSampleCount: totalDepartures,
    timeWeightedAvgStoppedQueue,
    maxStoppedQueue,
    perApproach,
    processedEventIdsCount: processedEventIds.size
  };
}

/**
 * Runs both Fixed 45s and Adaptive sessions and returns unified comparison result payload.
 */
export function runComparisonPair({
  videoId = 'bellevue_trial',
  arrivalEvents = [],
  mappedDirection = 'S',
  durationSec = 158.63,
  randomSeed = 42,
  fixedDurations = TRAFFIC_CONSTANTS.SIGNAL_POLICY.FIXED_DURATIONS,
  roi = null,
  weatherMode = 'normal',
  demandMultiplier = (TRAFFIC_CONSTANTS.DEMAND_POLICY?.DEFAULT_GENERATED_DEMAND_MULTIPLIER ?? 0.5)
}) {
  const startTimeISO = new Date().toISOString();
  const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // Build unified arrival timeline
  const synthSchedule = generateSyntheticSchedule(randomSeed, durationSec, [mappedDirection], demandMultiplier);
  const videoSchedule = arrivalEvents.map(e => ({
    ...e,
    mappedDirection: mappedDirection
  }));

  const arrivalTimeline = [...videoSchedule, ...synthSchedule].sort((a, b) => a.videoTimeSec - b.videoTimeSec);

  const inputConfig = {
    videoId,
    mappedDirection,
    durationSec,
    randomSeed,
    demandMultiplier,
    adaptiveSecondsPerPCU: TRAFFIC_CONSTANTS.SIGNAL_POLICY?.ADAPTIVE_SECONDS_PER_PCU || 1.0,
    arrivalCount: arrivalEvents.length,
    fixedDurations,
    roi,
    weatherMode,
    weatherPolicy: TRAFFIC_CONSTANTS.WEATHER_POLICY,
    version: COMPARISON_ENGINE_VERSION
  };

  const fingerprint = computeFingerprint(inputConfig, arrivalTimeline);

  // Run isolated sessions with identical weather mode
  const fixedResults = runSingleSession({
    strategy: 'fixed',
    arrivalTimeline,
    targetDurationSec: durationSec,
    weatherMode
  });

  const adaptiveResults = runSingleSession({
    strategy: 'adaptive',
    arrivalTimeline,
    targetDurationSec: durationSec,
    weatherMode
  });

  // Calculate percentage change helper
  const calcDiffPct = (fixedVal, adaptiveVal) => {
    if (typeof fixedVal !== 'number' || typeof adaptiveVal !== 'number' || fixedVal === 0) {
      return 'N/A';
    }
    const pct = ((adaptiveVal - fixedVal) / fixedVal) * 100;
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
  };

  const comparisonTable = {
    totalOfferedArrivals: { fixed: fixedResults.totalOfferedArrivals, adaptive: adaptiveResults.totalOfferedArrivals, diffPct: calcDiffPct(fixedResults.totalOfferedArrivals, adaptiveResults.totalOfferedArrivals) },
    totalAcceptedArrivals: { fixed: fixedResults.totalAcceptedArrivals, adaptive: adaptiveResults.totalAcceptedArrivals, diffPct: calcDiffPct(fixedResults.totalAcceptedArrivals, adaptiveResults.totalAcceptedArrivals) },
    totalDepartures: { fixed: fixedResults.totalDepartures, adaptive: adaptiveResults.totalDepartures, diffPct: calcDiffPct(fixedResults.totalDepartures, adaptiveResults.totalDepartures) },
    averageWaitingAccruedPerAdmitted: {
      fixed: fixedResults.averageWaitingAccruedPerAdmitted,
      adaptive: adaptiveResults.averageWaitingAccruedPerAdmitted,
      diffPct: calcDiffPct(fixedResults.averageWaitingAccruedPerAdmitted, adaptiveResults.averageWaitingAccruedPerAdmitted)
    },
    totalAccumulatedWaitSec: { fixed: fixedResults.totalAccumulatedWaitSec, adaptive: adaptiveResults.totalAccumulatedWaitSec, diffPct: calcDiffPct(fixedResults.totalAccumulatedWaitSec, adaptiveResults.totalAccumulatedWaitSec) },
    timeWeightedAvgStoppedQueue: { fixed: fixedResults.timeWeightedAvgStoppedQueue, adaptive: adaptiveResults.timeWeightedAvgStoppedQueue, diffPct: calcDiffPct(fixedResults.timeWeightedAvgStoppedQueue, adaptiveResults.timeWeightedAvgStoppedQueue) },
    maxStoppedQueue: { fixed: fixedResults.maxStoppedQueue, adaptive: adaptiveResults.maxStoppedQueue, diffPct: calcDiffPct(fixedResults.maxStoppedQueue, adaptiveResults.maxStoppedQueue) },
    totalRemainingVehicles: { fixed: fixedResults.totalRemainingVehicles, adaptive: adaptiveResults.totalRemainingVehicles, diffPct: calcDiffPct(fixedResults.totalRemainingVehicles, adaptiveResults.totalRemainingVehicles) }
  };

  const completionTimeISO = new Date().toISOString();

  return {
    metadata: {
      runId,
      engineVersion: COMPARISON_ENGINE_VERSION,
      startTime: startTimeISO,
      completionTime: completionTimeISO,
      timestamp: completionTimeISO,
      randomSeed,
      actualDurationSec: durationSec,
      timelineFingerprint: fingerprint,
      mappedDirection,
      videoId,
      fixedPlanLabel: 'Uniform Fixed Baseline — 45s per direction',
      scenarioLabel: 'Short-run comparison (~159s clip; full Fixed cycle takes ~196s including clearance)',
      fixedDurations,
      inputConfig
    },
    fixedResults,
    adaptiveResults,
    comparisonTable,
    status: 'COMPLETED'
  };
}
