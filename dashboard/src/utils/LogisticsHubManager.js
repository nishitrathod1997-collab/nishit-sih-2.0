import { TRAFFIC_CONSTANTS } from './constants.js';

/**
 * LogisticsHubManager.js
 * Dedicated manager for urban logistics freight hubs, loading bays, dwell timers, and curb queues.
 *
 * Core Responsibilities:
 * 1. Logistics hub definitions from central registry (single source of truth).
 * 2. Deterministic loading-bay state machine (AVAILABLE -> OCCUPIED -> DWELLING -> RELEASED -> AVAILABLE).
 * 3. Commercial vehicle arrival processing (bay assignment vs. FIFO curb queue).
 * 4. Dwell countdown via simulation delta time (dt).
 * 5. Curb overflow queue management and promotion.
 * 6. Lane-blockage state reporting.
 * 7. Logistics telemetry and persistent delivery records reporting.
 */
export class LogisticsHubManager {
  constructor(customHubs = null, defaultDwellSec = null) {
    this.hubs = {};
    this.totalCompletedVehicles = 0;
    this.totalFreightServed = 0;
    this.dwellTimeHistory = [];
    this.completedDeliveries = [];
    this.initHubs(customHubs, defaultDwellSec);
  }

  /**
   * Initializes or reconfigures hubs using the central configuration registry.
   */
  initHubs(customHubs = null, defaultDwellSec = null) {
    const hubConfigs = customHubs || TRAFFIC_CONSTANTS.LOGISTICS_POLICY?.DEFAULT_HUBS || [];
    const globalDefaultDwell = defaultDwellSec || TRAFFIC_CONSTANTS.LOGISTICS_POLICY?.DEFAULT_DWELL_SEC || 45;

    this.hubs = {};
    hubConfigs.forEach(cfg => {
      const totalBays = typeof cfg.totalBays === 'number'
        ? cfg.totalBays
        : (TRAFFIC_CONSTANTS.LOGISTICS_POLICY?.DEFAULT_BAYS || 3);
      const dwellTimeSec = typeof cfg.dwellTimeSec === 'number'
        ? cfg.dwellTimeSec
        : globalDefaultDwell;

      const bays = [];
      for (let i = 0; i < totalBays; i++) {
        bays.push({
          bayIndex: i,
          status: 'AVAILABLE', // 'AVAILABLE' | 'OCCUPIED' | 'DWELLING'
          occupiedByVehicleId: null,
          vehicleOccupying: null,
          vehicleType: null,
          cargoTonnage: 0,
          dwellRemainingSec: 0,
          totalDwellSec: dwellTimeSec,
          vehicleRef: null,
          arrivalTimeSec: 0
        });
      }

      this.hubs[cfg.hubId] = {
        hubId: cfg.hubId,
        name: cfg.name,
        associatedJunction: cfg.associatedJunction || null,
        approach: cfg.approach || 'W',
        nominalLaneCount: cfg.nominalLanes || TRAFFIC_CONSTANTS.LOGISTICS_POLICY?.NOMINAL_LANES_DEFAULT || 3,
        totalBays,
        dwellTimeSeconds: dwellTimeSec,
        bays,
        curbQueue: [], // FIFO queue of waiting commercial vehicle items
        laneBlocked: false,
        completedCount: 0,
        totalFreightServed: 0
      };
    });
  }

  reset() {
    this.initHubs();
    this.totalCompletedVehicles = 0;
    this.totalFreightServed = 0;
    this.dwellTimeHistory = [];
    this.completedDeliveries = [];
  }

  getHub(hubId) {
    return this.hubs[hubId] || null;
  }

  getAllHubs() {
    return Object.values(this.hubs);
  }

  getHubByJunction(junctionId) {
    return Object.values(this.hubs).find(h => h.associatedJunction === junctionId) || null;
  }

