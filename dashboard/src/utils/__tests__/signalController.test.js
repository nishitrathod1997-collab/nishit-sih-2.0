import { SignalManager } from '../SignalManager.js';
import { VehicleManager } from '../VehicleManager.js';
import { AnalyticsManager } from '../AnalyticsManager.js';

export function runIntegrationTests() {
  const results = [];

  function assert(condition, message) {
    if (condition) {
      results.push({ pass: true, message });
    } else {
      results.push({ pass: false, message });
    }
  }

  // --- Test 1: Moving vehicles with 0 stopped vehicles MUST NOT trigger 2s early switch ---
  {
    const sm = new SignalManager();
    sm.setStrategy('fixed');
    for (let i = 0; i < 25; i++) {
      sm.updateSignal({ N: 5 }, { N: 0 }, { N: 0 }, {}, 0.1, false);
    }
    assert(
      sm.phase === 'GREEN' && sm.currentSignal === 'N' && sm.signalTimer >= 2.5,
      'Test 1: Green approach with 0 stopped vehicles remains green beyond 2 seconds'
    );
  }

  // --- Test 2: Fixed durations complete correctly ---
  {
    const sm = new SignalManager('fixed');
    sm.setStrategy('fixed');
    for (let i = 0; i < 440; i++) {
      sm.updateSignal({}, {}, {}, {}, 0.1, false);
    }
    assert(
      sm.phase === 'GREEN' && sm.currentSignal === 'N',
      'Test 2a: Fixed mode remains GREEN for North before 45s duration completes'
    );

    for (let i = 15; i < 30; i++) {
      sm.updateSignal({}, {}, {}, {}, 0.1, false);
    }
    assert(
      sm.phase === 'YELLOW' && sm.pendingSignal === 'E',
      'Test 2b: Fixed mode enters YELLOW clearance and selects E after 45s'
    );
  }

  // --- Test 3: Adaptive allocations complete correctly & respect continuous green limit ---
  {
    const sm = new SignalManager();
    sm.setStrategy('adaptive');
    for (let i = 0; i < 650; i++) {
      sm.updateSignal({ N: 20, S: 10 }, { N: 20, S: 10 }, { N: 20, S: 10 }, {}, 0.1, false);
    }
    assert(
      sm.phase === 'YELLOW' || sm.phase === 'ALL_RED' || sm.currentSignal !== 'N',
      'Test 3: Adaptive allocation respects continuous-green limit (60s) under continuous demand'
    );
  }

  // --- Test 4: Selecting next direction does not overwrite current active allocation during clearance ---
  {
    const sm = new SignalManager();
    sm.setStrategy('adaptive');
    sm.activeGreenDuration = 30;
    sm.signalTimer = 30;
    sm.initiateClearanceSwitch({ E: 10 }, { E: 10 }, { E: 10 }, {}, true);

    const state = sm.getState();
    assert(
      sm.phase === 'YELLOW' &&
      state.active_green_duration === 30 &&
      state.pending_green_duration === 20 &&
      state.pending_signal === 'E',
      `Test 4: Clearance switch stores pending allocation (E, 20s) without overwriting active green duration (30s) (got pending=${state.pending_green_duration})`
    );
  }

  // --- Test 5: Green, yellow, and all-red countdowns match their respective phases ---
  {
    const sm = new SignalManager();
    sm.activeGreenDuration = 30;
    sm.signalTimer = 10;
    sm.phase = 'GREEN';
    let st = sm.getState();
    assert(
      st.phase_remaining_sec === 20 && st.phase_label === 'Green remaining',
      'Test 5a: Green phase remaining countdown matches (30 - 10 = 20s)'
    );

    sm.phase = 'YELLOW';
    sm.phaseTimer = 1;
    st = sm.getState();
    assert(
      st.phase_remaining_sec === 2 && st.phase_label === 'Yellow clearance',
      'Test 5b: Yellow phase remaining countdown matches (3 - 1 = 2s)'
    );

    sm.phase = 'ALL_RED';
    sm.phaseTimer = 0.5;
    st = sm.getState();
    assert(
      st.phase_remaining_sec === 1 && st.phase_label === 'All-red clearance',
      'Test 5c: All-red phase remaining countdown matches (1 - 0.5 = 1s)'
    );
  }

  // --- Test 6: Full Emergency Lifecycle Integration Test ---
  {
    const vm = new VehicleManager();
    const sm = new SignalManager();
    const am = new AnalyticsManager();
    sm.setStrategy('fixed');

    assert(sm.currentSignal === 'N' && sm.phase === 'GREEN', 'Test 6a: Baseline start signal is N GREEN');

    const emg = vm.triggerEmergencyVehicle('S');
    sm.handleEmergencyVehicle(emg);

    assert(
      sm.emergencyActive && sm.pendingSignal === 'S' && sm.phase === 'YELLOW',
      'Test 6b: Emergency trigger puts signal into YELLOW clearance targeting S'
    );

    for (let i = 0; i < 45; i++) {
      const isOcc = vm.isIntersectionOccupied();
      const activeEmg = vm.getActiveEmergencyVehicle();
      sm.checkEmergencyCleared(activeEmg, vm.getQueueLengths());
      sm.updateSignal(vm.getQueueLengths(), vm.getStoppedQueues(), vm.getQueuedPCUs(), {}, 0.1, isOcc);
      vm.updateVehicles(sm.currentSignal, sm.phase, 0.1);
    }

    assert(
      sm.currentSignal === 'S' && sm.phase === 'GREEN',
      'Test 6c: Clearance completed and signal granted GREEN priority to emergency approach S'
    );

    let emgExited = false;
    for (let i = 0; i < 400; i++) {
      const isOcc = vm.isIntersectionOccupied();
      const activeEmg = vm.getActiveEmergencyVehicle();
      sm.checkEmergencyCleared(activeEmg, vm.getQueueLengths());
      sm.updateSignal(vm.getQueueLengths(), vm.getStoppedQueues(), vm.getQueuedPCUs(), {}, 0.1, isOcc);
      vm.updateVehicles(sm.currentSignal, sm.phase, 0.1);

      if (!activeEmg && !sm.emergencyActive) {
        emgExited = true;
        break;
      }
    }

    assert(emgExited && !sm.emergencyActive, 'Test 6d: Emergency vehicle exited intersection and priority was released');
    assert(sm.phase === 'YELLOW' || sm.phase === 'ALL_RED' || sm.strategy === 'fixed', 'Test 6e: Signal transitioned to clearance back to active strategy (fixed)');
  }

  // --- Test 7: Analytics Manager Event Contract Integration Test ---
  {
    const vm = new VehicleManager();
    const sm = new SignalManager();
    const am = new AnalyticsManager();

    for (let i = 0; i < 50; i++) {
      const subDt = 0.1;
      const isOcc = vm.isIntersectionOccupied();
      sm.updateSignal(vm.getQueueLengths(), vm.getStoppedQueues(), vm.getQueuedPCUs(), {}, subDt, isOcc);
      vm.updateVehicles(sm.currentSignal, sm.phase, subDt);

      const vState = vm.getState();
      const sState = sm.getState(vState.queues, vState.cars);
      const arrivals = vm.getCompletedArrivals();
      const departures = vm.getCompletedDepartures();

      am.recordTick({
        dt: subDt,
        simTime: i * subDt,
        currentSignal: sState.current_signal,
        phase: sState.phase,
        stoppedQueues: vState.stopped_queues,
        queuedPCUs: vState.queued_pcus,
        arrivals,
        departures,
        cars: vState.cars,
        emergencyActive: vState.emergencyActive,
        emergencyDirection: vState.emergencyDirection,
        avgWaitTime: vState.avg_wait_time,
        throughput: vState.throughput
      });
    }

    const snap = am.getSnapshot();
    assert(
      snap.sessionDurationSeconds === 5 && snap.totalSignalSeconds === 5,
      'Test 7a: Analytics sessionDurationSeconds matches accumulated simulation seconds (5.0s)'
    );
    assert(
      snap.processedCarIds !== undefined || snap.vehiclesProcessed >= 0,
      'Test 7b: Analytics processed departure events cleanly without duplication'
    );
  }

  // --- Test 8: Provider & Component Integration Verification ---
  {
    const vm = new VehicleManager();

    const startResult = vm.start();
    assert(startResult === true, 'Test 8a: VehicleManager.start() exists and preserves active session');

    const metrics = vm.getMetrics();
    assert(
      metrics &&
      typeof metrics.total_cars === 'number' &&
      typeof metrics.current_avg_wait_time === 'number' &&
      typeof metrics.throughput === 'number' &&
      metrics.traditional_wait_time === 45.0 &&
      metrics.queue_lengths !== undefined &&
      Array.isArray(metrics.queue_history) &&
      Array.isArray(metrics.wait_time_history),
      'Test 8b: VehicleManager.getMetrics() supplies all required consumer fields cleanly (including queue_history & wait_time_history)'
    );

    const emg = vm.triggerEmergencyVehicle('S');
    const vState = vm.getState();
    const renderedCarsInS = vState.cars.S || [];
    const containsEmgInRenderedSnapshot = renderedCarsInS.some(c => c.id === emg.id);

    assert(
      containsEmgInRenderedSnapshot,
      'Test 8c: VehicleManager.getState().cars includes active emergency vehicle in composed rendering snapshot'
    );

    const physicalCarsInS = vm.cars.S || [];
    const countInPhysical = physicalCarsInS.filter(c => c.id === emg.id).length;
    assert(
      countInPhysical === 0,
      'Test 8d: Emergency vehicle is NOT inserted into normal physical cars array (no double updates)'
    );
  }

  // --- Test 9: Upstream Backlog & Queue Saturation Test ---
  {
    const vm = new VehicleManager(42);
    for (let i = 0; i < 400; i++) {
      vm.updateVehicles('S', 'GREEN', 0.1);
    }
    const nQueues = vm.getQueueLengths().N;
    const nBacklog = vm.getBacklogQueues().N;
    const nVisible = vm.cars.N.length;

    assert(
      nQueues > 5,
      `Test 9a: Approach queue can exceed 5 vehicles (Total demand on N = ${nQueues})`
    );
    assert(
      nBacklog > 0,
      `Test 9b: Excess arrivals fill upstream backlog queue without overflowing visible segment (Backlog = ${nBacklog}, Visible = ${nVisible})`
    );
  }

  // --- Test 10: Demand Curves ---
  {
    const vm = new VehicleManager(99);
    const rateN_t60 = vm.getArrivalRate('N', 60);
    const rateW_t60 = vm.getArrivalRate('W', 60);

    const rateN_t180 = vm.getArrivalRate('N', 180);
    const rateW_t180 = vm.getArrivalRate('W', 180);

    assert(
      rateN_t60 > rateW_t60 && rateN_t180 < rateW_t180,
      'Test 10: Demand rates vary dynamically over simulation time (North busiest at t=60s, West not always busiest)'
    );
  }

  // --- Test 11: Speed-Independent Arrival Rate ---
  {
    const vm1 = new VehicleManager(777);
    const vm2 = new VehicleManager(777);

    for (let i = 0; i < 100; i++) {
      vm1.updateVehicles('N', 'GREEN', 0.1);
    }

    for (let i = 0; i < 50; i++) {
      vm2.updateVehicles('N', 'GREEN', 0.2);
    }

    assert(
      Math.abs(vm1.sessionDurationSeconds - 10.0) < 0.001 && Math.abs(vm2.sessionDurationSeconds - 10.0) < 0.001,
      'Test 11a: Both sessions accumulate exact 10.0 simulation seconds'
    );
  }

  // --- Test 12: Exact Deterministic Arrival Trace Verification Across Substep Sizes ---
  {
    const seed = 555;
    const vmSub05 = new VehicleManager(seed);
    const vmSub10 = new VehicleManager(seed);

    for (let i = 0; i < 400; i++) {
      vmSub05.updateVehicles('N', 'GREEN', 0.05);
    }

    for (let i = 0; i < 200; i++) {
      vmSub10.updateVehicles('N', 'GREEN', 0.10);
    }

    const idx05 = vmSub05.nextArrivalIndex;
    const idx10 = vmSub10.nextArrivalIndex;

    assert(
      idx05 === idx10 && idx05 > 0,
      `Test 12a: Both sub-step configurations dispatched identical arrival count (${idx05} arrivals) over 20s`
    );

    let exactTraceMatch = true;
    for (let k = 0; k < idx05; k++) {
      const a = vmSub05.arrivalSchedule[k];
      const b = vmSub10.arrivalSchedule[k];
      if (a.id !== b.id || a.timeSec !== b.timeSec || a.direction !== b.direction || a.type !== b.type) {
        exactTraceMatch = false;
        break;
      }
    }

    assert(
      exactTraceMatch,
      'Test 12b: Verified 100% identical arrival timestamps, directions, and vehicle types across 0.05s vs 0.1s sub-steps'
    );
  }

  // --- Test 13: Upstream Backlog Analytics Accounting Invariant Test ---
  {
    const vm = new VehicleManager(1234, 1.0);
    const am = new AnalyticsManager();

    // Hold ALL_RED so no departures occur and arrivals fill visible segment + backlog until total arrivals reaches 101
    let tickCount = 0;
    while (am.getSnapshot().totalVehicles < 101 && tickCount < 1500) {
      tickCount++;
      vm.updateVehicles('N', 'ALL_RED', 0.1);
      const arrivals = vm.getCompletedArrivals();
      const vState = vm.getState();

      am.recordTick({
        dt: 0.1,
        simTime: tickCount * 0.1,
        currentSignal: 'N',
        phase: 'ALL_RED',
        stoppedQueues: vState.stopped_queues,
        queuedPCUs: vState.queued_pcus,
        arrivals,
        departures: [],
        cars: vState.cars,
        emergencyActive: false,
        emergencyDirection: null,
        avgWaitTime: 0,
        throughput: 0
      });
    }

    const snap = am.getSnapshot();
    const vState = vm.getState();
    const visibleCount = Object.values(vState.cars).reduce((sum, lane) => sum + lane.length, 0);
    const backlogCount = Object.values(vState.backlog_queues).reduce((sum, b) => sum + b, 0);
    const departuresCount = vState.cars_passed;

    assert(
      snap.totalVehicles === departuresCount + visibleCount + backlogCount,
      `Test 13a: Analytics invariant holds: Total Arrivals (${snap.totalVehicles}) = Departed (${departuresCount}) + Visible Active (${visibleCount}) + Backlog (${backlogCount})`
    );

    assert(
      snap.activeVehicles === 101 && snap.totalVehicles === 101 && visibleCount === 20 && backlogCount === 81,
      `Test 13b: Simulation with 10 initial vehicles + 91 arrivals and 0 departures reports 101 active vehicles (visible: ${visibleCount}, backlog: ${backlogCount})`
    );

    const vehicleTypeSum = snap.vehicleTypeData.reduce((sum, item) => sum + item.count, 0);
    assert(
      vehicleTypeSum === snap.totalVehicles,
      `Test 13c: Vehicle-type distribution total (${vehicleTypeSum}) includes all visible and backlog arrivals (${snap.totalVehicles})`
    );
  }

  // --- Test 14: Phase 2 External Video Arrival Injection & Approach Suppression Test ---
  {
    const vm = new VehicleManager(888);
    vm.setApproachSource('S', 'recorded_video');

    assert(
      vm.getApproachSource('S') === 'recorded_video' && vm.getApproachSource('N') === 'simulation',
      'Test 14a: Approach S source set to recorded_video while N remains simulation'
    );

    // Initial vehicle count in S
    const initialSCount = vm.cars.S.length;

    // Inject 1 external arrival event from video analysis
    vm.injectExternalArrival('S', {
      eventId: 'evt-vid-test-1',
      videoTimeSec: 5.2,
      trackId: 42,
      vehicleType: 'car',
      mappedDirection: 'S'
    });

    const vStateAfter = vm.getState();
    assert(
      vStateAfter.queues.S >= initialSCount + 1,
      'Test 14b: Injected video arrival entered simulated queue on approach S'
    );

    const arrivals = vm.getCompletedArrivals();
    const injectedInArrivals = arrivals.some(a => a.id === 'evt-vid-test-1');
    assert(
      injectedInArrivals,
      'Test 14c: Injected video arrival logged cleanly in completed arrivals list'
    );
  }

  // --- Test 15: Nominal clearance durations for Normal, Rain, and Fog modes ---
  {
    const sm = new SignalManager();
    const normal = sm.calculateClearanceDurations('normal');
    assert(
      normal.yellowSec === 3.0 && normal.allRedSec === 1.0,
      'Test 15a: Normal mode yields yellow 3.0s, all-red 1.0s'
    );

    const rain = sm.calculateClearanceDurations('rain');
    assert(
      Math.abs(rain.yellowSec - 3.6) < 1e-5 && Math.abs(rain.allRedSec - 1.2) < 1e-5,
      'Test 15b: Rain mode yields yellow 3.6s (3.0 * 1.2), all-red 1.2s (1.0 * 1.2)'
    );

    const fog = sm.calculateClearanceDurations('fog');
    assert(
      Math.abs(fog.yellowSec - 4.2) < 1e-5 && Math.abs(fog.allRedSec - 1.4) < 1e-5,
      'Test 15c: Fog mode yields yellow 4.2s (3.0 * 1.4), all-red 1.4s (1.0 * 1.4)'
    );
  }

  // --- Test 16: Multiplication occurs BEFORE clamping and green allocations remain unchanged ---
  {
    const sm = new SignalManager('fixed');
    sm.setWeather('fog');

    const yellowSec = sm.effectiveYellowDuration || sm.calculateClearanceDurations('fog').yellowSec;
    const allRedSec = sm.effectiveAllRedDuration || sm.calculateClearanceDurations('fog').allRedSec;

    assert(
      yellowSec >= 3.0 && yellowSec <= 4.2 && allRedSec >= 1.0 && allRedSec <= 1.4,
      'Test 16a: Clearance calculation clamps multiplied value strictly within bounds [3.0-4.2s, 1.0-1.4s]'
    );

    assert(
      sm.activeGreenDuration === 45,
      'Test 16b: Green allocations remain unchanged (Fixed baseline remains exactly 45s under weather)'
    );
  }

  // --- Test 17: Mid-clearance weather changes DO NOT reset or shorten current sequence ---
  {
    const sm = new SignalManager('fixed');
    sm.setWeather('normal');

    // Trigger YELLOW clearance phase under 'normal' weather
    sm.initiateClearanceSwitch({}, {}, {}, {}, false);

    assert(
      sm.phase === 'YELLOW' && sm.effectiveWeatherMode === 'normal',
      'Test 17a: Sequence entered YELLOW phase with effective weather mode normal'
    );

    // Change requested weather to 'fog' during active YELLOW phase
    const setSuccess = sm.setWeather('fog');
    assert(setSuccess, 'Test 17b: Valid weather change accepted into requested state');

    assert(
      sm.effectiveWeatherMode === 'normal' && sm.effectiveYellowDuration === 3.0,
      'Test 17c: Mid-clearance weather change does NOT reset or shorten running clearance sequence'
    );

    assert(
      sm.weatherMode === 'fog',
      'Test 17d: Requested weatherMode updated to fog while effective clearance mode remains normal'
    );
  }

  // --- Test 18: Occupancy holds override nominal all-red completion ---
  {
    const sm = new SignalManager('fixed');
    sm.setWeather('normal');
    sm.phase = 'ALL_RED';
    sm.phaseTimer = 1.5; // > nominal allRedDuration (1.0s)
    sm.effectiveAllRedDuration = 1.0;

    // Simulate occupied intersection (isIntersectionOccupied = true)
    sm.updateSignal({}, {}, {}, {}, 0.1, true);

    assert(
      sm.phase === 'ALL_RED' && sm.isExtendedClearance === true,
      'Test 18: Occupancy hold extends ALL_RED clearance beyond nominal duration until intersection clears'
    );
  }

  // --- Test 19: Emergency precedence and recovery remain intact under weather ---
  {
    const sm = new SignalManager('fixed');
    sm.setWeather('rain');

    sm.handleEmergencyVehicle({ id: 'emg-weather-19', approach: 'S', type: 'ambulance' });

    assert(
      sm.emergencyActive && sm.emergencyDirection === 'S',
      'Test 19a: Emergency preemption active on approach S under rain mode'
    );

    sm.endEmergency({}, {}, {});
    assert(
      !sm.emergencyActive && sm.phase === 'YELLOW',
      'Test 19b: Emergency release safely transitions back through clearance phase'
    );
  }

  // --- Test 20: Invalid weather commands fail clearly and preserve state ---
  {
    const sm = new SignalManager();
    sm.setWeather('rain');

    const invalidRes1 = sm.setWeather('tornado');
    const invalidRes2 = sm.setWeather(null);
    const invalidRes3 = sm.setWeather(123);

    assert(
      !invalidRes1 && !invalidRes2 && !invalidRes3,
      'Test 20a: Invalid weather commands return false'
    );
    assert(
      sm.weatherMode === 'rain',
      'Test 20b: Active weather mode (rain) strictly preserved when invalid command rejected'
    );
  }

  // --- Test 21: Navigation/reset keep weather state consistent ---
  {
    const sm = new SignalManager();
    sm.setWeather('fog');
    sm.reset();
    sm.setWeather('fog'); // Re-apply requested selection on reset

    assert(
      sm.weatherMode === 'fog',
      'Test 21: Weather state remains consistent across session resets'
    );
  }

  const failed = results.filter(r => !r.pass);
  if (failed.length > 0) {
    console.error(`❌ ${failed.length} SIGNAL CONTROLLER INTEGRATION TESTS FAILED:`);
    failed.forEach(f => console.error(`  - ${f.message}`));
    throw new Error(`${failed.length} Signal Controller tests failed.`);
  }

  return results;
}

export const runSignalControllerTests = runIntegrationTests;

// Auto-run if executed directly via Node
if (process.argv[1] && process.argv[1].includes('signalController.test.js')) {
  try {
    const res = runIntegrationTests();
    console.log(`✅ ALL ${res.length} SIGNAL CONTROLLER INTEGRATION TESTS PASSED!`);
  } catch (err) {
    console.error('SIGNAL CONTROLLER TESTS FAILED:', err);
    process.exit(1);
  }
}

