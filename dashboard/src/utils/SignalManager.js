import { TRAFFIC_CONSTANTS } from './constants.js';
import { SignalOptimizer } from './SignalOptimizer.js';

export class SignalManager {
  constructor(initialStrategy = 'adaptive') {
    this.currentSignal = 'N';
    this.signalTimer = 0;

    this.currentSignalIndex = 0;
    this.signalSequence = ['N', 'E', 'S', 'W'];

    // Strategy & Phase Controller
    this.strategy = initialStrategy;       // Active strategy: 'adaptive' | 'fixed'
    this.stagedStrategy = initialStrategy; // Staged strategy to apply at next phase boundary

    const initialDuration = this.strategy === 'fixed'
      ? (TRAFFIC_CONSTANTS.SIGNAL_POLICY?.FIXED_DURATIONS?.N || 45)
      : 30;

    this.signalDuration = initialDuration;
    this.activeGreenDuration = initialDuration;
    this.pendingGreenDuration = initialDuration;

    this.phase = 'GREEN';             // 'GREEN' | 'YELLOW' | 'ALL_RED'
    this.phaseTimer = 0;              // seconds in current phase
    this.pendingSignal = 'N';          // signal to switch to after clearance
    this.continuousGreenTimeSec = 0;   // accumulated continuous green time on current signal
    this.isExtendedClearance = false;  // true if clearance is waiting for vehicles inside intersection to clear

    // Policy parameters
    this.yellowDuration = TRAFFIC_CONSTANTS.SIGNAL_POLICY?.YELLOW_DURATION_SEC || 3;
    this.allRedDuration = TRAFFIC_CONSTANTS.SIGNAL_POLICY?.ALL_RED_DURATION_SEC || 1;

    // Weather-Adaptive Clearance State
    this.weatherMode = TRAFFIC_CONSTANTS.WEATHER_POLICY?.DEFAULT_MODE || 'normal';
    this.effectiveWeatherMode = this.weatherMode;
    this.effectiveYellowDuration = this.yellowDuration;
    this.effectiveAllRedDuration = this.allRedDuration;

    // Emergency tracking
    this.emergencyActive = false;
    this.emergencyDirection = null;
    this.emergencyVehicleId = null;

    // Cumulative idle waiting time in seconds per approach
    this.waitingSeconds = { N: 0, E: 0, S: 0, W: 0 };
    this.waitingTicks = { N: 0, E: 0, S: 0, W: 0 };

    // Latest decision record
    this.latestDecision = {
      selectedDirection: 'N',
      strategy: this.strategy,
      proposedGreen: initialDuration,
      activeGreen: initialDuration,
      reason: 'Initial signal cycle',
      queuedPCUs: { N: 0, S: 0, E: 0, W: 0 },
      stoppedCounts: { N: 0, S: 0, E: 0, W: 0 },
      timestamp: Date.now()
    };
  }

  setWeather(mode) {
    const validModes = TRAFFIC_CONSTANTS.WEATHER_POLICY?.MODES || ['normal', 'rain', 'fog'];
    if (!mode || typeof mode !== 'string' || !validModes.includes(mode.toLowerCase())) {
      console.warn(`Invalid weather mode requested: '${mode}'. Active weather mode '${this.weatherMode}' preserved.`);
      return false;
    }
    this.weatherMode = mode.toLowerCase();
    return true;
  }

  calculateClearanceDurations(mode) {
    const policy = TRAFFIC_CONSTANTS.WEATHER_POLICY || {};
    const multMap = policy.MULTIPLIERS || { normal: 1.0, rain: 1.2, fog: 1.4 };
    const mult = multMap[mode] !== undefined ? multMap[mode] : 1.0;
    const baseYellow = policy.NOMINAL_YELLOW_SEC || 3.0;
    const baseAllRed = policy.NOMINAL_ALL_RED_SEC || 1.0;
    const yellowBounds = policy.CLEARANCE_BOUNDS?.yellow || { min: 3.0, max: 4.2 };
    const allRedBounds = policy.CLEARANCE_BOUNDS?.allRed || { min: 1.0, max: 1.4 };

    // Calculate: adjusted = baseClearanceSeconds * multiplier
    // nominalDuration = clamp(adjusted, clearanceMin, clearanceMax)
    const rawYellow = baseYellow * mult;
    const rawAllRed = baseAllRed * mult;

    const yellowSec = Math.max(yellowBounds.min, Math.min(yellowBounds.max, rawYellow));
    const allRedSec = Math.max(allRedBounds.min, Math.min(allRedBounds.max, rawAllRed));

    return { yellowSec, allRedSec, multiplier: mult };
  }