  /**
   * Process an arriving commercial vehicle attempting to dock at its destination hub.
   * Assigns an available loading bay or places vehicle into FIFO curb queue.
   *
   * @param {Object} vehicle - Commercial vehicle from VehicleManager
   * @param {number} currentSimTime - Current simulation clock time in seconds
   * @returns {Object} Result receipt { status, bayIndex, reason }
   */
  processCommercialArrival(vehicle, currentSimTime = 0) {
    if (!vehicle || !vehicle.isCommercial) {
      return { status: 'REJECTED', bayIndex: null, reason: 'Non-commercial vehicle' };
    }

    const hubId = vehicle.destinationHubId;
    const hub = this.hubs[hubId];
    if (!hub) {
      return { status: 'REJECTED', bayIndex: null, reason: `Unknown destination hub: ${hubId}` };
    }

    // Check if already docked in a bay
    const alreadyInBay = hub.bays.find(b => b.occupiedByVehicleId === vehicle.id);
    if (alreadyInBay) {
      return { status: 'AT_HUB', bayIndex: alreadyInBay.bayIndex, reason: 'Already docked in bay' };
    }

    // Check if already in curb queue
    const alreadyInQueue = hub.curbQueue.find(v => v.id === vehicle.id);
    if (alreadyInQueue) {
      return { status: 'CURB_QUEUE', bayIndex: null, reason: 'Already in curb queue' };
    }

    const arrivalTime = typeof currentSimTime === 'number' && currentSimTime > 0
      ? currentSimTime
      : (typeof vehicle.timeSec === 'number' ? vehicle.timeSec : 0);

    // Find first available bay
    const freeBay = hub.bays.find(b => b.status === 'AVAILABLE');
    if (freeBay) {
      freeBay.status = 'OCCUPIED';
      freeBay.occupiedByVehicleId = vehicle.id;
      freeBay.vehicleOccupying = vehicle.id;
      freeBay.vehicleType = vehicle.type;
      freeBay.cargoTonnage = vehicle.cargoTonnage || 0;
      freeBay.dwellRemainingSec = hub.dwellTimeSeconds;
      freeBay.totalDwellSec = hub.dwellTimeSeconds;
      freeBay.vehicleRef = vehicle;
      freeBay.arrivalTimeSec = arrivalTime;

      vehicle.deliveryStatus = 'AT_HUB';
      vehicle.curbDwellRemainingSec = hub.dwellTimeSeconds;

      this._updateLaneBlockage(hub);

      return {
        status: 'AT_HUB',
        bayIndex: freeBay.bayIndex,
        dwellSec: hub.dwellTimeSeconds,
        reason: `Assigned loading bay ${freeBay.bayIndex}`
      };
    } else {
      // All bays occupied -> enqueue into FIFO curb queue
      vehicle.deliveryStatus = 'CURB_QUEUE';
      hub.curbQueue.push({
        id: vehicle.id,
        type: vehicle.type,
        cargoTonnage: vehicle.cargoTonnage || 0,
        queuedAtSec: arrivalTime,
        destinationHubId: hub.hubId,
        refVehicle: vehicle
      });

      this._updateLaneBlockage(hub);

      return {
        status: 'CURB_QUEUE',
        bayIndex: null,
        queuePosition: hub.curbQueue.length,
        reason: `All ${hub.totalBays} bays occupied. Queued at curb.`
      };
    }
  }

