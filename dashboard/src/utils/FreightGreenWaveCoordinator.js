import { TRAFFIC_CONSTANTS } from './constants.js';
import { CORRIDORS, JUNCTION_COORDINATES } from './CorridorCoordinator.js';

/**
 * FreightGreenWaveCoordinator.js
 * Logistics-Aware Multi-Intersection Freight Progression & Green-Wave Coordination Engine.
 *
 * Core Principles:
 * 1. Sits on top of existing simulation without duplicating clocks, vehicles, or signal state.
 * 2. Deterministic arrival-time estimation from genuine vehicle position and speed (ETA = d / v).
 * 3. Multi-objective balanced decision: evaluates freight benefit vs. passenger delay and spillback risk.
 * 4. Hard guardrails: Emergency preemption, passenger starvation (>45s), and downstream saturation (>=80%) suppress extensions.
 * 5. Consumes Phase 3 LogisticsHubManager hub departure state.
 * 6. 100% explainable structured decision receipts.
 */
export class FreightGreenWaveCoordinator {
  constructor(corridorId = 'corridor-bkc-arterial') {
    this.corridor = CORRIDORS.find(c => c.id === corridorId) || CORRIDORS[0];
    this.activeDecisions = [];
    this.telemetry = {
      evaluatedVehicles: 0,
      eligibleVehicles: 0,
      greenWaveOpportunities: 0,
      greenWaveGranted: 0,
      greenWaveDeferred: 0,
      greenWaveNoChange: 0,
      downstreamThrottleEvents: 0,
      starvationOverrideEvents: 0
    };
  }

  /**
   * Evaluates freight progression eligibility for a given vehicle.
   *
   * @param {Object} vehicle - Vehicle object from VehicleManager
   * @param {string} approachDirection - Approach direction (N, S, E, W)
   * @returns {Object} { isEligible: boolean, status: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'DEFERRED', reason: string }
   */
  evaluateEligibility(vehicle, approachDirection = 'N') {
    if (!vehicle || !vehicle.isCommercial) {
      return {
        isEligible: false,
        status: 'NOT_ELIGIBLE',
        reason: 'Vehicle is not classified as commercial freight (passenger/transit/emergency).'
      };
    }

    // Vehicles currently dwelling inside a loading bay are not in transit
    if (vehicle.deliveryStatus === 'AT_HUB' && vehicle.curbDwellRemainingSec > 0) {
      return {
        isEligible: false,
        status: 'NOT_ELIGIBLE',
        reason: `Vehicle ${vehicle.id} is currently docking/unloading inside loading bay (${vehicle.curbDwellRemainingSec}s remaining).`
      };
    }

    // Check if vehicle is progressing towards an active intersection
    if (vehicle.position > 58 && !vehicle.isExternal) {
      return {
        isEligible: false,
        status: 'NOT_ELIGIBLE',
        reason: `Vehicle ${vehicle.id} has already cleared the intersection stop line (position ${vehicle.position.toFixed(1)}).`
      };
    }

    return {
      isEligible: true,
      status: 'ELIGIBLE',
      reason: `Commercial ${vehicle.type} is en-route on approach ${approachDirection} with cargo load ${vehicle.cargoTonnage || 0}t.`
    };
  }

  /**
   * Deterministic arrival-time estimation to intersection stop line (position = 25).
   * Formula: ETA = (StopLinePosition - CurrentPosition) / EffectiveSpeed
   *
   * @param {Object} vehicle - Vehicle object
   * @param {number} stopLinePos - Position of stop line (default 25)
   * @returns {Object} { etaSeconds: number, distanceRemaining: number, effectiveSpeed: number }
   */
  estimateArrivalTime(vehicle, stopLinePos = 25) {
    if (!vehicle) return { etaSeconds: Infinity, distanceRemaining: 0, effectiveSpeed: 0 };

    const currentPos = typeof vehicle.position === 'number' ? vehicle.position : 0;
    const distanceRemaining = Math.max(0, stopLinePos - currentPos);
    const speed = typeof vehicle.speed === 'number' && vehicle.speed > 0
      ? vehicle.speed
      : (TRAFFIC_CONSTANTS.VEHICLE_SPEEDS[vehicle.type] || 5.0);

    const etaSeconds = distanceRemaining > 0
      ? Number((distanceRemaining / speed).toFixed(1))
      : 0;

    return {
      etaSeconds,
      distanceRemaining: Number(distanceRemaining.toFixed(1)),
      effectiveSpeed: speed
    };
  }

