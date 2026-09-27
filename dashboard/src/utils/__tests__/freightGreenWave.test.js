import { FreightGreenWaveCoordinator } from '../FreightGreenWaveCoordinator.js';
import { LogisticsHubManager } from '../LogisticsHubManager.js';
import { VehicleManager } from '../VehicleManager.js';
import { SignalManager } from '../SignalManager.js';
import { SignalOptimizer } from '../SignalOptimizer.js';
import { runComparisonPair } from '../comparisonEngine.js';
import { TRAFFIC_CONSTANTS } from '../constants.js';

export function runFreightGreenWaveTestSuite() {
  console.log('================================================================');
  console.log('  FREIGHT GREEN WAVE & CORRIDOR COORDINATION SUITE (PHASE 4)    ');
  console.log('================================================================\n');

  function assert(condition, message) {
    if (!condition) {
      console.error(`❌ ASSERTION FAILED: ${message}`);
      throw new Error(`Assertion Failed: ${message}`);
    }
  }

  // ----------------------------------------------------
  // TEST 1: NO FREIGHT VEHICLES
  // ----------------------------------------------------
  console.log('--- TEST 1: Zero Freight / Passenger Only Isolation ---');
  {
    const coordinator = new FreightGreenWaveCoordinator();
    const passengerCar = {
      id: 'pass-car-1',
      type: 'car',
      isCommercial: false,
      position: 10,
      speed: 6.0
    };

    const decision = coordinator.evaluateProgressionRecommendation({
      vehicle: passengerCar,
      approach: 'N',
      signalState: { currentSignal: 'N', phase: 'GREEN', activeGreenDuration: 30, signalTimer: 10 }
    });

    assert(decision.isEligible === false, 'Passenger car must not be eligible for freight wave');
    assert(decision.recommendedAction === 'NO_CHANGE', 'Recommended action must be NO_CHANGE');
    assert(decision.greenAdjustmentSec === 0, 'No green adjustment for passenger vehicle');
    console.log('  ✅ Test 1 Passed: Passenger-only traffic maintains standard adaptive control without intervention.');
  }

  // ----------------------------------------------------
  // TEST 2: FREIGHT OUTSIDE CORRIDOR / INELIGIBLE
  // ----------------------------------------------------
  console.log('--- TEST 2: Freight Inactive or Outside Progression Window ---');
  {
    const coordinator = new FreightGreenWaveCoordinator();
    
    // Vehicle already dwelling inside loading bay
    const dwellingTruck = {
      id: 'freight-docked-99',
      type: 'freight_truck',
      isCommercial: true,
      deliveryStatus: 'AT_HUB',
      curbDwellRemainingSec: 35,
      position: 15,
      speed: 0
    };

    const resDwelling = coordinator.evaluateProgressionRecommendation({
      vehicle: dwellingTruck,
      approach: 'W',
      signalState: { currentSignal: 'W', phase: 'GREEN', activeGreenDuration: 30, signalTimer: 5 }
    });

    assert(resDwelling.isEligible === false, 'Dwelling truck must not be eligible while unloading');
    assert(resDwelling.recommendedAction === 'NO_CHANGE', 'No green wave for parked loading truck');

    // Vehicle that already cleared the stop line past intersection (pos = 65)
    const clearedVan = {
      id: 'van-cleared-12',
      type: 'delivery_van',
      isCommercial: true,
      deliveryStatus: 'EN_ROUTE',
      curbDwellRemainingSec: 0,
      position: 65,
      speed: 5.2
    };

    const resCleared = coordinator.evaluateProgressionRecommendation({
      vehicle: clearedVan,
      approach: 'N',
      signalState: { currentSignal: 'N', phase: 'GREEN', activeGreenDuration: 30, signalTimer: 5 }
    });

    assert(resCleared.isEligible === false, 'Cleared vehicle must not trigger upstream green waves');
    console.log('  ✅ Test 2 Passed: Ineligible / docked / cleared commercial vehicles correctly bypassed.');
  }

  // ----------------------------------------------------
  // TEST 3: ELIGIBLE FREIGHT IDENTIFICATION & ETA CALCULATION
  // ----------------------------------------------------
  console.log('--- TEST 3: Eligible Freight & Deterministic ETA Calculation ---');
  {
    const coordinator = new FreightGreenWaveCoordinator();
    const freightTruck = {
      id: 'freight-van-42',
      type: 'delivery_van',
      isCommercial: true,
      deliveryStatus: 'EN_ROUTE',
      curbDwellRemainingSec: 0,
      cargoTonnage: 1.2,
      position: 5,   // Stop line at 25 -> Distance = 20
      speed: 5.0     // Speed = 5.0 -> ETA = 20 / 5.0 = 4.0s
    };

    const eligibility = coordinator.evaluateEligibility(freightTruck, 'S');
    assert(eligibility.isEligible === true, 'En-route delivery van must be eligible');

    const etaData = coordinator.estimateArrivalTime(freightTruck, 25);
    assert(etaData.distanceRemaining === 20, `Expected distance 20, got ${etaData.distanceRemaining}`);
    assert(etaData.etaSeconds === 4.0, `Expected ETA 4.0s, got ${etaData.etaSeconds}`);

    console.log(`  Freight ETA: ${etaData.etaSeconds}s (distance ${etaData.distanceRemaining}m at ${etaData.effectiveSpeed}m/s)`);
    console.log('  ✅ Test 3 Passed: Eligible freight identified with mathematically exact ETA.');
  }

  // ----------------------------------------------------
  // TEST 4: EXISTING GREEN WINDOW -> NO_CHANGE
  // ----------------------------------------------------
  console.log('--- TEST 4: Arrival Within Existing Green Window ---');
  {
    const coordinator = new FreightGreenWaveCoordinator();
    const freightTruck = {
      id: 'truck-green-win',
      type: 'freight_truck',
      isCommercial: true,
      position: 10,  // Distance = 15, Speed = 3.8 -> ETA = 3.9s
      speed: 3.8
    };

    // Active Green has 20s remaining (Timer = 10, Duration = 30)
    const decision = coordinator.evaluateProgressionRecommendation({
      vehicle: freightTruck,
      approach: 'N',
      signalState: { currentSignal: 'N', phase: 'GREEN', activeGreenDuration: 30, signalTimer: 10 },
      corridorContext: { downstreamSaturation: 0.40 }
    });

    assert(decision.isEligible === true, 'Vehicle must be eligible');
    assert(decision.recommendedAction === 'NO_CHANGE', `Expected NO_CHANGE, got ${decision.recommendedAction}`);
    assert(decision.greenAdjustmentSec === 0, 'No unnecessary green extension when current window suffices');
    assert(decision.reason.includes('will arrive within existing green window'), 'Reason must explain green window sufficiency');

    console.log('  Decision Reason:', decision.reason);
    console.log('  ✅ Test 4 Passed: NO_CHANGE recommended when active green window is already sufficient.');
  }

  // ----------------------------------------------------
  // TEST 5: USEFUL GREEN EXTENSION
  // ----------------------------------------------------
  console.log('--- TEST 5: Proactive Green Window Extension ---');
  {
    const coordinator = new FreightGreenWaveCoordinator();
    const freightTruck = {
      id: 'truck-needs-extension',
      type: 'freight_truck',
      isCommercial: true,
      position: 0,   // Distance = 25, Speed = 3.8 -> ETA = 6.6s
      speed: 3.8
    };

    // Active Green has only 2s remaining (Timer = 28, Duration = 30)
    // Vehicle arrives at t=6.6s (4.6s after green would expire)
    const decision = coordinator.evaluateProgressionRecommendation({
      vehicle: freightTruck,
      approach: 'S',
      signalState: { currentSignal: 'S', phase: 'GREEN', activeGreenDuration: 30, signalTimer: 28 },
      corridorContext: { downstreamSaturation: 0.35 }
    });

    assert(decision.isEligible === true, 'Vehicle must be eligible');
    assert(decision.recommendedAction === 'EXTEND_GREEN', `Expected EXTEND_GREEN, got ${decision.recommendedAction}`);
    assert(decision.greenAdjustmentSec > 0, `Green extension seconds must be > 0, got ${decision.greenAdjustmentSec}`);
    assert(decision.expectedFreightDelayReduction > 0, 'Expected freight delay reduction must be positive');

    console.log(`  Extension Granted: +${decision.greenAdjustmentSec}s. Reason: ${decision.reason}`);
    console.log('  ✅ Test 5 Passed: EXTEND_GREEN recommended safely when downstream conditions allow.');
  }

  // ----------------------------------------------------
  // TEST 6: DOWNSTREAM CONGESTION / BACKPRESSURE SUPPRESSION
  // ----------------------------------------------------
  console.log('--- TEST 6: Downstream Saturation Throttling (Spillback Guardrail) ---');
  {
    const coordinator = new FreightGreenWaveCoordinator();
    const freightTruck = {
      id: 'truck-blocked-downstream',
      type: 'freight_truck',
      isCommercial: true,
      position: 0,
      speed: 3.8
    };

    // Downstream saturation is 88% (>= 80% throttle threshold)
    const decision = coordinator.evaluateProgressionRecommendation({
      vehicle: freightTruck,
      approach: 'S',
      signalState: { currentSignal: 'S', phase: 'GREEN', activeGreenDuration: 30, signalTimer: 28 },
      corridorContext: { downstreamSaturation: 0.88 }
    });

    assert(decision.recommendedAction === 'DEFER', `Expected DEFER due to backpressure, got ${decision.recommendedAction}`);
    assert(decision.guardrailTriggered === 'DOWNSTREAM_BACKPRESSURE', `Guardrail must be DOWNSTREAM_BACKPRESSURE, got ${decision.guardrailTriggered}`);
    assert(decision.greenAdjustmentSec === 0, 'Green extension must be suppressed (0s)');
    assert(decision.reason.includes('Downstream approach saturation (88%) exceeds throttle threshold'), 'Reason must explain spillback throttle');

    console.log('  Throttled Reason:', decision.reason);
    console.log('  ✅ Test 6 Passed: Downstream backpressure properly suppresses green extension to avoid gridlock.');
  }

  // ----------------------------------------------------
  // TEST 7: LOGISTICS HUB DEPARTURE INTEGRATION
  // ----------------------------------------------------
  console.log('--- TEST 7: Logistics Hub Departure Integration ---');
  {
    const lhm = new LogisticsHubManager();
    const coordinator = new FreightGreenWaveCoordinator();

    // Dock and complete dwell
    const van = { id: 'departing-van-7', type: 'delivery_van', isCommercial: true, destinationHubId: 'HUB_DDR_01' };
    lhm.processCommercialArrival(van);

    // Complete dwell
    const tickResult = lhm.tick(45.0);
    assert(tickResult.completedVehicles.length === 1, '1 completed vehicle from hub dwell');

    // Register departure with coordinator
    const corridorPlatoons = coordinator.registerHubDepartures(tickResult.completedVehicles);
    assert(corridorPlatoons.length === 1, 'Coordinator must register departing platoon');
    assert(corridorPlatoons[0].vehicleId === 'departing-van-7', 'Departing vehicle ID must match');
    assert(corridorPlatoons[0].progressionStatus === 'CORRIDOR_PROGRESSION_READY', 'Status must be progression ready');

    console.log('  ✅ Test 7 Passed: Commercial vehicle completing hub dwell seamlessly registers for corridor progression.');
  }

  // ----------------------------------------------------
  // TEST 8: FIXED BASELINE ISOLATION
  // ----------------------------------------------------
  console.log('--- TEST 8: Fixed Baseline Invariance ---');
  {
    const smFixed = new SignalManager('fixed');
    smFixed.setStrategy('fixed');

    // Step 44 seconds in Fixed mode
    for (let i = 0; i < 44; i++) {
      smFixed.updateSignal({ N: 20 }, { N: 20 }, { N: 20 }, {}, 1.0);
    }
    assert(smFixed.phase === 'GREEN' && smFixed.currentSignal === 'N', 'Fixed mode remains green at 44s');

    // At 45s, Fixed mode MUST transition to YELLOW, ignoring any external freight override
    smFixed.updateSignal({ N: 20 }, { N: 20 }, { N: 20 }, {}, 1.0);
    assert(smFixed.phase === 'YELLOW' && smFixed.pendingSignal === 'E', 'Fixed mode strictly transitions at 45s baseline');

    console.log('  ✅ Test 8 Passed: Fixed baseline timing remains 100% invariant.');
  }

  // ----------------------------------------------------
  // TEST 9: DETERMINISM TEST
  // ----------------------------------------------------
  console.log('--- TEST 9: Deterministic Recommendation Output ---');
  {
    const coordinator = new FreightGreenWaveCoordinator();
    const v = { id: 'det-truck', type: 'freight_truck', isCommercial: true, position: 5, speed: 4.0 };
    const sig = { currentSignal: 'N', phase: 'GREEN', activeGreenDuration: 30, signalTimer: 26 };
    const ctx = { downstreamSaturation: 0.30 };

    const run1 = coordinator.evaluateProgressionRecommendation({ vehicle: v, approach: 'N', signalState: sig, corridorContext: ctx });
    const run2 = coordinator.evaluateProgressionRecommendation({ vehicle: v, approach: 'N', signalState: sig, corridorContext: ctx });

    assert(run1.recommendedAction === run2.recommendedAction, 'Decisions must match');
    assert(run1.greenAdjustmentSec === run2.greenAdjustmentSec, 'Adjustments must match');
    assert(run1.reason === run2.reason, 'Explanations must match');

    console.log('  ✅ Test 9 Passed: Identical input scenario produces 100% deterministic decision.');
  }

  console.log('\n================================================================');
  console.log('  ALL PHASE 4 FREIGHT GREEN WAVE TESTS PASSED CLEANLY!         ');
  console.log('================================================================\n');

  return { success: true };
}
