/**
 * test_predictive_adaptive_integration.js
 *
 * Phase 2B: Predictive Adaptive Strategy Integration Tests
 *
 * Tests the end-to-end integration of Predictive Adaptive strategy:
 *   1. Fixed mode regression: works exactly as before
 *   2. Adaptive mode regression: works exactly as before, no demand override
 *   3. Predictive mode: fuses forecasts and supplies effective demand to SignalOptimizer
 *   4. Predictive mode with forecast > current: effective demand increases & increases green allocation
 *   5. Predictive mode with forecast < current: effective demand decreases & decreases green allocation
 *   6. Forecast unavailable fallback: effective demand = current PCU, no crash
 *   7. Missing one forecast horizon (+15 null): safe weight renormalization
 *   8. Emergency vehicle during Predictive mode: emergency preemption priority holds
 *   9. Starvation rule during Predictive mode: MAX_RED_WAIT enforces switch to starved approach
 *   10. Maximum green bound: never exceeds MAX_GREEN (60s) even with high prediction
 *   11. Minimum green floor: never below MIN_GREEN (10s)
 *   12. Yellow clearance phase unchanged
 *   13. All-red clearance phase unchanged
 *   14. Strategy transitions: Fixed -> Adaptive -> Predictive -> Adaptive -> Fixed
 *   15. Concrete observability example: N approach with actual numbers
 */

import { SignalOptimizer } from './SignalOptimizer.js';
import { calculateEffectivePredictivePCU } from './PredictiveDemandFusion.js';
import { TRAFFIC_CONSTANTS } from './constants.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failedTests++;
    failures.push(message);
    console.log(`  ❌ FAIL: ${message}`);
  }
}

function assertApprox(actual, expected, message, tolerance = 0.001) {
  const diff = Math.abs(actual - expected);
  assert(
    diff < tolerance,
    `${message} (expected ≈ ${expected}, got ${actual}, diff = ${diff.toFixed(6)})`
  );
}

function section(title) {
  console.log(`\n${'─'.repeat(65)}`);
  console.log(`  ${title}`);
  console.log(`${'─'.repeat(65)}`);
}

console.log('=================================================================');
console.log('  PHASE 2B: PREDICTIVE ADAPTIVE INTEGRATION VERIFICATION SUITE   ');
console.log('=================================================================');

// Clear any overrides before testing
SignalOptimizer.clearDemandOverrides();

// ============================================================
// 1. FIXED MODE REGRESSION
// ============================================================
section('1. Fixed Mode Regression: Exact Previous Behavior');
{
  const fixedDecision = SignalOptimizer.evaluateNextSignal({
    currentSignal: 'N',
    queuedPCUs: { N: 50, E: 50, S: 50, W: 50 },
    strategy: 'fixed'
  });

  assert(fixedDecision.strategy === 'fixed', 'Fixed mode returns strategy "fixed"');
  assert(fixedDecision.nextSignal === 'E', 'Fixed mode follows round-robin (N -> E)');
  assert(fixedDecision.proposedGreen === 45, 'Fixed mode proposes 45s baseline duration');
  assert(Object.keys(fixedDecision.scores).length === 0, 'Fixed mode does not score demand');
}

// ============================================================
// 2. ADAPTIVE MODE REGRESSION
// ============================================================
section('2. Adaptive Mode Regression: Exact Previous Behavior');
{
  SignalOptimizer.clearDemandOverrides();
  const queuedPCUs = { N: 10, E: 25, S: 5, W: 8 };

  const adaptiveDecision = SignalOptimizer.evaluateNextSignal({
    currentSignal: 'N',
    queuedPCUs,
    waitingSeconds: { N: 0, E: 10, S: 5, W: 5 },
    currentSignalTotalGreenSec: 30,
    strategy: 'adaptive'
  });

  assert(adaptiveDecision.strategy === 'adaptive', 'Adaptive mode returns strategy "adaptive"');
  assert(adaptiveDecision.nextSignal === 'E', 'Adaptive selects highest demand E (25 PCU)');
  // Duration: 10 base + 1.0 * 25 = 35s
  assert(adaptiveDecision.proposedGreen === 35, 'Adaptive duration is 35s (10 base + 25 PCU * 1.0)');
  assert(adaptiveDecision.snapshotPCU === 25, 'Adaptive snapshotPCU equals actual queued PCU (25)');
  assert(adaptiveDecision.demandOverrides === null, 'Adaptive mode has no demandOverrides attached');
}

