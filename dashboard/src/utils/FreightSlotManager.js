import { DEFAULT_LINK_CONFIGS } from './LinkManager.js';

/**
 * FreightSlotManager.js
 * Smart Freight Arrival Slot & Upstream Holding Manager
 *
 * Core Responsibilities:
 * 1. Predicts whether destination hub can accept an incoming freight vehicle.
 * 2. Assigns deterministic arrival slot windows based on dwell countdowns and modeled travel times.
 * 3. Holds selected freight vehicles at upstream staging areas (J1/J2) during hub saturation or emergency priority.
 * 4. Automatically releases staged vehicles once corridor and hub conditions become safe.
 * 5. Guarantees exactly-once release with zero duplication between links, queues, and hubs.
 */

export const DEFAULT_FREIGHT_SLOT_CONFIG = {
  SLOT_DURATION_SEC: 300, // Configurable arrival slot duration: 5 simulation minutes (300 sec)
  MAX_ARRIVAL_WINDOW_SLACK_SEC: 300, // Max wait tolerance allowed for slot assignment before holding (300 sec)
  CRITICAL_CURB_SATURATION_THRESHOLD: 80, // >= 80% curb saturation triggers HOLD_AT_ORIGIN
  SPILLOVER_TRIGGER: true, // laneBlocked === true triggers HOLD_AT_ORIGIN
  STAGING_JUNCTIONS: ['J1', 'J2'] // Upstream staging points
};

export const FREIGHT_DECISIONS = {
  PROCEED_NOW: 'PROCEED_NOW',
  SLOT_ASSIGNED: 'SLOT_ASSIGNED',
  HOLD_AT_ORIGIN: 'HOLD_AT_ORIGIN',
  DEFER_EMERGENCY: 'DEFER_EMERGENCY'
};

export const FREIGHT_STAGING_STATUS = {
  STAGED: 'STAGED',
  SLOT_PENDING: 'SLOT_PENDING',
  RELEASED: 'RELEASED',
  CANCELLED: 'CANCELLED'
};

/**
 * Helper to format simulation seconds into MM:SS format deterministically.
 * @param {number} totalSec
 * @returns {string}
 */
