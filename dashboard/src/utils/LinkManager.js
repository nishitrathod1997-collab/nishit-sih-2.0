/**
 * LinkManager.js
 * Manages physical road links connecting corridor junctions.
 *
 * Scope for Phase 10.3B.1:
 * - Link: J1 -> J2 only
 * - Authoritative Distance: 3.4 km (CorridorCoordinator.js)
 * - Modeled Speed: 40 km/h (CONFIGURABLE SIMULATION ASSUMPTION)
 * - Modeled Travel Time: (3.4 / 40) * 3600 = 306 seconds
 *
 * Responsibilities:
 * - Owns in-transit vehicle records between junction simulations.
 * - Enforces zero-teleportation macro travel time.
 * - Preserves complete vehicle identity and freight metadata.
 * - Tracks conservation telemetry.
 * - Does NOT own signal phases, junction queues, or pathfinding.
 */

export const DEFAULT_LINK_CONFIGS = {
  'J1-J2': {
    id: 'J1-J2',
    from: 'J1',
    to: 'J2',
    distanceKm: 3.4,
    speedKmph: 40, // CONFIGURABLE SIMULATION ASSUMPTION
    travelTimeSec: 306, // (3.4 / 40) * 3600
    sourceApproach: 'N', // J1 exit heading North
    targetApproach: 'W'  // J2 entry from West
  },
  'J2-J3': {
    id: 'J2-J3',
    from: 'J2',
    to: 'J3',
    distanceKm: 4.2,
    speedKmph: 40,
    travelTimeSec: 378,
    sourceApproach: 'N',
    targetApproach: 'S'
  },
  'J3-J4': {
    id: 'J3-J4',
    from: 'J3',
    to: 'J4',
    distanceKm: 5.8,
    speedKmph: 40,
    travelTimeSec: 522,
    sourceApproach: 'N',
    targetApproach: 'S'
  }
};

export class LinkManager {
  constructor(customConfigs = {}) {
    this.configs = {
      ...DEFAULT_LINK_CONFIGS,
      ...customConfigs
    };

    // In-transit vehicle storage keyed by linkId
    this.inTransit = {};
    // Completed transits ready for downstream injection
    this.completedTransits = {};

    this.metrics = {
      totalReceived: 0,
      totalDelivered: 0
    };

    this._initializeLinks();
  }

  _initializeLinks() {
    Object.keys(this.configs).forEach(linkId => {
      this.inTransit[linkId] = [];
      this.completedTransits[linkId] = [];
    });
  }

  /**
   * Captures a completed departure from an upstream junction into the link.
   * @param {string} linkId - The corridor link identifier (e.g., 'J1-J2')
   * @param {Object} departure - The departure record produced by upstream VehicleManager
   * @param {number} currentTimeSec - Current simulation time in seconds
   * @returns {Object|null} The created in-transit record or null if invalid
   */
  receiveDeparture(linkId, departure, currentTimeSec = 0) {
    const config = this.configs[linkId];
    if (!config || !departure) {
      return null;
    }

    const travelTimeSec = config.travelTimeSec || ((config.distanceKm / config.speedKmph) * 3600);

    // Create explicit, immutable transfer record preserving all vehicle identity & metadata
    const transitRecord = {
      id: departure.id,
      eventId: departure.id,
      type: departure.type || 'car',
      source: departure.source || 'simulation',
      direction: departure.direction || config.sourceApproach,
      pcuEquivalent: departure.pcuEquivalent !== undefined ? departure.pcuEquivalent : 1.0,
      isCommercial: !!departure.isCommercial,
      destinationHubId: departure.destinationHubId || null,
      cargoTonnage: departure.cargoTonnage || 0,
      deliveryStatus: departure.deliveryStatus || (departure.isCommercial ? 'EN_ROUTE' : 'NONE'),
      totalWaitTime: departure.totalWaitTime !== undefined ? departure.totalWaitTime : (departure.delay || 0),
      isSimulatedCommercial: !!departure.isSimulatedCommercial,
      plannedExitApproach: departure.plannedExitApproach || null,
      corridorRoute: departure.corridorRoute || null,
      routeIndex: typeof departure.routeIndex === 'number' ? departure.routeIndex : 0,
      linkId,
      entryTimeSec: currentTimeSec,
      travelTimeSec,
      remainingTravelTime: travelTimeSec
    };

    this.inTransit[linkId].push(transitRecord);
    this.metrics.totalReceived++;

    return transitRecord;
  }

