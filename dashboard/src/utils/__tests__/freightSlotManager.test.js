import { FreightSlotManager, FREIGHT_DECISIONS, FREIGHT_STAGING_STATUS } from '../FreightSlotManager.js';
import { LogisticsHubManager } from '../LogisticsHubManager.js';
import { LinkManager, DEFAULT_LINK_CONFIGS } from '../LinkManager.js';

export function runFreightSlotManagerTestSuite() {
  console.log('================================================================');
  console.log('  SMART FREIGHT ARRIVAL SLOT & UPSTREAM HOLDING TEST SUITE      ');
  console.log('================================================================\n');

  function assert(condition, message) {
    if (!condition) {
      console.error(`❌ ASSERTION FAILED: ${message}`);
      throw new Error(`Assertion Failed: ${message}`);
    }
  }

  // Helper to create mock commercial vehicle
  function createMockVehicle(id = 'J1-v-N-1', origin = 'J1', destHub = 'HUB_DDR_01', type = 'delivery_van') {
    return {
      id,
      type,
      source: 'simulation',
      direction: 'N',
      isCommercial: true,
      destinationHubId: destHub,
      originJunctionId: origin,
      cargoTonnage: type === 'freight_truck' ? 8.5 : 1.5,
      deliveryStatus: 'EN_ROUTE',
      corridorRoute: destHub === 'HUB_DDR_01' ? ['J1', 'J2'] : ['J1', 'J2', 'J3'],
      routeIndex: 0
    };
  }

  // ----------------------------------------------------
  // TEST 1: Free bay produces PROCEED_NOW
  // ----------------------------------------------------
  console.log('--- TEST 1: Free Bay Produces PROCEED_NOW ---');
  {
    const lhm = new LogisticsHubManager();
    const fsm = new FreightSlotManager({ logisticsHubManager: lhm });
    const vehicle = createMockVehicle('veh-01', 'J1', 'HUB_DDR_01');

    const result = fsm.evaluateDeparture(vehicle, 'J1', 'J1-J2', 100, {
      isEmergencyActive: false,
      logisticsHubManager: lhm
    });

    assert(result.decision === FREIGHT_DECISIONS.PROCEED_NOW, `Expected PROCEED_NOW, got ${result.decision}`);
    assert(result.shouldReleaseNow === true, 'Vehicle should release immediately when bay is free');
    console.log('  ✅ Test 1 Passed: Free bay produces PROCEED_NOW with immediate release.');
  }

  // ----------------------------------------------------
  // TEST 2: Critical curb saturation produces HOLD_AT_ORIGIN
  // ----------------------------------------------------
  console.log('--- TEST 2: Critical Curb Saturation Produces HOLD_AT_ORIGIN ---');
  {
    const lhm = new LogisticsHubManager();
    const hub = lhm.getHub('HUB_DDR_01');
    // Occupy all bays and fill curb queue to >= 80% saturation
    hub.bays.forEach(b => {
      b.status = 'DWELLING';
      b.occupiedByVehicleId = 'occupant-x';
      b.dwellRemainingSec = 45;
    });
    hub.curbQueue = [
      { id: 'q1', type: 'delivery_van', cargoTonnage: 1.0 },
      { id: 'q2', type: 'delivery_van', cargoTonnage: 1.0 },
      { id: 'q3', type: 'delivery_van', cargoTonnage: 1.0 }
    ];
    lhm._updateLaneBlockage(hub); // laneBlocked becomes true

    const fsm = new FreightSlotManager({ logisticsHubManager: lhm });
    const vehicle = createMockVehicle('veh-02', 'J1', 'HUB_DDR_01');

    const result = fsm.evaluateDeparture(vehicle, 'J1', 'J1-J2', 100, {
      isEmergencyActive: false,
      logisticsHubManager: lhm
    });

    assert(result.decision === FREIGHT_DECISIONS.HOLD_AT_ORIGIN, `Expected HOLD_AT_ORIGIN, got ${result.decision}`);
    assert(result.shouldReleaseNow === false, 'Vehicle should not be released when hub curb is saturated');
    assert(vehicle.deliveryStatus === 'STAGED', `Vehicle deliveryStatus should be STAGED, got ${vehicle.deliveryStatus}`);
    assert(fsm.totalCurbEntriesPrevented === 1, `Curb entries prevented counter should be 1, got ${fsm.totalCurbEntriesPrevented}`);
    console.log('  ✅ Test 2 Passed: Critical curb saturation produces HOLD_AT_ORIGIN.');
  }

  // ----------------------------------------------------
  // TEST 3: Emergency mode produces DEFER_EMERGENCY
  // ----------------------------------------------------
  console.log('--- TEST 3: Emergency Mode Produces DEFER_EMERGENCY ---');
  {
    const lhm = new LogisticsHubManager();
    const fsm = new FreightSlotManager({ logisticsHubManager: lhm });
    const vehicle = createMockVehicle('veh-03', 'J1', 'HUB_DDR_01');

    const result = fsm.evaluateDeparture(vehicle, 'J1', 'J1-J2', 100, {
      isEmergencyActive: true,
      logisticsHubManager: lhm
    });

    assert(result.decision === FREIGHT_DECISIONS.DEFER_EMERGENCY, `Expected DEFER_EMERGENCY, got ${result.decision}`);
    assert(result.shouldReleaseNow === false, 'Vehicle must not be released during emergency preemption');
    assert(vehicle.deliveryStatus === 'STAGED', 'Vehicle deliveryStatus must be STAGED');
    assert(result.reason.includes('emergency corridor priority'), 'Reason should cite emergency priority');
    console.log('  ✅ Test 3 Passed: Emergency mode produces DEFER_EMERGENCY.');
  }

  // ----------------------------------------------------
  // TEST 4: Predicted bay release produces SLOT_ASSIGNED
  // ----------------------------------------------------
  console.log('--- TEST 4: Predicted Bay Release Produces SLOT_ASSIGNED ---');
  {
    const lhm = new LogisticsHubManager();
    const hub = lhm.getHub('HUB_DDR_01');
    // Occupy all bays with short remaining dwell, curb queue empty
    hub.bays.forEach((b, idx) => {
      b.status = 'DWELLING';
      b.occupiedByVehicleId = `docked-${idx}`;
      b.dwellRemainingSec = 30; // Will be free in 30 seconds
    });
    hub.curbQueue = [];
    lhm._updateLaneBlockage(hub);

    const fsm = new FreightSlotManager({ logisticsHubManager: lhm });
    // Travel time J1->J2 is 306s, bay free in 30s. Earliest arrival is 100+306 = 406s.
    // By 406s, bay is free! Slot window is assigned: [406, 706].
    const vehicle = createMockVehicle('veh-04', 'J1', 'HUB_DDR_01');

    const result = fsm.evaluateDeparture(vehicle, 'J1', 'J1-J2', 100, {
      isEmergencyActive: false,
      logisticsHubManager: lhm
    });

    assert(result.decision === FREIGHT_DECISIONS.SLOT_ASSIGNED, `Expected SLOT_ASSIGNED, got ${result.decision}`);
    assert(vehicle.deliveryStatus === 'SLOT_ASSIGNED', 'Vehicle deliveryStatus should be SLOT_ASSIGNED');
    assert(result.record.assignedSlotStartSec >= 406, 'Slot start should be >= 406s');
    assert(result.record.assignedSlotEndSec === result.record.assignedSlotStartSec + 300, 'Slot duration should be 300s (5 min)');
    console.log(`  Assigned Slot: ${result.record.assignedSlotStartSec}s - ${result.record.assignedSlotEndSec}s (Duration: 300s)`);
    console.log('  ✅ Test 4 Passed: Predicted bay release produces SLOT_ASSIGNED.');
  }

  // ----------------------------------------------------
  // TEST 5: Held vehicle does not enter LinkManager
  // ----------------------------------------------------
  console.log('--- TEST 5: Held Vehicle Does Not Enter LinkManager ---');
  {
    const lhm = new LogisticsHubManager();
    const lm = new LinkManager();
    const fsm = new FreightSlotManager({ logisticsHubManager: lhm });

    const hub = lhm.getHub('HUB_DDR_01');
    hub.laneBlocked = true; // Saturated

    const vehicle = createMockVehicle('veh-05', 'J1', 'HUB_DDR_01');

    const decision = fsm.evaluateDeparture(vehicle, 'J1', 'J1-J2', 100, {
      isEmergencyActive: false,
      logisticsHubManager: lhm
    });

    // Enforce staging check: only send to LinkManager if shouldReleaseNow is true
    if (decision.shouldReleaseNow) {
      lm.receiveDeparture('J1-J2', vehicle, 100);
    }

    assert(lm.getTotalInTransitCount() === 0, 'LinkManager should contain 0 vehicles when held');
    assert(fsm.getStagedVehicles().length === 1, 'Staged vehicles count in FreightSlotManager should be 1');
    assert(fsm.stagedVehicles['veh-05'] !== undefined, 'Vehicle veh-05 must be present in stagedVehicles map');
    console.log('  ✅ Test 5 Passed: Held vehicle safely retained in staging queue; does not enter LinkManager.');
  }

  // ----------------------------------------------------
  // TEST 6: Staged vehicle is released when conditions become safe
  // ----------------------------------------------------
  console.log('--- TEST 6: Staged Vehicle Released When Conditions Become Safe ---');
  {
    const lhm = new LogisticsHubManager();
    const fsm = new FreightSlotManager({ logisticsHubManager: lhm });

    // Step A: Stage vehicle due to emergency
    const vehicle = createMockVehicle('veh-06', 'J1', 'HUB_DDR_01');
    fsm.evaluateDeparture(vehicle, 'J1', 'J1-J2', 100, {
      isEmergencyActive: true,
      logisticsHubManager: lhm
    });
    assert(fsm.getStagedVehicles().length === 1, 'Vehicle is staged');

    // Step B: Tick while emergency is still active -> remains staged
    let released = fsm.tick(1.0, 101, { isEmergencyActive: true, logisticsHubManager: lhm });
    assert(released.length === 0, 'No vehicle released during emergency');

    // Step C: Emergency ends! Free bay available -> tick releases vehicle automatically
    released = fsm.tick(1.0, 102, { isEmergencyActive: false, logisticsHubManager: lhm });
    assert(released.length === 1, 'Vehicle should be released once emergency clears');
    assert(released[0].vehicleId === 'veh-06', 'Released vehicle must be veh-06');
    assert(fsm.getStagedVehicles().length === 0, 'Staged queue should now be empty');
    console.log('  ✅ Test 6 Passed: Staged vehicle released automatically when conditions become safe.');
  }

  // ----------------------------------------------------
  // TEST 7: Released vehicle enters the correct next link
  // ----------------------------------------------------
  console.log('--- TEST 7: Released Vehicle Enters the Correct Next Link ---');
  {
    const lhm = new LogisticsHubManager();
    const lm = new LinkManager();
    const fsm = new FreightSlotManager({ logisticsHubManager: lhm });

    const vehicle = createMockVehicle('veh-07', 'J1', 'HUB_DDR_01');
    // Force staging with future slot
    fsm._createOrUpdateStagedRecord(
      vehicle,
      'J1',
      'J1-J2',
      100,
      306,
      FREIGHT_DECISIONS.SLOT_ASSIGNED,
      'Slot pending',
      FREIGHT_STAGING_STATUS.SLOT_PENDING,
      500,
      800
    );
    // targetDepartureSec = 500 - 306 = 194s

    // Tick before targetDepartureSec
    let released = fsm.tick(5.0, 190, { isEmergencyActive: false, logisticsHubManager: lhm });
    assert(released.length === 0, 'Should not release before departure time (194s)');

    // Tick at targetDepartureSec (194s)
    released = fsm.tick(5.0, 195, { isEmergencyActive: false, logisticsHubManager: lhm });
    assert(released.length === 1, 'Should release at departure time');
    const relVeh = released[0];

    // Send released vehicle to LinkManager as SimulationContext does
    relVeh.vehicle.deliveryStatus = 'EN_ROUTE';
    lm.receiveDeparture(relVeh.nextLinkId, relVeh.vehicle, 195);

    assert(lm.inTransit['J1-J2'].length === 1, 'Vehicle must be inside J1-J2 inTransit');
    assert(lm.inTransit['J1-J2'][0].id === 'veh-07', 'Vehicle ID must match in link transit');
    assert(lm.inTransit['J1-J2'][0].deliveryStatus === 'EN_ROUTE', 'Delivery status on link must be EN_ROUTE');
    console.log('  ✅ Test 7 Passed: Released vehicle enters correct corridor link (J1-J2) with EN_ROUTE status.');
  }

  // ----------------------------------------------------
  // TEST 8: Vehicle is released exactly once
  // ----------------------------------------------------
  console.log('--- TEST 8: Vehicle is Released Exactly Once ---');
  {
    const lhm = new LogisticsHubManager();
    const fsm = new FreightSlotManager({ logisticsHubManager: lhm });

    const vehicle = createMockVehicle('veh-08', 'J1', 'HUB_DDR_01');
    fsm._createOrUpdateStagedRecord(
      vehicle,
      'J1',
      'J1-J2',
      100,
      306,
      FREIGHT_DECISIONS.SLOT_ASSIGNED,
      'Slot pending',
      FREIGHT_STAGING_STATUS.SLOT_PENDING,
      406,
      706
    ); // targetDeparture = 406 - 306 = 100s

    // First tick at 100s releases vehicle
    const rel1 = fsm.tick(1.0, 100, { isEmergencyActive: false, logisticsHubManager: lhm });
    assert(rel1.length === 1, 'Vehicle released on first eligible tick');

    // Subsequent ticks must NOT re-release
    const rel2 = fsm.tick(1.0, 101, { isEmergencyActive: false, logisticsHubManager: lhm });
    const rel3 = fsm.tick(1.0, 102, { isEmergencyActive: false, logisticsHubManager: lhm });
    assert(rel2.length === 0, 'No re-release on tick 101');
    assert(rel3.length === 0, 'No re-release on tick 102');
    assert(fsm.totalVehiclesReleased === 1, `Total released count must be exactly 1, got ${fsm.totalVehiclesReleased}`);
    console.log('  ✅ Test 8 Passed: Exactly-once vehicle release guaranteed; zero duplicate releases.');
  }

  // ----------------------------------------------------
  // TEST 9: Freight metadata is preserved
  // ----------------------------------------------------
  console.log('--- TEST 9: Freight Metadata is Preserved ---');
  {
    const lhm = new LogisticsHubManager();
    const fsm = new FreightSlotManager({ logisticsHubManager: lhm });

    const originalVeh = {
      id: 'J1-v-N-99',
      type: 'freight_truck',
      source: 'simulation',
      direction: 'N',
      isCommercial: true,
      cargoTonnage: 12.8,
      destinationHubId: 'HUB_BKC_01',
      corridorRoute: ['J1', 'J2', 'J3'],
      routeIndex: 0
    };

    fsm._createOrUpdateStagedRecord(
      originalVeh,
      'J1',
      'J1-J2',
      50,
      684,
      FREIGHT_DECISIONS.HOLD_AT_ORIGIN,
      'Testing metadata',
      FREIGHT_STAGING_STATUS.STAGED
    );

    const staged = fsm.stagedVehicles['J1-v-N-99'];
    assert(staged.vehicleId === 'J1-v-N-99', 'Vehicle ID preserved');
    assert(staged.vehicleType === 'freight_truck', 'Vehicle type preserved');
    assert(staged.cargoTonnage === 12.8, 'Cargo tonnage preserved');
    assert(staged.destinationHubId === 'HUB_BKC_01', 'Destination hub preserved');
    assert(JSON.stringify(staged.corridorRoute) === JSON.stringify(['J1', 'J2', 'J3']), 'Corridor route preserved');
    assert(staged.originJunctionId === 'J1', 'Origin junction preserved');
    assert(staged.nextLinkId === 'J1-J2', 'Next link ID preserved');
    console.log('  ✅ Test 9 Passed: All freight metadata fields strictly preserved during staging.');
  }

  // ----------------------------------------------------
  // TEST 10: Passenger vehicles are unaffected
  // ----------------------------------------------------
  console.log('--- TEST 10: Passenger Vehicles are Unaffected ---');
  {
    const lhm = new LogisticsHubManager();
    const fsm = new FreightSlotManager({ logisticsHubManager: lhm });

    const passengerCar = {
      id: 'car-pass-01',
      type: 'car',
      source: 'simulation',
      direction: 'N',
      isCommercial: false
    };

    const res = fsm.evaluateDeparture(passengerCar, 'J1', 'J1-J2', 100, {
      isEmergencyActive: true, // Even during emergency
      logisticsHubManager: lhm
    });

    assert(res.decision === FREIGHT_DECISIONS.PROCEED_NOW, 'Passenger car must receive PROCEED_NOW');
    assert(res.shouldReleaseNow === true, 'Passenger car shouldReleaseNow must be true');
    assert(fsm.getStagedVehicles().length === 0, 'No passenger vehicle can be placed in staging queue');
    console.log('  ✅ Test 10 Passed: Passenger vehicles bypass slot management completely and are unaffected.');
  }

  // ----------------------------------------------------
  // TEST 11: Reset clears all staging and slot state
  // ----------------------------------------------------
  console.log('--- TEST 11: Reset Clears All Staging and Slot State ---');
  {
    const lhm = new LogisticsHubManager();
    const fsm = new FreightSlotManager({ logisticsHubManager: lhm });

    const v1 = createMockVehicle('v-rst-1', 'J1', 'HUB_DDR_01');
    const v2 = createMockVehicle('v-rst-2', 'J2', 'HUB_BKC_01');

    fsm._createOrUpdateStagedRecord(v1, 'J1', 'J1-J2', 10, 306, FREIGHT_DECISIONS.HOLD_AT_ORIGIN, 'Held', FREIGHT_STAGING_STATUS.STAGED);
    fsm._createOrUpdateStagedRecord(v2, 'J2', 'J2-J3', 10, 378, FREIGHT_DECISIONS.SLOT_ASSIGNED, 'Slot', FREIGHT_STAGING_STATUS.SLOT_PENDING, 400, 700);
    fsm.totalVehiclesHeld = 2;
    fsm.totalSlotsAssigned = 1;
    fsm.totalVehiclesReleased = 3;
    fsm.totalCurbEntriesPrevented = 1;

    assert(fsm.getStagedVehicles().length === 2, 'Pre-reset staged count must be 2');

    fsm.reset();

    assert(fsm.getStagedVehicles().length === 0, 'Post-reset staged vehicles must be empty');
    assert(fsm.getActiveSlotAssignments().length === 0, 'Post-reset active slots must be empty');
    assert(fsm.totalVehiclesHeld === 0, 'totalVehiclesHeld reset to 0');
    assert(fsm.totalSlotsAssigned === 0, 'totalSlotsAssigned reset to 0');
    assert(fsm.totalVehiclesReleased === 0, 'totalVehiclesReleased reset to 0');
    assert(fsm.totalCurbEntriesPrevented === 0, 'totalCurbEntriesPrevented reset to 0');
    assert(fsm.decisionHistory.length === 0, 'decisionHistory cleared');
    assert(fsm.releasedVehicleHistory.length === 0, 'releasedVehicleHistory cleared');
    console.log('  ✅ Test 11 Passed: Reset cleanly purges all staging queues, slots, and metric counters.');
  }

  // ----------------------------------------------------
  // TEST 12: Identical inputs produce identical decisions
  // ----------------------------------------------------
  console.log('--- TEST 12: Identical Inputs Produce Identical Decisions ---');
  {
    const lhm = new LogisticsHubManager();
    const hub = lhm.getHub('HUB_DDR_01');
    hub.bays.forEach((b, idx) => {
      b.status = 'DWELLING';
      b.occupiedByVehicleId = `test-occ-${idx}`;
      b.dwellRemainingSec = 40;
    });
    hub.curbQueue = [];
    lhm._updateLaneBlockage(hub);

    const fsm1 = new FreightSlotManager({ logisticsHubManager: lhm });
    const fsm2 = new FreightSlotManager({ logisticsHubManager: lhm });

    const veh1 = createMockVehicle('det-veh-1', 'J1', 'HUB_DDR_01');
    const veh2 = createMockVehicle('det-veh-1', 'J1', 'HUB_DDR_01');

    const res1 = fsm1.evaluateDeparture(veh1, 'J1', 'J1-J2', 150, { isEmergencyActive: false, logisticsHubManager: lhm });
    const res2 = fsm2.evaluateDeparture(veh2, 'J1', 'J1-J2', 150, { isEmergencyActive: false, logisticsHubManager: lhm });

    assert(res1.decision === res2.decision, `Decisions must match: ${res1.decision} vs ${res2.decision}`);
    assert(res1.reason === res2.reason, `Reasons must match: "${res1.reason}" vs "${res2.reason}"`);
    assert(res1.record.assignedSlotStartSec === res2.record.assignedSlotStartSec, 'Slot start times must match exactly');
    assert(res1.record.assignedSlotEndSec === res2.record.assignedSlotEndSec, 'Slot end times must match exactly');
    assert(res1.shouldReleaseNow === res2.shouldReleaseNow, 'shouldReleaseNow flags must match');
    console.log('  ✅ Test 12 Passed: Deterministic execution verified (100% identical outputs for identical inputs).');
  }

  console.log('\n================================================================');
  console.log('  ALL 12 FREIGHT SLOT MANAGER TESTS PASSED CLEANLY (12/12)      ');
  console.log('================================================================\n');

  return { success: true };
}
