import {
  UrbanResourcePressureEngine,
  PRESSURE_LEVELS,
  RECOMMENDATIONS,
  getPressureLevel
} from '../UrbanResourcePressureEngine.js';

export function runUrbanResourcePressureTestSuite() {
  console.log('================================================================');
  console.log('  URBAN RESOURCE PRESSURE & RESPONSE ENGINE TEST SUITE          ');
  console.log('================================================================\n');

  function assert(condition, message) {
    if (!condition) {
      console.error(`❌ ASSERTION FAILED: ${message}`);
      throw new Error(`Assertion Failed: ${message}`);
    }
  }

  // ----------------------------------------------------
  // TEST 1: Empty / Light Network Produces Stable Pressure
  // ----------------------------------------------------
  console.log('--- TEST 1: Empty / Light Network Produces Stable Pressure ---');
  {
    const engine = new UrbanResourcePressureEngine();
    const emptyInput = {
      junctions: {
        J1: { queues: { N: 0, S: 0, E: 0, W: 0 }, avg_wait_time: 0 },
        J2: { queues: { N: 0, S: 0, E: 0, W: 0 }, avg_wait_time: 0 },
        J3: { queues: { N: 0, S: 0, E: 0, W: 0 }, avg_wait_time: 0 },
        J4: { queues: { N: 0, S: 0, E: 0, W: 0 }, avg_wait_time: 0 }
      },
      linkManager: { getTotalInTransitCount: () => 0 },
      logisticsHubManager: {
        getAllHubs: () => [
          { hubId: 'HUB_DDR_01', totalBays: 3, occupiedBays: 0, curbQueue: [], curbSaturation: 0, laneBlocked: false },
          { hubId: 'HUB_BKC_01', totalBays: 4, occupiedBays: 0, curbQueue: [], curbSaturation: 0, laneBlocked: false }
        ]
      },
      freightSlotManager: {
        getStagedVehicles: () => [],
        getActiveSlotAssignments: () => []
      },
      state: {
        corridorFreight: { activeFreightCount: 0, totalFreightPcu: 0, totalCargoTonnage: 0 }
      },
      isEmergencyActive: false,
      simTime: 10
    };

    const res = engine.evaluate(emptyInput);
    assert(res.overallPressureIndex <= 20, `Empty network score should be low, got ${res.overallPressureIndex}`);
    assert(res.overallLevel === PRESSURE_LEVELS.STABLE, `Expected STABLE, got ${res.overallLevel}`);
    assert(res.primaryRecommendation.action === RECOMMENDATIONS.CONTINUE_NORMAL_OPERATION, 'Should recommend normal operation');
    assert(res.priorityState === null, 'Priority state should be null when emergency inactive');
    console.log(`  Overall Score: ${res.overallPressureIndex} (Level: ${res.overallLevel})`);
    console.log('  ✅ Test 1 Passed: Empty/light network produces Stable pressure.');
  }

  // ----------------------------------------------------
  // TEST 2: Increased PCU Queues Increase Road Network Pressure
  // ----------------------------------------------------
  console.log('--- TEST 2: Increased PCU Queues Increase Road Network Pressure ---');
  {
    const engine = new UrbanResourcePressureEngine();
    const light = engine.evaluate({
      junctions: {
        J1: { queues: { N: 2, S: 2, E: 2, W: 2 }, avg_wait_time: 5 },
        J2: { queues: { N: 2, S: 2, E: 2, W: 2 }, avg_wait_time: 5 },
        J3: { queues: { N: 2, S: 2, E: 2, W: 2 }, avg_wait_time: 5 },
        J4: { queues: { N: 2, S: 2, E: 2, W: 2 }, avg_wait_time: 5 }
      },
      simTime: 20
    });

    const heavy = engine.evaluate({
      junctions: {
        J1: { queues: { N: 25, S: 20, E: 15, W: 18 }, avg_wait_time: 35 },
        J2: { queues: { N: 20, S: 22, E: 18, W: 15 }, avg_wait_time: 35 },
        J3: { queues: { N: 30, S: 25, E: 20, W: 22 }, avg_wait_time: 40 },
        J4: { queues: { N: 15, S: 18, E: 12, W: 14 }, avg_wait_time: 30 }
      },
      simTime: 25
    });

    assert(heavy.categories.roadNetwork.score > light.categories.roadNetwork.score,
      `Heavy road score (${heavy.categories.roadNetwork.score}) must exceed light road score (${light.categories.roadNetwork.score})`);
    console.log(`  Light Road Score: ${light.categories.roadNetwork.score} vs Heavy Road Score: ${heavy.categories.roadNetwork.score}`);
    console.log('  ✅ Test 2 Passed: Increased PCU queues increase Road Network Pressure.');
  }

  // ----------------------------------------------------
  // TEST 3: Long Red Waiting Time Increases Intersection Pressure
  // ----------------------------------------------------
  console.log('--- TEST 3: Long Red Waiting Time Increases Intersection Pressure ---');
  {
    const engine = new UrbanResourcePressureEngine();
    const normalWait = engine.evaluate({
      junctions: {
        J3: {
          vehicleManager: {
            getQueueLengths: () => ({ N: 5, S: 5, E: 5, W: 5 }),
            getQueuedPCUs: () => ({ N: 5, S: 5, E: 5, W: 5 }),
            getStoppedQueues: () => ({ N: 3, S: 3, E: 3, W: 3 }),
            getOldestWaitTimes: () => ({ N: 8, S: 6, E: 7, W: 5 })
          }
        }
      },
      simTime: 30
    });

    const longWait = engine.evaluate({
      junctions: {
        J3: {
          vehicleManager: {
            getQueueLengths: () => ({ N: 5, S: 5, E: 5, W: 5 }),
            getQueuedPCUs: () => ({ N: 5, S: 5, E: 5, W: 5 }),
            getStoppedQueues: () => ({ N: 3, S: 3, E: 3, W: 3 }),
            getOldestWaitTimes: () => ({ N: 55, S: 45, E: 50, W: 40 })
          }
        }
      },
      simTime: 35
    });

    assert(longWait.categories.intersection.score > normalWait.categories.intersection.score,
      `Long wait intersection score (${longWait.categories.intersection.score}) must exceed normal (${normalWait.categories.intersection.score})`);
    console.log(`  Normal Wait: ${normalWait.categories.intersection.score} vs Long Wait: ${longWait.categories.intersection.score}`);
    console.log('  ✅ Test 3 Passed: Long red waiting time increases Intersection Pressure.');
  }

  // ----------------------------------------------------
  // TEST 4: Full Loading Bays Increase Curb & Hub Pressure
  // ----------------------------------------------------
  console.log('--- TEST 4: Full Loading Bays Increase Curb & Hub Pressure ---');
  {
    const engine = new UrbanResourcePressureEngine();
    const emptyHubs = engine.evaluate({
      junctions: { J1: { queues: {} } },
      logisticsHubManager: {
        getAllHubs: () => [
          { hubId: 'HUB_DDR_01', totalBays: 3, occupiedBays: 0, curbQueue: [], curbSaturation: 0, laneBlocked: false },
          { hubId: 'HUB_BKC_01', totalBays: 4, occupiedBays: 0, curbQueue: [], curbSaturation: 0, laneBlocked: false }
        ]
      },
      simTime: 40
    });

    const fullHubs = engine.evaluate({
      junctions: { J1: { queues: {} } },
      logisticsHubManager: {
        getAllHubs: () => [
          { hubId: 'HUB_DDR_01', totalBays: 3, occupiedBays: 3, curbQueue: [], curbSaturation: 50, laneBlocked: false },
          { hubId: 'HUB_BKC_01', totalBays: 4, occupiedBays: 4, curbQueue: [], curbSaturation: 75, laneBlocked: false }
        ]
      },
      simTime: 45
    });

    assert(fullHubs.categories.curbHub.score > emptyHubs.categories.curbHub.score,
      `Full hubs score (${fullHubs.categories.curbHub.score}) must exceed empty hubs (${emptyHubs.categories.curbHub.score})`);
    console.log(`  Empty Hubs: ${emptyHubs.categories.curbHub.score} vs Full Hubs: ${fullHubs.categories.curbHub.score}`);
    console.log('  ✅ Test 4 Passed: Full loading bays increase Curb & Hub Pressure.');
  }

  // ----------------------------------------------------
  // TEST 5: Curb Spillover Creates Lane-Capacity Contributing Factor
  // ----------------------------------------------------
  console.log('--- TEST 5: Curb Spillover Creates Lane-Capacity Factor ---');
  {
    const engine = new UrbanResourcePressureEngine();
    const spilloverRes = engine.evaluate({
      junctions: { J1: { queues: {} } },
      logisticsHubManager: {
        getAllHubs: () => [
          { hubId: 'HUB_BKC_01', name: 'BKC Freight Hub', totalBays: 4, occupiedBays: 4, curbQueue: [{}, {}, {}, {}], curbSaturation: 100, laneBlocked: true }
        ]
      },
      simTime: 50
    });

    const roadFactors = spilloverRes.categories.roadNetwork.contributingFactors;
    const hasCapacityFactor = roadFactors.some(f => f.includes('reduced effective road capacity'));
    assert(hasCapacityFactor, `Expected curb spillover lane capacity factor in ${JSON.stringify(roadFactors)}`);
    console.log(`  Detected factor: "${roadFactors.find(f => f.includes('reduced effective road capacity'))}"`);
    console.log('  ✅ Test 5 Passed: Curb spillover creates a lane-capacity contributing factor.');
  }

  // ----------------------------------------------------
  // TEST 6: Staged Vehicles Increase Freight System Pressure
  // ----------------------------------------------------
  console.log('--- TEST 6: Staged Vehicles Increase Freight System Pressure ---');
  {
    const engine = new UrbanResourcePressureEngine();
    const noStaging = engine.evaluate({
      junctions: { J1: { queues: {} } },
      freightSlotManager: {
        getStagedVehicles: () => [],
        getActiveSlotAssignments: () => []
      },
      state: { corridorFreight: { activeFreightCount: 3, totalFreightPcu: 5, totalCargoTonnage: 4 } },
      simTime: 60
    });

    const withStaging = engine.evaluate({
      junctions: { J1: { queues: {} } },
      freightSlotManager: {
        getStagedVehicles: () => [
          { vehicleId: 's1', decision: 'HOLD_AT_ORIGIN' },
          { vehicleId: 's2', decision: 'HOLD_AT_ORIGIN' },
          { vehicleId: 's3', decision: 'HOLD_AT_ORIGIN' }
        ],
        getActiveSlotAssignments: () => [{ id: 'slot1' }]
      },
      state: { corridorFreight: { activeFreightCount: 6, totalFreightPcu: 15, totalCargoTonnage: 18 } },
      simTime: 65
    });

    assert(withStaging.categories.freightSystem.score > noStaging.categories.freightSystem.score,
      `Freight pressure with staging (${withStaging.categories.freightSystem.score}) must exceed no-staging (${noStaging.categories.freightSystem.score})`);
    console.log(`  No Staging: ${noStaging.categories.freightSystem.score} vs With Staging: ${withStaging.categories.freightSystem.score}`);
    console.log('  ✅ Test 6 Passed: Staged vehicles increase Freight System Pressure.');
  }

  // ----------------------------------------------------
  // TEST 7: Emergency Activates Emergency Override
  // ----------------------------------------------------
  console.log('--- TEST 7: Emergency Activates Emergency Override ---');
  {
    const engine = new UrbanResourcePressureEngine();
    const normal = engine.evaluate({
      junctions: { J1: { queues: { N: 5 } } },
      isEmergencyActive: false,
      simTime: 70
    });
    assert(normal.priorityState === null, 'Priority state must be null during normal flow');

    const emergency = engine.evaluate({
      junctions: { J1: { queues: { N: 5 } } },
      isEmergencyActive: true,
      simTime: 75
    });
    assert(emergency.priorityState === 'EMERGENCY OVERRIDE', `Expected EMERGENCY OVERRIDE, got ${emergency.priorityState}`);
    assert(emergency.primaryRecommendation.action === RECOMMENDATIONS.PRIORITIZE_EMERGENCY_CORRIDOR,
      'Emergency must produce PRIORITIZE_EMERGENCY_CORRIDOR recommendation');
    console.log(`  Priority State: "${emergency.priorityState}" • Action: "${emergency.primaryRecommendation.action}"`);
    console.log('  ✅ Test 7 Passed: Emergency activates Emergency Override priority state.');
  }

  // ----------------------------------------------------
  // TEST 8: Critical Hub Pressure Recommends HOLD_FREIGHT_UPSTREAM
  // ----------------------------------------------------
  console.log('--- TEST 8: Critical Hub Pressure Recommends HOLD_FREIGHT_UPSTREAM ---');
  {
    const engine = new UrbanResourcePressureEngine();
    const criticalHub = engine.evaluate({
      junctions: { J1: { queues: {} } },
      logisticsHubManager: {
        getAllHubs: () => [
          { hubId: 'HUB_BKC_01', name: 'BKC Hub', totalBays: 4, occupiedBays: 4, curbQueue: [{}, {}, {}, {}], curbSaturation: 100, laneBlocked: true }
        ]
      },
      simTime: 80
    });

    assert(criticalHub.primaryRecommendation.action === RECOMMENDATIONS.HOLD_FREIGHT_UPSTREAM,
      `Expected HOLD_FREIGHT_UPSTREAM, got ${criticalHub.primaryRecommendation.action}`);
    assert(criticalHub.primaryRecommendation.responsibleModule === 'FreightSlotManager',
      `Responsible module should be FreightSlotManager, got ${criticalHub.primaryRecommendation.responsibleModule}`);
    console.log(`  Recommendation: "${criticalHub.primaryRecommendation.action}" • Module: "${criticalHub.primaryRecommendation.responsibleModule}"`);
    console.log('  ✅ Test 8 Passed: Critical hub pressure recommends HOLD_FREIGHT_UPSTREAM.');
  }

  // ----------------------------------------------------
  // TEST 9: Stable Hub with Staged Vehicles Recommends RELEASE_STAGED_FREIGHT
  // ----------------------------------------------------
  console.log('--- TEST 9: Stable Hub with Staged Vehicles Recommends RELEASE_STAGED_FREIGHT ---');
  {
    const engine = new UrbanResourcePressureEngine();
    const recoverHub = engine.evaluate({
      junctions: { J1: { queues: {} } },
      logisticsHubManager: {
        getAllHubs: () => [
          { hubId: 'HUB_BKC_01', name: 'BKC Hub', totalBays: 4, occupiedBays: 1, curbQueue: [], curbSaturation: 0, laneBlocked: false }
        ]
      },
      freightSlotManager: {
        getStagedVehicles: () => [{ vehicleId: 'staged-01' }],
        getActiveSlotAssignments: () => []
      },
      isEmergencyActive: false,
      simTime: 90
    });

    assert(recoverHub.primaryRecommendation.action === RECOMMENDATIONS.RELEASE_STAGED_FREIGHT,
      `Expected RELEASE_STAGED_FREIGHT, got ${recoverHub.primaryRecommendation.action}`);
    console.log(`  Recommendation: "${recoverHub.primaryRecommendation.action}" • Reason: "${recoverHub.primaryRecommendation.reason}"`);
    console.log('  ✅ Test 9 Passed: Stable hub with staged vehicles recommends RELEASE_STAGED_FREIGHT.');
  }

  // ----------------------------------------------------
  // TEST 10: Scores Remain Within 0–100
  // ----------------------------------------------------
  console.log('--- TEST 10: Scores Clamped Between 0 and 100 ---');
  {
    const engine = new UrbanResourcePressureEngine();
    // Overloaded mega-congestion scenario
    const megaOverload = engine.evaluate({
      junctions: {
        J1: { queues: { N: 500, S: 500, E: 500, W: 500 }, avg_wait_time: 999 },
        J2: { queues: { N: 500, S: 500, E: 500, W: 500 }, avg_wait_time: 999 },
        J3: { queues: { N: 500, S: 500, E: 500, W: 500 }, avg_wait_time: 999 },
        J4: { queues: { N: 500, S: 500, E: 500, W: 500 }, avg_wait_time: 999 }
      },
      linkManager: { getTotalInTransitCount: () => 500 },
      logisticsHubManager: {
        getAllHubs: () => [
          { hubId: 'HUB_BKC_01', totalBays: 4, occupiedBays: 4, curbQueue: new Array(50).fill({}), curbSaturation: 500, laneBlocked: true }
        ]
      },
      freightSlotManager: {
        getStagedVehicles: () => new Array(50).fill({}),
        getActiveSlotAssignments: () => new Array(50).fill({})
      },
      state: { corridorFreight: { activeFreightCount: 100, totalFreightPcu: 250, totalCargoTonnage: 500 } },
      simTime: 100
    });

    assert(megaOverload.overallPressureIndex >= 0 && megaOverload.overallPressureIndex <= 100,
      `Overall score must be <= 100, got ${megaOverload.overallPressureIndex}`);
    assert(megaOverload.categories.roadNetwork.score <= 100, 'Road network score <= 100');
    assert(megaOverload.categories.intersection.score <= 100, 'Intersection score <= 100');
    assert(megaOverload.categories.curbHub.score <= 100, 'Curb hub score <= 100');
    assert(megaOverload.categories.freightSystem.score <= 100, 'Freight system score <= 100');
    console.log(`  Mega Overload Scores: Overall=${megaOverload.overallPressureIndex}, Road=${megaOverload.categories.roadNetwork.score}, Hub=${megaOverload.categories.curbHub.score}`);
    console.log('  ✅ Test 10 Passed: All scores strictly clamped between 0 and 100.');
  }

  // ----------------------------------------------------
  // TEST 11: Identical Input Produces Identical Result
  // ----------------------------------------------------
  console.log('--- TEST 11: Deterministic Consistency ---');
  {
    const engine1 = new UrbanResourcePressureEngine();
    const engine2 = new UrbanResourcePressureEngine();

    const mockInput = {
      junctions: {
        J1: { queues: { N: 10, S: 8, E: 6, W: 4 }, avg_wait_time: 14 }
      },
      logisticsHubManager: {
        getAllHubs: () => [
          { hubId: 'HUB_BKC_01', totalBays: 4, occupiedBays: 2, curbQueue: [{}], curbSaturation: 25, laneBlocked: false }
        ]
      },
      simTime: 110
    };

    const out1 = engine1.evaluate(mockInput);
    const out2 = engine2.evaluate(mockInput);

    assert(out1.overallPressureIndex === out2.overallPressureIndex, 'Scores must match');
    assert(out1.overallLevel === out2.overallLevel, 'Levels must match');
    assert(out1.primaryRecommendation.action === out2.primaryRecommendation.action, 'Actions must match');
    assert(JSON.stringify(out1.categories) === JSON.stringify(out2.categories), 'Category states must match');
    console.log('  ✅ Test 11 Passed: Identical inputs produce byte-for-byte identical output.');
  }

  // ----------------------------------------------------
  // TEST 12: Event is Created Only on Meaningful Changes
  // ----------------------------------------------------
  console.log('--- TEST 12: Event Logging Rate Limiting ---');
  {
    const engine = new UrbanResourcePressureEngine();
    const staticInput = {
      junctions: { J1: { queues: { N: 2, S: 2 } } },
      simTime: 120
    };

    // First tick creates baseline
    engine.evaluate(staticInput);
    assert(engine.events.length === 0, 'No event on initial baseline tick');

    // 10 identical ticks: should NOT create 10 events!
    for (let t = 1; t <= 10; t++) {
      engine.evaluate({ ...staticInput, simTime: 120 + t });
    }
    assert(engine.events.length === 0, `Expected 0 events for static state, got ${engine.events.length}`);

    // Trigger state change (Emergency Active)
    engine.evaluate({ ...staticInput, isEmergencyActive: true, simTime: 135 });
    assert(engine.events.length === 1, `Expected exactly 1 event on emergency change, got ${engine.events.length}`);
    assert(engine.events[0].isEmergency === true, 'Event must log emergency state');
    console.log(`  Events Logged: ${engine.events.length} (Only on state change)`);
    console.log('  ✅ Test 12 Passed: Event created only when pressure level or primary action changes.');
  }

  // ----------------------------------------------------
  // TEST 13: Reset Clears History and Previous Baselines
  // ----------------------------------------------------
  console.log('--- TEST 13: Reset Clears History ---');
  {
    const engine = new UrbanResourcePressureEngine();
    engine.evaluate({ junctions: { J1: { queues: { N: 2 } } }, simTime: 140 });
    engine.evaluate({ junctions: { J1: { queues: { N: 2 } } }, isEmergencyActive: true, simTime: 145 }); // triggers state change event
    assert(engine.events.length >= 1, 'Events populated');

    engine.reset();
    assert(engine.events.length === 0, 'Events must be empty after reset');
    assert(engine.previousLevel === null, 'previousLevel must be null after reset');
    assert(engine.previousPrimaryAction === null, 'previousPrimaryAction must be null after reset');
    console.log('  ✅ Test 13 Passed: Reset cleanly purges all event and baseline history.');
  }

  // ----------------------------------------------------
  // TEST 14: Missing Data Produces Safe UNAVAILABLE State
  // ----------------------------------------------------
  console.log('--- TEST 14: Missing Data Produces UNAVAILABLE State ---');
  {
    const engine = new UrbanResourcePressureEngine();
    const badInput = null;
    const res = engine.evaluate(badInput);

    assert(res.overallLevel === PRESSURE_LEVELS.UNAVAILABLE, `Expected UNAVAILABLE, got ${res.overallLevel}`);
    assert(res.provenance === 'UNAVAILABLE', `Expected provenance UNAVAILABLE, got ${res.provenance}`);
    assert(res.primaryRecommendation === null, 'Recommendation must be null when data unavailable');
    assert(res.contributingFactors.length > 0, 'Contributing factors should explain missing data');
    console.log(`  Fallback Output: Level="${res.overallLevel}" • Provenance="${res.provenance}"`);
    console.log('  ✅ Test 14 Passed: Missing data produces a safe UNAVAILABLE state without fabricated values.');
  }

  // ----------------------------------------------------
  // TEST 15: No Event for Identical Level Unless Action/Emergency/Spillover Changed
  // ----------------------------------------------------
  console.log('--- TEST 15: No Event for Identical Level Unless Action/Emergency/Spillover Changed ---');
  {
    const engine = new UrbanResourcePressureEngine();
    // Baseline tick
    engine.evaluate({ junctions: { J1: { queues: { N: 1 } } }, simTime: 0 });
    assert(engine.events.length === 0, 'No event on initial baseline');

    // Slight score increase within STABLE, same action (NORMAL), no emergency, no spillover
    engine.evaluate({ junctions: { J1: { queues: { N: 4 } } }, simTime: 10 });
    assert(engine.events.length === 0, 'Identical level without action/emergency/spillover change must NOT create event');

    // Now trigger spillover while level remains STABLE
    engine.evaluate({
      junctions: { J1: { queues: { N: 4 } } },
      logisticsHubManager: {
        getAllHubs: () => [{ hubId: 'HUB_1', laneBlocked: true, curbQueue: [{}, {}], occupiedBays: 1, totalBays: 3, curbSaturation: 50 }]
      },
      simTime: 15
    });
    assert(engine.events.length === 1, 'Spillover change must create an event even if level is unchanged');
    assert(engine.events[0].hasSpillover === true, 'Event must record spillover state');
    console.log('  ✅ Test 15 Passed: Identical level creates event ONLY when action, emergency, or spillover changes.');
  }

  // ----------------------------------------------------
  // TEST 16: Deduplicate Events Using 4-Tuple Signature
  // ----------------------------------------------------
  console.log('--- TEST 16: Deduplicate Events Using 4-Tuple Signature ---');
  {
    const engine = new UrbanResourcePressureEngine();
    // Baseline tick
    engine.evaluate({ junctions: { J1: { queues: { N: 5 } } }, simTime: 10 });
    assert(engine.events.length === 0, 'No event on initial baseline');

    const inputWithEmergency = {
      junctions: { J1: { queues: { N: 5 } } },
      isEmergencyActive: true,
      simTime: 20
    };
    engine.evaluate(inputWithEmergency); // First emergency transition -> logs 1 event
    assert(engine.events.length === 1, 'First emergency transition logs 1 event');

    // 10 subsequent ticks with same emergency + same action + same level + same spillover
    for (let t = 1; t <= 10; t++) {
      engine.evaluate({ ...inputWithEmergency, simTime: 20 + t });
    }
    assert(engine.events.length === 1, `Expected exactly 1 event after 10 identical signature ticks, got ${engine.events.length}`);
    console.log('  ✅ Test 16 Passed: Duplicate events strictly prevented using level+action+emergency+spillover signature.');
  }

  // ----------------------------------------------------
  // TEST 17: 5-Simulation-Second Stabilization Period
  // ----------------------------------------------------
  console.log('--- TEST 17: 5-Simulation-Second Stabilization Period ---');
  {
    const engine = new UrbanResourcePressureEngine();
    const lightNetwork = { junctions: { J1: { queues: { N: 1 } } } };
    const heavyNetwork = {
      junctions: {
        J1: { queues: { N: 60, S: 60, E: 60, W: 60 }, avg_wait_time: 60 },
        J2: { queues: { N: 60, S: 60, E: 60, W: 60 }, avg_wait_time: 60 },
        J3: { queues: { N: 60, S: 60, E: 60, W: 60 }, avg_wait_time: 60 },
        J4: { queues: { N: 60, S: 60, E: 60, W: 60 }, avg_wait_time: 60 }
      },
      logisticsHubManager: {
        getAllHubs: () => [
          { hubId: 'HUB_1', totalBays: 4, occupiedBays: 4, curbQueue: [{}, {}, {}, {}], curbSaturation: 100, laneBlocked: true }
        ]
      },
      state: {
        corridorFreight: { activeFreightCount: 10, totalFreightPcu: 25, totalCargoTonnage: 100 }
      }
    };

    // Baseline at T=0 (Confirmed STABLE)
    const baseRes = engine.evaluate({ ...lightNetwork, simTime: 0 });
    assert(baseRes.overallLevel === PRESSURE_LEVELS.STABLE, 'Initial level confirmed STABLE');
    assert(engine.events.length === 0, 'No event on initial baseline');

    // Sudden spike at T=1 (Score is CRITICAL, but only 0s elapsed)
    const t1 = engine.evaluate({ ...heavyNetwork, simTime: 1 });
    assert(t1.overallLevel === PRESSURE_LEVELS.STABLE, `At T=1 (0s elapsed), level must remain STABLE during stabilization, got ${t1.overallLevel}`);
    assert(engine.events.filter(e => e.previousLevel !== e.newLevel).length === 0, 'No level-change event during stabilization period');

    // At T=3 (2s elapsed)
    const t3 = engine.evaluate({ ...heavyNetwork, simTime: 3 });
    assert(t3.overallLevel === PRESSURE_LEVELS.STABLE, `At T=3 (2s elapsed), level must still be STABLE, got ${t3.overallLevel}`);
    assert(engine.events.filter(e => e.previousLevel !== e.newLevel).length === 0, 'Still no level-change event');

    // At T=6 (5s elapsed from T=1): now confirmed!
    const t6 = engine.evaluate({ ...heavyNetwork, simTime: 6 });
    assert(t6.overallLevel === PRESSURE_LEVELS.HIGH, `At T=6 (5s elapsed), level must confirm to HIGH, got ${t6.overallLevel}`);
    const levelEvents = engine.events.filter(e => e.previousLevel !== e.newLevel);
    assert(levelEvents.length === 1, `Exactly 1 level transition event must be logged after 5s, got ${levelEvents.length}`);
    assert(levelEvents[0].previousLevel === PRESSURE_LEVELS.STABLE, 'Previous level was STABLE');
    assert(levelEvents[0].newLevel === PRESSURE_LEVELS.HIGH, 'New level is HIGH');
    console.log('  ✅ Test 17 Passed: Level change strictly requires 5 simulation seconds of sustained stabilization.');
  }

  // ----------------------------------------------------
  // TEST 18: 3-Point Hysteresis Around Pressure Thresholds
  // ----------------------------------------------------
  console.log('--- TEST 18: 3-Point Hysteresis Around Pressure Thresholds ---');
  {
    // Thresholds: ELEVATED <= 64, HIGH 65-84
    // Hysteresis deadband = 3 points. High drops to ELEVATED only strictly below 65 - 3 = 62 (i.e. <= 61).
    assert(getPressureLevel(64, undefined, null) === PRESSURE_LEVELS.ELEVATED, 'Without current level, 64 is ELEVATED');
    assert(getPressureLevel(65, undefined, null) === PRESSURE_LEVELS.HIGH, 'Without current level, 65 is HIGH');

    // Coming from HIGH:
    assert(getPressureLevel(65, undefined, PRESSURE_LEVELS.HIGH, 3) === PRESSURE_LEVELS.HIGH, '65 in HIGH remains HIGH');
    assert(getPressureLevel(64, undefined, PRESSURE_LEVELS.HIGH, 3) === PRESSURE_LEVELS.HIGH, '64 in HIGH remains HIGH (within 3-pt hysteresis deadband)');
    assert(getPressureLevel(63, undefined, PRESSURE_LEVELS.HIGH, 3) === PRESSURE_LEVELS.HIGH, '63 in HIGH remains HIGH (within 3-pt hysteresis deadband)');
    assert(getPressureLevel(62, undefined, PRESSURE_LEVELS.HIGH, 3) === PRESSURE_LEVELS.HIGH, '62 in HIGH remains HIGH (deadband lower bound: 65 - 3 = 62)');
    assert(getPressureLevel(61, undefined, PRESSURE_LEVELS.HIGH, 3) === PRESSURE_LEVELS.ELEVATED, '61 in HIGH drops to ELEVATED (strictly below 62)');

    // Coming from ELEVATED:
    assert(getPressureLevel(61, undefined, PRESSURE_LEVELS.ELEVATED, 3) === PRESSURE_LEVELS.ELEVATED, '61 in ELEVATED remains ELEVATED');
    assert(getPressureLevel(62, undefined, PRESSURE_LEVELS.ELEVATED, 3) === PRESSURE_LEVELS.ELEVATED, '62 in ELEVATED remains ELEVATED');
    assert(getPressureLevel(63, undefined, PRESSURE_LEVELS.ELEVATED, 3) === PRESSURE_LEVELS.ELEVATED, '63 in ELEVATED remains ELEVATED');
    assert(getPressureLevel(64, undefined, PRESSURE_LEVELS.ELEVATED, 3) === PRESSURE_LEVELS.ELEVATED, '64 in ELEVATED remains ELEVATED');
    assert(getPressureLevel(65, undefined, PRESSURE_LEVELS.ELEVATED, 3) === PRESSURE_LEVELS.HIGH, '65 in ELEVATED crosses threshold to HIGH');

    console.log('  ✅ Test 18 Passed: 3-point hysteresis deadband (62-64) eliminates rapid HIGH/ELEVATED oscillation.');
  }

  console.log('\n================================================================');
  console.log('  ALL 18 URBAN RESOURCE PRESSURE ENGINE TESTS PASSED (18/18)    ');
  console.log('================================================================\n');

  return { success: true };
}
