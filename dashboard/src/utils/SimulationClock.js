/**
 * SimulationClock: Manages physical simulation time and delta-time (dt) tracking.
 * Subdivides elapsed simulation time into bounded sub-steps (max 0.05s) to guarantee
 * physical accuracy and prevent slow frames from skipping clearance phases or stop lines.
 * Caps background-tab resume catch-up delta to prevent time jumps.
 */
export class SimulationClock {
  constructor(initialSpeed = 1.0) {
    this.speed = initialSpeed;
    this.simTime = 0; // Total accumulated simulated seconds
    this.lastWallTime = Date.now();
  }

  setSpeed(speed) {
    const clampedSpeed = Math.max(0.1, Math.min(5.0, speed));
    this.speed = clampedSpeed;
  }

  /**
   * Advances clock based on real elapsed wall-time scaled by speed.
   * Clamps maximum catch-up delta to 0.5s to handle background-tab pause gracefully.
   * Subdivides overall dt into an array of sub-step deltas (max 0.05s each).
   * @param {number|null} forcedDtSec Optional explicit simulation dt in seconds
   * @returns {{ totalDt: number, subSteps: number[] }} Object containing totalDt and subStep array
   */
  tick(forcedDtSec = null) {
    const now = Date.now();
    const realElapsedSec = (now - this.lastWallTime) / 1000;
    this.lastWallTime = now;

    let dt = 0;
    if (forcedDtSec !== null) {
      dt = forcedDtSec;
    } else {
      // Clamp max realElapsed to 0.5s on tab resume / pause
      const clampedRealSec = Math.min(realElapsedSec, 0.5);
      // Speed scaling applied EXACTLY ONCE
      dt = clampedRealSec * this.speed;
    }

    this.simTime += dt;

    // Subdivide dt into max 0.05s sub-steps
    const maxSubStep = 0.05;
    const subSteps = [];
    let remaining = dt;
    while (remaining > 0) {
      const step = Math.min(remaining, maxSubStep);
      subSteps.push(step);
      remaining -= step;
    }

    return {
      totalDt: dt,
      subSteps: subSteps.length > 0 ? subSteps : [0]
    };
  }

  reset() {
    this.simTime = 0;
    this.lastWallTime = Date.now();
  }

  getSimTime() {
    return this.simTime;
  }

  setSimTime(time) {
    this.simTime = Math.max(0, time);
    this.lastWallTime = Date.now();
  }
}