  setStrategy(newStrategy) {
    if (['adaptive', 'fixed'].includes(newStrategy)) {
      this.stagedStrategy = newStrategy;
    }
  }

  /**
   * Advances signal state machine using delta time dt (seconds).
   * Note: Emergency active mode allows YELLOW and ALL_RED clearance phases to advance,
   * reaching GREEN for the emergency approach before holding green priority.
   */
  updateSignal(queues = {}, stoppedCounts = {}, queuedPCUs = {}, oldestWaitTimes = {}, dt = 1.0, isIntersectionOccupied = false, hasActiveCrossingVehicles = false, demandOverrides = null) {
    const deltaSec = typeof dt === 'number' && dt > 0 ? dt : 1.0;
    const maxContinuousGreen = TRAFFIC_CONSTANTS.SIGNAL_POLICY?.MAX_CONTINUOUS_GREEN || 60;

    // Accumulate wait time for non-green / stopped approaches
    Object.keys(this.waitingSeconds).forEach(dir => {
      if (dir !== this.currentSignal || this.phase !== 'GREEN') {
        this.waitingSeconds[dir] += deltaSec;
        this.waitingTicks[dir] = Math.floor(this.waitingSeconds[dir]);
      } else {
        this.waitingSeconds[dir] = 0;
        this.waitingTicks[dir] = 0;
      }
    });

    this.phaseTimer += deltaSec;

    // Handle current phase state machine
    if (this.phase === 'GREEN') {
      this.signalTimer += deltaSec;
      this.continuousGreenTimeSec += deltaSec;

      // During active emergency preemption, hold GREEN phase on emergency direction until released
      if (this.emergencyActive) {
        return;
      }

      if (this.continuousGreenTimeSec >= maxContinuousGreen) {
        this.initiateClearanceSwitch(queues, stoppedCounts, queuedPCUs, oldestWaitTimes, true, demandOverrides);
        return;
      }

      // Dynamic early switch when all queued vehicles have cleared past the opposite signal
      const minGreen = TRAFFIC_CONSTANTS.SIGNAL_POLICY?.MIN_GREEN || 10;
      const currentStopped = (stoppedCounts && stoppedCounts[this.currentSignal]) || 0;
      const otherApproachesHaveDemand = Object.entries(stoppedCounts || {}).some(([d, cnt]) => d !== this.currentSignal && cnt > 0);

      if (this.strategy === 'adaptive' && this.signalTimer >= minGreen && currentStopped === 0 && !hasActiveCrossingVehicles && otherApproachesHaveDemand) {
        this.initiateClearanceSwitch(queues, stoppedCounts, queuedPCUs, oldestWaitTimes, true, demandOverrides);
        return;
      }

      if (this.signalTimer >= this.activeGreenDuration) {
        this.initiateClearanceSwitch(queues, stoppedCounts, queuedPCUs, oldestWaitTimes, false, demandOverrides);
      }
    } else if (this.phase === 'YELLOW') {
      if (this.phaseTimer >= this.effectiveYellowDuration) {
        this.phase = 'ALL_RED';
        this.phaseTimer = 0;
      }
    } else if (this.phase === 'ALL_RED') {
      // Check if crossing vehicles remain inside intersection
      if (this.phaseTimer >= this.effectiveAllRedDuration) {
        if (isIntersectionOccupied) {
          this.isExtendedClearance = true;
          // Hold ALL_RED phase until intersection is clear
          return;
        }

        // Clearance complete: commit pending signal and pending green duration together!
        this.isExtendedClearance = false;
        this.strategy = this.stagedStrategy;

        if (this.pendingSignal !== this.currentSignal) {
          this.continuousGreenTimeSec = 0;
        }

        this.currentSignal = this.pendingSignal;
        this.activeGreenDuration = this.pendingGreenDuration;
        this.signalDuration = this.pendingGreenDuration;
        this.currentSignalIndex = this.signalSequence.indexOf(this.currentSignal);

        this.phase = 'GREEN';
        this.phaseTimer = 0;
        this.signalTimer = 0;
        this.waitingSeconds[this.currentSignal] = 0;
        this.waitingTicks[this.currentSignal] = 0;
      }
    }
  }

