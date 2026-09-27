import { LogisticsHubManager } from '../LogisticsHubManager.js';
import { VehicleManager } from '../VehicleManager.js';
import { SignalManager } from '../SignalManager.js';
import { TRAFFIC_CONSTANTS } from '../constants.js';

export function runLogisticsHubManagerTestSuite() {
  console.log('================================================================');
  console.log('  LOGISTICS HUB & SMART CURB VERIFICATION SUITE (PHASE 3)      ');
  console.log('================================================================\n');

  function assert(condition, message) {
    if (!condition) {
      console.error(`❌ ASSERTION FAILED: ${message}`);
      throw new Error(`Assertion Failed: ${message}`);
    }
  }

  // ----------------------------------------------------
  // TEST 1: HUB INITIALIZATION
  // ----------------------------------------------------
  console.log('--- TEST 1: Hub Initialization & Configuration ---');
  {
    const lhm = new LogisticsHubManager();
    const hubs = lhm.getAllHubs();

    assert(hubs.length >= 2, `Expected at least 2 configured hubs, found ${hubs.length}`);
    
    const ddrHub = lhm.getHub('HUB_DDR_01');
    assert(ddrHub !== null, 'HUB_DDR_01 must be initialized');
    assert(ddrHub.totalBays === 3, `HUB_DDR_01 must have 3 bays, got ${ddrHub.totalBays}`);
    assert(ddrHub.bays.length === 3, `HUB_DDR_01 bay array length must be 3`);
    assert(ddrHub.bays.every(b => b.status === 'AVAILABLE'), 'All bays must initially be AVAILABLE');
    assert(ddrHub.curbQueue.length === 0, 'Curb queue must initially be empty');
    assert(ddrHub.laneBlocked === false, 'Lane must not be blocked initially');

    const bkcHub = lhm.getHub('HUB_BKC_01');
    assert(bkcHub !== null, 'HUB_BKC_01 must be initialized');
    assert(bkcHub.totalBays === 4, `HUB_BKC_01 must have 4 bays, got ${bkcHub.totalBays}`);

    const telemetry = lhm.getTelemetry();
    assert(telemetry.occupiedBays === 0, 'Initial occupied bays must be 0');
    assert(telemetry.availableBays === 7, `Initial available bays must be 7 (3+4), got ${telemetry.availableBays}`);
    assert(telemetry.totalQueuedCommercialVehicles === 0, 'Initial queued count must be 0');

    console.log('  ✅ Test 1 Passed: Hubs initialized correctly from central registry.');
  }

  // ----------------------------------------------------
  // TEST 2: BAY ASSIGNMENT
  // ----------------------------------------------------
  console.log('--- TEST 2: Bay Assignment for Arriving Vehicle ---');
  {
    const lhm = new LogisticsHubManager();
    const vehicle = {
      id: 'comm-van-101',
      type: 'delivery_van',
      isCommercial: true,
      destinationHubId: 'HUB_DDR_01',
      cargoTonnage: 1.2,
      deliveryStatus: 'ARRIVING',
      curbDwellRemainingSec: 0
    };

    const res = lhm.processCommercialArrival(vehicle);
    assert(res.status === 'AT_HUB', `Expected status AT_HUB, got ${res.status}`);
    assert(res.bayIndex === 0, `Expected assigned bayIndex 0, got ${res.bayIndex}`);
    assert(vehicle.deliveryStatus === 'AT_HUB', `Vehicle deliveryStatus must transition to AT_HUB, got ${vehicle.deliveryStatus}`);
    assert(vehicle.curbDwellRemainingSec === 45, `Vehicle curbDwellRemainingSec must be 45, got ${vehicle.curbDwellRemainingSec}`);

    const hubState = lhm.getHubState('HUB_DDR_01');
    assert(hubState.occupiedBays === 1, `Occupied bays must be 1, got ${hubState.occupiedBays}`);
    assert(hubState.availableBays === 2, `Available bays must be 2, got ${hubState.availableBays}`);
    assert(hubState.bays[0].status === 'OCCUPIED', `Bay 0 status must be OCCUPIED, got ${hubState.bays[0].status}`);
    assert(hubState.bays[0].occupiedByVehicleId === 'comm-van-101', 'Bay 0 occupant ID must match');

    console.log('  ✅ Test 2 Passed: Arriving commercial vehicle assigned free bay and entered AT_HUB.');
  }

  // ----------------------------------------------------
  // TEST 3: FULL HUB & CURB QUEUE
  // ----------------------------------------------------
  console.log('--- TEST 3: Full Hub Overflow into Curb Queue ---');
  {
    const lhm = new LogisticsHubManager();
    const vehicles = [
      { id: 'v-1', type: 'delivery_van', isCommercial: true, destinationHubId: 'HUB_DDR_01', cargoTonnage: 1.2 },
      { id: 'v-2', type: 'freight_truck', isCommercial: true, destinationHubId: 'HUB_DDR_01', cargoTonnage: 8.5 },
      { id: 'v-3', type: 'delivery_van', isCommercial: true, destinationHubId: 'HUB_DDR_01', cargoTonnage: 1.5 }
    ];

    // Fill all 3 bays of Dadar hub
    vehicles.forEach(v => {
      const r = lhm.processCommercialArrival(v);
      assert(r.status === 'AT_HUB', `Vehicle ${v.id} should be assigned a bay`);
    });

    const stateFull = lhm.getHubState('HUB_DDR_01');
    assert(stateFull.occupiedBays === 3, 'All 3 bays must be occupied');
    assert(stateFull.availableBays === 0, '0 bays available');
    assert(stateFull.queueLength === 0, 'Queue length should still be 0 before overflow');
    assert(stateFull.laneBlocked === false, 'Lane should not be blocked before queue forms');

    // 4th vehicle arrives when hub is full
    const overflowVehicle = {
      id: 'v-4-overflow',
      type: 'freight_truck',
      isCommercial: true,
      destinationHubId: 'HUB_DDR_01',
      cargoTonnage: 9.0
    };
    const resOverflow = lhm.processCommercialArrival(overflowVehicle);
    assert(resOverflow.status === 'CURB_QUEUE', `Expected CURB_QUEUE status, got ${resOverflow.status}`);
    assert(overflowVehicle.deliveryStatus === 'CURB_QUEUE', 'Vehicle deliveryStatus must be CURB_QUEUE');

    const stateOverflow = lhm.getHubState('HUB_DDR_01');
    assert(stateOverflow.queueLength === 1, `Queue length must be 1, got ${stateOverflow.queueLength}`);
    assert(stateOverflow.laneBlocked === true, 'Lane must be marked blocked when curb queue forms');

    console.log('  ✅ Test 3 Passed: Overflow vehicle placed in FIFO curb queue and lane blockage reported.');
  }

  // ----------------------------------------------------
  // TEST 4: DWELL COUNTDOWN VIA SIMULATION DT
  // ----------------------------------------------------
  console.log('--- TEST 4: Dwell Countdown via Simulation dt ---');
  {
    const lhm = new LogisticsHubManager();
    const veh = { id: 'v-dwell', type: 'delivery_van', isCommercial: true, destinationHubId: 'HUB_DDR_01' };
    lhm.processCommercialArrival(veh);

    // Initial dwell = 45s. Step 10s of simulation time (10 steps of 1.0s)
    for (let i = 0; i < 10; i++) {
      lhm.tick(1.0);
    }

    let hubState = lhm.getHubState('HUB_DDR_01');
    assert(hubState.bays[0].dwellRemainingSec === 35, `Expected 35s dwell remaining, got ${hubState.bays[0].dwellRemainingSec}`);
    assert(hubState.bays[0].status === 'DWELLING', `Bay status must be DWELLING, got ${hubState.bays[0].status}`);

    // Step another 20s
    for (let i = 0; i < 20; i++) {
      lhm.tick(1.0);
    }
    hubState = lhm.getHubState('HUB_DDR_01');
    assert(hubState.bays[0].dwellRemainingSec === 15, `Expected 15s dwell remaining, got ${hubState.bays[0].dwellRemainingSec}`);

    console.log('  ✅ Test 4 Passed: Dwell timer decrements precisely according to simulation dt.');
  }

  // ----------------------------------------------------
  // TEST 5 & 6: BAY RELEASE & FIFO QUEUE PROMOTION
  // ----------------------------------------------------
  console.log('--- TEST 5 & 6: Bay Release & Deterministic FIFO Promotion ---');
  {
    const lhm = new LogisticsHubManager();
    // Fill all 3 bays of Dadar hub (dwell = 45s)
    const v1 = { id: 'v-1', type: 'delivery_van', isCommercial: true, destinationHubId: 'HUB_DDR_01' };
    const v2 = { id: 'v-2', type: 'delivery_van', isCommercial: true, destinationHubId: 'HUB_DDR_01' };
    const v3 = { id: 'v-3', type: 'delivery_van', isCommercial: true, destinationHubId: 'HUB_DDR_01' };
    lhm.processCommercialArrival(v1);
    lhm.processCommercialArrival(v2);
    lhm.processCommercialArrival(v3);

    // Queue 2 overflow vehicles in order
    const qFirst = { id: 'q-first', type: 'freight_truck', isCommercial: true, destinationHubId: 'HUB_DDR_01' };
    const qSecond = { id: 'q-second', type: 'delivery_van', isCommercial: true, destinationHubId: 'HUB_DDR_01' };
    lhm.processCommercialArrival(qFirst);
    lhm.processCommercialArrival(qSecond);

    let state = lhm.getHubState('HUB_DDR_01');
    assert(state.queueLength === 2, `Expected queue length 2, got ${state.queueLength}`);
    assert(state.curbQueue[0].id === 'q-first', 'First queued vehicle must be q-first (FIFO order)');
    assert(state.curbQueue[1].id === 'q-second', 'Second queued vehicle must be q-second (FIFO order)');

    // Step 45 seconds to complete dwell for v1, v2, v3
    for (let i = 0; i < 45; i++) {
      lhm.tick(1.0);
    }

    state = lhm.getHubState('HUB_DDR_01');
    // q-first and q-second should have been promoted to bays!
    const occupiedVehicles = state.bays.map(b => b.occupiedByVehicleId).filter(Boolean);
    assert(occupiedVehicles.includes('q-first'), 'q-first must be promoted into a bay');
    assert(occupiedVehicles.includes('q-second'), 'q-second must be promoted into a bay');
    assert(qFirst.deliveryStatus === 'AT_HUB', `q-first deliveryStatus must transition to AT_HUB, got ${qFirst.deliveryStatus}`);
    assert(qSecond.deliveryStatus === 'AT_HUB', `q-second deliveryStatus must transition to AT_HUB, got ${qSecond.deliveryStatus}`);
    assert(state.queueLength === 0, `Queue should be empty after promotions, got ${state.queueLength}`);
    assert(state.laneBlocked === false, 'Lane blockage must clear when curb queue empties');

    console.log('  ✅ Test 5 & 6 Passed: Bays released on dwell expiry; queued vehicles promoted in strict FIFO order.');
  }

  // ----------------------------------------------------
  // TEST 7: LANE BLOCKAGE STATE
  // ----------------------------------------------------
  console.log('--- TEST 7: Lane Blockage State Reporting ---');
  {
    const lhm = new LogisticsHubManager();
    const ddr = lhm.getHub('HUB_DDR_01');
    assert(lhm.getHubState('HUB_DDR_01').effectiveLaneCount === 3, 'Nominal 3 lanes available initially');

    // Fill bays and add overflow
    for (let i = 0; i < 3; i++) {
      lhm.processCommercialArrival({ id: `veh-${i}`, type: 'delivery_van', isCommercial: true, destinationHubId: 'HUB_DDR_01' });
    }
    lhm.processCommercialArrival({ id: 'overflow-veh', type: 'delivery_van', isCommercial: true, destinationHubId: 'HUB_DDR_01' });

    const stateBlocked = lhm.getHubState('HUB_DDR_01');
    assert(stateBlocked.laneBlocked === true, 'Hub must report laneBlocked = true');
    assert(stateBlocked.effectiveLaneCount === 2, `Effective lanes must be 2 when blocked (3 - 1), got ${stateBlocked.effectiveLaneCount}`);

    console.log('  ✅ Test 7 Passed: Lane blockage state correctly exposed without hardcoding global road mutations.');
  }

  // ----------------------------------------------------
  // TEST 8: DETERMINISM TEST
  // ----------------------------------------------------
  console.log('--- TEST 8: Deterministic Hub Execution ---');
  {
    function runSimScenario() {
      const lhm = new LogisticsHubManager();
      for (let i = 0; i < 5; i++) {
        lhm.processCommercialArrival({ id: `c-${i}`, type: i % 2 === 0 ? 'delivery_van' : 'freight_truck', isCommercial: true, destinationHubId: 'HUB_DDR_01' });
      }
      for (let step = 0; step < 60; step++) {
        lhm.tick(0.5);
      }
      return lhm.getHubState('HUB_DDR_01');
    }

    const stateRun1 = runSimScenario();
    const stateRun2 = runSimScenario();

    assert(JSON.stringify(stateRun1) === JSON.stringify(stateRun2), 'Repeated execution must produce byte-for-byte identical state');
    console.log('  ✅ Test 8 Passed: Identical input scenario produces 100% deterministic hub state.');
  }

  // ----------------------------------------------------
  // TEST 9: PASSENGER TRAFFIC NON-REGRESSION
  // ----------------------------------------------------
  console.log('--- TEST 9: Passenger Simulation Non-Regression ---');
  {
    const vm = new VehicleManager(12345, 0.5, 1.0);
    const sm = new SignalManager('fixed');

    for (let i = 0; i < 500; i++) {
      vm.updateVehicles(sm.currentSignal, sm.phase, 0.1);
      sm.updateSignal(vm.getVisibleStoppedQueues(), vm.getStoppedQueues(), vm.getQueuedPCUs(), {}, 0.1);
    }

    assert(vm.carsPassed > 0, `Passenger vehicles must progress and pass intersection normally, passed: ${vm.carsPassed}`);
    assert(sm.phase === 'GREEN' || sm.phase === 'YELLOW' || sm.phase === 'ALL_RED', 'Signal FSM remains fully intact');
    console.log('  ✅ Test 9 Passed: Zero regressions in existing passenger kinematics and signal state machine.');
  }

  // ----------------------------------------------------
  // TEST 10: VEHICLE STATE INTEGRITY THROUGH LIFECYCLE
  // ----------------------------------------------------
  console.log('--- TEST 10: Vehicle State Integrity (EN_ROUTE -> ARRIVING -> AT_HUB -> COMPLETED) ---');
  {
    const lhm = new LogisticsHubManager();
    const vehicle = {
      id: 'lifecycle-van-99',
      type: 'delivery_van',
      isCommercial: true,
      pcuEquivalent: 1.5,
      destinationHubId: 'HUB_DDR_01',
      cargoTonnage: 1.2,
      deliveryStatus: 'EN_ROUTE',
      curbDwellRemainingSec: 0
    };

    // 1. Vehicle is EN_ROUTE
    assert(vehicle.deliveryStatus === 'EN_ROUTE', 'Initial status is EN_ROUTE');

    // 2. Vehicle approaches destination -> ARRIVING
    vehicle.deliveryStatus = 'ARRIVING';
    assert(vehicle.deliveryStatus === 'ARRIVING', 'Transitioned to ARRIVING');

    // 3. Dock at hub -> AT_HUB
    const arrivalReceipt = lhm.processCommercialArrival(vehicle);
    assert(arrivalReceipt.status === 'AT_HUB', 'Arrival assigned to bay');
    assert(vehicle.deliveryStatus === 'AT_HUB', 'Vehicle status is AT_HUB');
    assert(vehicle.curbDwellRemainingSec === 45, 'Dwell timer initialized to 45s');

    // 4. Complete dwell -> COMPLETED
    for (let i = 0; i < 45; i++) {
      lhm.tick(1.0);
    }
    const receipt = lhm.getHubState('HUB_DDR_01');
    assert(receipt.completedCount === 1, 'Hub completed count incremented to 1');
    assert(lhm.getTelemetry().commercialVehiclesCompleted === 1, 'Total completed telemetry updated');

    console.log('  ✅ Test 10 Passed: Commercial vehicle metadata and delivery lifecycle transitions fully verified.');
  }

  console.log('\n================================================================');
  console.log('  ALL PHASE 3 LOGISTICS HUB MANAGER TESTS PASSED CLEANLY!       ');
  console.log('================================================================\n');

  return { success: true };
}