  /**
   * Main simulation tick for dwell countdowns and FIFO queue promotions.
   * Decrements dwell timers using exact simulation delta time (dt).
   *
   * @param {number} dt - Simulation delta time in seconds
   * @param {number} currentSimTime - Current simulation clock in seconds
   * @returns {Object} { completedVehicles }
   */
  tick(dt = 1.0, currentSimTime = 0) {
    const deltaSec = typeof dt === 'number' && dt > 0 ? dt : 1.0;
    const completedThisTick = [];

    Object.values(this.hubs).forEach(hub => {
      // 1. Advance dwell timers on occupied bays
      hub.bays.forEach(bay => {
        if (bay.status === 'OCCUPIED' || bay.status === 'DWELLING') {
          bay.status = 'DWELLING';
          if (bay.vehicleRef) {
            bay.vehicleRef.deliveryStatus = 'DWELLING';
          }
          bay.dwellRemainingSec = Math.max(0, bay.dwellRemainingSec - deltaSec);
          if (bay.vehicleRef) {
            bay.vehicleRef.curbDwellRemainingSec = bay.dwellRemainingSec;
          }

          if (bay.dwellRemainingSec <= 0) {
            // Dwell complete -> release bay
            bay.status = 'AVAILABLE';
            const departingVehId = bay.occupiedByVehicleId;
            const departingType = bay.vehicleType;
            const departingCargo = bay.cargoTonnage || 0;
            const arrivalTime = bay.arrivalTimeSec || 0;
            const completionTime = typeof currentSimTime === 'number' && currentSimTime > 0
              ? currentSimTime
              : Number((arrivalTime + bay.totalDwellSec).toFixed(1));

            if (bay.vehicleRef) {
              bay.vehicleRef.deliveryStatus = 'COMPLETED';
              bay.vehicleRef.curbDwellRemainingSec = 0;
            }

            // Exactly-once increment for completed count and freight served
            hub.completedCount++;
            hub.totalFreightServed = Number((hub.totalFreightServed + departingCargo).toFixed(1));
            this.totalCompletedVehicles++;
            this.totalFreightServed = Number((this.totalFreightServed + departingCargo).toFixed(1));

            this.dwellTimeHistory.push(bay.totalDwellSec);
            if (this.dwellTimeHistory.length > 500) this.dwellTimeHistory.shift();

            // Create persistent completed delivery record
            const deliveryRecord = {
              vehicleId: departingVehId,
              vehicleType: departingType,
              cargo: departingCargo,
              cargoTonnage: departingCargo,
              hub: hub.name,
              hubId: hub.hubId,
              arrivalTime,
              completionTime,
              deliveryStatus: 'COMPLETED',
              dwellDurationSec: bay.totalDwellSec
            };
            this.completedDeliveries.push(deliveryRecord);
            if (this.completedDeliveries.length > 500) this.completedDeliveries.shift();

            completedThisTick.push({
              vehicleId: departingVehId,
              vehicleType: departingType,
              hubId: hub.hubId,
              hubName: hub.name,
              cargoTonnage: departingCargo,
              arrivalTime,
              completionTime,
              dwellDurationSec: bay.totalDwellSec,
              deliveryStatus: 'COMPLETED'
            });

            // Reset bay state
            bay.occupiedByVehicleId = null;
            bay.vehicleOccupying = null;
            bay.vehicleType = null;
            bay.cargoTonnage = 0;
            bay.vehicleRef = null;
            bay.arrivalTimeSec = 0;

            // 2. Promote next vehicle from FIFO curb queue if waiting
            if (hub.curbQueue.length > 0) {
              const nextQueued = hub.curbQueue.shift();
              bay.status = 'OCCUPIED';
              bay.occupiedByVehicleId = nextQueued.id;
              bay.vehicleOccupying = nextQueued.id;
              bay.vehicleType = nextQueued.type;
              bay.cargoTonnage = nextQueued.cargoTonnage || 0;
              bay.dwellRemainingSec = hub.dwellTimeSeconds;
              bay.totalDwellSec = hub.dwellTimeSeconds;
              bay.vehicleRef = nextQueued.refVehicle || null;
              bay.arrivalTimeSec = typeof currentSimTime === 'number' && currentSimTime > 0
                ? currentSimTime
                : (nextQueued.queuedAtSec || 0);

              if (nextQueued.refVehicle) {
                nextQueued.refVehicle.deliveryStatus = 'AT_HUB';
                nextQueued.refVehicle.curbDwellRemainingSec = hub.dwellTimeSeconds;
              }
            }
          }
        }
      });

      this._updateLaneBlockage(hub);
    });

    return { completedVehicles: completedThisTick };
  }

  _updateLaneBlockage(hub) {
    const queueLen = hub.curbQueue.length;
    const spilloverThreshold = TRAFFIC_CONSTANTS.LOGISTICS_POLICY?.SPILLOVER_QUEUE_THRESHOLD || 1;
    hub.laneBlocked = queueLen >= spilloverThreshold;
  }

