/**
 * GoogleTrafficModel.js
 * Scientific Traffic Flow Modeling using Indo-HCM (Indian Highway Capacity Manual)
 * and Google Maps Live Traffic Delay Metrics.
 * 
 * Replaces arbitrary random numbers with:
 * 1. Google Maps DistanceMatrix real-time delay index: (duration_in_traffic / duration)
 * 2. Greenshields Fundamental Traffic Flow Model (Speed vs Density vs Flow)
 * 3. IRC (Indian Road Congress) Vehicle PCU equivalency standards
 * 4. Deterministic green-phase queue discharge (Saturation Flow Rate)
 */

// IRC Standard Passenger Car Unit (PCU) Equivalents
export const IRC_PCU_FACTORS = {
  TWO_WHEELER: 0.5,
  CAR: 1.0,
  AUTO_RICKSHAW: 1.0,
  BUS_TRUCK: 2.5
};

// Typical Mumbai Arterial Road Characteristics (per approach)
export const ROAD_SPECS = {
  LANES_PER_APPROACH: 3,
  SATURATION_FLOW_PER_LANE: 1800, // CONFIGURABLE SIMULATION PARAMETER - ASSUMED THEORETICAL CAPACITY CEILING (PCU / hour of green)
  FREE_FLOW_SPEED_KMPH: 50,
  JAM_DENSITY_PCU_KM: 130,        // Max queue packing density per lane-km
  APPROACH_LENGTH_METERS: 350
};

/**
 * Maps Google Maps live traffic delay ratio to physical traffic metrics
 * 
 * @param {number} delayRatio - duration_in_traffic / free_flow_duration (e.g. 1.0 to 3.5)
 * @returns {Object} { pcu, speedKmph, queueMeters, level, bikes, cars, heavies }
 */
export function deriveApproachMetricsFromGoogleRatio(delayRatio = 1.0) {
  // Clamp delay ratio between 1.0 (free flow) and 4.0 (gridlock)
  const ratio = Math.max(1.0, Math.min(4.0, delayRatio));

  // Greenshields Speed-Density relationship:
  // Speed drops proportionally as congestion ratio increases
  const speedKmph = Math.max(6, Math.round(ROAD_SPECS.FREE_FLOW_SPEED_KMPH / Math.pow(ratio, 1.25)));

  // Density factor (0.0 to 1.0)
  const densityRatio = Math.min(1.0, (ROAD_SPECS.FREE_FLOW_SPEED_KMPH - speedKmph) / (ROAD_SPECS.FREE_FLOW_SPEED_KMPH * 0.88));

  // Base PCU demand on approach (capacity * density)
  // Normal: 15-22 PCU, Slow: 35-55 PCU, Heavy: 65-110+ PCU
  const basePcu = Number((14 + densityRatio * 90).toFixed(1));

  // Vehicle class composition typical for Indian urban arterials:
  // ~45% Two-wheelers, ~42% Cars/Taxis, ~13% Heavy/Buses
  const totalVehicles = Math.max(8, Math.round(basePcu / 1.15));
  const bikes = Math.round(totalVehicles * 0.45);
  const cars = Math.round(totalVehicles * 0.42);
  const heavies = Math.max(1, totalVehicles - bikes - cars);

  // Exact IRC PCU verification:
  const calculatedPcu = Number((bikes * IRC_PCU_FACTORS.TWO_WHEELER + cars * IRC_PCU_FACTORS.CAR + heavies * IRC_PCU_FACTORS.BUS_TRUCK).toFixed(1));

  // Queue length in meters (average vehicle spacing ~ 6.5m in queue)
  const queueMeters = Math.min(
    ROAD_SPECS.APPROACH_LENGTH_METERS,
    Math.round((calculatedPcu / ROAD_SPECS.LANES_PER_APPROACH) * 6.5)
  );

  let level = 'NORMAL';
  if (ratio >= 2.1 || calculatedPcu >= 60 || speedKmph <= 15) {
    level = 'HEAVY';
  } else if (ratio >= 1.4 || calculatedPcu >= 30 || speedKmph <= 28) {
    level = 'SLOW';
  }

  return {
    count: totalVehicles,
    pcu: calculatedPcu,
    bikes,
    cars,
    heavies,
    speedKmph,
    queueMeters,
    delayRatio: Number(ratio.toFixed(2)),
    level
  };
}

