/**
 * PredictiveDemandFusion.js
 *
 * Phase 2A: Predictive Demand Fusion Engine
 *
 * Pure utility module that combines current traffic PCU with multi-horizon
 * forecasts (+5min, +10min, +15min) into a single effectivePredictivePCU.
 *
 * This module is calculation-only:
 *   - No React dependencies
 *   - No SimulationContext access
 *   - No API requests
 *   - No signal state mutation
 *
 * The effectivePredictivePCU will later be consumed by a Predictive Adaptive
 * signal strategy (Phase 2B+). This module does NOT implement that strategy.
 *
 * DOES NOT modify:
 *   - Fixed mode
 *   - Adaptive mode
 *   - Signal lifecycle, green duration, yellow, all-red
 *   - Starvation, MAX_RED_WAIT, MAX_CONTINUOUS_GREEN
 *   - Emergency preemption
 *   - Vehicle physics
 */

// ============================================================
// FUSION WEIGHTS
// ============================================================
// Weights for blending current demand with forecast horizons.
// These MUST sum to 1.0.
//
//   0.55 + 0.25 + 0.15 + 0.05 = 1.00
// ============================================================

export const CURRENT_WEIGHT     = 0.55;
export const FORECAST_5_WEIGHT  = 0.25;
export const FORECAST_10_WEIGHT = 0.15;
export const FORECAST_15_WEIGHT = 0.05;

// ============================================================
// SAFETY PARAMETERS
// ============================================================

/**
 * Maximum multiplier for the safety clamp when currentPCU > 0.
 * effectivePredictivePCU will not exceed SAFETY_CLAMP_MULTIPLIER × currentPCU.
 *
 * This prevents extreme prediction spikes (e.g. a forecast of 5× current
 * traffic) from dominating the effective demand value.
 */
export const SAFETY_CLAMP_MULTIPLIER = 1.5;

/**
 * Small epsilon to prevent division by zero in boost percentage calculation.
 */
export const EPSILON = 1e-6;

/**
 * When currentPCU is 0, the multiplicative safety clamp (1.5 × currentPCU)
 * would incorrectly clamp all forecast-derived demand to zero, preventing
 * the system from detecting approaching traffic at an empty intersection.
 *
 * Instead, when currentPCU = 0, we cap effectivePredictivePCU at this
 * absolute maximum. This value represents a reasonable upper bound for
 * predictive PCU at a single approach when no current traffic is present,
 * allowing the system to signal approaching demand without runaway values.
 */
export const ZERO_CURRENT_MAX_PREDICTIVE_PCU = 50;


// ============================================================
// INTERNAL HELPERS
// ============================================================

/**
 * Checks whether a value is a valid, finite, non-NaN number.
 * @param {*} val - Value to check
 * @returns {boolean} true if val is a finite number (not NaN, not Infinity)
 */
function isValidNumber(val) {
  return typeof val === 'number' && Number.isFinite(val);
}

/**
 * Clamps a value to be non-negative (minimum 0).
 * @param {number} val
 * @returns {number}
 */
function clampNonNegative(val) {
  return Math.max(0, val);
}


// ============================================================
// MAIN FUSION FUNCTION
// ============================================================

/**
 * Calculates the effective predictive PCU by fusing current traffic demand
 * with multi-horizon forecasts using weighted averaging.
 *
 * FUSION FORMULA (when all forecasts available):
 *
 *   effectivePredictivePCU =
 *       0.55 × currentPCU
 *     + 0.25 × forecast5
 *     + 0.15 × forecast10
 *     + 0.05 × forecast15
 *
 * FALLBACK BEHAVIOR:
 *   - If ALL forecasts are unavailable → effectivePredictivePCU = currentPCU
 *   - If SOME forecasts are unavailable → renormalize weights across the
 *     remaining available values, preserving their relative proportions.
 *     currentPCU always participates in the calculation.
 *   - Invalid values (null, undefined, NaN, Infinity, negative) are treated
 *     as "unavailable" for forecast inputs, or clamped to 0 for currentPCU.
 *
 * SAFETY CLAMP:
 *   - When currentPCU > 0:
 *       effectivePredictivePCU ≤ SAFETY_CLAMP_MULTIPLIER × currentPCU
 *   - When currentPCU = 0:
 *       effectivePredictivePCU ≤ ZERO_CURRENT_MAX_PREDICTIVE_PCU
 *       (allows detection of approaching traffic)
 *
 * @param {Object} params
 * @param {number}  params.currentPCU  - Current observed PCU at the approach
 * @param {number} [params.forecast5]  - Predicted PCU at +5 minutes
 * @param {number} [params.forecast10] - Predicted PCU at +10 minutes
 * @param {number} [params.forecast15] - Predicted PCU at +15 minutes
 *
 * @returns {{
 *   currentPCU: number,
 *   forecast5: number|null,
 *   forecast10: number|null,
 *   forecast15: number|null,
 *   effectivePredictivePCU: number,
 *   predictiveBoostPCU: number,
 *   predictiveBoostPercent: number
 * }}
 */
