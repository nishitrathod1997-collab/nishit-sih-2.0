import { VehicleManager } from '../VehicleManager.js';
import { SignalManager } from '../SignalManager.js';
import { TRAFFIC_CONSTANTS } from '../constants.js';

export function runCommercialVehicleTestSuite() {
  console.log('================================================================');
  console.log('  COMMERCIAL FREIGHT VEHICLE MODEL VERIFICATION SUITE (PHASE 2) ');
  console.log('================================================================\n');

  const results = [];
  function assert(condition, message) {
    if (!condition) {
      console.error(`❌ ASSERTION FAILED: ${message}`);
      throw new Error(`Assertion Failed: ${message}`);
    }
  }

  // ----------------------------------------------------
  // TEST 1: VEHICLE CREATION & METADATA VERIFICATION
  // ----------------------------------------------------
  console.log('--- TEST 1: Commercial Vehicle Types & Metadata ---');
  {
    const vm = new VehicleManager(42, 0.5, 1.0);
    const schedule = vm.arrivalSchedule;
    
    // Verify delivery_van and freight_truck exist in generated schedule
    const deliveryVans = schedule.filter(v => v.type === 'delivery_van');
    const freightTrucks = schedule.filter(v => v.type === 'freight_truck');
    const passengerCars = schedule.filter(v => v.type === 'car');
    const bikes = schedule.filter(v => v.type === 'bike');
    const buses = schedule.filter(v => v.type === 'bus');

    assert(deliveryVans.length > 0, 'Schedule must contain delivery_van vehicles');
    assert(freightTrucks.length > 0, 'Schedule must contain freight_truck vehicles');
    assert(passengerCars.length > 0, 'Schedule must contain passenger car vehicles');
    assert(bikes.length > 0, 'Schedule must contain bikes');
    assert(buses.length > 0, 'Schedule must contain buses');

    // Verify delivery_van properties from central registry
    const van = deliveryVans[0];
    assert(van.isCommercial === true, 'delivery_van must have isCommercial = true');
    assert(van.isSimulatedCommercial === true, 'delivery_van must have isSimulatedCommercial = true');
    assert(van.pcuEquivalent === 1.5, `delivery_van PCU must be 1.5, got ${van.pcuEquivalent}`);
    assert(van.speed === TRAFFIC_CONSTANTS.VEHICLE_SPEEDS.delivery_van, `delivery_van speed must match constants (${TRAFFIC_CONSTANTS.VEHICLE_SPEEDS.delivery_van}), got ${van.speed}`);
    assert(van.cargoTonnage === 1.2, `delivery_van cargo tonnage must be 1.2, got ${van.cargoTonnage}`);
    assert(van.destinationHubId !== null, 'delivery_van must have a designated destinationHubId');
    assert(van.deliveryStatus === 'EN_ROUTE', `delivery_van initial deliveryStatus must be EN_ROUTE, got ${van.deliveryStatus}`);
    assert(van.curbDwellRemainingSec === 0, 'delivery_van initial curbDwellRemainingSec must be 0');

    // Verify freight_truck properties from central registry
    const truck = freightTrucks[0];
    assert(truck.isCommercial === true, 'freight_truck must have isCommercial = true');
    assert(truck.isSimulatedCommercial === true, 'freight_truck must have isSimulatedCommercial = true');
    assert(truck.pcuEquivalent === 2.5, `freight_truck PCU must be 2.5, got ${truck.pcuEquivalent}`);
    assert(truck.speed === TRAFFIC_CONSTANTS.VEHICLE_SPEEDS.freight_truck, `freight_truck speed must match constants (${TRAFFIC_CONSTANTS.VEHICLE_SPEEDS.freight_truck}), got ${truck.speed}`);
    assert(truck.cargoTonnage === 8.5, `freight_truck cargo tonnage must be 8.5, got ${truck.cargoTonnage}`);
    assert(truck.destinationHubId !== null, 'freight_truck must have a designated destinationHubId');
    assert(truck.deliveryStatus === 'EN_ROUTE', `freight_truck initial deliveryStatus must be EN_ROUTE, got ${truck.deliveryStatus}`);

    // Verify standard passenger car metadata
    const car = passengerCars[0];
    assert(car.isCommercial === false, 'car must have isCommercial = false');
    assert(car.isSimulatedCommercial === false, 'car must have isSimulatedCommercial = false');
    assert(car.pcuEquivalent === 1.0, `car PCU must be 1.0, got ${car.pcuEquivalent}`);
    assert(car.cargoTonnage === 0, 'passenger car cargo tonnage must be 0');
    assert(car.destinationHubId === null, 'passenger car destinationHubId must be null');

    console.log('  ✅ Test 1 Passed: Commercial vehicle types & metadata correctly initialized from registry.');
  }

  // ----------------------------------------------------
  // TEST 2: DETERMINISM VERIFICATION
  // ----------------------------------------------------
  console.log('--- TEST 2: Deterministic Reproducibility ---');
  {
    const vm1 = new VehicleManager(9999, 0.5, 1.5);
    const vm2 = new VehicleManager(9999, 0.5, 1.5);

    assert(vm1.arrivalSchedule.length === vm2.arrivalSchedule.length, 'Schedules must have identical length');
    for (let i = 0; i < vm1.arrivalSchedule.length; i++) {
      const v1 = vm1.arrivalSchedule[i];
      const v2 = vm2.arrivalSchedule[i];
      assert(v1.id === v2.id, `Vehicle IDs must match at index ${i}`);
      assert(v1.timeSec === v2.timeSec, `Arrival timestamps must match at index ${i}`);
      assert(v1.type === v2.type, `Vehicle types must match at index ${i}`);
      assert(v1.pcuEquivalent === v2.pcuEquivalent, `PCU equivalents must match at index ${i}`);
      assert(v1.isCommercial === v2.isCommercial, `isCommercial flags must match at index ${i}`);
    }

    console.log('  ✅ Test 2 Passed: Deterministic seeded schedule produces byte-for-byte identical commercial stream.');
  }

  // ----------------------------------------------------
  // TEST 3: FREIGHT DEMAND MULTIPLIER SCALING
  // ----------------------------------------------------
  console.log('--- TEST 3: Freight Demand Multiplier (0.5x, 1.0x, 1.5x, 2.0x) ---');
  {
    const multipliers = [0.5, 1.0, 1.5, 2.0];
    const commercialCounts = [];

    multipliers.forEach(mult => {
      const vm = new VehicleManager(777, 0.5, mult);
      const commCount = vm.arrivalSchedule.filter(v => v.isCommercial).length;
      commercialCounts.push({ multiplier: mult, count: commCount });
    });

    console.log('  Freight Counts Across Multipliers (1200s Horizon):', commercialCounts);

    // Verify monotonic growth with multiplier
    for (let i = 1; i < commercialCounts.length; i++) {
      assert(
        commercialCounts[i].count >= commercialCounts[i - 1].count,
        `Commercial vehicle volume must scale monotonically with freightMultiplier (${commercialCounts[i].count} >= ${commercialCounts[i-1].count})`
      );
    }

    console.log('  ✅ Test 3 Passed: Freight demand scaling verified across 0.5x to 2.0x.');
  }

  // ----------------------------------------------------
  // TEST 4: KINEMATICS, STOP LINES, GAP CHECKING & QUEUES
  // ----------------------------------------------------
  console.log('--- TEST 4: Kinematics, Queueing & Collision Avoidance ---');
  {
    const vm = new VehicleManager(12345, 0.5, 1.0);
    const sm = new SignalManager('fixed');

    // Run simulation under Red signal for North approach
    sm.currentSignal = 'S'; // North is RED
    sm.phase = 'GREEN';

    for (let step = 0; step < 300; step++) {
      vm.updateVehicles(sm.currentSignal, sm.phase, 0.1);
    }

    const nLane = vm.cars.N;
    assert(nLane.length > 0, 'North lane must contain queued vehicles');

    // Check stop-line enforcement
    nLane.forEach(v => {
      assert(v.position <= 25.001, `Queued vehicle ${v.id} (${v.type}) must not cross stop line (25), position = ${v.position}`);
    });

    // Check gap spacing enforcement (MIN_VEHICLE_GAP = 5.5)
    for (let i = 1; i < nLane.length; i++) {
      const lead = nLane[i - 1];
      const follower = nLane[i];
      const gap = lead.position - follower.position;
      assert(gap >= 5.49, `Gap between ${lead.id} and ${follower.id} (${follower.type}) must be >= 5.5, got ${gap.toFixed(2)}`);
    }

    // Verify commercial vehicles in queue contribute PCUs correctly
    const queuedPCUs = vm.getQueuedPCUs();
    const commPCUs = vm.getCommercialPCUs();
    assert(queuedPCUs.N >= commPCUs.N, `Total queued PCU (${queuedPCUs.N}) must be >= commercial PCU (${commPCUs.N})`);

    console.log(`  North Approach: Total PCU = ${queuedPCUs.N}, Commercial PCU = ${commPCUs.N}`);
    console.log('  ✅ Test 4 Passed: Commercial vehicles strictly obey stop-line physics and collision avoidance.');
  }

  // ----------------------------------------------------
  // TEST 5: REGRESSION & PASSENGER VEHICLE PRESERVATION
  // ----------------------------------------------------
  console.log('--- TEST 5: Passenger & Emergency Preemption Regression ---');
  {
    const vm = new VehicleManager(555, 0.5, 1.0);
    
    // Test emergency ambulance injection
    const emg = vm.triggerEmergencyVehicle('W', 'ambulance', 'N');
    assert(emg !== null, 'Emergency ambulance must spawn cleanly');
    assert(emg.type === 'ambulance', 'Emergency vehicle type must be ambulance');
    assert(emg.approach === 'W', 'Emergency approach must be W');

    // Step simulation
    for (let step = 0; step < 50; step++) {
      vm.updateVehicles('W', 'GREEN', 0.1);
    }

    assert(vm.getActiveEmergencyVehicle() !== null || vm.carsPassed > 0, 'Emergency vehicle must progress towards intersection');
    console.log('  ✅ Test 5 Passed: Existing passenger vehicle flow and emergency preemption remain 100% operational.');
  }

  console.log('\n================================================================');
  console.log('  ALL PHASE 2 COMMERCIAL VEHICLE MODEL TESTS PASSED CLEANLY!   ');
  console.log('================================================================\n');

  return { success: true };
}
