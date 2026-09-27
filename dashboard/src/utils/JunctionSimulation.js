import { VehicleManager } from './VehicleManager.js';
import { SignalManager } from './SignalManager.js';

/**
 * JunctionSimulation encapsulates the state and logic for a single intersection,
 * wrapping its own isolated VehicleManager and SignalManager.
 */
export class JunctionSimulation {
  constructor(id, seed, config = {}) {
    this.id = id;
    this.seed = seed;
    this.config = config;

    this.vehicleManager = new VehicleManager(
      seed,
      config.demandMultiplier !== undefined ? config.demandMultiplier : 1.0,
      config.freightDemandMultiplier !== undefined ? config.freightDemandMultiplier : 1.0,
      id
    );
    this.vehicleManager.start();

    this.signalManager = new SignalManager(config.initialStrategy || 'adaptive');
  }

  /**
   * Advances the simulation by subDt seconds.
   */
  tick(subDt, options = {}) {
    const { strategy = 'adaptive', demandOverrides = null } = options;
    this.signalManager.setStrategy(strategy);

    const stoppedQueues = this.vehicleManager.getStoppedQueues();
    const queuedPCUs = this.vehicleManager.getQueuedPCUs();
    const oldestWaitTimes = this.vehicleManager.getOldestWaitTimes();
    const totalQueues = this.vehicleManager.getQueueLengths();

    const isIntersectionOccupied = this.vehicleManager.isIntersectionOccupied();
    const activeEmergency = this.vehicleManager.getActiveEmergencyVehicle();

    this.signalManager.checkEmergencyCleared(activeEmergency, totalQueues);

    const hasActiveCrossing = typeof this.vehicleManager.hasActiveCrossingVehicles === 'function'
      ? this.vehicleManager.hasActiveCrossingVehicles(this.signalManager.currentSignal)
      : false;

    // Advance signal controller
    this.signalManager.updateSignal(
      totalQueues,
      stoppedQueues,
      queuedPCUs,
      oldestWaitTimes,
      subDt,
      isIntersectionOccupied,
      hasActiveCrossing,
      demandOverrides
    );

    // Advance vehicle positions
    const updateResult = this.vehicleManager.updateVehicles(
      this.signalManager.currentSignal,
      this.signalManager.phase,
      subDt
    );

    this.lastDepartedCars = updateResult?.departedCars || [];
    return updateResult || { departedCars: [] };
  }

  /**
   * Returns a serializable representation of this junction's state.
   */
  getState() {
    const vState = this.vehicleManager.getState();
    const sState = this.signalManager.getState(vState.queues, vState.cars);

    return {
      id: this.id,
      seed: this.seed,
      ...vState,
      signal: sState.current_signal,
      signal_timer: sState.signal_timer,
      signal_phase: sState.signal_phase,
      throughput: this.vehicleManager.calculateThroughput(),
      departedCars: this.lastDepartedCars || []
    };
  }

  reset() {
    this.lastDepartedCars = [];
    this.vehicleManager.reset(this.seed);
    this.vehicleManager.start();
    this.signalManager = new SignalManager(this.config.initialStrategy || 'adaptive');
  }
}
