import { TRAFFIC_CONSTANTS } from './constants.js';

const INTERSECTION_ENTRY_THRESHOLD = 38;
const INTERSECTION_EXIT_THRESHOLD = 58;
const MIN_VEHICLE_GAP = 5.5;
const STOP_LINE_POSITION = 25;
const QUEUE_APPROACH_SPEED = 1.2;

/**
 * Seedable Pseudo-Random Number Generator (Mulberry32)
 */
function createPRNG(seed = 12345) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class VehicleManager {
  constructor(
    seed = 12345,
    demandMultiplier = (TRAFFIC_CONSTANTS.DEMAND_POLICY?.DEFAULT_GENERATED_DEMAND_MULTIPLIER ?? 0.5),
    freightDemandMultiplier = (TRAFFIC_CONSTANTS.DEMAND_POLICY?.DEFAULT_FREIGHT_DEMAND_MULTIPLIER ?? 1.0),
    junctionId = 'J3'
  ) {
    this.seed = seed;
    this.demandMultiplier = demandMultiplier;
    this.freightDemandMultiplier = freightDemandMultiplier;
    this.junctionId = junctionId;
    this.cars = { N: [], E: [], S: [], W: [] };
    this.backlog = { N: [], E: [], S: [], W: [] };
    this.carsPassed = 0;
    this.sessionDurationSeconds = 0;
    this.emergencyVehicle = null;
    this.emergencyCooldown = 0;
    this.carIdCounter = 1;
    this.historicalDeparturesCount = 0;

    this.approachSources = { N: 'simulation', E: 'simulation', S: 'simulation', W: 'simulation' };
    this._queueHistory = [];
    this._completedWaitTimes = [];
    this._completedArrivals = [];
    this._completedDepartures = [];
    this._waitTimeHistory = [];
    this._throughputHistory = [];

    this._initScheduleAndSimulation();
  }

  setApproachSource(direction, source) {
    if (['N', 'S', 'E', 'W'].includes(direction) && ['simulation', 'recorded_video', 'pune_historical'].includes(source)) {
      this.approachSources[direction] = source;
    }
  }

  getApproachSource(direction) {
    return this.approachSources[direction] || 'simulation';
  }

  clearApproach(direction) {
    if (!['N', 'S', 'E', 'W'].includes(direction)) return;
    this.cars[direction] = [];
    this.backlog[direction] = [];
    this._completedArrivals = this._completedArrivals.filter(a => a.direction !== direction);
  }

  /**
   * Safely purge pending unspawned historical arrivals from backlog
   * when transitioning traffic sources, while leaving vehicles already on the road.
   */
  clearHistoricalBacklog(direction = null) {
    const dirs = direction ? [direction] : ['N', 'S', 'E', 'W'];
    dirs.forEach(d => {
      if (this.backlog[d]) {
        this.backlog[d] = this.backlog[d].filter(v => v.source !== 'pune_historical');
      }
    });
  }

  /**
   * Inject a single deduplicated external arrival from recorded video or Pune historical replay.
   * Conserves arrival demand by safely queueing into backlog if entry line is blocked.
   * Returns an acceptance receipt.
   */
  injectExternalArrival(direction, event) {
    if (!['N', 'S', 'E', 'W'].includes(direction) || !event) {
      return { accepted: false, spawnedImmediately: false, queuedInBacklog: false };
    }

    const vType = event.vehicleType || 'car';
    const speeds = TRAFFIC_CONSTANTS.VEHICLE_SPEEDS || {};
    const speed = speeds[vType] || (vType === 'bike' ? 7.5 : vType === 'bus' ? 4.5 : (vType === 'freight_truck' || vType === 'truck') ? 4.0 : vType === 'delivery_van' ? 5.2 : 6.0);
    const vehId = event.eventId || `ext-${direction}-${this.carIdCounter++}`;
    const source = event.source || (event.eventId?.startsWith('pune') ? 'pune_historical' : 'recorded_video');
    const isCommercial = event.isCommercial !== undefined ? event.isCommercial : (vType === 'delivery_van' || vType === 'freight_truck' || vType === 'truck');
    const pcuWeights = TRAFFIC_CONSTANTS.PCU_WEIGHTS || {};
    const pcuEquivalent = event.pcuEquivalent || pcuWeights[vType] || (isCommercial ? 2.5 : (vType === 'bike' ? 0.5 : 1.0));

    const newVeh = {
      id: vehId,
      eventId: event.eventId || null,
      source,
      position: 0,
      speed,
      type: vType,
      waitTime: event.totalWaitTime || 0,
      isStopped: false,
      inIntersection: false,
      curbDwellRemainingSec: 0,
      isExternal: true,
      isCommercial,
      pcuEquivalent,
      destinationHubId: event.destinationHubId || null,
      cargoTonnage: event.cargoTonnage || 0,
      deliveryStatus: event.deliveryStatus || (isCommercial ? (((this.junctionId === 'J2' && event.destinationHubId === 'HUB_DDR_01') || (this.junctionId === 'J3' && event.destinationHubId === 'HUB_BKC_01')) ? 'ARRIVING' : 'EN_ROUTE') : 'NONE'),
      totalWaitTime: event.totalWaitTime || 0,
      plannedExitApproach: event.plannedExitApproach || null,
      corridorRoute: event.corridorRoute || null,
      routeIndex: typeof event.routeIndex === 'number' ? event.routeIndex : 0,
      isSimulatedCommercial: event.isSimulatedCommercial || false
    };

    this._completedArrivals.push({
      id: vehId,
      direction,
      type: vType,
      source,
      isCommercial,
      pcuEquivalent,
      timeSec: typeof event.videoTimeSec === 'number'
        ? event.videoTimeSec
        : (typeof event.simTimeSec === 'number' ? event.simTimeSec : this.sessionDurationSeconds)
    });

    const sortedLane = this.cars[direction];
    const rearCar = sortedLane.length > 0 ? sortedLane[sortedLane.length - 1] : null;

    let effectiveRear = rearCar ? rearCar.position : Infinity;
    if (this.emergencyVehicle && this.emergencyVehicle.position < 100 && this.emergencyVehicle.approach === direction) {
      effectiveRear = Math.min(effectiveRear, this.emergencyVehicle.position);
    }

    if (effectiveRear >= MIN_VEHICLE_GAP) {
      this.cars[direction].push(newVeh);
      this.cars[direction].sort((a, b) => b.position - a.position);
      return { accepted: true, spawnedImmediately: true, queuedInBacklog: false };
    } else {
      this.backlog[direction].push(newVeh);
      return { accepted: true, spawnedImmediately: false, queuedInBacklog: true };
    }
  }


  start() {
    return true;
  }

  setSeed(seed = 12345, demandMultiplier = this.demandMultiplier, freightDemandMultiplier = this.freightDemandMultiplier) {
    this.seed = seed;
    this.demandMultiplier = demandMultiplier;
    this.freightDemandMultiplier = freightDemandMultiplier;
    this._initScheduleAndSimulation();
  }

  setFreightDemandMultiplier(freightDemandMultiplier = 1.0) {
    this.freightDemandMultiplier = freightDemandMultiplier;
    this._initScheduleAndSimulation();
  }

  _initScheduleAndSimulation() {
    this.prng = createPRNG(this.seed);
    this.arrivalSchedule = this._generateArrivalSchedule(this.seed, 1200, this.demandMultiplier, this.freightDemandMultiplier);
    this.nextArrivalIndex = 0;
    this._initializeSimulationVehicles();
  }

  /**
   * Dynamic time-varying demand curves (vehicles per simulation second).
   * Multiplier is applied to rate AFTER calculating base curve and min floor.
   */
  getArrivalRate(direction, simTimeSec, demandMultiplier = this.demandMultiplier) {
    const t = simTimeSec || 0;
    let baseRate = 0.30;

    switch (direction) {
      case 'N':
        baseRate = 0.30 + 0.25 * Math.sin((2 * Math.PI * t) / 120);
        break;
      case 'S':
        baseRate = 0.35 + 0.25 * Math.cos((2 * Math.PI * t) / 180);
        break;
      case 'E':
        baseRate = 0.25 + 0.30 * Math.sin((2 * Math.PI * t) / 150 + Math.PI / 2);
        break;
      case 'W':
        baseRate = 0.28 + 0.28 * Math.sin((2 * Math.PI * t) / 200 + Math.PI);
        break;
    }
    const unscaledRate = Math.max(0.08, parseFloat(baseRate.toFixed(3)));
    const mult = typeof demandMultiplier === 'number' && demandMultiplier > 0 ? demandMultiplier : 0.5;
    return parseFloat((unscaledRate * mult).toFixed(4));
  }

  /**
   * Precomputes a continuous, deterministic arrival schedule for the seed.
   * Ensures identical arrival timestamps, directions, and vehicle types
   * regardless of physics sub-step sizes (e.g. 0.05s vs 0.1s).
   */
  _generateArrivalSchedule(
    seed,
    maxDurationSec = 1200,
    demandMultiplier = this.demandMultiplier,
    freightDemandMultiplier = this.freightDemandMultiplier
  ) {
    const prng = createPRNG(seed);
    const schedule = [];
    const directions = ['N', 'S', 'E', 'W'];
    let idCounter = 1;

    const speeds = TRAFFIC_CONSTANTS.VEHICLE_SPEEDS || {};
    const pcuWeights = TRAFFIC_CONSTANTS.PCU_WEIGHTS || {};
    const cargoTonnages = TRAFFIC_CONSTANTS.COMMERCIAL_DEFAULTS?.CARGO_TONNAGE || {};

    const freightMult = typeof freightDemandMultiplier === 'number' && freightDemandMultiplier > 0
      ? freightDemandMultiplier
      : 1.0;

    directions.forEach(direction => {
      let t = prng() * 2.0;
      while (t < maxDurationSec) {
        const ratePerSec = this.getArrivalRate(direction, t, demandMultiplier);
        const dtArrival = -Math.log(1 - Math.min(0.99, prng())) / ratePerSec;
        t += Math.max(0.5, dtArrival);

        if (t >= maxDurationSec) break;

        const r = prng();
        // Base vehicle distribution: car (50%), bike (22%), bus (14%), commercial freight (14% * freightMult)
        let vType;
        const freightFraction = Math.max(0.05, Math.min(0.35, 0.14 * freightMult));
        const passengerRatio = 1.0 - freightFraction;

        if (r < 0.50 * passengerRatio / 0.86) {
          vType = 'car';
        } else if (r < 0.72 * passengerRatio / 0.86) {
          vType = 'bike';
        } else if (r < passengerRatio) {
          vType = 'bus';
        } else {
          // Commercial freight vehicle (delivery_van vs freight_truck)
          const freightSub = prng();
          vType = freightSub < 0.60 ? 'delivery_van' : 'freight_truck';
        }

        const isCommercial = (vType === 'delivery_van' || vType === 'freight_truck' || vType === 'truck');
        const pcuEquivalent = pcuWeights[vType] || (vType === 'delivery_van' ? 1.5 : (vType === 'freight_truck' || vType === 'truck' || vType === 'bus') ? 2.5 : (vType === 'bike' ? 0.5 : 1.0));
        const speed = speeds[vType] || (vType === 'bike' ? 7.5 : vType === 'bus' ? 4.5 : vType === 'freight_truck' ? 3.8 : vType === 'delivery_van' ? 5.2 : vType === 'truck' ? 4.0 : 6.0);
        const cargoTonnage = isCommercial ? (cargoTonnages[vType] || (vType === 'delivery_van' ? 1.2 : 8.5)) : 0;
        let destinationHubId = null;
        let corridorRoute = null;
        let routeIndex = 0;
        let plannedExitApproach = null;

        if (isCommercial) {
          const origin = this.junctionId || 'J3';
          if (origin === 'J1') {
            if (vType === 'delivery_van') {
              destinationHubId = 'HUB_DDR_01';
              corridorRoute = ['J1', 'J2'];
              routeIndex = 0;
            } else {
              destinationHubId = 'HUB_BKC_01';
              corridorRoute = ['J1', 'J2', 'J3'];
              routeIndex = 0;
            }
            plannedExitApproach = 'N';
          } else if (origin === 'J2') {
            if (vType === 'delivery_van') {
              destinationHubId = 'HUB_DDR_01';
              corridorRoute = ['J2'];
              routeIndex = 0;
              plannedExitApproach = 'N';
            } else {
              destinationHubId = 'HUB_BKC_01';
              corridorRoute = ['J2', 'J3'];
              routeIndex = 0;
              plannedExitApproach = 'N';
            }
          } else if (origin === 'J3') {
            destinationHubId = 'HUB_BKC_01';
            corridorRoute = ['J3'];
            routeIndex = 0;
            plannedExitApproach = 'N';
          } else {
            destinationHubId = null;
            corridorRoute = null;
            routeIndex = 0;
            plannedExitApproach = 'N';
          }
        }
        const deliveryStatus = isCommercial ? 'EN_ROUTE' : 'NONE';
        const isSimulatedCommercial = isCommercial;

        schedule.push({
          id: `v-${direction}-${idCounter++}`,
          timeSec: parseFloat(t.toFixed(3)),
          direction,
          type: vType,
          speed,
          isCommercial,
          pcuEquivalent,
          destinationHubId,
          cargoTonnage,
          deliveryStatus,
          curbDwellRemainingSec: 0,
          isSimulatedCommercial,
          corridorRoute,
          routeIndex,
          plannedExitApproach
        });
      }
    });

    schedule.sort((a, b) => a.timeSec - b.timeSec);
    return schedule;
  }

  _initializeSimulationVehicles() {
    this.cars = { N: [], E: [], S: [], W: [] };
    this.backlog = { N: [], E: [], S: [], W: [] };
    this._completedArrivals = [];
  }

  getQueueLengths() {
    const q = {};
    Object.keys(this.cars).forEach(dir => {
      q[dir] = this.cars[dir].length + (this.backlog[dir] ? this.backlog[dir].length : 0);
    });
    return q;
  }

  getVisibleStoppedQueues() {
    const visible = {};
    Object.keys(this.cars).forEach(dir => {
      visible[dir] = this.cars[dir].filter(c => c.position <= STOP_LINE_POSITION && c.isStopped).length;
    });
    return visible;
  }

  getStoppedQueues() {
    const stopped = {};
    Object.keys(this.cars).forEach(dir => {
      const visibleStopped = this.cars[dir].filter(c => c.position <= STOP_LINE_POSITION && c.isStopped).length;
      const backlogCount = this.backlog[dir] ? this.backlog[dir].length : 0;
      stopped[dir] = visibleStopped + backlogCount;
    });
    return stopped;
  }

  getBacklogQueues() {
    const b = {};
    Object.keys(this.backlog).forEach(dir => {
      b[dir] = this.backlog[dir].length;
    });
    return b;
  }

  getQueuedPCUs() {
    const pcus = {};
    const weights = TRAFFIC_CONSTANTS.PCU_WEIGHTS || {
      car: 1.0,
      bike: 0.5,
      bus: 2.5,
      truck: 2.5,
      delivery_van: 1.5,
      freight_truck: 2.5,
      emergency: 1.0
    };
    Object.keys(this.cars).forEach(dir => {
      let totalPcu = 0;
      this.cars[dir].forEach(c => {
        if (c.position <= STOP_LINE_POSITION && c.isStopped) {
          const w = c.pcuEquivalent || weights[c.type] || 1.0;
          totalPcu += w;
        }
      });
      (this.backlog[dir] || []).forEach(bVeh => {
        const w = bVeh.pcuEquivalent || weights[bVeh.type] || 1.0;
        totalPcu += w;
      });

      pcus[dir] = parseFloat(totalPcu.toFixed(1));
    });
    return pcus;
  }

  /**
   * Returns all active commercial freight vehicles currently on visible roads or in backlog.
   */
  getCommercialVehicles() {
    const comm = [];
    Object.keys(this.cars).forEach(dir => {
      this.cars[dir].forEach(c => {
        if (c.isCommercial) comm.push({ ...c, direction: dir });
      });
      (this.backlog[dir] || []).forEach(b => {
        if (b.isCommercial) comm.push({ ...b, direction: dir, inBacklog: true });
      });
    });
    return comm;
  }

  /**
   * Returns queued PCU breakdown specifically attributed to commercial freight vehicles.
   */
  getCommercialPCUs() {
    const commPCUs = {};
    const weights = TRAFFIC_CONSTANTS.PCU_WEIGHTS || {};
    Object.keys(this.cars).forEach(dir => {
      let pcu = 0;
      this.cars[dir].forEach(c => {
        if (c.isCommercial && c.position <= STOP_LINE_POSITION && c.isStopped) {
          pcu += (c.pcuEquivalent || weights[c.type] || 1.5);
        }
      });
      (this.backlog[dir] || []).forEach(b => {
        if (b.isCommercial) {
          pcu += (b.pcuEquivalent || weights[b.type] || 1.5);
        }
      });
      commPCUs[dir] = parseFloat(pcu.toFixed(1));
    });
    return commPCUs;
  }

  getOldestWaitTimes() {
    const oldest = {};
    Object.keys(this.cars).forEach(dir => {
      let maxWait = 0;
      this.cars[dir].forEach(car => {
        if (car.position <= STOP_LINE_POSITION && car.isStopped && car.waitTime > maxWait) {
          maxWait = car.waitTime;
        }
      });
      (this.backlog[dir] || []).forEach(bVeh => {
        if (bVeh.waitTime > maxWait) {
          maxWait = bVeh.waitTime;
        }
      });
      oldest[dir] = maxWait;
    });
    return oldest;
  }

  getCompletedArrivals() {
    return [...(this._completedArrivals || [])];
  }

  getCompletedDepartures() {
    return [...(this._completedDepartures || [])];
  }

  getActiveEmergencyVehicle() {
    if (this.emergencyVehicle && this.emergencyVehicle.position < 100) {
      return this.emergencyVehicle;
    }
    return null;
  }

  isIntersectionOccupied() {
    const normalOccupied = Object.values(this.cars).some(lane =>
      lane.some(car => car.inIntersection || (car.position > STOP_LINE_POSITION && car.position <= INTERSECTION_EXIT_THRESHOLD))
    );
    const emgOccupied = !!(this.emergencyVehicle &&
      (this.emergencyVehicle.inIntersection || (this.emergencyVehicle.position > STOP_LINE_POSITION && this.emergencyVehicle.position <= INTERSECTION_EXIT_THRESHOLD))
    );
    return normalOccupied || emgOccupied;
  }

  hasActiveCrossingVehicles(direction = null) {
    if (direction && this.cars[direction]) {
      return this.cars[direction].some(c => c.position > STOP_LINE_POSITION && c.position <= INTERSECTION_EXIT_THRESHOLD);
    }
    return Object.values(this.cars).some(lane =>
      lane.some(c => c.position > STOP_LINE_POSITION && c.position <= INTERSECTION_EXIT_THRESHOLD)
    );
  }

  /**
   * Bounded Physics, Deterministic Scheduled Arrivals & Backlog Rules:
   * 1. Scheduled arrivals enter system strictly at precomputed simulation timestamps (timeSec).
   * 2. When visible entrance fills, arriving vehicles queue in the off-screen backlog.
   * 3. Backlog vehicles transition smoothly onto visible road (position = 0) as space opens.
   * 4. External arrivals continue spawning regardless of emergency mode.
   */
  updateVehicles(currentSignal = 'N', signalPhase = 'GREEN', dt = 1.0) {
    const deltaSec = typeof dt === 'number' && dt > 0 ? dt : 1.0;
    this.sessionDurationSeconds += deltaSec;
    const isEmergencyActive = !!(this.emergencyVehicle && this.emergencyVehicle.position < 100);
    const stepDepartedCars = [];

    // 1. Process backlog wait times
    Object.keys(this.backlog).forEach(dir => {
      (this.backlog[dir] || []).forEach(bVeh => {
        bVeh.waitTime += deltaSec;
      });
    });

    // 2. Dispatch precomputed arrival schedule up to current sessionDurationSeconds
    while (
      this.arrivalSchedule &&
      this.nextArrivalIndex < this.arrivalSchedule.length &&
      this.arrivalSchedule[this.nextArrivalIndex].timeSec <= this.sessionDurationSeconds
    ) {
      const event = this.arrivalSchedule[this.nextArrivalIndex++];
      const direction = event.direction;

      // Skip generated arrival if approach is set to recorded_video or pune_historical source
      if (this.approachSources[direction] !== 'simulation') {
        continue;
      }

      const isComm = !!event.isCommercial;
      const newVeh = {
        id: event.id,
        position: 0,
        speed: event.speed,
        type: event.type,
        waitTime: 0,
        isStopped: false,
        inIntersection: false,
        isCommercial: isComm,
        pcuEquivalent: event.pcuEquivalent || (TRAFFIC_CONSTANTS.PCU_WEIGHTS[event.type] || (isComm ? 1.5 : 1.0)),
        destinationHubId: event.destinationHubId || null,
        cargoTonnage: event.cargoTonnage || 0,
        deliveryStatus: event.deliveryStatus || (isComm ? 'EN_ROUTE' : 'NONE'),
        curbDwellRemainingSec: event.curbDwellRemainingSec || 0,
        isSimulatedCommercial: !!event.isSimulatedCommercial,
        corridorRoute: event.corridorRoute || null,
        routeIndex: typeof event.routeIndex === 'number' ? event.routeIndex : 0,
        plannedExitApproach: event.plannedExitApproach || null,
        timeSec: event.timeSec
      };

      this._completedArrivals.push({
        id: event.id,
        direction: event.direction,
        type: event.type,
        timeSec: event.timeSec,
        isCommercial: isComm,
        pcuEquivalent: newVeh.pcuEquivalent
      });

      const sortedLane = this.cars[direction];
      const rearCar = sortedLane.length > 0 ? sortedLane[sortedLane.length - 1] : null;

      let effectiveRear = rearCar ? rearCar.position : Infinity;
      if (isEmergencyActive && this.emergencyVehicle && this.emergencyVehicle.approach === direction) {
        effectiveRear = Math.min(effectiveRear, this.emergencyVehicle.position);
      }

      if (effectiveRear >= MIN_VEHICLE_GAP) {
        this.cars[direction].push(newVeh);
        this.cars[direction].sort((a, b) => b.position - a.position);
      } else {
        this.backlog[direction].push(newVeh);
      }
    }

    // 3. Update visible vehicle positions
    Object.keys(this.cars).forEach(direction => {
      const isGreenPhase = (direction === currentSignal && signalPhase === 'GREEN');
      const laneArr = this.cars[direction];

      const updatedCars = laneArr.filter(car => {
        if (car.position > STOP_LINE_POSITION && car.position <= INTERSECTION_EXIT_THRESHOLD) {
          car.inIntersection = true;
        } else {
          car.inIntersection = false;
        }

        if (car.isCommercial && car.destinationHubId) {
          const isAtDest = (this.junctionId === 'J2' && car.destinationHubId === 'HUB_DDR_01') ||
            (this.junctionId === 'J3' && car.destinationHubId === 'HUB_BKC_01');
          if (isAtDest && car.deliveryStatus === 'EN_ROUTE') {
            car.deliveryStatus = 'ARRIVING';
          }
        }

        const isCommittedPastStopLine = car.position > STOP_LINE_POSITION;
        const canMove = isGreenPhase || isCommittedPastStopLine || car.inIntersection;

        const myIndex = laneArr.indexOf(car);
        let carAhead = myIndex > 0 ? laneArr[myIndex - 1] : null;

        if (isEmergencyActive && this.emergencyVehicle && this.emergencyVehicle.approach === direction) {
          const emgPos = this.emergencyVehicle.position;
          if (emgPos > car.position) {
            if (!carAhead || emgPos < carAhead.position) {
              carAhead = { position: emgPos };
            }
          }
        }

        if (canMove) {
          car.isStopped = false;
          // In emergency corridor, expedite vehicles ahead of ambulance to pass smoothly
          const isEmgApproach = isEmergencyActive && this.emergencyVehicle && this.emergencyVehicle.approach === direction;
          const effectiveSpeed = isEmgApproach ? Math.max(car.speed, 8.5) : car.speed;
          const moveSpeed = effectiveSpeed * deltaSec;
          car.position += moveSpeed;

          if (carAhead && car.position > carAhead.position - MIN_VEHICLE_GAP) {
            car.position = Math.max(0, carAhead.position - MIN_VEHICLE_GAP);
          }

          if (car.position >= 100) {
            this.carsPassed++;
            const wt = typeof car.waitTime === 'number' ? car.waitTime : 0;
            this._completedWaitTimes.push(wt);
            if (this._completedWaitTimes.length > 300) this._completedWaitTimes.shift();

            if (car.source === 'pune_historical') {
              this.historicalDeparturesCount++;
            }

            const depObj = {
              id: car.id,
              type: car.type || 'car',
              source: car.source || 'simulation',
              direction: car.plannedExitApproach || direction,
              delay: wt,
              totalWaitTime: wt,
              exitTime: Date.now(),
              isCommercial: !!car.isCommercial,
              pcuEquivalent: car.pcuEquivalent || 1.0,
              cargoTonnage: car.cargoTonnage || 0,
              destinationHubId: car.destinationHubId || null,
              deliveryStatus: car.deliveryStatus || (car.isCommercial ? 'EN_ROUTE' : 'NONE'),
              isSimulatedCommercial: !!car.isSimulatedCommercial,
              corridorRoute: car.corridorRoute || null,
              routeIndex: typeof car.routeIndex === 'number' ? car.routeIndex : 0,
              plannedExitApproach: car.plannedExitApproach || null
            };
            this._completedDepartures.push(depObj);
            stepDepartedCars.push(depObj);
            if (this._completedDepartures.length > 500) {
              this._completedDepartures.shift();
            }
            return false;
          }
        } else {
          const naturalSlot = carAhead
            ? Math.min(STOP_LINE_POSITION, carAhead.position - MIN_VEHICLE_GAP)
            : STOP_LINE_POSITION;

          if (car.position < naturalSlot) {
            car.isStopped = false;
            car.position = Math.min(naturalSlot, car.position + QUEUE_APPROACH_SPEED * deltaSec);
          } else {
            car.position = Math.min(car.position, naturalSlot);
            car.isStopped = true;
            car.waitTime = (car.waitTime || 0) + deltaSec;
          }
        }
        return true;
      });

      this.cars[direction] = updatedCars.sort((a, b) => b.position - a.position);

      // Dequeue from backlog onto visible road (position = 0) as space opens
      const sortedLane = this.cars[direction];
      const rearCar = sortedLane.length > 0 ? sortedLane[sortedLane.length - 1] : null;

      let effectiveRearPos = rearCar ? rearCar.position : Infinity;
      if (isEmergencyActive && this.emergencyVehicle && this.emergencyVehicle.approach === direction) {
        effectiveRearPos = Math.min(effectiveRearPos, this.emergencyVehicle.position);
      }

      if (effectiveRearPos >= MIN_VEHICLE_GAP && this.backlog[direction].length > 0) {
        const enteringVeh = this.backlog[direction].shift();
        enteringVeh.position = 0;
        enteringVeh.isStopped = false;
        this.cars[direction].push(enteringVeh);
        this.cars[direction].sort((a, b) => b.position - a.position);
      }
    });

    // 4. Advance separate emergency vehicle entity if active
    if (isEmergencyActive) {
      const emgApp = this.emergencyVehicle.approach;
      const isEmgGreen = (emgApp === currentSignal && signalPhase === 'GREEN');
      const isEmgCommitted = this.emergencyVehicle.position > STOP_LINE_POSITION;

      if (isEmgGreen || isEmgCommitted || this.emergencyVehicle.inIntersection) {
        this.emergencyVehicle.isStopped = false;
        const laneArr = this.cars[emgApp] || [];
        const carsAhead = laneArr.filter(c => c.position > this.emergencyVehicle.position);
        const carDirectlyAhead = carsAhead.length > 0
          ? carsAhead.reduce((prev, curr) => curr.position < prev.position ? curr : prev)
          : null;

        const maxAllowedPos = carDirectlyAhead
          ? Math.max(0, carDirectlyAhead.position - MIN_VEHICLE_GAP)
          : 105;

        const targetPos = this.emergencyVehicle.position + Math.max(this.emergencyVehicle.speed || 8.5, 8.5) * deltaSec;
        this.emergencyVehicle.position = Math.min(targetPos, maxAllowedPos);

        if (this.emergencyVehicle.position > STOP_LINE_POSITION && this.emergencyVehicle.position <= INTERSECTION_EXIT_THRESHOLD) {
          this.emergencyVehicle.inIntersection = true;
        } else {
          this.emergencyVehicle.inIntersection = false;
        }

        if (this.emergencyVehicle.position >= 100) {
          this.carsPassed++;
          const depObj = {
            id: this.emergencyVehicle.id,
            type: this.emergencyVehicle.type || 'ambulance',
            direction: emgApp,
            delay: this.emergencyVehicle.waitTime || 0,
            totalWaitTime: this.emergencyVehicle.waitTime || 0,
            exitTime: Date.now()
          };
          this._completedDepartures.push(depObj);
          stepDepartedCars.push(depObj);
          this.emergencyVehicle = null;
        }
      } else {
        const laneArr = this.cars[emgApp] || [];
        const carsAhead = laneArr.filter(c => c.position > this.emergencyVehicle.position);
        const carDirectlyAhead = carsAhead.length > 0
          ? carsAhead.reduce((prev, curr) => curr.position < prev.position ? curr : prev)
          : null;

        const naturalSlot = carDirectlyAhead
          ? Math.min(STOP_LINE_POSITION, carDirectlyAhead.position - MIN_VEHICLE_GAP)
          : STOP_LINE_POSITION;

        if (this.emergencyVehicle.position < naturalSlot) {
          this.emergencyVehicle.isStopped = false;
          this.emergencyVehicle.position = Math.min(naturalSlot, this.emergencyVehicle.position + QUEUE_APPROACH_SPEED * deltaSec);
        } else {
          this.emergencyVehicle.position = Math.min(this.emergencyVehicle.position, naturalSlot);
          this.emergencyVehicle.isStopped = true;
          this.emergencyVehicle.waitTime = (this.emergencyVehicle.waitTime || 0) + deltaSec;
        }
      }
    }

    if (this.emergencyCooldown > 0) {
      this.emergencyCooldown -= deltaSec;
    }

    if (!this._lastHistoryTime || this.sessionDurationSeconds - this._lastHistoryTime >= 1.0) {
      this._lastHistoryTime = this.sessionDurationSeconds;
      const ql = this.getQueueLengths();
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      const snapshot = {
        time: timeStr,
        ...ql,
        queues: { ...ql }
      };
      this._queueHistory = [...this._queueHistory.slice(-29), snapshot];

      const currentAvgWait = this.calculateAverageWaitTime();
      this._waitTimeHistory = [
        ...this._waitTimeHistory.slice(-29),
        {
          time: timeStr,
          wait_time: currentAvgWait
        }
      ];

      this._throughputHistory = [
        ...this._throughputHistory.slice(-119),
        {
          timestamp: Date.now(),
          throughput: this.calculateThroughput()
        }
      ];
    }

    return { departedCars: stepDepartedCars };
  }

  triggerEmergency(direction, type, activeSignal) {
    return this.triggerEmergencyVehicle(direction, type, activeSignal);
  }

  triggerEmergencyVehicle(direction, type = 'ambulance', activeSignal = null) {
    const validDirs = ['N', 'S', 'E', 'W'];
    let app;
    if (validDirs.includes(direction)) {
      app = direction;
    } else {
      // Pick a random approach, avoiding the currently green signal so preemption is clearly visible
      const nonGreenDirs = activeSignal ? validDirs.filter(d => d !== activeSignal) : validDirs;
      const candidates = nonGreenDirs.length > 0 ? nonGreenDirs : validDirs;
      const randomFrac = this.prng ? this.prng() : Math.random();
      app = candidates[Math.floor(randomFrac * candidates.length)];
    }

    if (this.emergencyVehicle && this.emergencyVehicle.position < 100) {
      return this.emergencyVehicle;
    }

    const emgId = `emg-${app}-${Date.now()}`;
    const sortedLane = this.cars[app] || [];

    // Cascading forward clearance: Ensure vehicles in this lane have MIN_VEHICLE_GAP spacing
    // Shift from front (index 0) to back (index length - 1) so space opens up cleanly
    if (sortedLane.length > 0) {
      const rearCar = sortedLane[sortedLane.length - 1];
      if (rearCar.position < MIN_VEHICLE_GAP) {
        const neededShift = (MIN_VEHICLE_GAP - rearCar.position) + 0.5;
        for (let i = 0; i < sortedLane.length; i++) {
          const c = sortedLane[i];
          if (i === 0) {
            c.position = c.position + neededShift;
          } else {
            const aheadPos = sortedLane[i - 1].position - MIN_VEHICLE_GAP;
            c.position = Math.min(aheadPos, c.position + neededShift);
          }
        }
      }
    }

    const emgType = type || 'ambulance';
    this.emergencyVehicle = {
      id: emgId,
      position: 0,
      speed: 8.5,
      type: emgType,
      approach: app,
      waitTime: 0,
      isStopped: false,
      inIntersection: false
    };

    this._completedArrivals.push({
      id: emgId,
      direction: app,
      type: emgType,
      timeSec: this.sessionDurationSeconds
    });

    return this.emergencyVehicle;
  }

  calculateAverageWaitTime() {
    let totalWait = 0;
    let count = 0;

    // 1. Accumulate wait times of all visible cars currently on road with delay
    Object.values(this.cars).forEach(lane => {
      lane.forEach(car => {
        if (typeof car.waitTime === 'number' && car.waitTime > 0) {
          totalWait += car.waitTime;
          count++;
        }
      });
    });

    // 2. Accumulate wait times of off-screen backlog vehicles
    Object.values(this.backlog).forEach(bList => {
      bList.forEach(bVeh => {
        if (typeof bVeh.waitTime === 'number' && bVeh.waitTime > 0) {
          totalWait += bVeh.waitTime;
          count++;
        }
      });
    });

    // 3. Include active emergency vehicle if delayed
    if (this.emergencyVehicle && this.emergencyVehicle.waitTime > 0) {
      totalWait += this.emergencyVehicle.waitTime;
      count++;
    }

    // If active vehicles are experiencing delay, calculate their average
    if (count > 0) {
      const activeAvg = totalWait / count;
      // If we also have recent completed departures, blend gently for stable telemetry
      if (this._completedWaitTimes.length > 0) {
        const recent = this._completedWaitTimes.slice(-10);
        const compAvg = recent.reduce((sum, v) => sum + v, 0) / recent.length;
        // 70% active current delay, 30% recent completed departure baseline
        const blended = 0.7 * activeAvg + 0.3 * compAvg;
        return parseFloat(blended.toFixed(1));
      }
      return parseFloat(activeAvg.toFixed(1));
    }

    // If no vehicles are currently waiting, use the recent completed departures
    if (this._completedWaitTimes.length > 0) {
      const recent = this._completedWaitTimes.slice(-10);
      const sum = recent.reduce((acc, val) => acc + val, 0);
      return parseFloat((sum / recent.length).toFixed(1));
    }

    return 0;
  }

  calculateThroughput() {
    if (this.sessionDurationSeconds <= 0) return 0;
    return Math.round((this.carsPassed / this.sessionDurationSeconds) * 60);
  }

  getMetrics() {
    const avgWait = this.calculateAverageWaitTime();
    const throughput = this.calculateThroughput();
    const totalCars = this.carsPassed;

    return {
      total_cars: totalCars,
      cars_passed: totalCars,
      current_avg_wait_time: avgWait,
      avg_wait_time: avgWait,
      throughput: throughput,
      traditional_wait_time: 45.0,
      time_saved_per_hour_minutes: parseFloat(((totalCars * 12.5) / 60).toFixed(1)),
      fuel_saved_per_hour_liters: parseFloat((totalCars * 0.15).toFixed(1)),
      queue_lengths: this.getQueueLengths(),
      queues: this.getQueueLengths(),
      stopped_queues: this.getStoppedQueues(),
      visible_stopped_queues: this.getVisibleStoppedQueues(),
      backlog_queues: this.getBacklogQueues(),
      queued_pcus: this.getQueuedPCUs(),
      queue_history: [...this._queueHistory],
      wait_time_history: [...this._waitTimeHistory]
    };
  }

  reset(seed = 12345, demandMultiplier = this.demandMultiplier) {
    this.seed = seed;
    this.demandMultiplier = demandMultiplier;
    this.carsPassed = 0;
    this.sessionDurationSeconds = 0;
    this.emergencyVehicle = null;
    this.emergencyCooldown = 0;
    this.carIdCounter = 1;
    this.historicalDeparturesCount = 0;
    this._queueHistory = [];
    this._completedWaitTimes = [];
    this._completedArrivals = [];
    this._completedDepartures = [];
    this._waitTimeHistory = [];
    this._throughputHistory = [];
    this._lastHistoryTime = 0;
    this._initScheduleAndSimulation();
  }

  getState() {
    const composedCars = { N: [...this.cars.N], E: [...this.cars.E], S: [...this.cars.S], W: [...this.cars.W] };
    if (this.emergencyVehicle && this.emergencyVehicle.position < 100) {
      const app = this.emergencyVehicle.approach;
      if (composedCars[app]) {
        composedCars[app] = [...composedCars[app], this.emergencyVehicle].sort((a, b) => b.position - a.position);
      }
    }

    return {
      cars: composedCars,
      cars_passed: this.carsPassed,
      emergency_vehicle: this.emergencyVehicle,
      emergencyActive: !!(this.emergencyVehicle && this.emergencyVehicle.position < 100),
      emergencyDirection: this.emergencyVehicle ? this.emergencyVehicle.approach : null,
      queues: this.getQueueLengths(),
      stopped_queues: this.getStoppedQueues(),
      visible_stopped_queues: this.getVisibleStoppedQueues(),
      backlog_queues: this.getBacklogQueues(),
      queued_pcus: this.getQueuedPCUs(),
      avg_wait_time: this.calculateAverageWaitTime(),
      throughput: this.calculateThroughput(),
      generated_demand_multiplier: this.demandMultiplier
    };
  }

  getHistoricalConservationMetrics() {
    let currentlyOnRoad = 0;
    Object.values(this.cars).forEach(lane => {
      lane.forEach(c => {
        if (c.source === 'pune_historical') currentlyOnRoad++;
      });
    });

    let pendingBacklog = 0;
    Object.values(this.backlog).forEach(bList => {
      bList.forEach(c => {
        if (c.source === 'pune_historical') pendingBacklog++;
      });
    });

    const completed = this.historicalDeparturesCount || 0;
    const accepted = currentlyOnRoad + pendingBacklog + completed;

    return {
      currentlyOnRoad,
      pendingBacklog,
      completed,
      accepted
    };
  }
}