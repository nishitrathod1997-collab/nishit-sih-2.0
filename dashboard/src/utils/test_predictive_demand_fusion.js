/**
 * test_predictive_demand_fusion.js
 *
 * Phase 2A: Test suite for PredictiveDemandFusion.js
 *
 * Run from the dashboard directory:
 *   node src/utils/test_predictive_demand_fusion.js
 *
 * Tests cover:
 *   1.  Normal weighted calculation
 *   2.  All forecasts equal current → effective = current
 *   3.  Forecasts lower than current → demand decreases
 *   4.  Missing +15 forecast → safe renormalization
 *   5.  Only +5 available → safe renormalization
 *   6.  All forecasts unavailable → effective = current
 *   7.  Current = 0 with positive forecasts → effective > 0
 *   8.  NaN / null / undefined inputs → no crash
 *   9.  Negative values → safely clamped
 *   10. Extreme prediction spike → safety cap works
 */

import {
  calculateEffectivePredictivePCU,
  CURRENT_WEIGHT,
  FORECAST_5_WEIGHT,
  FORECAST_10_WEIGHT,
  FORECAST_15_WEIGHT,
  SAFETY_CLAMP_MULTIPLIER,
  ZERO_CURRENT_MAX_PREDICTIVE_PCU,
  EPSILON,
} from './PredictiveDemandFusion.js';

// ============================================================
// TEST INFRASTRUCTURE
// ============================================================

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

function assertFinite(val, message) {
  assert(
    typeof val === 'number' && Number.isFinite(val),
    `${message} (value = ${val})`
  );
}

