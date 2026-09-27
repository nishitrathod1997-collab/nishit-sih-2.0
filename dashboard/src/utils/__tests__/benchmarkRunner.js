/**
 * benchmarkRunner.js
 * 
 * Node-only CLI wrapper for running benchmark regression tests & persisting
 * Phase 3A benchmark results. Delegates core simulation stepping and metrics
 * calculation to the browser-compatible comparisonEngine.js module.
 */

import { runComparisonPair, runSingleSession, generateSyntheticSchedule } from '../comparisonEngine.js';
import { TRAFFIC_CONSTANTS } from '../constants.js';
import fs from 'fs';
import path from 'path';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ BENCHMARK ASSERTION FAILED: ${message}`);
    throw new Error(`Benchmark Assertion Failed: ${message}`);
  }
}

/**
 * Load Bellevue trial video analysis output & metadata for South (S)
 */
function loadBellevueData() {
  const cachePath1 = path.join(process.cwd(), '..', 'backend', 'cache', 'south_incoming_run.json');
  const cachePath2 = path.join(process.cwd(), 'backend', 'cache', 'south_incoming_run.json');
  const cachePath3 = path.join(process.cwd(), '..', 'backend', 'cache', '5c8d5e5a5839656e3d5d6bbbd5d1d415.json');
  
  const cachePath = fs.existsSync(cachePath1) 
    ? cachePath1 
    : fs.existsSync(cachePath2) 
      ? cachePath2 
      : fs.existsSync(cachePath3)
        ? cachePath3
        : null;

  assert(cachePath !== null, 'Analysis cache file south_incoming_run.json / 5c8d5e5a5839656e3d5d6bbbd5d1d415.json not found');
  const cacheData = JSON.parse(fs.readFileSync(cachePath, 'utf8'));

  const durationSec = cacheData.videoMetadata?.durationSec || 158.63;
  const arrivalEvents = cacheData.arrivalEvents || [];

  return {
    durationSec,
    arrivalEvents,
    videoMetadata: cacheData.videoMetadata || {},
    analysisStats: cacheData.analysisStats || {}
  };
}

export function runPhase3ABenchmark(seed = 42) {
  console.log(`================================================================`);
  console.log(`  PHASE 3A BENCHMARK RUNNER (Seed: ${seed}, Sub-steps: <= 0.05s) `);
  console.log(`================================================================\n`);

  const bellevue = loadBellevueData();
  const actualDurationSec = bellevue.durationSec;
  const arrivalEvents = bellevue.arrivalEvents;

  console.log(`[Input Data] Analysis Duration: ${actualDurationSec}s`);
  console.log(`[Input Data] South Bellevue clip arrivals: ${arrivalEvents.length}`);

  const benchmarkResultPayload = runComparisonPair({
    videoId: 'bellevue_trial',
    arrivalEvents,
    mappedDirection: 'S',
    durationSec: actualDurationSec,
    randomSeed: seed,
    fixedDurations: TRAFFIC_CONSTANTS.SIGNAL_POLICY.FIXED_DURATIONS
  });

  const { fixedResults, adaptiveResults } = benchmarkResultPayload;

  console.log(`\n--- RUNNING PHASE 3A BENCHMARK REGRESSION TESTS ---`);

  // Test 1: Offered and Accepted equality
  assert(fixedResults.totalAcceptedArrivals === fixedResults.totalOfferedArrivals, 'Fixed accepted arrivals must equal offered arrivals');
  assert(adaptiveResults.totalAcceptedArrivals === adaptiveResults.totalOfferedArrivals, 'Adaptive accepted arrivals must equal offered arrivals');
  console.log(`  ✅ Assertion 1 Passed: 100% arrival acceptance verified.`);

  // Test 2: Mass balance verification
  const fixedBalance = fixedResults.totalDepartures + fixedResults.totalVisibleCarsRemaining + fixedResults.totalBacklogCarsRemaining;
  assert(fixedBalance === fixedResults.totalAcceptedArrivals, `Fixed mass balance broken: ${fixedBalance} != ${fixedResults.totalAcceptedArrivals}`);
  const adaptiveBalance = adaptiveResults.totalDepartures + adaptiveResults.totalVisibleCarsRemaining + adaptiveResults.totalBacklogCarsRemaining;
  assert(adaptiveBalance === adaptiveResults.totalAcceptedArrivals, `Adaptive mass balance broken: ${adaptiveBalance} != ${adaptiveResults.totalAcceptedArrivals}`);
  console.log(`  ✅ Assertion 2 Passed: Vehicle mass conservation law verified.`);

  // Test 3: Replay arrival dispatch count
  assert(fixedResults.processedEventIdsCount === fixedResults.totalOfferedArrivals, 'Fixed event cursor count mismatch');
  assert(adaptiveResults.processedEventIdsCount === adaptiveResults.totalOfferedArrivals, 'Adaptive event cursor count mismatch');
  console.log(`  ✅ Assertion 3 Passed: Replay event cursor processed exact arrivals timeline.`);

  // Test 4: honest waiting metric presence
  assert(typeof fixedResults.averageWaitingAccruedPerAdmitted === 'number', 'Fixed average waiting per admitted vehicle must be a valid number');
  assert(typeof adaptiveResults.averageWaitingAccruedPerAdmitted === 'number', 'Adaptive average waiting per admitted vehicle must be a valid number');
  console.log(`  ✅ Assertion 4 Passed: Average waiting accrued per admitted vehicle metric verified.`);

  console.log(`\n✅ ALL BENCHMARK REGRESSION TESTS PASSED CLEANLY!\n`);

  // Write output JSON for dashboard artifact usage
  const outPathBackend = path.join(process.cwd(), '..', 'backend', 'cache', 'phase3a_benchmark_result_v2.json');
  const outPathDashboard = path.join(process.cwd(), 'src', 'utils', '__tests__', 'phase3a_benchmark_result_v2.json');

  try {
    fs.writeFileSync(outPathDashboard, JSON.stringify(benchmarkResultPayload, null, 2));
    if (fs.existsSync(path.dirname(outPathBackend))) {
      fs.writeFileSync(outPathBackend, JSON.stringify(benchmarkResultPayload, null, 2));
    }
  } catch (e) {
    console.warn('Could not write output cache file:', e.message);
  }

  return benchmarkResultPayload;
}

// Auto-run if executed directly via Node
if (process.argv[1] && process.argv[1].includes('benchmarkRunner.js')) {
  try {
    const res = runPhase3ABenchmark(42);
    console.log('SUMMARY METRICS (Fixed vs Adaptive):');
    console.log(JSON.stringify(res.comparisonTable, null, 2));
  } catch (err) {
    console.error('BENCHMARK RUNNER FAILED:', err);
    process.exit(1);
  }
}