export function formatSimTime(totalSec) {
  if (typeof totalSec !== 'number' || isNaN(totalSec)) return '00:00';
  const totalSeconds = Math.max(0, Math.floor(totalSec));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export class FreightSlotManager {
  constructor(options = {}) {
    this.config = {
      ...DEFAULT_FREIGHT_SLOT_CONFIG,
      ...(options.config || {})
    };
    this.linkConfigs = options.linkConfigs || DEFAULT_LINK_CONFIGS;
    this.logisticsHubManager = options.logisticsHubManager || null;

    // Internal state
    this.stagedVehicles = {}; // Keyed by vehicleId: staged vehicle record
    this.activeSlotAssignments = []; // List of active slot objects
    this.releasedVehicleHistory = []; // Bounded history of released vehicles
    this.decisionHistory = []; // Bounded history of decisions evaluated

    // Metrics counters
    this.totalVehiclesHeld = 0;
    this.totalSlotsAssigned = 0;
    this.totalVehiclesReleased = 0;
    this.totalCurbEntriesPrevented = 0;
  }

  /**
   * Resets all internal state, slots, staging queues, and metrics.
   */
  reset() {
    this.stagedVehicles = {};
    this.activeSlotAssignments = [];
    this.releasedVehicleHistory = [];
    this.decisionHistory = [];
    this.totalVehiclesHeld = 0;
    this.totalSlotsAssigned = 0;
    this.totalVehiclesReleased = 0;
    this.totalCurbEntriesPrevented = 0;
  }

  /**
   * Estimates remaining corridor travel time to destination hub based on authoritative link configs.
   *
   * Modeled travel times:
   * - J1 -> J2 (J1-J2 link): 306 seconds
   * - J2 -> J3 (J2-J3 link): 378 seconds
   * - J1 -> J3 (J1-J2 + J2-J3 links): 306 + 378 = 684 seconds
   * - At hub junction: 0 seconds
   *
   * @param {string} originJunctionId
   * @param {string} destinationHubId
   * @param {Array<string>} corridorRoute
   * @param {number} routeIndex
   * @returns {number} Estimated travel time in seconds
   */
  estimateTravelTime(originJunctionId, destinationHubId, corridorRoute = null, routeIndex = 0) {
    // Map destination hub to its associated junction
    let targetJunction = 'J3'; // BKC default
    if (destinationHubId === 'HUB_DDR_01') {
      targetJunction = 'J2';
    } else if (destinationHubId === 'HUB_BKC_01') {
      targetJunction = 'J3';
    } else if (this.logisticsHubManager) {
      const hub = this.logisticsHubManager.getHub(destinationHubId);
      if (hub && hub.associatedJunction) {
        targetJunction = hub.associatedJunction;
      }
    }

    if (originJunctionId === targetJunction) {
      return 0;
    }

    // If corridor route is defined, sum link travel times from current routeIndex to targetJunction
    if (Array.isArray(corridorRoute) && corridorRoute.length > 1) {
      const startIdx = Math.max(0, typeof routeIndex === 'number' ? routeIndex : 0);
      let cumulativeTime = 0;
      let reachedTarget = false;
      for (let i = startIdx; i < corridorRoute.length - 1; i++) {
        const fromJ = corridorRoute[i];
        const toJ = corridorRoute[i + 1];
        const linkKey = `${fromJ}-${toJ}`;
        const linkTime = this.linkConfigs[linkKey]?.travelTimeSec || 300;
        cumulativeTime += linkTime;
        if (toJ === targetJunction) {
          reachedTarget = true;
          break;
        }
      }
      if (reachedTarget) {
        return cumulativeTime;
      }
    }

    if (originJunctionId === 'J1') {
      const link1 = this.linkConfigs['J1-J2']?.travelTimeSec || 306;
      if (targetJunction === 'J2') {
        return link1;
      }
      if (targetJunction === 'J3') {
        const link2 = this.linkConfigs['J2-J3']?.travelTimeSec || 378;
        return link1 + link2;
      }
      if (targetJunction === 'J4') {
        const link2 = this.linkConfigs['J2-J3']?.travelTimeSec || 378;
        const link3 = this.linkConfigs['J3-J4']?.travelTimeSec || 522;
        return link1 + link2 + link3;
      }
    }

    if (originJunctionId === 'J2') {
      const link2 = this.linkConfigs['J2-J3']?.travelTimeSec || 378;
      if (targetJunction === 'J3') {
        return link2;
      }
      if (targetJunction === 'J4') {
        const link3 = this.linkConfigs['J3-J4']?.travelTimeSec || 522;
        return link2 + link3;
      }
    }

    if (originJunctionId === 'J3') {
      if (targetJunction === 'J4') {
        return this.linkConfigs['J3-J4']?.travelTimeSec || 522;
      }
    }

    // Default fallback to first link travel time if link exists
    const directKey = `${originJunctionId}-${targetJunction}`;
    if (this.linkConfigs[directKey]) {
      return this.linkConfigs[directKey].travelTimeSec;
    }

    return 300; // Modeled standard assumption
  }

  /**
   * Evaluates slot decision for a departing commercial vehicle at an upstream junction.
   *
   * Decision priority:
   * A. Emergency active -> DEFER_EMERGENCY
   * B. Hub spillover or critical curb saturation (laneBlocked or curbSaturation >= 80%) -> HOLD_AT_ORIGIN
   * C. Bay currently available (availableBays > 0) -> PROCEED_NOW
   * D. Bay predicted to become available near arrival -> SLOT_ASSIGNED
   * E. Hub unavailable beyond predicted arrival -> HOLD_AT_ORIGIN
   *
   * @param {Object} vehicle - Departing vehicle record
   * @param {string} originJunctionId - Junction ID of departure ('J1', 'J2', etc.)
   * @param {string} nextLinkId - Next LinkManager link ID ('J1-J2', 'J2-J3')
   * @param {number} currentSimTime - Current simulation clock in seconds
   * @param {Object} context - Operational context { isEmergencyActive, logisticsHubManager, hubState }
   * @returns {Object} { decision, reason, record, shouldReleaseNow }
   */
  evaluateDeparture(vehicle, originJunctionId, nextLinkId, currentSimTime = 0, context = {}) {
    if (!vehicle || !vehicle.isCommercial) {
      return {
        decision: FREIGHT_DECISIONS.PROCEED_NOW,
        reason: 'Non-commercial vehicle. Staging control bypassed.',
        record: null,
        shouldReleaseNow: true
      };
    }

    // Upstream staging applies to configured staging junctions (J1, J2)
    if (!this.config.STAGING_JUNCTIONS.includes(originJunctionId)) {
      return {
        decision: FREIGHT_DECISIONS.PROCEED_NOW,
        reason: `Origin ${originJunctionId} outside upstream staging control zone.`,
        record: null,
        shouldReleaseNow: true
      };
    }

    const hubMgr = context.logisticsHubManager || this.logisticsHubManager;
    const destHubId = vehicle.destinationHubId;
    let hub = context.hubState || (hubMgr ? hubMgr.getHub(destHubId) : null);

    if (!hub && hubMgr) {
      hub = hubMgr.getHub(destHubId);
    }

    if (!hub) {
      return {
        decision: FREIGHT_DECISIONS.PROCEED_NOW,
        reason: `Destination hub ${destHubId || 'unassigned'} not under smart slot management.`,
        record: null,
        shouldReleaseNow: true
      };
    }

    // Extract hub metrics
    const totalBays = typeof hub.totalBays === 'number'
      ? hub.totalBays
      : (hub.bays ? hub.bays.length : 3);
    const occupiedBays = typeof hub.occupiedBays === 'number'
      ? hub.occupiedBays
      : (hub.bays ? hub.bays.filter(b => b.status === 'OCCUPIED' || b.status === 'DWELLING').length : 0);
    const availableBays = typeof hub.availableBays === 'number'
      ? hub.availableBays
      : Math.max(0, totalBays - occupiedBays);
    const curbQueueLength = hub.curbQueue ? hub.curbQueue.length : (hub.queueLength || 0);
    const curbSaturation = typeof hub.curbSaturation === 'number'
      ? hub.curbSaturation
      : Math.min(100, Math.round((curbQueueLength / Math.max(1, totalBays)) * 100));
    const laneBlocked = !!hub.laneBlocked;
    const isEmergencyActive = !!context.isEmergencyActive;

    const estimatedTravelTimeSec = this.estimateTravelTime(
      originJunctionId,
      destHubId,
      vehicle.corridorRoute,
      vehicle.routeIndex
    );
    const earliestArrivalSec = currentSimTime + estimatedTravelTimeSec;

    // ----------------------------------------------------
    // PRIORITY A: EMERGENCY CORRIDOR PREEMPTION ACTIVE
    // ----------------------------------------------------
    if (isEmergencyActive) {
      const decision = FREIGHT_DECISIONS.DEFER_EMERGENCY;
      const reason = 'Freight departure deferred because emergency corridor priority is active.';
      const record = this._createOrUpdateStagedRecord(
        vehicle,
        originJunctionId,
        nextLinkId,
        currentSimTime,
        estimatedTravelTimeSec,
        decision,
        reason,
        FREIGHT_STAGING_STATUS.STAGED,
        null,
        null
      );
      this.totalVehiclesHeld++;
      this._recordDecision(record);
      vehicle.deliveryStatus = 'STAGED';
      return { decision, reason, record, shouldReleaseNow: false };
    }

    // ----------------------------------------------------
    // PRIORITY B: HUB SPILLOVER OR CRITICAL CURB SATURATION
    // ----------------------------------------------------
    if (laneBlocked || curbSaturation >= this.config.CRITICAL_CURB_SATURATION_THRESHOLD) {
      const decision = FREIGHT_DECISIONS.HOLD_AT_ORIGIN;
      const reason = 'Destination hub curb capacity is critical. Vehicle retained at upstream staging area.';
      const record = this._createOrUpdateStagedRecord(
        vehicle,
        originJunctionId,
        nextLinkId,
        currentSimTime,
        estimatedTravelTimeSec,
        decision,
        reason,
        FREIGHT_STAGING_STATUS.STAGED,
        null,
        null
      );
      this.totalVehiclesHeld++;
      this.totalCurbEntriesPrevented++;
      this._recordDecision(record);
      vehicle.deliveryStatus = 'STAGED';
      return { decision, reason, record, shouldReleaseNow: false };
    }

    // ----------------------------------------------------
    // PRIORITY C: BAY CURRENTLY AVAILABLE
    // ----------------------------------------------------
    if (availableBays > 0) {
      const decision = FREIGHT_DECISIONS.PROCEED_NOW;
      const reason = `Bay currently available at destination hub (${availableBays} of ${totalBays} open).`;
      const record = {
        vehicleId: vehicle.id,
        vehicleType: vehicle.type,
        originJunctionId,
        destinationHubId: destHubId,
        cargoTonnage: vehicle.cargoTonnage || 0,
        corridorRoute: vehicle.corridorRoute || null,
        routeIndex: typeof vehicle.routeIndex === 'number' ? vehicle.routeIndex : 0,
        nextLinkId,
        stagedAtSimTime: currentSimTime,
        assignedSlotStartSec: earliestArrivalSec,
        assignedSlotEndSec: earliestArrivalSec + this.config.SLOT_DURATION_SEC,
        estimatedTravelTimeSec,
        decision,
        reason,
        status: FREIGHT_STAGING_STATUS.RELEASED,
        vehicle
      };
      this._recordDecision(record);
      // Vehicle is not held; enters LinkManager immediately
      return { decision, reason, record, shouldReleaseNow: true };
    }

    // ----------------------------------------------------
    // PRIORITY D: BAY PREDICTED TO BECOME AVAILABLE
    // ----------------------------------------------------
    const bays = hub.bays || [];
    let earliestBayDwellRemaining = hub.dwellTimeSeconds || 45;
    if (bays.length > 0) {
      const dwellValues = bays.map(b => (typeof b.dwellRemainingSec === 'number' ? b.dwellRemainingSec : 45));
      earliestBayDwellRemaining = Math.min(...dwellValues);
    }

    // Earliest predicted bay release time
    const earliestBayReleaseSec = currentSimTime + earliestBayDwellRemaining;

    // Account for pending vehicles ahead in curb queue
    const curbOffsetSec = curbQueueLength > 0
      ? (curbQueueLength * (hub.dwellTimeSeconds || 45)) / Math.max(1, totalBays)
      : 0;
    const predictedAvailableSec = earliestBayReleaseSec + curbOffsetSec;

    // Check if predicted availability falls near vehicle's arrival window
    const arrivalSlack = predictedAvailableSec - earliestArrivalSec;
    if (arrivalSlack <= this.config.MAX_ARRIVAL_WINDOW_SLACK_SEC) {
      const slotStartSec = Math.max(earliestArrivalSec, predictedAvailableSec);
      const slotEndSec = slotStartSec + this.config.SLOT_DURATION_SEC;
      const targetDepartureSec = slotStartSec - estimatedTravelTimeSec;
      const shouldReleaseNow = targetDepartureSec <= currentSimTime;

      const decision = FREIGHT_DECISIONS.SLOT_ASSIGNED;
      const reason = `Predicted bay available at ${formatSimTime(slotStartSec)} (Slot: ${formatSimTime(slotStartSec)}–${formatSimTime(slotEndSec)} simulation time).`;

      if (shouldReleaseNow) {
        const record = {
          vehicleId: vehicle.id,
          vehicleType: vehicle.type,
          originJunctionId,
          destinationHubId: destHubId,
          cargoTonnage: vehicle.cargoTonnage || 0,
          corridorRoute: vehicle.corridorRoute || null,
          routeIndex: typeof vehicle.routeIndex === 'number' ? vehicle.routeIndex : 0,
          nextLinkId,
          stagedAtSimTime: currentSimTime,
          assignedSlotStartSec: slotStartSec,
          assignedSlotEndSec: slotEndSec,
          estimatedTravelTimeSec,
          decision,
          reason,
          status: FREIGHT_STAGING_STATUS.RELEASED,
          vehicle
        };
        this.totalSlotsAssigned++;
        this.totalVehiclesReleased++;
        this._recordSlot(record);
        this._recordDecision(record);
        vehicle.deliveryStatus = 'SLOT_ASSIGNED';
        return { decision, reason, record, shouldReleaseNow: true };
      } else {
        const record = this._createOrUpdateStagedRecord(
          vehicle,
          originJunctionId,
          nextLinkId,
          currentSimTime,
          estimatedTravelTimeSec,
          decision,
          reason,
          FREIGHT_STAGING_STATUS.SLOT_PENDING,
          slotStartSec,
          slotEndSec
        );
        this.totalSlotsAssigned++;
        this.totalVehiclesHeld++;
        this._recordSlot(record);
        this._recordDecision(record);
        vehicle.deliveryStatus = 'SLOT_ASSIGNED';
        return { decision, reason, record, shouldReleaseNow: false };
      }
    }

    // ----------------------------------------------------
    // PRIORITY E: HUB UNAVAILABLE BEYOND PREDICTED ARRIVAL
    // ----------------------------------------------------
    {
      const decision = FREIGHT_DECISIONS.HOLD_AT_ORIGIN;
      const reason = 'Destination hub unavailable beyond predicted arrival window. Vehicle retained at upstream staging area.';
      const record = this._createOrUpdateStagedRecord(
        vehicle,
        originJunctionId,
        nextLinkId,
        currentSimTime,
        estimatedTravelTimeSec,
        decision,
        reason,
        FREIGHT_STAGING_STATUS.STAGED,
        null,
        null
      );
      this.totalVehiclesHeld++;
      this._recordDecision(record);
      vehicle.deliveryStatus = 'STAGED';
      return { decision, reason, record, shouldReleaseNow: false };
    }
  }

  /**
   * Advances simulation time, reevaluating staged vehicles and releasing eligible ones.
   * Guarantees each staged vehicle is released exactly once.
   *
   * @param {number} dt - Simulation sub-step delta time
   * @param {number} currentSimTime - Current simulation clock in seconds
   * @param {Object} context - Operational context { isEmergencyActive, logisticsHubManager }
   * @returns {Array<Object>} List of released vehicle records ready for LinkManager
   */
  tick(dt = 1.0, currentSimTime = 0, context = {}) {
    void dt;
    // 1. Prune expired active slots
    this.activeSlotAssignments = this.activeSlotAssignments.filter(
      slot => slot.assignedSlotEndSec > currentSimTime
    );

    const releasedList = [];
    const hubMgr = context.logisticsHubManager || this.logisticsHubManager;
    const isEmergencyActive = !!context.isEmergencyActive;

    const vehicleIds = Object.keys(this.stagedVehicles);
    for (let i = 0; i < vehicleIds.length; i++) {
      const vId = vehicleIds[i];
      const staged = this.stagedVehicles[vId];
      if (!staged) continue;

      const hub = hubMgr ? hubMgr.getHub(staged.destinationHubId) : null;
      const curbSat = hub ? (typeof hub.curbSaturation === 'number' ? hub.curbSaturation : 0) : 0;
      const laneBlocked = hub ? !!hub.laneBlocked : false;

      // Check emergency preemption
      if (isEmergencyActive) {
        staged.decision = FREIGHT_DECISIONS.DEFER_EMERGENCY;
        staged.status = FREIGHT_STAGING_STATUS.STAGED;
        staged.reason = 'Freight departure deferred because emergency corridor priority is active.';
        if (staged.vehicle) staged.vehicle.deliveryStatus = 'STAGED';
        continue;
      }

      // If scheduled slot is pending departure
      if (staged.status === FREIGHT_STAGING_STATUS.SLOT_PENDING) {
        const targetDepartureSec = staged.assignedSlotStartSec - staged.estimatedTravelTimeSec;

        // If hub became critical in the meantime, hold
        if (laneBlocked || curbSat >= this.config.CRITICAL_CURB_SATURATION_THRESHOLD) {
          staged.decision = FREIGHT_DECISIONS.HOLD_AT_ORIGIN;
          staged.status = FREIGHT_STAGING_STATUS.STAGED;
          staged.reason = 'Destination hub curb capacity became critical before slot departure. Holding at origin.';
          if (staged.vehicle) staged.vehicle.deliveryStatus = 'STAGED';
          continue;
        }

        // Check if departure time has arrived
        if (currentSimTime >= targetDepartureSec) {
          staged.status = FREIGHT_STAGING_STATUS.RELEASED;
          staged.releasedAtSimTime = currentSimTime;
          if (staged.vehicle) {
            staged.vehicle.deliveryStatus = 'EN_ROUTE';
          }
          delete this.stagedVehicles[vId];
          this.releasedVehicleHistory.push({ ...staged });
          if (this.releasedVehicleHistory.length > 200) this.releasedVehicleHistory.shift();
          this.totalVehiclesReleased++;
          releasedList.push(staged);
          continue;
        }
      }

      // If held at origin (HOLD_AT_ORIGIN or deferred emergency that just ended)
      if (staged.status === FREIGHT_STAGING_STATUS.STAGED) {
        // Reevaluate live destination hub state
        if (!laneBlocked && curbSat < this.config.CRITICAL_CURB_SATURATION_THRESHOLD) {
          const evalResult = this.evaluateDeparture(
            staged.vehicle,
            staged.originJunctionId,
            staged.nextLinkId,
            currentSimTime,
            { isEmergencyActive: false, logisticsHubManager: hubMgr }
          );

          if (evalResult.shouldReleaseNow) {
            staged.status = FREIGHT_STAGING_STATUS.RELEASED;
            staged.releasedAtSimTime = currentSimTime;
            staged.decision = evalResult.decision;
            staged.reason = evalResult.reason;
            if (staged.vehicle) {
              staged.vehicle.deliveryStatus = 'EN_ROUTE';
            }
            delete this.stagedVehicles[vId];
            this.releasedVehicleHistory.push({ ...staged });
            if (this.releasedVehicleHistory.length > 200) this.releasedVehicleHistory.shift();
            this.totalVehiclesReleased++;
            releasedList.push(staged);
          } else if (evalResult.decision === FREIGHT_DECISIONS.SLOT_ASSIGNED) {
            staged.status = FREIGHT_STAGING_STATUS.SLOT_PENDING;
            staged.assignedSlotStartSec = evalResult.record.assignedSlotStartSec;
            staged.assignedSlotEndSec = evalResult.record.assignedSlotEndSec;
            staged.decision = FREIGHT_DECISIONS.SLOT_ASSIGNED;
            staged.reason = evalResult.reason;
            if (staged.vehicle) {
              staged.vehicle.deliveryStatus = 'SLOT_ASSIGNED';
            }
          }
        }
      }
    }

    return releasedList;
  }

  /**
   * Internal helper to create or update a staged vehicle record.
   */
  _createOrUpdateStagedRecord(
    vehicle,
    originJunctionId,
    nextLinkId,
    stagedAtSimTime,
    estimatedTravelTimeSec,
    decision,
    reason,
    status,
    slotStartSec = null,
    slotEndSec = null
  ) {
    const record = {
      vehicleId: vehicle.id,
      vehicleType: vehicle.type,
      originJunctionId,
      destinationHubId: vehicle.destinationHubId,
      cargoTonnage: vehicle.cargoTonnage || 0,
      corridorRoute: vehicle.corridorRoute || null,
      routeIndex: typeof vehicle.routeIndex === 'number' ? vehicle.routeIndex : 0,
      nextLinkId,
      stagedAtSimTime,
      assignedSlotStartSec: slotStartSec,
      assignedSlotEndSec: slotEndSec,
      estimatedTravelTimeSec,
      decision,
      reason,
      status,
      vehicle
    };

    this.stagedVehicles[vehicle.id] = record;
    return record;
  }

  _recordSlot(record) {
    this.activeSlotAssignments.push({
      vehicleId: record.vehicleId,
      destinationHubId: record.destinationHubId,
      originJunctionId: record.originJunctionId,
      assignedSlotStartSec: record.assignedSlotStartSec,
      assignedSlotEndSec: record.assignedSlotEndSec,
      assignedAtSimTime: record.stagedAtSimTime
    });
    if (this.activeSlotAssignments.length > 100) this.activeSlotAssignments.shift();
  }

  _recordDecision(record) {
    this.decisionHistory.push({
      vehicleId: record.vehicleId,
      originJunctionId: record.originJunctionId,
      destinationHubId: record.destinationHubId,
      decision: record.decision,
      reason: record.reason,
      simTime: record.stagedAtSimTime
    });
    if (this.decisionHistory.length > 100) this.decisionHistory.shift();
  }

  getStagedVehicles() {
    return Object.values(this.stagedVehicles);
  }

  getActiveSlotAssignments() {
    return [...this.activeSlotAssignments];
  }

  getState() {
    const stagedList = this.getStagedVehicles();
    return {
      stagedVehicles: stagedList,
      stagedCount: stagedList.length,
      activeSlotAssignments: [...this.activeSlotAssignments],
      activeSlotCount: this.activeSlotAssignments.length,
      releasedVehicleHistory: [...this.releasedVehicleHistory],
      decisionHistory: [...this.decisionHistory],
      latestDecision: this.decisionHistory[this.decisionHistory.length - 1] || null,
      totalVehiclesHeld: this.totalVehiclesHeld,
      totalSlotsAssigned: this.totalSlotsAssigned,
      totalVehiclesReleased: this.totalVehiclesReleased,
      totalCurbEntriesPrevented: this.totalCurbEntriesPrevented,
      config: { ...this.config }
    };
  }
}