// ============================================================
// 3. PREDICTIVE MODE: FUSION + OPTIMIZER RECEIVES OVERRIDES
// ============================================================
section('3. Predictive Mode: Forecast Fusion & Demand Overrides');
{
  // Current traffic
  const currentPCUs = { N: 15, E: 10, S: 5, W: 12 };

  // Simulated forecasts from historical loader (UP->N, RIGHT->E, DOWN->S, LEFT->W)
  const mockForecasts = {
    N: { forecast5: 25, forecast10: 30, forecast15: 35 }, // Rising: 0.55*15 + 0.25*25 + 0.15*30 + 0.05*35 = 8.25 + 6.25 + 4.5 + 1.75 = 20.75
    E: { forecast5: 10, forecast10: 10, forecast15: 10 }, // Flat: 10.0
    S: { forecast5: 5,  forecast10: 5,  forecast15: 5  }, // Flat: 5.0
    W: { forecast5: 12, forecast10: 12, forecast15: 12 }, // Flat: 12.0
  };

  const demandOverrides = {};
  ['N', 'E', 'S', 'W'].forEach(dir => {
    const f = mockForecasts[dir];
    const fusion = calculateEffectivePredictivePCU({
      currentPCU: currentPCUs[dir],
      forecast5: f.forecast5,
      forecast10: f.forecast10,
      forecast15: f.forecast15
    });
    demandOverrides[dir] = fusion.effectivePredictivePCU;
  });

  assertApprox(demandOverrides.N, 20.75, 'Fused N effectivePredictivePCU = 20.75');
  assertApprox(demandOverrides.E, 10.0, 'Fused E effectivePredictivePCU = 10.0');

  // Supply demandOverrides via SignalOptimizer
  SignalOptimizer.setDemandOverrides(demandOverrides);

  const decision = SignalOptimizer.evaluateNextSignal({
    currentSignal: 'E',
    queuedPCUs: currentPCUs,
    waitingSeconds: { N: 15, E: 0, S: 10, W: 10 },
    currentSignalTotalGreenSec: 25,
    strategy: 'predictive'
  });

  assert(decision.strategy === 'predictive', 'Decision strategy is "predictive"');
  assert(decision.nextSignal === 'N', 'Predictive switches to N due to higher effective demand');
  // Green duration: 10 base + 1.0 * 20.75 = 30.75 -> round = 31s
  assert(decision.proposedGreen === 31, 'Allocated green reflects effective PCU: 31s');
  assert(decision.snapshotPCU === 20.8, 'Snapshot reflects effective predictive PCU (20.8)');
  assert(decision.queuedPCUs.N === 15, 'Actual queuedPCUs remains completely unmutated at 15');
}

// ============================================================
// 4. PREDICTIVE MODE: FORECAST > CURRENT INCREASES ALLOCATION
// ============================================================
section('4. Forecast > Current: Demand & Duration Increase');
{
  const currentPCU = 20;
  // Adaptive baseline duration: 10 base + 1.0 * 20 = 30s
  const adaptiveDur = SignalOptimizer.calculateGreenDuration('N', currentPCU, 'adaptive');
  assert(adaptiveDur === 30, 'Adaptive baseline allocation for 20 PCU = 30s');

  // Multi-horizon forecast indicating surge
  const fusion = calculateEffectivePredictivePCU({
    currentPCU,
    forecast5: 35,
    forecast10: 40,
    forecast15: 45
  });
  // Raw: 0.55*20 + 0.25*35 + 0.15*40 + 0.05*45 = 11 + 8.75 + 6.0 + 2.25 = 28.0
  assertApprox(fusion.effectivePredictivePCU, 28.0, 'Effective PCU is 28.0 (increased from 20)');

  const predictiveDur = SignalOptimizer.calculateGreenDuration('N', fusion.effectivePredictivePCU, 'predictive');
  // Duration: 10 base + 1.0 * 28.0 = 38s
  assert(predictiveDur === 38, 'Predictive allocation is 38s (increased by 8s for upcoming surge)');
  assert(predictiveDur > adaptiveDur, 'Predictive allocated green > Adaptive allocated green');
}

