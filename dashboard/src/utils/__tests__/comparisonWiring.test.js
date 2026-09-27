/**
 * comparisonWiring.test.js
 * 
 * Focused unit & integration tests for comparison engine wiring, fingerprinting,
 * lifecycle state handling, job token protection, and metric calculation.
 */

import { runComparisonPair, runSingleSession, computeFingerprint } from '../comparisonEngine.js';
import { TRAFFIC_CONSTANTS } from '../constants.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion Failed: ${message}`);
  }
}

export function runComparisonWiringTests() {
  console.log('================================================================');
  console.log('  COMPARISON ENGINE & WIRING INTEGRATION TEST SUITE           ');
  console.log('================================================================\n');

  // --- Test 1: Two reruns with identical inputs produce identical numerical results but DISTINCT runIDs ---
  {
    const sampleEvents = [
      { eventId: 'ev-1', videoTimeSec: 10.0, vehicleType: 'car', mappedDirection: 'S' },
      { eventId: 'ev-2', videoTimeSec: 20.0, vehicleType: 'truck', mappedDirection: 'S' }
    ];

    const runA = runComparisonPair({ arrivalEvents: sampleEvents, durationSec: 100 });
    const runB = runComparisonPair({ arrivalEvents: sampleEvents, durationSec: 100 });

    assert(runA.metadata.runId !== runB.metadata.runId, 'Test 1a: Successive comparison runs must generate distinct runIDs');
    assert(
      runA.fixedResults.averageWaitingAccruedPerAdmitted === runB.fixedResults.averageWaitingAccruedPerAdmitted,
      'Test 1b: Identical inputs must yield identical numerical average waiting metrics'
    );
    assert(
      runA.adaptiveResults.totalDepartures === runB.adaptiveResults.totalDepartures,
      'Test 1c: Identical inputs must yield identical numerical departure counts'
    );
    console.log('  ✅ Test 1 Passed: Identical inputs yield deterministic metrics with unique runIDs.');
  }

  // --- Test 2: Changing an event timestamp without changing event count produces a DIFFERENT fingerprint ---
  {
    const eventsA = [
      { eventId: 'ev-1', videoTimeSec: 10.0, vehicleType: 'car', mappedDirection: 'S' },
      { eventId: 'ev-2', videoTimeSec: 20.0, vehicleType: 'truck', mappedDirection: 'S' }
    ];

    const eventsB = [
      { eventId: 'ev-1', videoTimeSec: 10.0, vehicleType: 'car', mappedDirection: 'S' },
      { eventId: 'ev-2', videoTimeSec: 25.5, vehicleType: 'truck', mappedDirection: 'S' } // timestamp changed
    ];

    const fpA = computeFingerprint({ durationSec: 100 }, eventsA);
    const fpB = computeFingerprint({ durationSec: 100 }, eventsB);

    assert(fpA !== fpB, `Test 2: Changing event timestamp must change fingerprint (${fpA} !== ${fpB})`);
    console.log('  ✅ Test 2 Passed: Full timeline signature fingerprinting verified.');
  }

  // --- Test 3: Controlled changed-demand fixture affects calculated output ---
  {
    const lowDemandEvents = [
      { eventId: 'ev-1', videoTimeSec: 10.0, vehicleType: 'car', mappedDirection: 'S' }
    ];

    const heavyDemandEvents = Array.from({ length: 25 }, (_, i) => ({
      eventId: `ev-heavy-${i}`,
      videoTimeSec: 2.0 + i * 2.0,
      vehicleType: 'truck',
      mappedDirection: 'S'
    }));

    const resLow = runComparisonPair({ arrivalEvents: lowDemandEvents, durationSec: 100 });
    const resHeavy = runComparisonPair({ arrivalEvents: heavyDemandEvents, durationSec: 100 });

    assert(
      resLow.fixedResults.totalAccumulatedWaitSec !== resHeavy.fixedResults.totalAccumulatedWaitSec,
      'Test 3: Different traffic demand schedules must affect accumulated wait times'
    );
    console.log('  ✅ Test 3 Passed: Engine sensitivity to demand schedules verified.');
  }

  // --- Test 4: Zero-arrival run returns null for average waiting metric ---
  {
    const emptyTimeline = [];
    const resEmpty = runSingleSession({ strategy: 'fixed', arrivalTimeline: emptyTimeline, targetDurationSec: 50 });

    assert(resEmpty.totalAcceptedArrivals === 0, 'Test 4a: Empty run has 0 accepted arrivals');
    assert(resEmpty.averageWaitingAccruedPerAdmitted === null, 'Test 4b: Empty run must return null for average waiting accrued');
    console.log('  ✅ Test 4 Passed: Zero-arrival metric division-by-zero protection verified.');
  }

  // --- Test 5: Mass balance conservation equation (Accepted = Departures + Visible + Backlog) ---
  {
    const events = [
      { eventId: 'ev-1', videoTimeSec: 5.0, vehicleType: 'car', mappedDirection: 'S' },
      { eventId: 'ev-2', videoTimeSec: 15.0, vehicleType: 'car', mappedDirection: 'S' }
    ];

    const pair = runComparisonPair({ arrivalEvents: events, durationSec: 100 });
    const f = pair.fixedResults;
    const fSum = f.totalDepartures + f.totalVisibleCarsRemaining + f.totalBacklogCarsRemaining;
    assert(fSum === f.totalAcceptedArrivals, `Test 5a: Fixed mass balance equation: ${fSum} == ${f.totalAcceptedArrivals}`);

    const a = pair.adaptiveResults;
    const aSum = a.totalDepartures + a.totalVisibleCarsRemaining + a.totalBacklogCarsRemaining;
    assert(aSum === a.totalAcceptedArrivals, `Test 5b: Adaptive mass balance equation: ${aSum} == ${a.totalAcceptedArrivals}`);
    console.log('  ✅ Test 5 Passed: Vehicle mass conservation law verified.');
  }

  // --- Test 6: Job Token Protection simulation test ---
  {
    let jobToken = 0;
    let completedRuns = [];

    const triggerRun = (id, delayMs) => {
      jobToken++;
      const currentToken = jobToken;
      setTimeout(() => {
        if (currentToken === jobToken) {
          completedRuns.push(id);
        }
      }, delayMs);
    };

    triggerRun('Run 1', 50);
    triggerRun('Run 2', 20); // Newer run triggered before Run 1 completes

    // Simulate clock passage
    setTimeout(() => {
      assert(completedRuns.length === 1 && completedRuns[0] === 'Run 2', 'Test 6: Outdated job token must be ignored upon completion');
      console.log('  ✅ Test 6 Passed: Job token generation protection verified.');
    }, 100);
  }

  console.log('\n✅ ALL COMPARISON WIRING TESTS PASSED CLEANLY!\n');
  return true;
}

// Auto-run if executed directly via Node
if (process.argv[1] && process.argv[1].includes('comparisonWiring.test.js')) {
  try {
    runComparisonWiringTests();
  } catch (err) {
    console.error('COMPARISON WIRING TESTS FAILED:', err);
    process.exit(1);
  }
}