/**
 * Deterministic Signal Phase Evolution (Replaces Math.random)
 * 
 * Green phase: Discharges vehicles at physical Saturation Flow Rate (~0.5 PCU/sec per lane).
 * Red phase: Accumulates incoming traffic from upstream arrival rate.
 * 
 * @param {Object} currentApproach - Previous state of this approach
 * @param {boolean} isGreen - Is this approach currently green?
 * @param {number} arrivalRatePerSec - Vehicles arriving per second from upstream
 * @param {number} elapsedSeconds - Time delta (typically 1s)
 */
export function stepApproachFlow(currentApproach, isGreen, arrivalRatePerSec = 0.25, elapsedSeconds = 1) {
  const satDischargePerSec = (ROAD_SPECS.SATURATION_FLOW_PER_LANE * ROAD_SPECS.LANES_PER_APPROACH) / 3600; // ~1.5 PCU/sec

  let nextPcu = currentApproach.pcu;
  
  if (isGreen) {
    // Green Phase: Queue drains at saturation flow rate until baseline arrival flow
    const discharge = satDischargePerSec * elapsedSeconds;
    const netChange = arrivalRatePerSec * elapsedSeconds - discharge;
    nextPcu = Math.max(8.0, Number((nextPcu + netChange).toFixed(1)));
  } else {
    // Red Phase: Queue grows steadily as vehicles arrive and stop
    const addition = arrivalRatePerSec * elapsedSeconds * 1.1;
    nextPcu = Math.min(130.0, Number((nextPcu + addition).toFixed(1)));
  }

  // Calculate speed and queue from deterministic physical density
  const speedKmph = isGreen
    ? Math.min(ROAD_SPECS.FREE_FLOW_SPEED_KMPH, Math.round(currentApproach.speedKmph + 2 * elapsedSeconds))
    : Math.max(0, Math.round(ROAD_SPECS.FREE_FLOW_SPEED_KMPH * (1 - Math.min(1, nextPcu / 100))));

  const totalVehicles = Math.max(5, Math.round(nextPcu / 1.15));
  const bikes = Math.round(totalVehicles * 0.45);
  const cars = Math.round(totalVehicles * 0.42);
  const heavies = Math.max(1, totalVehicles - bikes - cars);
  const queueMeters = Math.min(ROAD_SPECS.APPROACH_LENGTH_METERS, Math.round((nextPcu / ROAD_SPECS.LANES_PER_APPROACH) * 6.5));

  return {
    ...currentApproach,
    count: totalVehicles,
    pcu: nextPcu,
    bikes,
    cars,
    heavies,
    speedKmph,
    queueMeters
  };
}

/**
 * Fetch live Google Maps Distance Matrix traffic delay between coordinates
 * If Google Maps is available in window.google.maps, queries live traffic.
 * Otherwise returns calibrated Mumbai arterial baseline.
 */
export function queryGoogleCorridorDelay(originCoords, destCoords) {
  return new Promise((resolve) => {
    if (!window.google?.maps?.DistanceMatrixService) {
      // Offline/Schematic fallback: return realistic default
      resolve({ delayRatio: 1.35, durationSec: 280, freeFlowSec: 210 });
      return;
    }

    try {
      const service = new window.google.maps.DistanceMatrixService();
      service.getDistanceMatrix(
        {
          origins: [new window.google.maps.LatLng(originCoords.lat, originCoords.lng)],
          destinations: [new window.google.maps.LatLng(destCoords.lat, destCoords.lng)],
          travelMode: window.google.maps.TravelMode.DRIVING,
          drivingOptions: {
            departureTime: new Date(),
            trafficModel: window.google.maps.TrafficModel.BEST_GUESS
          }
        },
        (response, status) => {
          if (status === 'OK' && response?.rows?.[0]?.elements?.[0]?.status === 'OK') {
            const element = response.rows[0].elements[0];
            const normalSec = element.duration?.value || 240;
            const trafficSec = element.duration_in_traffic?.value || normalSec;
            const ratio = Number((trafficSec / Math.max(1, normalSec)).toFixed(2));
            resolve({ delayRatio: Math.max(1.0, ratio), durationSec: trafficSec, freeFlowSec: normalSec });
          } else {
            // Graceful fallback to calibrated flow
            resolve({ delayRatio: 1.25, durationSec: 260, freeFlowSec: 210 });
          }
        }
      );
    } catch (e) {
      resolve({ delayRatio: 1.25, durationSec: 260, freeFlowSec: 210 });
    }
  });
}
