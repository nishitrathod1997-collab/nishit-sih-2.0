export const TRAFFIC_CONSTANTS = {
  // Core Time & Tick Configuration
  MIN_SIGNAL_TIME: 10,
  MAX_SIGNAL_TIME: 60,
  BASE_TIME_PER_CAR: 2.0,
  POLL_INTERVAL: 1000,
  SIMULATION_TIME_SCALE: 1.0, // 1 sim second = 1 real second at 1.0x speed

  // Data & Metric Provenance Tags
  PROVENANCE: {
    LIVE_SIMULATION: 'LIVE_SIMULATION',
    VISION: 'VISION',
    HISTORICAL: 'HISTORICAL',
    ASSUMPTION: 'ASSUMPTION',
    DERIVED: 'DERIVED'
  },

  // Authoritative Resource & Environmental Assumptions Registry
  RESOURCE_REGISTRY: {
    FUEL_CONSUMPTION_RATE: {
      key: 'FUEL_CONSUMPTION_RATE',
      name: 'Idle Fuel Consumption Rate',
      value: 0.00028,
      unit: 'L/sec',
      sourceType: 'ASSUMPTION',
      description: 'Assumed proxy for idle fuel consumption'
    },
    CO2_FACTOR: {
      key: 'CO2_FACTOR',
      name: 'CO2 Emission Factor',
      value: 2.31,
      unit: 'kg CO2/L',
      sourceType: 'ASSUMPTION',
      description: 'Assumed conversion factor'
    },
    FUEL_COST: {
      key: 'FUEL_COST',
      name: 'Fuel Retail Price',
      value: 105,
      unit: 'INR/L',
      sourceType: 'ASSUMPTION',
      description: 'Assumed current fuel price'
    },
    COMMUTER_TIME_VALUE_PER_HOUR: {
      key: 'COMMUTER_TIME_VALUE_PER_HOUR',
      name: 'Passenger Time Valuation',
      value: 200,
      unit: 'INR/hour',
      sourceType: 'ASSUMPTION',
      description: 'Assumed economic commuter road-user-cost'
    },
    FREIGHT_DELAY_COST_PER_HOUR: {
      key: 'FREIGHT_DELAY_COST_PER_HOUR',
      name: 'Commercial Freight Delay Cost',
      value: 500,
      unit: 'INR/hour',
      sourceType: 'ASSUMPTION',
      description: 'Assumed economic freight road-user-cost'
    }
  },

  // Backward-compatible direct resource accessors (Restored as ASSUMPTIONS)
  FUEL_CONSUMPTION_RATE: 0.00028, // L/sec delay reduction
  CO2_FACTOR: 2.31, // kg CO2 per liter of gasoline
  FUEL_COST: 105, // INR/L
  COMMUTER_TIME_VALUE_PER_HOUR: 200, // INR/hour commuter time valuation
  FREIGHT_DELAY_COST_PER_HOUR: 500, // INR/hour freight delay valuation
  TRADITIONAL_WAIT_TIME: 45.0, // seconds baseline fixed plan delay

  // Vehicle Classes & PCU Conversion Weights (CONFIGURABLE SIMULATION PARAMETER — PCU weighting assumption)
  // Not an official universal standard. These are simulation assumptions for capacity scaling.
  PCU_WEIGHTS: {
    car: 1.0,
    bike: 0.5,
    bus: 2.5,
    truck: 2.5, // Legacy truck support
    delivery_van: 1.5, // Light commercial vehicle (LCV)
    freight_truck: 2.5, // Heavy commercial vehicle (HCV)
    emergency: 1.0
  },

  // Vehicle Kinematics Speed Profiles (simulation units/sec)
  VEHICLE_SPEEDS: {
    bike: 7.5,
    car: 6.0,
    delivery_van: 5.2,
    bus: 4.5,
    truck: 4.0,
    freight_truck: 3.8,
    emergency: 9.0
  },

  // Commercial Vehicle Defaults
  COMMERCIAL_DEFAULTS: {
    CARGO_TONNAGE: {
      delivery_van: 1.2, // metric tonnes
      freight_truck: 8.5, // metric tonnes
      truck: 6.0
    },
    FREIGHT_SPAWN_BASE_FRACTION: 0.18 // ~18% base freight proportion in mixed flow
  },

  // Logistics Hubs & Curb Side Policy
  LOGISTICS_POLICY: {
    DEFAULT_BAYS: 3,
    MIN_BAYS: 1,
    MAX_BAYS: 6,
    DEFAULT_DWELL_SEC: 45,
    MIN_DWELL_SEC: 15,
    MAX_DWELL_SEC: 120,
    NOMINAL_LANES_DEFAULT: 3,
    NOMINAL_CAPACITY_PER_LANE_PCU_HR: 1800, // CONFIGURABLE SIMULATION PARAMETER - ASSUMED THEORETICAL CAPACITY CEILING
    CAPACITY_REDUCTION_FACTOR_PER_BLOCKED_LANE: 0.333, // 1/3 road capacity reduction per blocked curb lane
    SPILLOVER_QUEUE_THRESHOLD: 1, // 1 queued vehicle without available bay causes curb spillover
    DEFAULT_HUBS: [
      {
        hubId: 'HUB_DDR_01',
        name: 'Dadar Central Logistics Depot',
        associatedJunction: 'J2',
        approach: 'W',
        nominalLanes: 3,
        totalBays: 3,
        dwellTimeSec: 45
      },
      {
        hubId: 'HUB_BKC_01',
        name: 'BKC Freight & Delivery Hub',
        associatedJunction: 'J3',
        approach: 'S',
        nominalLanes: 3,
        totalBays: 4,
        dwellTimeSec: 60
      }
    ]
  },

  // Multi-Factor Signal Optimization & Weighting Policy
  SIGNAL_WEIGHTS: {
    PASSENGER: 1.0,
    FREIGHT: 1.3,
    BUS: 1.4,
    EMERGENCY: 10.0
  },

  // Corridor Backpressure & Guardrail Thresholds
  CORRIDOR_GUARDRAILS: {
    DOWNSTREAM_SATURATION_THROTTLE: 0.80, // >= 80% saturation suppresses upstream green extension
    DOWNSTREAM_CRITICAL_SATURATION: 0.90, // >= 90% triggers spillback warning
    PASSENGER_STARVATION_LIMIT_SEC: 45, // Max seconds passenger approach can starve
    FREIGHT_SURGE_PCU_THRESHOLD: 30, // Freight PCU demand threshold for surge classification
    PASSENGER_SURGE_PCU_THRESHOLD: 40 // Passenger PCU demand threshold for surge classification
  },

  // Root Cause Diagnostic Rules & Taxonomy
  DIAGNOSTIC_POLICY: {
    EVIDENCE_LEVELS: {
      HIGH: 'HIGH',
      MEDIUM: 'MEDIUM',
      LOW: 'LOW'
    },
    SEVERITY: {
      CRITICAL: 'CRITICAL',
      HIGH: 'HIGH',
      MEDIUM: 'MEDIUM',
      LOW: 'LOW'
    },
    PRIMARY_CAUSES: {
      EMERGENCY_PREEMPTION: 'EMERGENCY_PREEMPTION',
      CURB_SPILLOVER: 'CURB_SPILLOVER',
      DOWNSTREAM_BACKPRESSURE: 'DOWNSTREAM_BACKPRESSURE',
      FREIGHT_SURGE: 'FREIGHT_SURGE',
      PASSENGER_SURGE: 'PASSENGER_SURGE',
      NOMINAL_CONGESTION: 'NOMINAL_CONGESTION'
    }
  },

  // Emergency Priority Profiles
  EMERGENCY_TYPES: {
    AMBULANCE: { priority: 3, spawnRate: 0.0008 },
    FIRE: { priority: 2, spawnRate: 0.0004 },
    POLICE: { priority: 1, spawnRate: 0.0003 }
  },

  DIRECTIONS: ['N', 'S', 'E', 'W'],
  LANE_WEIGHTS: { N: 0.3, S: 0.25, E: 0.25, W: 0.2 },

  // Weather-Adaptive Clearance Configuration
  WEATHER_POLICY: {
    DEFAULT_MODE: 'normal',
    MODES: ['normal', 'rain', 'fog'],
    MULTIPLIERS: {
      normal: 1.0,
      rain: 1.2,
      fog: 1.4
    },
    NOMINAL_YELLOW_SEC: 3.0,
    NOMINAL_ALL_RED_SEC: 1.0,
    CLEARANCE_BOUNDS: {
      yellow: { min: 3.0, max: 4.2 },
      allRed: { min: 1.0, max: 1.4 }
    }
  },

  // Demand Policies
  DEMAND_POLICY: {
    DEFAULT_GENERATED_DEMAND_MULTIPLIER: 0.5,
    DEFAULT_FREIGHT_DEMAND_MULTIPLIER: 1.0,
    OPTIONS: [
      { value: 0.5, label: 'Moderate 0.5×' },
      { value: 1.0, label: 'Standard 1.0×' },
      { value: 1.5, label: 'Peak Freight 1.5×' },
      { value: 2.0, label: 'Heavy Surge 2.0×' }
    ]
  },

  // Signal Policy
  SIGNAL_POLICY: {
    MIN_GREEN: 10,
    MAX_GREEN: 60,
    MAX_CONTINUOUS_GREEN: 60,
    BASE_GREEN: 10,
    SECONDS_PER_PCU: 1.0,
    ADAPTIVE_SECONDS_PER_PCU: 1.0,
    SWITCH_MARGIN_PCU: 3.0,
    STARVATION_THRESHOLD_SEC: 45,
    STARVATION_BOOST_PER_SEC: 0.5,
    MAX_RED_WAIT_SEC: 60,
    YELLOW_DURATION_SEC: 3,
    ALL_RED_DURATION_SEC: 1,
    FIXED_DURATIONS: { N: 45, S: 45, E: 45, W: 45 }
  }
};