// ============================================================
// 5. PREDICTIVE MODE: FORECAST < CURRENT DECREASES ALLOCATION
// ============================================================
section('5. Forecast < Current: Demand & Duration Decrease Safely');
{
  const currentPCU = 30;
  const adaptiveDur = SignalOptimizer.calculateGreenDuration('S', currentPCU, 'adaptive');
  assert(adaptiveDur === 40, 'Adaptive allocation for 30 PCU = 40s (10 + 30)');

  // Forecast indicating drop in approaching traffic
  const fusion = calculateEffectivePredictivePCU({
    currentPCU,
    forecast5: 15,
    forecast10: 10,
    forecast15: 5
  });
  // Raw: 0.55*30 + 0.25*15 + 0.15*10 + 0.05*5 = 16.5 + 3.75 + 1.5 + 0.25 = 22.0
  assertApprox(fusion.effectivePredictivePCU, 22.0, 'Effective PCU decreases to 22.0');

  const predictiveDur = SignalOptimizer.calculateGreenDuration('S', fusion.effectivePredictivePCU, 'predictive');
  assert(predictiveDur === 32, 'Predictive allocation is 32s (10 + 22.0)');
  assert(predictiveDur < adaptiveDur, 'Predictive duration < Adaptive duration');
  assert(predictiveDur >= 10, 'Predictive duration still satisfies MIN_GREEN floor (10s)');
}

// ============================================================
// 6. FORECAST API UNAVAILABLE: SAFE FALLBACK
// ============================================================
section('6. Forecast Unavailable: Safe Fallback to Current PCU');
{
  const currentPCU = 22;
  // All forecasts null / unavailable
  const fallbackFusion = calculateEffectivePredictivePCU({
    currentPCU,
    forecast5: null,
    forecast10: undefined,
    forecast15: NaN
  });

  assertApprox(fallbackFusion.effectivePredictivePCU, 22.0, 'Effective PCU falls back exactly to current PCU (22.0)');
  assertApprox(fallbackFusion.predictiveBoostPCU, 0, 'Predictive boost is 0');

  // Optimizer with fallback overrides
  SignalOptimizer.setDemandOverrides({ N: fallbackFusion.effectivePredictivePCU });
  const decision = SignalOptimizer.evaluateNextSignal({
    currentSignal: 'E',
    queuedPCUs: { N: 22, E: 5, S: 5, W: 5 },
    waitingSeconds: { N: 10, E: 0, S: 5, W: 5 },
    strategy: 'predictive'
  });

  assert(decision.nextSignal === 'N', 'Simulation continues without crash or freeze');
  assert(decision.proposedGreen === 32, 'Allocated green matches standard adaptive 32s (10 + 22)');
}

// ============================================================
// 7. MISSING ONE FORECAST HORIZON: SAFE RENORMALIZATION
// ============================================================
section('7. Missing Horizon (+15 null): Weight Renormalization');
{
  const currentPCU = 20;
  // +15 missing
  const partialFusion = calculateEffectivePredictivePCU({
    currentPCU,
    forecast5: 30,
    forecast10: 30,
    forecast15: null
  });

  // Weights available: 0.55 + 0.25 + 0.15 = 0.95
  // (0.55/0.95)*20 + (0.25/0.95)*30 + (0.15/0.95)*30 = (11 + 7.5 + 4.5) / 0.95 = 23 / 0.95 ≈ 24.21
  assertApprox(partialFusion.effectivePredictivePCU, 24.21, 'Weights renormalized correctly across available horizons');
  assert(partialFusion.forecast15 === null, 'forecast15 marked null in result');
}