  initiateClearanceSwitch(queues = {}, stoppedCounts = {}, queuedPCUs = {}, oldestWaitTimes = {}, forceOptimal = false, demandOverrides = null) {
    this.strategy = this.stagedStrategy;

    const decision = SignalOptimizer.evaluateNextSignal({
      currentSignal: this.currentSignal,
      queuedPCUs,
      stoppedCounts,
      waitingSeconds: this.waitingSeconds,
      currentSignalTotalGreenSec: this.continuousGreenTimeSec,
      strategy: this.strategy,
      signalSequence: this.signalSequence,
      forceOptimal,
      policy: TRAFFIC_CONSTANTS.SIGNAL_POLICY,
      demandOverrides
    });

    this.pendingSignal = decision.nextSignal;
    this.pendingGreenDuration = decision.proposedGreen;

    this.latestDecision = {
      selectedDirection: decision.nextSignal,
      strategy: this.strategy,
      proposedGreen: decision.proposedGreen,
      activeGreen: this.activeGreenDuration,
      reason: decision.reason,
      allocationExplanation: decision.allocationExplanation,
      snapshotPCU: decision.snapshotPCU,
      coefficient: decision.coefficient,
      queuedPCUs: { ...queuedPCUs },
      stoppedCounts: { ...stoppedCounts },
      timestamp: Date.now()
    };

    // If decision extends current signal without switching direction
    if (decision.nextSignal === this.currentSignal && !forceOptimal && !this.emergencyActive) {
      this.activeGreenDuration = decision.proposedGreen;
      this.signalDuration = decision.proposedGreen;
      this.signalTimer = 0;
      this.phase = 'GREEN';
      this.phaseTimer = 0;
      return;
    }

    // Start YELLOW clearance phase: SNAPSHOT WEATHER HERE!
    this.effectiveWeatherMode = this.weatherMode;
    const { yellowSec, allRedSec } = this.calculateClearanceDurations(this.effectiveWeatherMode);
    this.effectiveYellowDuration = yellowSec;
    this.effectiveAllRedDuration = allRedSec;
    this.yellowDuration = yellowSec;
    this.allRedDuration = allRedSec;

    this.phase = 'YELLOW';
    this.phaseTimer = 0;
  }

  switchSignal(queues = {}, forceOptimal = false, demandOverrides = null) {
    this.initiateClearanceSwitch(queues, queues, queues, {}, forceOptimal, demandOverrides);
  }

  determineNextSignal(queues = {}, forceOptimal = false, demandOverrides = null) {
    const decision = SignalOptimizer.evaluateNextSignal({
      currentSignal: this.currentSignal,
      queuedPCUs: queues,
      stoppedCounts: queues,
      waitingSeconds: this.waitingSeconds,
      currentSignalTotalGreenSec: this.continuousGreenTimeSec,
      strategy: this.strategy,
      signalSequence: this.signalSequence,
      forceOptimal,
      policy: TRAFFIC_CONSTANTS.SIGNAL_POLICY,
      demandOverrides
    });
    return decision.nextSignal;
  }

  calculateSignalDuration(arg1, arg2) {
    let dir = null;
    const fixed = TRAFFIC_CONSTANTS.SIGNAL_POLICY?.FIXED_DURATIONS || { N: 30, S: 45, E: 22, W: 60 };
    if (typeof arg1 === 'string' && fixed[arg1.toUpperCase()]) dir = arg1.toUpperCase();
    else if (typeof arg2 === 'string' && fixed[arg2.toUpperCase()]) dir = arg2.toUpperCase();
    else if (this.currentSignal && fixed[this.currentSignal.toUpperCase()]) dir = this.currentSignal.toUpperCase();

    return SignalOptimizer.calculateGreenDuration(dir || this.currentSignal, 0, this.strategy);
  }

