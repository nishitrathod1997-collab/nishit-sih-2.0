/**
 * HistoricalDemandScheduler.js
 *
 * Deterministic pure utility module for converting empirical Pune 5-minute
 * traffic counts into scheduled vehicle arrival events spread across 300 seconds.
 *
 * Architecture Rules:
 * - Pure scheduling utility (does NOT own vehicle speeds, acceleration, or physics).
 * - Direction mapping: UP -> N, RIGHT -> E, DOWN -> S, LEFT -> W
 * - Vehicle type mapping: car -> car, motorbike -> bike, bus -> bus, truck -> truck
 * - Deterministic arrival timestamps (no Math.random)
 * - Class-staggered offsets to avoid simultaneous burst spawning
 * - Unique deterministic event IDs
 */

export const PUNE_TO_SIM_DIRECTION_MAP = Object.freeze({
  UP: 'N',
  RIGHT: 'E',
  DOWN: 'S',
  LEFT: 'W'
});

export const SIM_TO_PUNE_DIRECTION_MAP = Object.freeze({
  N: 'UP',
  E: 'RIGHT',
  S: 'DOWN',
  W: 'LEFT'
});

export const PUNE_TO_SIM_VEHICLE_TYPE_MAP = Object.freeze({
  car: 'car',
  motorbike: 'bike',
  bus: 'bus',
  truck: 'truck'
});

export const CLASS_STAGGER_OFFSETS = Object.freeze({
  car: 0.0,
  bike: 0.6,
  bus: 1.2,
  truck: 1.8
});

export const PCU_WEIGHTS = Object.freeze({
  car: 1.0,
  bike: 0.5,
  bus: 2.5,
  truck: 2.5
});

/**
 * Calculates total PCU for a set of vehicle counts.
 */
export function calculateBucketPCU(counts = {}) {
  const car = counts.car || 0;
  const bike = counts.motorbike !== undefined ? counts.motorbike : (counts.bike || 0);
  const bus = counts.bus || 0;
  const truck = counts.truck || 0;

  const pcu = (car * PCU_WEIGHTS.car) +
              (bike * PCU_WEIGHTS.bike) +
              (bus * PCU_WEIGHTS.bus) +
              (truck * PCU_WEIGHTS.truck);

  return Number(pcu.toFixed(2));
}

/**
 * Generates an ordered list of deterministic arrival events spread across
 * an interval (nominal 300 seconds) for a given Pune data bucket.
 *
 * @param {Object} options
 * @param {string} options.date - e.g. "2023-01-17"
 * @param {string} options.time - e.g. "09:00:00"
 * @param {number} [options.baseSimTimeSec=0] - Simulation start time of this 300s window
 * @param {number} [options.intervalSeconds=300] - Duration of the bucket (default 300s)
 * @param {Object} options.directions - Direction dictionary (UP, RIGHT, DOWN, LEFT)
 * @returns {Array<Object>} Sorted list of scheduled arrival events
 */
export function generateBucketArrivals({
  date = '2023-01-17',
  time = '09:00:00',
  baseSimTimeSec = 0,
  intervalSeconds = 300,
  directions = {}
} = {}) {
  const events = [];
  const puneDirections = ['UP', 'RIGHT', 'DOWN', 'LEFT'];
  const vehicleTypes = ['car', 'motorbike', 'bus', 'truck'];

  puneDirections.forEach(puneDir => {
    const simDir = PUNE_TO_SIM_DIRECTION_MAP[puneDir];
    if (!simDir) return;

    const dirData = directions[puneDir] || {};

    vehicleTypes.forEach(puneType => {
      const simType = PUNE_TO_SIM_VEHICLE_TYPE_MAP[puneType];
      const count = Math.max(0, Math.floor(Number(dirData[puneType]) || 0));

      if (count <= 0) return;

      const staggerOffset = CLASS_STAGGER_OFFSETS[simType] || 0.0;
      const stepSec = intervalSeconds / count;

      for (let i = 0; i < count; i++) {
        // Evenly space across interval, with a safe ceiling strictly inside the bucket
        const rawTimeOffset = staggerOffset + (i + 0.5) * stepSec;
        const relativeSec = Math.min(intervalSeconds - 0.1, Math.max(0, rawTimeOffset));
        const simTimeSec = Number((baseSimTimeSec + relativeSec).toFixed(3));

        const indexPad = String(i + 1).padStart(4, '0');
        const eventId = `pune-${date}-${time}-${puneDir}-${simType}-${indexPad}`;

        events.push({
          eventId,
          direction: simDir,
          vehicleType: simType,
          simTimeSec,
          source: 'pune_historical'
        });
      }
    });
  });

  // Sort deterministically by scheduled simTimeSec ascending, breaking ties with eventId
  events.sort((a, b) => {
    if (a.simTimeSec !== b.simTimeSec) {
      return a.simTimeSec - b.simTimeSec;
    }
    return a.eventId.localeCompare(b.eventId);
  });

  return events;
}