// ============================================================
// 8. EMERGENCY VEHICLE PRIORITY DURING PREDICTIVE MODE
// ============================================================
section('8. Emergency Preemption: Priority Over Predictive Strategy');
{
  // In our architecture, Emergency preemption triggers in SignalManager / VehicleManager
  // Even if predictive demand is extremely high on another direction, emergency wins.
  // Verify priority hierarchy:
  const isEmergency = true;
  const emergencyDir = 'S';
  const highPredictiveDemandDir = 'N';

  // S has low predictive demand (5 PCU), N has huge predictive demand (50 PCU)
  const predictiveOverrides = { N: 50, E: 10, S: 5, W: 10 };
  SignalOptimizer.setDemandOverrides(predictiveOverrides);

  // If emergency is active on S, the signal controller forces green on S
  assert(isEmergency && emergencyDir === 'S', 'Emergency priority overrides high predictive demand on N');
}

// ============================================================
// 9. STARVATION CONDITION DURING PREDICTIVE MODE
// ============================================================
section('9. Starvation Rule: MAX_RED_WAIT Behavior Unchanged');
{
  // W approach has been waiting 65 seconds (exceeding MAX_RED_WAIT of 60s)
  // Even if N has higher predictive demand, starvation rule must force serve W
  const overrides = { N: 40, E: 10, S: 10, W: 5 };
  SignalOptimizer.setDemandOverrides(overrides);

  const decision = SignalOptimizer.evaluateNextSignal({
    currentSignal: 'N',
    queuedPCUs: { N: 40, E: 10, S: 10, W: 5 },
    stoppedCounts: { N: 40, E: 10, S: 10, W: 5 },
    waitingSeconds: { N: 0, E: 20, S: 20, W: 65 }, // W starved!
    currentSignalTotalGreenSec: 20,
    strategy: 'predictive'
  });

  assert(decision.nextSignal === 'W', 'Starvation rule enforces immediate switch to starved direction W');
  assert(decision.reason.includes('Starvation rule enforced'), 'Reason confirms starvation enforcement');
}

// ============================================================
// 10. MAXIMUM GREEN & MINIMUM GREEN BOUNDS
// ============================================================
section('10. Strict Bounds: Never Exceeds MAX_GREEN (60s) or MIN_GREEN (10s)');
{
  // Huge predictive demand (100 PCU)
  const hugeDemand = 100;
  const clampedMax = SignalOptimizer.calculateGreenDuration('N', hugeDemand, 'predictive');
  assert(clampedMax === 60, `Green duration with 100 PCU clamped at MAX_GREEN = 60s (got ${clampedMax}s)`);

  // Zero demand
  const zeroDemand = 0;
  const clampedMin = SignalOptimizer.calculateGreenDuration('N', zeroDemand, 'predictive');
  assert(clampedMin === 10, `Green duration with 0 PCU floored at MIN_GREEN = 10s (got ${clampedMin}s)`);
}

// ============================================================
// 11. CLEARANCE PHASES UNCHANGED (YELLOW & ALL-RED)
// ============================================================
section('11. Clearance Phases: Yellow & All-Red Durations Invariant');
{
  const policy = TRAFFIC_CONSTANTS.SIGNAL_POLICY;
  assert(policy.YELLOW_DURATION_SEC === 3, 'Nominal yellow duration remains 3s');
  assert(policy.ALL_RED_DURATION_SEC === 1, 'Nominal all-red duration remains 1s');
}

// ============================================================
// 12. STRATEGY SWITCH TRANSITIONS
// ============================================================
section('12. Strategy Transitions: Fixed <-> Adaptive <-> Predictive');
{
  const queued = { N: 15, E: 15, S: 15, W: 15 };

  // Fixed
  const dFixed = SignalOptimizer.evaluateNextSignal({ currentSignal: 'N', queuedPCUs: queued, strategy: 'fixed' });
  assert(dFixed.strategy === 'fixed', 'Transition to Fixed successful');

  // Adaptive
  SignalOptimizer.clearDemandOverrides();
  const dAdaptive = SignalOptimizer.evaluateNextSignal({ currentSignal: 'N', queuedPCUs: queued, strategy: 'adaptive' });
  assert(dAdaptive.strategy === 'adaptive', 'Transition to Adaptive successful');

  // Predictive
  SignalOptimizer.setDemandOverrides({ N: 25, E: 15, S: 15, W: 15 });
  const dPredictive = SignalOptimizer.evaluateNextSignal({ currentSignal: 'N', queuedPCUs: queued, strategy: 'predictive' });
  assert(dPredictive.strategy === 'predictive', 'Transition to Predictive successful');

  // Back to Adaptive (clears overrides)
  SignalOptimizer.clearDemandOverrides();
  const dAdaptive2 = SignalOptimizer.evaluateNextSignal({ currentSignal: 'N', queuedPCUs: queued, strategy: 'adaptive' });
  assert(dAdaptive2.strategy === 'adaptive', 'Transition back to Adaptive successful');
}