function section(title) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'─'.repeat(60)}`);
}


// ============================================================
// PRE-FLIGHT: WEIGHT VALIDATION
// ============================================================

section('Pre-flight: Weight validation');

const weightSum = CURRENT_WEIGHT + FORECAST_5_WEIGHT + FORECAST_10_WEIGHT + FORECAST_15_WEIGHT;
assertApprox(weightSum, 1.0, `Weights sum to 1.0 (sum = ${weightSum})`);
assert(CURRENT_WEIGHT === 0.55,     `CURRENT_WEIGHT = 0.55`);
assert(FORECAST_5_WEIGHT === 0.25,  `FORECAST_5_WEIGHT = 0.25`);
assert(FORECAST_10_WEIGHT === 0.15, `FORECAST_10_WEIGHT = 0.15`);
assert(FORECAST_15_WEIGHT === 0.05, `FORECAST_15_WEIGHT = 0.05`);


// ============================================================
// TEST 1: Normal weighted calculation
// ============================================================

section('Test 1: Normal weighted calculation');

{
  const result = calculateEffectivePredictivePCU({
    currentPCU: 100,
    forecast5: 130,
    forecast10: 145,
    forecast15: 150,
  });

  // Expected: 0.55*100 + 0.25*130 + 0.15*145 + 0.05*150
  //         = 55 + 32.5 + 21.75 + 7.5 = 116.75
  assertApprox(result.effectivePredictivePCU, 116.75, 'effectivePredictivePCU = 116.75');
  assertApprox(result.currentPCU, 100, 'currentPCU echoed correctly');
  assertApprox(result.forecast5, 130, 'forecast5 echoed correctly');
  assertApprox(result.forecast10, 145, 'forecast10 echoed correctly');
  assertApprox(result.forecast15, 150, 'forecast15 echoed correctly');
  assertApprox(result.predictiveBoostPCU, 16.75, 'predictiveBoostPCU = 16.75');
  assertApprox(result.predictiveBoostPercent, 16.75, 'predictiveBoostPercent ≈ 16.75%');
}


// ============================================================
// TEST 2: All forecasts equal current → effective = current
// ============================================================

section('Test 2: All forecasts equal current');

{
  const result = calculateEffectivePredictivePCU({
    currentPCU: 80,
    forecast5: 80,
    forecast10: 80,
    forecast15: 80,
  });

  assertApprox(result.effectivePredictivePCU, 80, 'effectivePredictivePCU = currentPCU when all equal');
  assertApprox(result.predictiveBoostPCU, 0, 'predictiveBoostPCU = 0');
  assertApprox(result.predictiveBoostPercent, 0, 'predictiveBoostPercent = 0%');
}


// ============================================================
// TEST 3: Forecasts lower than current → demand decreases
// ============================================================

section('Test 3: Forecasts lower than current');

{
  const result = calculateEffectivePredictivePCU({
    currentPCU: 100,
    forecast5: 70,
    forecast10: 50,
    forecast15: 30,
  });

  // Expected: 0.55*100 + 0.25*70 + 0.15*50 + 0.05*30
  //         = 55 + 17.5 + 7.5 + 1.5 = 81.5
  assertApprox(result.effectivePredictivePCU, 81.5, 'effectivePredictivePCU = 81.5 (less than current)');
  assert(result.effectivePredictivePCU < 100, 'Effective demand decreased below current');
  assert(result.predictiveBoostPCU < 0, 'predictiveBoostPCU is negative (demand dropping)');
  assert(result.predictiveBoostPercent < 0, 'predictiveBoostPercent is negative');
}


// ============================================================
// TEST 4: Missing +15 forecast → safe renormalization
// ============================================================

section('Test 4: Missing +15 forecast (renormalization)');

{
  const result = calculateEffectivePredictivePCU({
    currentPCU: 100,
    forecast5: 130,
    forecast10: 145,
    forecast15: null,
  });

  // Available weights: current(0.55) + f5(0.25) + f10(0.15) = 0.95
  // Renormalized: current = 0.55/0.95, f5 = 0.25/0.95, f10 = 0.15/0.95
  // Expected: (0.55/0.95)*100 + (0.25/0.95)*130 + (0.15/0.95)*145
  //         = 57.8947 + 34.2105 + 22.8947 ≈ 115.0
  const expected =
    (CURRENT_WEIGHT / 0.95) * 100
    + (FORECAST_5_WEIGHT / 0.95) * 130
    + (FORECAST_10_WEIGHT / 0.95) * 145;
  assertApprox(result.effectivePredictivePCU, expected, `effectivePredictivePCU ≈ ${expected.toFixed(2)} (renormalized)`);
  assert(result.forecast15 === null, 'forecast15 returned as null (unavailable)');
  assertFinite(result.effectivePredictivePCU, 'Result is finite');
}


// ============================================================
// TEST 5: Only +5 available → safe renormalization
// ============================================================

section('Test 5: Only +5 forecast available');

{
  const result = calculateEffectivePredictivePCU({
    currentPCU: 100,
    forecast5: 130,
    forecast10: undefined,
    forecast15: undefined,
  });

  // Available weights: current(0.55) + f5(0.25) = 0.80
  // Renormalized: current = 0.55/0.80, f5 = 0.25/0.80
  // Expected: (0.55/0.80)*100 + (0.25/0.80)*130
  //         = 68.75 + 40.625 = 109.375
  const expected =
    (CURRENT_WEIGHT / 0.80) * 100
    + (FORECAST_5_WEIGHT / 0.80) * 130;
  assertApprox(result.effectivePredictivePCU, expected, `effectivePredictivePCU ≈ ${expected.toFixed(3)} (only +5 available)`);
  assert(result.forecast5 === 130, 'forecast5 present');
  assert(result.forecast10 === null, 'forecast10 returned as null');
  assert(result.forecast15 === null, 'forecast15 returned as null');
  assertFinite(result.effectivePredictivePCU, 'Result is finite');
}


// ============================================================
// TEST 6: All forecasts unavailable → effective = current
// ============================================================

section('Test 6: All forecasts unavailable');

{
  const result = calculateEffectivePredictivePCU({
    currentPCU: 100,
    forecast5: null,
    forecast10: undefined,
    forecast15: NaN,
  });

  assertApprox(result.effectivePredictivePCU, 100, 'effectivePredictivePCU = currentPCU when all unavailable');
  assertApprox(result.predictiveBoostPCU, 0, 'predictiveBoostPCU = 0');
  assert(result.forecast5 === null, 'forecast5 null');
  assert(result.forecast10 === null, 'forecast10 null');
  assert(result.forecast15 === null, 'forecast15 null');
}


// ============================================================
// TEST 7: Current = 0 with positive forecasts → effective > 0
// ============================================================

section('Test 7: Current = 0, positive future forecast');

{
  const result = calculateEffectivePredictivePCU({
    currentPCU: 0,
    forecast5: 50,
    forecast10: 60,
    forecast15: 70,
  });

  // Expected raw: 0.55*0 + 0.25*50 + 0.15*60 + 0.05*70
  //             = 0 + 12.5 + 9 + 3.5 = 25.0
  // Safety: currentPCU = 0, cap at ZERO_CURRENT_MAX_PREDICTIVE_PCU = 50
  // 25 < 50, no clamp
  assertApprox(result.effectivePredictivePCU, 25.0, 'effectivePredictivePCU = 25.0');
  assert(result.effectivePredictivePCU > 0, 'Effective demand > 0 despite current = 0');
  assertFinite(result.effectivePredictivePCU, 'Result is finite');
  assert(result.predictiveBoostPCU > 0, 'Positive boost from approaching traffic');
}


// ============================================================
// TEST 7b: Current = 0, very large forecasts → capped at max
// ============================================================

section('Test 7b: Current = 0, large forecasts → absolute cap');

{
  const result = calculateEffectivePredictivePCU({
    currentPCU: 0,
    forecast5: 500,
    forecast10: 600,
    forecast15: 700,
  });

  // Raw: 0.55*0 + 0.25*500 + 0.15*600 + 0.05*700 = 0 + 125 + 90 + 35 = 250
  // But capped at ZERO_CURRENT_MAX_PREDICTIVE_PCU = 50
  assertApprox(result.effectivePredictivePCU, ZERO_CURRENT_MAX_PREDICTIVE_PCU,
    `effectivePredictivePCU capped at ${ZERO_CURRENT_MAX_PREDICTIVE_PCU} when current = 0`);
}


// ============================================================
// TEST 8: NaN / null / undefined inputs → no crash
// ============================================================

section('Test 8: NaN / null / undefined inputs');

{
  // All garbage inputs
  const result1 = calculateEffectivePredictivePCU({
    currentPCU: NaN,
    forecast5: null,
    forecast10: undefined,
    forecast15: NaN,
  });
  assertApprox(result1.effectivePredictivePCU, 0, 'All NaN/null/undefined → effective = 0');
  assertFinite(result1.effectivePredictivePCU, 'No NaN in result');
  assertFinite(result1.predictiveBoostPCU, 'No NaN in boost');
  assertFinite(result1.predictiveBoostPercent, 'No NaN in boost percent');

  // currentPCU is valid, forecasts are garbage
  const result2 = calculateEffectivePredictivePCU({
    currentPCU: 50,
    forecast5: Infinity,
    forecast10: -Infinity,
    forecast15: NaN,
  });
  assertApprox(result2.effectivePredictivePCU, 50, 'Valid current, garbage forecasts → effective = current');
  assertFinite(result2.effectivePredictivePCU, 'Result is finite');

  // No arguments at all
  const result3 = calculateEffectivePredictivePCU({});
  assertApprox(result3.effectivePredictivePCU, 0, 'Empty object → effective = 0');
  assertFinite(result3.effectivePredictivePCU, 'Result is finite');

  // Completely undefined
  const result4 = calculateEffectivePredictivePCU();
  assertApprox(result4.effectivePredictivePCU, 0, 'No args → effective = 0');
  assertFinite(result4.effectivePredictivePCU, 'Result is finite');
}


// ============================================================
// TEST 9: Negative values → safely clamped
// ============================================================

section('Test 9: Negative values');

{
  // Negative currentPCU → clamped to 0
  const result1 = calculateEffectivePredictivePCU({
    currentPCU: -50,
    forecast5: 30,
    forecast10: 40,
    forecast15: 50,
  });
  assert(result1.currentPCU === 0, 'Negative currentPCU clamped to 0');
  assert(result1.effectivePredictivePCU >= 0, 'effectivePredictivePCU >= 0');
  assertFinite(result1.effectivePredictivePCU, 'Result is finite');

  // Negative forecast → treated as unavailable
  const result2 = calculateEffectivePredictivePCU({
    currentPCU: 100,
    forecast5: -10,
    forecast10: 120,
    forecast15: 130,
  });
  assert(result2.forecast5 === null, 'Negative forecast5 treated as unavailable');
  assert(result2.forecast10 === 120, 'Positive forecast10 accepted');
  assertFinite(result2.effectivePredictivePCU, 'Result is finite');

  // All negative forecasts
  const result3 = calculateEffectivePredictivePCU({
    currentPCU: 100,
    forecast5: -10,
    forecast10: -20,
    forecast15: -30,
  });
  assertApprox(result3.effectivePredictivePCU, 100, 'All negative forecasts → effective = current');
}


// ============================================================
// TEST 10: Extreme prediction spike → safety cap works
// ============================================================

section('Test 10: Extreme prediction spike');

{
  const result = calculateEffectivePredictivePCU({
    currentPCU: 100,
    forecast5: 500,
    forecast10: 600,
    forecast15: 700,
  });

  // Raw: 0.55*100 + 0.25*500 + 0.15*600 + 0.05*700
  //    = 55 + 125 + 90 + 35 = 305
  // Safety clamp: min(305, 1.5 * 100) = 150
  const expectedClamped = SAFETY_CLAMP_MULTIPLIER * 100;
  assertApprox(result.effectivePredictivePCU, expectedClamped,
    `effectivePredictivePCU clamped to ${expectedClamped} (1.5 × current)`);
  assert(result.effectivePredictivePCU <= SAFETY_CLAMP_MULTIPLIER * 100,
    'Safety clamp enforced');

  // Moderate spike — should NOT be clamped
  const result2 = calculateEffectivePredictivePCU({
    currentPCU: 100,
    forecast5: 120,
    forecast10: 130,
    forecast15: 140,
  });
  // Raw: 0.55*100 + 0.25*120 + 0.15*130 + 0.05*140
  //    = 55 + 30 + 19.5 + 7 = 111.5
  // 111.5 < 150, no clamp
  assertApprox(result2.effectivePredictivePCU, 111.5,
    'Moderate spike: no clamp applied (111.5 < 150)');
}


// ============================================================
// BONUS: Edge cases
// ============================================================

section('Bonus: Additional edge cases');

{
  // Zero everywhere
  const result1 = calculateEffectivePredictivePCU({
    currentPCU: 0,
    forecast5: 0,
    forecast10: 0,
    forecast15: 0,
  });
  assertApprox(result1.effectivePredictivePCU, 0, 'All zeros → effective = 0');
  assertFinite(result1.predictiveBoostPercent, 'Boost percent finite even with zero current');

  // Very small current
  const result2 = calculateEffectivePredictivePCU({
    currentPCU: 0.001,
    forecast5: 0.002,
    forecast10: 0.003,
    forecast15: 0.004,
  });
  assert(result2.effectivePredictivePCU > 0, 'Very small values: result > 0');
  assertFinite(result2.effectivePredictivePCU, 'Very small values: result is finite');

  // Very large values
  const result3 = calculateEffectivePredictivePCU({
    currentPCU: 1e8,
    forecast5: 1e8,
    forecast10: 1e8,
    forecast15: 1e8,
  });
  assertApprox(result3.effectivePredictivePCU, 1e8, 'Very large equal values');
  assertFinite(result3.effectivePredictivePCU, 'Very large values: result is finite');
}


// ============================================================
// RESULTS SUMMARY
// ============================================================

console.log(`\n${'═'.repeat(60)}`);
console.log(`  TEST RESULTS`);
console.log(`${'═'.repeat(60)}`);
console.log(`  Total:  ${totalTests}`);
console.log(`  Passed: ${passedTests} ✅`);
console.log(`  Failed: ${failedTests} ❌`);
console.log(`${'═'.repeat(60)}`);

if (failedTests > 0) {
  console.log('\n  Failed tests:');
  for (const f of failures) {
    console.log(`    ❌ ${f}`);
  }
  console.log('');
  process.exit(1);
} else {
  console.log('\n  🎉 All tests passed!\n');
  process.exit(0);
}