  /**
   * Advances in-transit travel timers by elapsed simulation time subDt.
   * @param {number} dt - Sub-step delta time in seconds
   * @param {number} currentTimeSec - Current simulation time in seconds
   */
  tick(dt = 1.0, currentTimeSec = 0) {
    const delta = typeof dt === 'number' && dt > 0 ? dt : 1.0;

    Object.keys(this.inTransit).forEach(linkId => {
      const activeList = this.inTransit[linkId];
      const remainingActive = [];

      for (let i = 0; i < activeList.length; i++) {
        const vehicle = activeList[i];
        vehicle.remainingTravelTime -= delta;

        if (vehicle.remainingTravelTime <= 0) {
          // Transit complete; ready for downstream junction injection
          this.completedTransits[linkId].push({
            ...vehicle,
            exitTimeSec: currentTimeSec,
            remainingTravelTime: 0
          });
          this.metrics.totalDelivered++;
        } else {
          remainingActive.push(vehicle);
        }
      }

      this.inTransit[linkId] = remainingActive;
    });
  }

  /**
   * Polls and clears completed transits for a specific link.
   * @param {string} linkId
   * @returns {Array<Object>} List of vehicles ready for downstream injection
   */
  pollCompletedTransits(linkId) {
    if (!this.completedTransits[linkId]) {
      return [];
    }
    const completed = [...this.completedTransits[linkId]];
    this.completedTransits[linkId] = [];
    return completed;
  }

  /**
   * Returns total count of vehicles currently in transit across all links.
   */
  getTotalInTransitCount() {
    return Object.values(this.inTransit).reduce((sum, list) => sum + list.length, 0);
  }

  /**
   * Returns a serializable representation of link manager state.
   */
  getState() {
    const linksState = {};

    Object.entries(this.configs).forEach(([linkId, config]) => {
      const transitList = this.inTransit[linkId] || [];
      const completedList = this.completedTransits[linkId] || [];

      linksState[linkId] = {
        linkId,
        from: config.from,
        to: config.to,
        distanceKm: config.distanceKm,
        speedKmph: config.speedKmph,
        travelTimeSec: config.travelTimeSec,
        sourceApproach: config.sourceApproach,
        targetApproach: config.targetApproach,
        vehicleCount: transitList.length,
        completedPendingCount: completedList.length,
        vehicles: transitList.map(v => ({
          id: v.id,
          type: v.type,
          isCommercial: v.isCommercial,
          entryTimeSec: v.entryTimeSec,
          remainingTravelTime: parseFloat(v.remainingTravelTime.toFixed(1)),
          progressPercent: parseFloat(
            Math.min(100, Math.max(0, ((v.travelTimeSec - v.remainingTravelTime) / v.travelTimeSec) * 100)).toFixed(1)
          ),
          totalWaitTime: v.totalWaitTime,
          pcuEquivalent: v.pcuEquivalent,
          destinationHubId: v.destinationHubId,
          cargoTonnage: v.cargoTonnage,
          deliveryStatus: v.deliveryStatus
        }))
      };
    });

    return {
      links: linksState,
      metrics: {
        totalReceived: this.metrics.totalReceived,
        totalInTransit: this.getTotalInTransitCount(),
        totalDelivered: this.metrics.totalDelivered
      }
    };
  }

  /**
   * Resets all in-transit state and metrics.
   */
  reset() {
    this.inTransit = {};
    this.completedTransits = {};
    this.metrics = {
      totalReceived: 0,
      totalDelivered: 0
    };
    this._initializeLinks();
  }
}