export function calculateEffectivePredictivePCU({
  currentPCU,
  forecast5,
  forecast10,
  forecast15,
} = {}) {
  // ----------------------------------------------------------
  // 1. Sanitize currentPCU
  //    currentPCU must always participate. If invalid, treat as 0.
  // ----------------------------------------------------------
  const safeCurrent = isValidNumber(currentPCU)
    ? clampNonNegative(currentPCU)
    : 0;

  // ----------------------------------------------------------
  // 2. Build forecast entries and filter to valid ones
  // ----------------------------------------------------------
  const forecastInputs = [
    { key: 'forecast5',  rawValue: forecast5,  weight: FORECAST_5_WEIGHT  },
    { key: 'forecast10', rawValue: forecast10, weight: FORECAST_10_WEIGHT },
    { key: 'forecast15', rawValue: forecast15, weight: FORECAST_15_WEIGHT },
  ];

  const validForecasts = [];
  const returnedForecasts = { forecast5: null, forecast10: null, forecast15: null };

  for (const entry of forecastInputs) {
    if (isValidNumber(entry.rawValue) && entry.rawValue >= 0) {
      const safeValue = clampNonNegative(entry.rawValue);
      validForecasts.push({ key: entry.key, value: safeValue, weight: entry.weight });
      returnedForecasts[entry.key] = safeValue;
    }
    // else: remains null in returnedForecasts (unavailable)
  }

  // ----------------------------------------------------------
  // 3. Calculate effectivePredictivePCU
  // ----------------------------------------------------------
  let effectivePredictivePCU;

  if (validForecasts.length === 0) {
    // All forecasts unavailable → pure fallback to current demand
    effectivePredictivePCU = safeCurrent;
  } else {
    // Renormalize: total weight = current weight + sum of available forecast weights
    const totalAvailableWeight = CURRENT_WEIGHT
      + validForecasts.reduce((sum, f) => sum + f.weight, 0);

    // Weighted sum with renormalized weights
    effectivePredictivePCU = (CURRENT_WEIGHT / totalAvailableWeight) * safeCurrent;

    for (const forecast of validForecasts) {
      effectivePredictivePCU += (forecast.weight / totalAvailableWeight) * forecast.value;
    }
  }

  // ----------------------------------------------------------
  // 4. Safety clamp
  // ----------------------------------------------------------
  if (safeCurrent > 0) {
    // Prevent extreme prediction spikes from dominating current traffic
    effectivePredictivePCU = Math.min(
      effectivePredictivePCU,
      SAFETY_CLAMP_MULTIPLIER * safeCurrent
    );
  } else {
    // currentPCU = 0: allow forecast-derived demand through,
    // but cap at an absolute maximum to prevent runaway values
    effectivePredictivePCU = Math.min(
      effectivePredictivePCU,
      ZERO_CURRENT_MAX_PREDICTIVE_PCU
    );
  }

  // ----------------------------------------------------------
  // 5. Compute boost metrics
  // ----------------------------------------------------------
  const predictiveBoostPCU = effectivePredictivePCU - safeCurrent;
  const predictiveBoostPercent =
    (predictiveBoostPCU / Math.max(safeCurrent, EPSILON)) * 100;

  // ----------------------------------------------------------
  // 6. Return result — guaranteed no NaN or Infinity
  // ----------------------------------------------------------
  return {
    currentPCU:              safeCurrent,
    forecast5:               returnedForecasts.forecast5,
    forecast10:              returnedForecasts.forecast10,
    forecast15:              returnedForecasts.forecast15,
    effectivePredictivePCU,
    predictiveBoostPCU,
    predictiveBoostPercent,
  };
}
