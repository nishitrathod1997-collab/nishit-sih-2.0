import { TRAFFIC_CONSTANTS } from './constants.js';

/**
 * Centralized, authoritative calculation for Environmental & Commuter Economic Impact.
 *
 * Direct mathematical formulas:
 * 1. delayReductionPerVehicle = (baselineDelay - currentMeasuredDelay) (if comparable)
 * 2. Fuel, CO2, and Economic metrics currently return 'Unavailable' as there is no 
 *    verified physical microscopic consumption model or sourceable pricing implemented.
 *
 * @param {number} passedCars - Authoritative count of passed vehicles in current session
 * @param {number|null} currentMeasuredDelay - Measured average delay in seconds (e.g. 30.0s)
 * @param {number|null} baselineDelay - Genuinely comparable baseline measured delay. Do not pass manufactured values.
 * @returns {Object} Calculated impact metrics or explicit unavailable state
 */
export function calculateEnvironmentalImpact(
  passedCars = 0,
  currentMeasuredDelay = null,
  baselineDelay = null
) {
  const cars = typeof passedCars === 'number' && !isNaN(passedCars) ? Math.max(0, passedCars) : 0;
  
  const hasComparableBaseline = typeof baselineDelay === 'number' && !isNaN(baselineDelay) && 
                                typeof currentMeasuredDelay === 'number' && !isNaN(currentMeasuredDelay);

  // If a genuine comparison exists, we calculate delay reduction. Otherwise, it is unavailable.
  // We explicitly DO NOT manufacture a baseline.
  let delayReductionPerVehicle = null;
  let totalDelayReduction = null;
  let commuterTimeSaved = null;

  if (hasComparableBaseline) {
    delayReductionPerVehicle = Math.max(0, Number((baselineDelay - currentMeasuredDelay).toFixed(1)));
    totalDelayReduction = Number((cars * delayReductionPerVehicle).toFixed(1));
    commuterTimeSaved = totalDelayReduction;
  }

  let fuelSavedLiters = {
    status: 'unavailable',
    value: null,
    reason: 'Validated fuel-consumption model/data unavailable'
  };

  let co2ReducedKg = {
    status: 'unavailable',
    value: null,
    reason: 'Verified emission factor methodology unavailable'
  };

  let economicSavingsRupees = {
    status: 'unavailable',
    value: null,
    reason: 'Verified economic road-user-cost model and current fuel price unavailable'
  };

  if (hasComparableBaseline && totalDelayReduction !== null && totalDelayReduction > 0) {
    const fuelLiters = totalDelayReduction * TRAFFIC_CONSTANTS.FUEL_CONSUMPTION_RATE;
    const co2Kg = fuelLiters * TRAFFIC_CONSTANTS.CO2_FACTOR;
    
    // Convert commuter time saved from seconds to hours
    const commuterTimeHours = commuterTimeSaved / 3600;
    
    const fuelSavingsINR = fuelLiters * TRAFFIC_CONSTANTS.FUEL_COST;
    const commuterTimeSavingsINR = commuterTimeHours * TRAFFIC_CONSTANTS.COMMUTER_TIME_VALUE_PER_HOUR;
    const totalEconomicSavings = fuelSavingsINR + commuterTimeSavingsINR;

    fuelSavedLiters = Number(fuelLiters.toFixed(2));
    co2ReducedKg = Number(co2Kg.toFixed(2));
    economicSavingsRupees = Number(totalEconomicSavings.toFixed(0));
  }

  const unavailableComparison = {
    status: 'unavailable',
    value: null,
    reason: 'Comparable baseline simulation run unavailable'
  };

  return {
    passedCars: cars,
    baselineDelay: hasComparableBaseline ? Number(baselineDelay.toFixed(1)) : unavailableComparison,
    currentDelay: typeof currentMeasuredDelay === 'number' ? Number(currentMeasuredDelay.toFixed(1)) : null,
    
    // Delay comparisons
    delayReductionPerVehicle: hasComparableBaseline ? Number(delayReductionPerVehicle.toFixed(1)) : unavailableComparison,
    totalDelayReduction: hasComparableBaseline ? Number(totalDelayReduction.toFixed(1)) : unavailableComparison,
    
    // Fuel Conserved
    fuelConserved: fuelSavedLiters,
    fuelSavedLiters: fuelSavedLiters,
    rawFuelConserved: fuelSavedLiters,

    // CO2 Avoided
    co2Avoided: co2ReducedKg,
    carbonSavedKg: co2ReducedKg, // backward compatibility
    co2ReducedKg: co2ReducedKg,
    rawCo2Avoided: co2ReducedKg,

    // Economic Impact
    fuelSavings: economicSavingsRupees,
    commuterTimeSaved: hasComparableBaseline ? Number(commuterTimeSaved.toFixed(1)) : unavailableComparison,
    commuterTimeValue: economicSavingsRupees,
    economicValue: economicSavingsRupees,
    costSavedINR: economicSavingsRupees, // backward compatibility
    economicSavingsRupees: economicSavingsRupees,

    hasData: cars > 0
  };
}