  handleEmergencyVehicle(emergency) {
    if (emergency) {
      const approach = emergency.approach || emergency.direction;
      if (approach) {
        this.emergencyActive = true;
        this.emergencyDirection = approach;
        this.emergencyVehicleId = emergency.id || null;

        this.pendingSignal = approach;
        this.pendingGreenDuration = TRAFFIC_CONSTANTS.MAX_SIGNAL_TIME || 60;

        if (this.currentSignal !== approach || this.phase !== 'GREEN') {
          this.effectiveWeatherMode = this.weatherMode;
          const { yellowSec, allRedSec } = this.calculateClearanceDurations(this.effectiveWeatherMode);
          this.effectiveYellowDuration = yellowSec;
          this.effectiveAllRedDuration = allRedSec;
          this.yellowDuration = yellowSec;
          this.allRedDuration = allRedSec;

          this.phase = 'YELLOW';
          this.phaseTimer = 0;
        } else {
          this.phase = 'GREEN';
          this.phaseTimer = 0;
          this.signalTimer = 0;
          this.activeGreenDuration = TRAFFIC_CONSTANTS.MAX_SIGNAL_TIME || 60;
          this.signalDuration = 60;
        }

        const seqIdx = this.signalSequence.indexOf(approach);
        if (seqIdx !== -1) {
          this.currentSignalIndex = seqIdx;
        }

        this.latestDecision = {
          selectedDirection: approach,
          strategy: this.strategy,
          proposedGreen: 60,
          activeGreen: 60,
          reason: `Emergency Preemption: granting green corridor to ${emergency.type || 'Emergency'} vehicle.`,
          queuedPCUs: {},
          stoppedCounts: {},
          timestamp: Date.now()
        };
      }
    }
  }

  endEmergency(queues = {}, stoppedCounts = {}, queuedPCUs = {}) {
    this.emergencyActive = false;
    this.emergencyDirection = null;
    this.emergencyVehicleId = null;
    this.signalTimer = 0;

    // Transition smoothly through clearance back to active strategy (adaptive or fixed)
    this.initiateClearanceSwitch(queues, stoppedCounts, queuedPCUs, {}, true);
  }

  checkEmergencyCleared(emergencyVehicle = null, queues = {}) {
    if (this.emergencyActive) {
      const isStillActive = !!(
        emergencyVehicle &&
        emergencyVehicle.position < 100 &&
        (!this.emergencyVehicleId || emergencyVehicle.id === this.emergencyVehicleId)
      );

      if (!isStillActive) {
        this.endEmergency(queues);
      }
    }
  }

  getPedestrianSignals(queues = {}, cars = {}) {
    if (this.emergencyActive) {
      return { N: 'STOP', S: 'STOP', E: 'STOP', W: 'STOP' };
    }

    if (this.phase !== 'GREEN') {
      return { N: 'STOP', S: 'STOP', E: 'STOP', W: 'STOP' };
    }

    const currentGreen = this.currentSignal;
    const remainingTime = Math.max(0, this.activeGreenDuration - this.signalTimer);
    const isClearingPhase = remainingTime <= 2;

    const greenQueue = (queues && queues[currentGreen]) || 0;
    const greenCars = (cars && cars[currentGreen]) || [];
    const hasApproachingVehicles = greenCars.some(c => c.position < 60);

    const signals = { N: 'STOP', S: 'STOP', E: 'STOP', W: 'STOP' };

    if (currentGreen === 'N' || currentGreen === 'S') {
      signals.E = isClearingPhase ? 'STOP' : 'WALK';
      signals.W = isClearingPhase ? 'STOP' : 'WALK';

      if (greenQueue === 0 && !hasApproachingVehicles) {
        signals.N = isClearingPhase ? 'STOP' : 'WALK';
        signals.S = isClearingPhase ? 'STOP' : 'WALK';
      } else {
        signals.N = 'STOP';
        signals.S = 'STOP';
      }
    } else if (currentGreen === 'E' || currentGreen === 'W') {
      signals.N = isClearingPhase ? 'STOP' : 'WALK';
      signals.S = isClearingPhase ? 'STOP' : 'WALK';

      if (greenQueue === 0 && !hasApproachingVehicles) {
        signals.E = isClearingPhase ? 'STOP' : 'WALK';
        signals.W = isClearingPhase ? 'STOP' : 'WALK';
      } else {
        signals.E = 'STOP';
        signals.W = 'STOP';
      }
    }

    return signals;
  }