  /**
   * Retrieves complete structured state snapshot for a single hub.
   */
  getHubState(hubId) {
    const hub = this.hubs[hubId];
    if (!hub) return null;

    const occupiedBays = hub.bays.filter(b => b.status === 'OCCUPIED' || b.status === 'DWELLING').length;
    const availableBays = hub.totalBays - occupiedBays;
    const queueLength = hub.curbQueue.length;
    const curbSaturation = Math.min(100, Math.round((queueLength / Math.max(1, hub.totalBays)) * 100));

    return {
      hubId: hub.hubId,
      name: hub.name,
      hubName: hub.name,
      associatedJunction: hub.associatedJunction,
      approach: hub.approach,
      totalBays: hub.totalBays,
      occupiedBays,
      availableBays,
      curbSaturation,
      totalFreightServed: hub.totalFreightServed || 0,
      completedCount: hub.completedCount,
      queueLength,
      queuedCommercialVehicles: queueLength,
      laneBlocked: hub.laneBlocked,
      nominalLaneCount: hub.nominalLaneCount,
      effectiveLaneCount: hub.laneBlocked ? Math.max(1, hub.nominalLaneCount - 1) : hub.nominalLaneCount,
      dwellTimeSeconds: hub.dwellTimeSeconds,
      bays: hub.bays.map(b => ({
        bayIndex: b.bayIndex,
        status: b.status,
        occupiedByVehicleId: b.occupiedByVehicleId,
        vehicleOccupying: b.occupiedByVehicleId,
        vehicleType: b.vehicleType,
        cargoTonnage: b.cargoTonnage,
        dwellRemainingSec: Number(b.dwellRemainingSec.toFixed(1)),
        totalDwellSec: b.totalDwellSec,
        deliveryStatus: b.status === 'AVAILABLE' ? 'NONE' : (b.vehicleRef?.deliveryStatus || (b.status === 'DWELLING' ? 'DWELLING' : 'AT_HUB'))
      })),
      curbQueue: hub.curbQueue.map(q => ({
        id: q.id,
        type: q.type,
        cargoTonnage: q.cargoTonnage,
        queuedAtSec: q.queuedAtSec,
        destinationHubId: q.destinationHubId,
        deliveryStatus: q.refVehicle?.deliveryStatus || 'AT_HUB'
      }))
    };
  }

  /**
   * Retrieves serializable snapshots for all configured hubs.
   */
  getAllHubStates() {
    return Object.keys(this.hubs).map(id => this.getHubState(id));
  }

  /**
   * Returns list of persistent completed delivery records.
   */
  getCompletedDeliveries() {
    return [...this.completedDeliveries];
  }

  /**
   * Returns authoritative system-wide logistics telemetry.
   */
  getTelemetry() {
    const hubs = Object.values(this.hubs);
    let totalBays = 0;
    let occupiedBays = 0;
    let totalQueued = 0;
    let laneBlockedCount = 0;

    hubs.forEach(h => {
      totalBays += h.totalBays;
      occupiedBays += h.bays.filter(b => b.status === 'OCCUPIED' || b.status === 'DWELLING').length;
      totalQueued += h.curbQueue.length;
      if (h.laneBlocked) laneBlockedCount++;
    });

    const avgDwell = this.dwellTimeHistory.length > 0
      ? Number((this.dwellTimeHistory.reduce((a, b) => a + b, 0) / this.dwellTimeHistory.length).toFixed(1))
      : 0;

    return {
      totalHubs: hubs.length,
      totalBays,
      occupiedBays,
      availableBays: totalBays - occupiedBays,
      totalQueuedCommercialVehicles: totalQueued,
      laneBlockedHubCount: laneBlockedCount,
      commercialVehiclesAtHub: occupiedBays,
      commercialVehiclesCompleted: this.totalCompletedVehicles,
      totalFreightServed: Number(this.totalFreightServed.toFixed(1)),
      averageDwellTime: avgDwell
    };
  }
}