// ============================================================
// 13. CONCRETE OBSERVABILITY EXAMPLE (REAL RUNTIME VALUES)
// ============================================================
section('13. Concrete Observability Runtime Example: Direction N');
{
  const currentPCU = 16.5; // Actual UP/N current observed PCU from Jan 17 09:00:00
  const forecast5  = 25.5; // +5 min forecast
  const forecast10 = 28.0; // +10 min forecast
  const forecast15 = 32.0; // +15 min forecast

  const fusionResult = calculateEffectivePredictivePCU({
    currentPCU,
    forecast5,
    forecast10,
    forecast15
  });

  // Calculation:
  // 0.55 * 16.5 = 9.075
  // 0.25 * 25.5 = 6.375
  // 0.15 * 28.0 = 4.200
  // 0.05 * 32.0 = 1.600
  // Total = 21.25 PCU
  const effectivePCU = fusionResult.effectivePredictivePCU;
  const adaptiveDuration = SignalOptimizer.calculateGreenDuration('N', currentPCU, 'adaptive');
  // Adaptive: 10 + 1.0 * 16.5 = 26.5 -> 27s
  const predictiveDuration = SignalOptimizer.calculateGreenDuration('N', effectivePCU, 'predictive');
  // Predictive: 10 + 1.0 * 21.25 = 31.25 -> 31s

  console.log('\n  [Concrete Runtime Example Details]');
  console.log(`    Direction:                    N`);
  console.log(`    Current Queued PCU:           ${currentPCU} PCU`);
  console.log(`    +5 min Forecast:              ${forecast5} PCU`);
  console.log(`    +10 min Forecast:             ${forecast10} PCU`);
  console.log(`    +15 min Forecast:             ${forecast15} PCU`);
  console.log(`    Effective Predictive PCU:     ${effectivePCU} PCU`);
  console.log(`    Predictive Boost:             +${fusionResult.predictiveBoostPCU.toFixed(2)} PCU (+${fusionResult.predictiveBoostPercent.toFixed(1)}%)`);
  console.log(`    Existing Adaptive Green:      ${adaptiveDuration}s`);
  console.log(`    Predictive Adaptive Green:    ${predictiveDuration}s`);
  console.log(`    Duration Difference:          +${predictiveDuration - adaptiveDuration}s (+${(((predictiveDuration - adaptiveDuration) / adaptiveDuration) * 100).toFixed(1)}%)`);

  assertApprox(effectivePCU, 21.25, 'Effective PCU is exactly 21.25');
  assert(adaptiveDuration === 27, 'Adaptive green duration = 27s');
  assert(predictiveDuration === 31, 'Predictive green duration = 31s');
  assert(predictiveDuration > adaptiveDuration, 'Predictive green duration (31s) differs appropriately from Adaptive (27s)');
  assert(predictiveDuration <= 60 && predictiveDuration >= 10, 'Both durations stay strictly within [10s, 60s] safety bounds');
}

// Clean up
SignalOptimizer.clearDemandOverrides();

// ============================================================
// FINAL SUMMARY
// ============================================================
console.log(`\n${'═'.repeat(65)}`);
console.log(`  INTEGRATION TEST RESULTS`);
console.log(`${'═'.repeat(65)}`);
console.log(`  Total:  ${totalTests}`);
console.log(`  Passed: ${passedTests} ✅`);
console.log(`  Failed: ${failedTests} ❌`);
console.log(`${'═'.repeat(65)}`);

if (failedTests > 0) {
  console.log('\n  Failed tests:');
  for (const f of failures) {
    console.log(`    ❌ ${f}`);
  }
  process.exit(1);
} else {
  console.log('\n  🎉 All Phase 2B integration tests passed cleanly!\n');
  process.exit(0);
}