  /**
   * Formulates a balanced, multi-objective green wave progression recommendation.
   *
   * @param {Object} params
   * @param {Object} params.vehicle - Leading commercial vehicle
   * @param {string} params.approach - Approach direction (N, S, E, W)
   * @param {Object} params.signalState - Current signal state from SignalManager
   * @param {Object} params.corridorContext - Downstream junction/approach saturation context
   * @param {Object} params.hubState - Logistics hub state if associated
   * @param {boolean} params.isEmergencyActive - Whether emergency preemption is active
   * @returns {Object} Structured decision result with transparent explainability
   */
  evaluateProgressionRecommendation({
    vehicle,
    approach = 'N',
    signalState = {},
    corridorContext = {},
    hubState = null,
    isEmergencyActive = false
  }) {
    this.telemetry.evaluatedVehicles++;

    const eligibility = this.evaluateEligibility(vehicle, approach);
    if (!eligibility.isEligible) {
      return {
        vehicleId: vehicle?.id || 'unknown',
        vehicleType: vehicle?.type || 'unknown',
        approach,
        decision: 'DEFER',
        recommendedAction: 'NO_CHANGE',
        isEligible: false,
        reason: eligibility.reason,
        guardrailTriggered: null,
        greenAdjustmentSec: 0,
        downstreamSaturation: corridorContext.downstreamSaturation || 0,
        isExecuted: false,
        timestamp: Date.now()
      };
    }

    this.telemetry.eligibleVehicles++;
    this.telemetry.greenWaveOpportunities++;

    const etaData = this.estimateArrivalTime(vehicle);
    const etaSec = etaData.etaSeconds;

    const currentSignal = signalState.currentSignal || 'N';
    const currentPhase = signalState.phase || 'GREEN';
    const activeGreenDuration = signalState.activeGreenDuration || 30;
    const signalTimer = signalState.signalTimer || 0;
    const remainingGreenSec = currentPhase === 'GREEN' && currentSignal === approach
      ? Math.max(0, activeGreenDuration - signalTimer)
      : 0;

    const downstreamSaturation = typeof corridorContext.downstreamSaturation === 'number'
      ? corridorContext.downstreamSaturation
      : 0.45; // nominal 45% if unmonitored

    const maxPassengerWaitSec = corridorContext.maxPassengerWaitSec || 0;
    const throttleThreshold = TRAFFIC_CONSTANTS.CORRIDOR_GUARDRAILS?.DOWNSTREAM_SATURATION_THROTTLE || 0.80;
    const starvationLimit = TRAFFIC_CONSTANTS.CORRIDOR_GUARDRAILS?.PASSENGER_STARVATION_LIMIT_SEC || 45;

    // GUARDRAIL 1: Emergency preemption always dominates
    if (isEmergencyActive) {
      this.telemetry.greenWaveDeferred++;
      return {
        vehicleId: vehicle.id,
        vehicleType: vehicle.type,
        approach,
        etaSeconds: etaSec,
        decision: 'BLOCKED',
        recommendedAction: 'DEFER',
        isEligible: true,
        guardrailTriggered: 'EMERGENCY_OVERRIDE',
        greenAdjustmentSec: 0,
        reason: 'Blocked because emergency vehicle preemption is active on corridor.',
        expectedFreightDelayReduction: 0,
        downstreamSaturation,
        isExecuted: false,
        timestamp: Date.now()
      };
    }

    // GUARDRAIL 2: Downstream backpressure / spillback protection
    if (downstreamSaturation >= throttleThreshold) {
      this.telemetry.greenWaveDeferred++;
      this.telemetry.downstreamThrottleEvents++;
      return {
        vehicleId: vehicle.id,
        vehicleType: vehicle.type,
        approach,
        etaSeconds: etaSec,
        decision: 'DEFER',
        recommendedAction: 'DEFER',
        isEligible: true,
        guardrailTriggered: 'DOWNSTREAM_BACKPRESSURE',
        greenAdjustmentSec: 0,
        reason: `Downstream approach saturation (${Math.round(downstreamSaturation * 100)}%) exceeds throttle threshold (${Math.round(throttleThreshold * 100)}%). Deferred progression to prevent corridor spillback.`,
        expectedFreightDelayReduction: 0,
        downstreamSaturation,
        isExecuted: false,
        timestamp: Date.now()
      };
    }

    // GUARDRAIL 3: Conflicting passenger starvation protection
    if (maxPassengerWaitSec >= starvationLimit) {
      this.telemetry.greenWaveDeferred++;
      this.telemetry.starvationOverrideEvents++;
      return {
        vehicleId: vehicle.id,
        vehicleType: vehicle.type,
        approach,
        etaSeconds: etaSec,
        decision: 'DEFER',
        recommendedAction: 'DEFER',
        isEligible: true,
        guardrailTriggered: 'PASSENGER_STARVATION',
        greenAdjustmentSec: 0,
        reason: `Deferred because passenger waiting time (${Math.round(maxPassengerWaitSec)}s) exceeded the safety threshold (${starvationLimit}s). Freight extension suppressed to protect passenger flow.`,
        expectedFreightDelayReduction: 0,
        downstreamSaturation,
        isExecuted: false,
        timestamp: Date.now()
      };
    }

    // DECISION LOGIC:
    // Case A: Approach is currently GREEN
    if (currentSignal === approach && currentPhase === 'GREEN') {
      if (etaSec <= remainingGreenSec) {
        // Vehicle will clear within already allocated green window
        this.telemetry.greenWaveNoChange++;
        return {
          vehicleId: vehicle.id,
          vehicleType: vehicle.type,
          approach,
          etaSeconds: etaSec,
          remainingGreenSec: Number(remainingGreenSec.toFixed(1)),
          decision: 'GRANT',
          recommendedAction: 'NO_CHANGE',
          isEligible: true,
          guardrailTriggered: null,
          greenAdjustmentSec: 0,
          reason: `Freight vehicle (ETA ${etaSec}s) will arrive within existing green window (${remainingGreenSec.toFixed(1)}s remaining). No timing intervention needed.`,
          expectedFreightDelayReduction: 0,
          downstreamSaturation,
          isExecuted: false,
          timestamp: Date.now()
        };
      } else if (etaSec <= remainingGreenSec + 15) {
        // Vehicle arrives shortly after planned green expiry -> extend green!
        const neededExtension = Math.min(15, Math.ceil(etaSec - remainingGreenSec + 2));
        const maxContinuous = TRAFFIC_CONSTANTS.SIGNAL_POLICY?.MAX_CONTINUOUS_GREEN || 60;
        const currentTotalGreen = signalTimer;

        if (currentTotalGreen + neededExtension <= maxContinuous) {
          this.telemetry.greenWaveGranted++;
          return {
            vehicleId: vehicle.id,
            vehicleType: vehicle.type,
            approach,
            etaSeconds: etaSec,
            remainingGreenSec: Number(remainingGreenSec.toFixed(1)),
            decision: 'GRANT',
            recommendedAction: 'EXTEND_GREEN',
            isEligible: true,
            guardrailTriggered: null,
            greenAdjustmentSec: neededExtension,
            reason: `Proactive green extension (+${neededExtension}s) allocated for ${vehicle.type} (ETA ${etaSec}s). Downstream saturation is safe (${Math.round(downstreamSaturation * 100)}%).`,
            expectedFreightDelayReduction: Math.round(neededExtension * 1.5),
            downstreamSaturation,
            isExecuted: false,
            timestamp: Date.now()
          };
        } else {
          this.telemetry.greenWaveDeferred++;
          return {
            vehicleId: vehicle.id,
            vehicleType: vehicle.type,
            approach,
            etaSeconds: etaSec,
            remainingGreenSec: Number(remainingGreenSec.toFixed(1)),
            decision: 'DEFER',
            recommendedAction: 'DEFER',
            isEligible: true,
            guardrailTriggered: 'MAX_GREEN_LIMIT',
            greenAdjustmentSec: 0,
            reason: `Deferred because maximum continuous green limit (${maxContinuous}s) would be exceeded.`,
            expectedFreightDelayReduction: 0,
            downstreamSaturation,
            isExecuted: false,
            timestamp: Date.now()
          };
        }
      }
    }

    // Case B: Approach is currently RED / YELLOW
    if (currentSignal !== approach) {
      if (etaSec <= 10 && signalState.continuousGreenTimeSec >= (TRAFFIC_CONSTANTS.SIGNAL_POLICY?.MIN_GREEN || 10)) {
        this.telemetry.greenWaveGranted++;
        return {
          vehicleId: vehicle.id,
          vehicleType: vehicle.type,
          approach,
          etaSeconds: etaSec,
          decision: 'GRANT',
          recommendedAction: 'EARLY_GREEN',
          isEligible: true,
          guardrailTriggered: null,
          greenAdjustmentSec: 0,
          reason: `Freight vehicle arriving at red approach in ${etaSec}s. Proactively queueing early phase switch to ${approach} approach.`,
          expectedFreightDelayReduction: 12,
          downstreamSaturation,
          isExecuted: false,
          timestamp: Date.now()
        };
      }
    }

    // Default: Hold or No Change
    this.telemetry.greenWaveNoChange++;
    return {
      vehicleId: vehicle.id,
      vehicleType: vehicle.type,
      approach,
      etaSeconds: etaSec,
      decision: 'DEFER',
      recommendedAction: 'HOLD_CURRENT_PHASE',
      isEligible: true,
      guardrailTriggered: null,
      greenAdjustmentSec: 0,
      reason: `Freight progression tracked (ETA ${etaSec}s). Conditions nominal; standard adaptive timing cycle maintained.`,
      expectedFreightDelayReduction: 0,
      downstreamSaturation,
      isExecuted: false,
      timestamp: Date.now()
    };
  }

  /**
   * Consumes LogisticsHubManager completed dwell events to track departing freight platoons.
   *
   * @param {Array} completedHubVehicles - List of vehicles completing dwell at a hub
   */
  registerHubDepartures(completedHubVehicles = []) {
    if (!Array.isArray(completedHubVehicles)) return [];
    return completedHubVehicles.map(dep => ({
      vehicleId: dep.vehicleId,
      sourceHubId: dep.hubId,
      corridorId: this.corridor.id,
      progressionStatus: 'CORRIDOR_PROGRESSION_READY',
      registeredAt: Date.now()
    }));
  }

  /**
   * Returns current coordinator telemetry.
   */
  getTelemetry() {
    return {
      corridorId: this.corridor.id,
      corridorName: this.corridor.name,
      ...this.telemetry,
      grantRatePercent: this.telemetry.greenWaveOpportunities > 0
        ? Math.round((this.telemetry.greenWaveGranted / this.telemetry.greenWaveOpportunities) * 100)
        : 0
    };
  }
}