  manualOverride(direction) {
    if (['N', 'S', 'E', 'W'].includes(direction)) {
      if (this.currentSignal !== direction) {
        this.pendingSignal = direction;
        this.pendingGreenDuration = 60;
        this.phase = 'YELLOW';
        this.phaseTimer = 0;
      } else {
        this.phase = 'GREEN';
        this.phaseTimer = 0;
        this.signalTimer = 0;
        this.activeGreenDuration = 60;
        this.signalDuration = 60;
      }

      const idx = this.signalSequence.indexOf(direction);
      if (idx !== -1) {
        this.currentSignalIndex = idx;
      }

      this.latestDecision = {
        selectedDirection: direction,
        strategy: 'manual',
        proposedGreen: 60,
        activeGreen: 60,
        reason: `Manual Override: Operator forced green signal for ${direction}.`,
        queuedPCUs: {},
        stoppedCounts: {},
        timestamp: Date.now()
      };
    }
  }

  reset() {
    this.currentSignal = 'N';
    this.pendingSignal = 'N';
    this.phase = 'GREEN';
    this.phaseTimer = 0;
    this.signalTimer = 0;

    const initialDuration = this.strategy === 'fixed'
      ? (TRAFFIC_CONSTANTS.SIGNAL_POLICY?.FIXED_DURATIONS?.N || 45)
      : 30;

    this.activeGreenDuration = initialDuration;
    this.pendingGreenDuration = initialDuration;
    this.signalDuration = initialDuration;
    this.currentSignalIndex = 0;
    this.continuousGreenTimeSec = 0;
    this.isExtendedClearance = false;
    this.emergencyActive = false;
    this.emergencyDirection = null;
    this.emergencyVehicleId = null;
    this.waitingSeconds = { N: 0, E: 0, S: 0, W: 0 };
    this.waitingTicks = { N: 0, E: 0, S: 0, W: 0 };
    this.latestDecision = {
      selectedDirection: 'N',
      strategy: this.strategy,
      proposedGreen: initialDuration,
      activeGreen: initialDuration,
      reason: 'Session reset',
      queuedPCUs: { N: 0, S: 0, E: 0, W: 0 },
      stoppedCounts: { N: 0, S: 0, E: 0, W: 0 },
      timestamp: Date.now()
    };
  }

  getState(queues = {}, cars = {}) {
    const activeDuration = this.activeGreenDuration;
    const pendingDuration = this.pendingGreenDuration;

    let phaseRemainingSec = 0;
    let phaseLabel = 'Green remaining';

    if (this.phase === 'GREEN') {
      phaseRemainingSec = Math.max(0, Math.ceil(activeDuration - this.signalTimer));
      phaseLabel = 'Green remaining';
    } else if (this.phase === 'YELLOW') {
      phaseRemainingSec = Math.max(0, Math.ceil(this.effectiveYellowDuration - this.phaseTimer));
      phaseLabel = 'Yellow clearance';
    } else if (this.phase === 'ALL_RED') {
      phaseRemainingSec = Math.max(0, Math.ceil(this.effectiveAllRedDuration - this.phaseTimer));
      phaseLabel = 'All-red clearance';
    }

    const clearanceStatus = this.isExtendedClearance
      ? 'Waiting for intersection clearance'
      : null;

    const { multiplier } = this.calculateClearanceDurations(this.effectiveWeatherMode);

    return {
      current_signal: this.currentSignal,
      pending_signal: this.pendingSignal,
      phase: this.phase,
      timer: Math.round(this.signalTimer),
      duration: activeDuration,
      active_green_duration: activeDuration,
      pending_green_duration: pendingDuration,
      phase_remaining_sec: phaseRemainingSec,
      phase_label: phaseLabel,
      is_extended_clearance: this.isExtendedClearance,
      clearance_status: clearanceStatus,
      strategy: this.strategy,
      staged_strategy: this.stagedStrategy,
      continuous_green_sec: Math.round(this.continuousGreenTimeSec),
      emergency_active: this.emergencyActive,
      emergency_direction: this.emergencyDirection,
      weather_mode: this.weatherMode,
      effective_weather_mode: this.effectiveWeatherMode,
      yellow_duration: parseFloat(this.effectiveYellowDuration.toFixed(1)),
      all_red_duration: parseFloat(this.effectiveAllRedDuration.toFixed(1)),
      weather_multiplier: multiplier,
      waiting_ticks: { ...this.waitingTicks },
      waiting_seconds: { ...this.waitingSeconds },
      decision: { ...this.latestDecision },
      pedestrian_signals: this.getPedestrianSignals(queues, cars)
    };
  }
}