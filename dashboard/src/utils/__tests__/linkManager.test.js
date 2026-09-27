import { LinkManager, DEFAULT_LINK_CONFIGS } from '../LinkManager.js';
import { JunctionSimulation } from '../JunctionSimulation.js';

export function runLinkManagerTestSuite() {
  console.log('================================================================');
  console.log('  LINKMANAGER & J1 -> J2 TRANSFER TEST SUITE (PHASE 10.3B.1)     ');
  console.log('================================================================\n');

  function assert(condition, message) {
    if (!condition) {
      console.error(`❌ ASSERTION FAILED: ${message}`);
      throw new Error(`Assertion Failed: ${message}`);
    }
  }

  // ----------------------------------------------------
  // TEST A: BASIC DEPARTURE CAPTURE & IN-TRANSIT QUEUEING
  // ----------------------------------------------------
  console.log('--- TEST A: Basic Departure Capture ---');
  {
    const lm = new LinkManager();
    const mockDep = {
      id: 'car-J1-test-01',
      type: 'car',
      source: 'simulation',
      direction: 'N',
      delay: 14.5,
      totalWaitTime: 14.5,
      pcuEquivalent: 1.0,
      isCommercial: false
    };

    const record = lm.receiveDeparture('J1-J2', mockDep, 100);
    assert(record !== null, 'Departure must be accepted into J1-J2 link');
    assert(lm.getTotalInTransitCount() === 1, 'In-transit count must be 1');

    const state = lm.getState();
    assert(state.links['J1-J2'].vehicleCount === 1, 'J1-J2 vehicleCount must be 1');
    assert(state.metrics.totalReceived === 1, 'Metrics totalReceived must be 1');
    assert(state.metrics.totalDelivered === 0, 'Metrics totalDelivered must be 0');
    console.log('  ✅ Test A Passed: Departure captured into LinkManager successfully.');
  }

  // ----------------------------------------------------
  // TEST B: EXACT 306-SECOND TRAVEL TIME COUNTDOWN
  // ----------------------------------------------------
  console.log('--- TEST B: Exact Travel Time (3.4 km @ 40 km/h = 306s) ---');
  {
    const lm = new LinkManager();
    const mockDep = {
      id: 'car-J1-timing-02',
      type: 'car',
      direction: 'N',
      totalWaitTime: 5.0
    };

    lm.receiveDeparture('J1-J2', mockDep, 0);

    // Advance 305 seconds
    lm.tick(305, 305);
    assert(lm.getTotalInTransitCount() === 1, 'Vehicle must remain in transit at 305s');
    assert(lm.pollCompletedTransits('J1-J2').length === 0, 'No vehicle should be completed at 305s');

    // Advance 1 more second (total 306s)
    lm.tick(1.0, 306);
    assert(lm.getTotalInTransitCount() === 0, 'Vehicle must no longer be in active transit at 306s');
    const completed = lm.pollCompletedTransits('J1-J2');
    assert(completed.length === 1, 'Vehicle must be ready for downstream injection at 306s');
    assert(completed[0].id === 'car-J1-timing-02', 'Completed vehicle ID must match');
    assert(completed[0].exitTimeSec === 306, 'Completed exitTimeSec must match arrival time');
    console.log('  ✅ Test B Passed: Exact 306-second travel time model verified.');
  }

  // ----------------------------------------------------
  // TEST C: VEHICLE IDENTITY PRESERVATION
  // ----------------------------------------------------
  console.log('--- TEST C: Vehicle Identity Preservation ---');
  {
    const lm = new LinkManager();
    const originalId = 'commercial-truck-unique-9988';
    const mockDep = {
      id: originalId,
      type: 'freight_truck',
      direction: 'N',
      totalWaitTime: 22.4,
      pcuEquivalent: 2.5,
      isCommercial: true,
      cargoTonnage: 8.5,
      destinationHubId: 'HUB_BKC_01',
      deliveryStatus: 'EN_ROUTE'
    };

    lm.receiveDeparture('J1-J2', mockDep, 50);
    lm.tick(306, 356);
    const [arrived] = lm.pollCompletedTransits('J1-J2');

    assert(arrived.id === originalId, `Vehicle ID must remain strictly identical (${originalId})`);
    assert(arrived.eventId === originalId, 'Vehicle eventId must remain identical');
    console.log('  ✅ Test C Passed: Vehicle ID preserved across transit.');
  }

  // ----------------------------------------------------
  // TEST D: COMMERCIAL FREIGHT METADATA PRESERVATION
  // ----------------------------------------------------
  console.log('--- TEST D: Commercial Metadata Preservation ---');
  {
    const lm = new LinkManager();
    const freightDep = {
      id: 'van-J1-freight-44',
      type: 'delivery_van',
      source: 'simulation',
      direction: 'N',
      totalWaitTime: 18.2,
      pcuEquivalent: 1.5,
      isCommercial: true,
      cargoTonnage: 1.2,
      destinationHubId: 'HUB_DADAR_02',
      deliveryStatus: 'EN_ROUTE',
      isSimulatedCommercial: true
    };

    lm.receiveDeparture('J1-J2', freightDep, 10);
    lm.tick(306, 316);
    const [arrived] = lm.pollCompletedTransits('J1-J2');

    assert(arrived.isCommercial === true, 'isCommercial must be true');
    assert(arrived.cargoTonnage === 1.2, 'cargoTonnage must be preserved (1.2)');
    assert(arrived.destinationHubId === 'HUB_DADAR_02', 'destinationHubId must be preserved');
    assert(arrived.deliveryStatus === 'EN_ROUTE', 'deliveryStatus must remain EN_ROUTE');
    assert(arrived.pcuEquivalent === 1.5, 'pcuEquivalent must be preserved (1.5)');
    assert(arrived.totalWaitTime === 18.2, 'totalWaitTime must be preserved (18.2)');
    assert(arrived.isSimulatedCommercial === true, 'isSimulatedCommercial must be true');
    console.log('  ✅ Test D Passed: All commercial metadata fields preserved.');
  }

  // ----------------------------------------------------
  // TEST E: NO DUPLICATION & STATE PARTITION
  // ----------------------------------------------------
  console.log('--- TEST E: No Duplication / Strict Partition ---');
  {
    const j1 = new JunctionSimulation('J1', 12343);
    const j2 = new JunctionSimulation('J2', 12344);
    const lm = new LinkManager();

    // Step J1 until a departure occurs or manually trigger departure
    const mockDep = {
      id: 'no-dup-car-77',
      type: 'car',
      direction: 'N',
      totalWaitTime: 12.0
    };

    // Receive into LinkManager
    lm.receiveDeparture('J1-J2', mockDep, 0);

    // Verify car does not exist in J2
    const j2Cars = Object.values(j2.vehicleManager.cars).flat();
    assert(!j2Cars.some(c => c.id === 'no-dup-car-77'), 'Vehicle must not exist in J2 while in transit');

    // Advance link to completion
    lm.tick(306, 306);
    const completed = lm.pollCompletedTransits('J1-J2');
    assert(completed.length === 1, 'Completed transit ready');
    assert(lm.getTotalInTransitCount() === 0, 'Vehicle removed from LinkManager upon polling');

    // Inject into J2
    const injectionReceipt = j2.vehicleManager.injectExternalArrival('W', {
      eventId: completed[0].id,
      vehicleType: completed[0].type,
      totalWaitTime: completed[0].totalWaitTime
    });
    assert(injectionReceipt.accepted === true, 'J2 must accept arrival');

    // Verify it is now in J2 and NOT in LinkManager
    assert(lm.getTotalInTransitCount() === 0, 'LinkManager must have 0 vehicles');
    const j2CarsAfter = [...Object.values(j2.vehicleManager.cars).flat(), ...Object.values(j2.vehicleManager.backlog).flat()];
    assert(j2CarsAfter.some(c => c.id === 'no-dup-car-77'), 'Vehicle must now exist in J2');
    console.log('  ✅ Test E Passed: Strict partition and zero duplicate existence verified.');
  }

  // ----------------------------------------------------
  // TEST F: TOTAL CONSERVATION INVARIANT
  // ----------------------------------------------------
  console.log('--- TEST F: Conservation Invariant Evaluation ---');
  {
    const lm = new LinkManager();
    const receivedVehicles = [
      { id: 'v1', type: 'car', direction: 'N', totalWaitTime: 2 },
      { id: 'v2', type: 'car', direction: 'N', totalWaitTime: 4 },
      { id: 'v3', type: 'car', direction: 'N', totalWaitTime: 6 }
    ];

    receivedVehicles.forEach(v => lm.receiveDeparture('J1-J2', v, 0));

    assert(lm.metrics.totalReceived === 3, 'Total received = 3');
    assert(lm.getTotalInTransitCount() === 3, 'In-transit = 3');
    assert(lm.metrics.totalDelivered === 0, 'Total delivered = 0');

    // Conservation check: totalReceived == inTransit + totalDelivered
    assert(
      lm.metrics.totalReceived === lm.getTotalInTransitCount() + lm.metrics.totalDelivered,
      'Link conservation equation holds before transit completion'
    );

    // Complete transit for all
    lm.tick(306, 306);
    assert(lm.metrics.totalReceived === 3, 'Total received remains 3');
    assert(lm.getTotalInTransitCount() === 0, 'In-transit = 0');
    assert(lm.metrics.totalDelivered === 3, 'Total delivered = 3');
    assert(
      lm.metrics.totalReceived === lm.getTotalInTransitCount() + lm.metrics.totalDelivered,
      'Link conservation equation holds after transit completion'
    );
    console.log('  ✅ Test F Passed: Conservation invariant holds across lifecycle.');
  }

  // ----------------------------------------------------
  // TEST G: ZERO-TELEPORTATION TIMING & RESET
  // ----------------------------------------------------
  console.log('--- TEST G: Zero-Teleportation & Deterministic Reset ---');
  {
    const lm = new LinkManager();
    const mockDep = { id: 'reset-veh-1', type: 'car', direction: 'N' };

    lm.receiveDeparture('J1-J2', mockDep, 0);
    assert(lm.getTotalInTransitCount() === 1, 'In-transit is 1');

    lm.reset();
    assert(lm.getTotalInTransitCount() === 0, 'In-transit must be 0 after reset');
    assert(lm.metrics.totalReceived === 0, 'Metrics totalReceived reset to 0');
    assert(lm.metrics.totalDelivered === 0, 'Metrics totalDelivered reset to 0');
    assert(lm.pollCompletedTransits('J1-J2').length === 0, 'Completed transits must be empty after reset');
    console.log('  ✅ Test G Passed: Reset operates deterministically.');
  }

  // ----------------------------------------------------
  // TEST H: J3/J4 DASHBOARD ISOLATION
  // ----------------------------------------------------
  console.log('--- TEST H: J3 / J4 Isolation Verification ---');
  {
    const j3 = new JunctionSimulation('J3', 12345);
    const j4 = new JunctionSimulation('J4', 12346);
    const lm = new LinkManager();

    const j3InitialState = j3.getState();
    const j4InitialState = j4.getState();

    // Perform J1->J2 transfer in LinkManager
    lm.receiveDeparture('J1-J2', { id: 'transfer-veh-99', type: 'car', direction: 'N' }, 0);
    lm.tick(306, 306);
    const completed = lm.pollCompletedTransits('J1-J2');

    // Verify J3 vehicle state has not been contaminated
    const j3Cars = Object.values(j3.vehicleManager.cars).flat();
    assert(!j3Cars.some(c => c.id === 'transfer-veh-99'), 'J3 cars must NOT contain transferred vehicle');

    // Verify J4 vehicle state has not been contaminated
    const j4Cars = Object.values(j4.vehicleManager.cars).flat();
    assert(!j4Cars.some(c => c.id === 'transfer-veh-99'), 'J4 cars must NOT contain transferred vehicle');

    console.log('  ✅ Test H Passed: J3 and J4 remain 100% isolated from J1-J2 link transfers.');
  }

  // ----------------------------------------------------
  // TEST I: J2 -> J3 TRANSFER VERIFICATION (PHASE 10.3B.2)
  // ----------------------------------------------------
  console.log('--- TEST I: J2 -> J3 Transfer Verification ---');
  {
    const lm = new LinkManager();
    const mockDep = {
      id: 'car-J2-J3-test',
      type: 'car',
      direction: 'N',
      totalWaitTime: 10.0
    };

    lm.receiveDeparture('J2-J3', mockDep, 0);
    assert(lm.getTotalInTransitCount() === 1, 'Departure must be accepted into J2-J3 link');

    // Advance 377 seconds
    lm.tick(377, 377);
    assert(lm.pollCompletedTransits('J2-J3').length === 0, 'No vehicle should be completed at 377s');

    // Advance 1 more second (total 378s)
    lm.tick(1.0, 378);
    assert(lm.getTotalInTransitCount() === 0, 'Vehicle must no longer be in active transit at 378s');
    const completed = lm.pollCompletedTransits('J2-J3');
    assert(completed.length === 1, 'Vehicle must be ready for downstream injection at 378s');
    assert(completed[0].id === 'car-J2-J3-test', 'Completed vehicle ID must match');
    assert(completed[0].exitTimeSec === 378, 'Completed exitTimeSec must match arrival time');
    console.log('  ✅ Test I Passed: Exact 378-second travel time model verified for J2-J3.');
  }

  // ----------------------------------------------------
  // TEST J: J3 -> J4 TRANSFER VERIFICATION (PHASE 10.3B.3)
  // ----------------------------------------------------
  console.log('--- TEST J: J3 -> J4 Transfer Verification ---');
  {
    const lm = new LinkManager();
    const mockDep = {
      id: 'car-J3-J4-test',
      type: 'car',
      direction: 'N',
      totalWaitTime: 12.5
    };

    lm.receiveDeparture('J3-J4', mockDep, 0);
    assert(lm.getTotalInTransitCount() === 1, 'Departure must be accepted into J3-J4 link');

    // Advance 521 seconds
    lm.tick(521, 521);
    assert(lm.pollCompletedTransits('J3-J4').length === 0, 'No vehicle should be completed at 521s');

    // Advance 1 more second (total 522s)
    lm.tick(1.0, 522);
    assert(lm.getTotalInTransitCount() === 0, 'Vehicle must no longer be in active transit at 522s');
    const completed = lm.pollCompletedTransits('J3-J4');
    assert(completed.length === 1, 'Vehicle must be ready for downstream injection at 522s');
    assert(completed[0].id === 'car-J3-J4-test', 'Completed vehicle ID must match');
    assert(completed[0].exitTimeSec === 522, 'Completed exitTimeSec must match arrival time');
    console.log('  ✅ Test J Passed: Exact 522-second travel time model verified for J3-J4.');
  }

  // ----------------------------------------------------
  // TEST K: MINIMAL DISCRETE MOVEMENT ABSTRACTION
  // ----------------------------------------------------
  console.log('--- TEST K: Minimal Discrete Movement Abstraction ---');
  {
    const j2 = new JunctionSimulation('J2', 12344);
    
    // 1. Inject vehicle into W with planned exit N
    const injectionReceipt = j2.vehicleManager.injectExternalArrival('W', {
      eventId: 'movement-test-1',
      vehicleType: 'car',
      plannedExitApproach: 'N'
    });
    assert(injectionReceipt.accepted === true, 'J2 must accept movement test arrival');
    
    // 2. Fast forward until vehicle departs
    let departed = false;
    let departureObj = null;
    for (let t = 0; t < 300; t++) {
      j2.tick(1.0, t);
      const deps = j2.getState().departedCars;
      const found = deps?.find(d => d.id === 'movement-test-1');
      if (found) {
        departed = true;
        departureObj = found;
        break;
      }
    }
    
    assert(departed === true, 'Vehicle must eventually depart');
    assert(departureObj.id === 'movement-test-1', 'Departure ID must match');
    assert(departureObj.direction === 'N', 'Departure direction must be overridden by plannedExitApproach (N)');
    
    // 3. Inject vehicle into W without planned exit (backward compatibility)
    const injectionReceipt2 = j2.vehicleManager.injectExternalArrival('W', {
      eventId: 'movement-test-2',
      vehicleType: 'car'
    });
    assert(injectionReceipt2.accepted === true, 'J2 must accept second movement test arrival');
    
    let departed2 = false;
    let departureObj2 = null;
    for (let t = 0; t < 300; t++) {
      j2.tick(1.0, t);
      const deps = j2.getState().departedCars;
      const found = deps?.find(d => d.id === 'movement-test-2');
      if (found) {
        departed2 = true;
        departureObj2 = found;
        break;
      }
    }
    
    assert(departed2 === true, 'Second vehicle must eventually depart');
    assert(departureObj2.id === 'movement-test-2', 'Second departure ID must match');
    assert(departureObj2.direction === 'W', 'Departure direction must fallback to bucket approach (W)');
    console.log('  ✅ Test K Passed: Discrete movement abstraction respects plannedExitApproach and maintains backward compatibility.');
  }

  console.log('\n================================================================');
  console.log('  ALL LINKMANAGER & TRANSFER TESTS PASSED (11/11)               ');
  console.log('================================================================\n');

  return {
    totalTests: 11,
    passedTests: 11,
    status: 'ALL_PASSED'
  };
}
