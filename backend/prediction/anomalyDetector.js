/**
 * Traffic Anomaly Detector & Congestion Risk Evaluator
 * Based on explainable deviations from historical training distributions.
 * NOTE: Never asserts causal assumptions (e.g. accidents, roadblocks).
 */

const ANOMALY_THRESHOLDS = Object.freeze({
  NORMAL_MAX: 0.25,        // < 25%
  MODERATE_MAX: 0.50,      // 25% - 50%
  // > 50% => ABNORMAL TRAFFIC BUILDUP
  EPSILON: 0.1             // Epsilon for numerical stability when expected PCU is near zero
});

const ANOMALY_STATUS = Object.freeze({
  NORMAL: 'NORMAL',
  MODERATE_DEVIATION: 'MODERATE DEVIATION',
  ABNORMAL_BUILDUP: 'ABNORMAL TRAFFIC BUILDUP'
});

const CONGESTION_RISK = Object.freeze({
  LOW: 'LOW',
  MODERATE: 'MODERATE',
  HIGH: 'HIGH'
});

/**
 * Calculates percentile value for a sorted array of numbers.
 * Uses linear interpolation between closest ranks.
 */
function calculatePercentile(sortedValues, percentile) {
  if (!sortedValues || sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];
  if (percentile <= 0) return sortedValues[0];
  if (percentile >= 100) return sortedValues[sortedValues.length - 1];

  const index = (percentile / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (lower === upper) {
    return sortedValues[lower];
  }
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

/**
 * Detects anomaly based on deviation ratio:
 * deviation = abs(observedPCU - expectedHistoricalPCU) / max(expectedHistoricalPCU, epsilon)
 */
function detectAnomaly(observedPCU, expectedHistoricalPCU, config = ANOMALY_THRESHOLDS) {
  if (typeof observedPCU !== 'number' || isNaN(observedPCU) ||
      typeof expectedHistoricalPCU !== 'number' || isNaN(expectedHistoricalPCU)) {
    return {
      status: 'N/A',
      deviationPercent: null,
      expectedPCU: expectedHistoricalPCU ?? null,
      observedPCU: observedPCU ?? null
    };
  }

  const epsilon = config.EPSILON || 0.1;
  const denominator = Math.max(expectedHistoricalPCU, epsilon);
  const deviationRatio = Math.abs(observedPCU - expectedHistoricalPCU) / denominator;
  const deviationPercent = deviationRatio * 100;

  let status = ANOMALY_STATUS.NORMAL;
  if (deviationRatio > config.MODERATE_MAX) {
    status = ANOMALY_STATUS.ABNORMAL_BUILDUP;
  } else if (deviationRatio >= config.NORMAL_MAX) {
    status = ANOMALY_STATUS.MODERATE_DEVIATION;
  }

  return {
    status,
    deviationPercent,
    expectedPCU: expectedHistoricalPCU,
    observedPCU
  };
}

/**
 * Evaluates congestion risk against historical percentiles (50th, 75th)
 */
function evaluateCongestionRisk(predictedPCU, percentiles) {
  if (typeof predictedPCU !== 'number' || isNaN(predictedPCU) || !percentiles) {
    return CONGESTION_RISK.LOW;
  }

  const { p50 = 0, p75 = 0 } = percentiles;

  if (predictedPCU < p50) {
    return CONGESTION_RISK.LOW;
  } else if (predictedPCU <= p75) {
    return CONGESTION_RISK.MODERATE;
  } else {
    return CONGESTION_RISK.HIGH;
  }
}

module.exports = {
  ANOMALY_THRESHOLDS,
  ANOMALY_STATUS,
  CONGESTION_RISK,
  calculatePercentile,
  detectAnomaly,
  evaluateCongestionRisk
};
