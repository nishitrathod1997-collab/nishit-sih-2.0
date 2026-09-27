const { defaultLoader, HistoricalTrafficLoader } = require('./historicalTrafficLoader');
const {
  detectAnomaly,
  evaluateCongestionRisk,
  calculatePercentile,
  ANOMALY_STATUS,
  CONGESTION_RISK
} = require('./anomalyDetector');

// Explicit configuration for training and validation dates
const TRAINING_DATES = Object.freeze([
  '2023-01-11',
  '2023-01-12',
  '2023-01-13',
  '2023-01-14',
  '2023-01-15',
  '2023-01-16'
]);

const VALIDATION_DATES = Object.freeze([
  '2023-01-17',
  '2023-01-18'
]);

const SUPPORTED_DIRECTIONS = Object.freeze(['UP', 'DOWN', 'LEFT', 'RIGHT']);
const FORECAST_HORIZONS = Object.freeze([5, 10, 15]);

// Clearly documented forecast blend weights
const FORECAST_WEIGHTS = Object.freeze({
  5: { historical: 0.60, current: 0.40 },
  10: { historical: 0.60, current: 0.40 },
  15: { historical: 0.70, current: 0.30 }
});

function addMinutesToTime(timeStr, minutes) {
  if (!timeStr) return null;
  const parts = timeStr.split(':').map(Number);
  if (parts.length < 2) return null;
  const [h, m, s = 0] = parts;
  const totalSec = h * 3600 + m * 60 + s + minutes * 60;
  if (totalSec < 0) return null;
  const newH = Math.floor(totalSec / 3600) % 24;
  const newM = Math.floor((totalSec % 3600) / 60);
  const newS = totalSec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(newH)}:${pad(newM)}:${pad(newS)}`;
}

class TrafficPredictor {
  constructor(loader = defaultLoader) {
    this.loader = loader;
    this.percentilesByDirection = new Map();
    this.overallPercentiles = null;
    this.isInitialized = false;
  }

  initialize() {
    if (this.isInitialized) return;
    this.loader.load();
    this._computeHistoricalPercentiles();
    this.isInitialized = true;
  }

  _computeHistoricalPercentiles() {
    // Compute percentiles for each direction using historical training records
    const trainingRecords = this.loader.getRecordsForDates(TRAINING_DATES);
    const pcusByDir = {
      UP: [],
      DOWN: [],
      LEFT: [],
      RIGHT: []
    };
    const allPCUs = [];

    for (const rec of trainingRecords) {
      if (typeof rec.pcu === 'number' && !isNaN(rec.pcu)) {
        if (pcusByDir[rec.direction]) {
          pcusByDir[rec.direction].push(rec.pcu);
        }
        allPCUs.push(rec.pcu);
      }
    }

    for (const dir of SUPPORTED_DIRECTIONS) {
      const sorted = [...(pcusByDir[dir] || [])].sort((a, b) => a - b);
      this.percentilesByDirection.set(dir, {
        p50: calculatePercentile(sorted, 50),
        p75: calculatePercentile(sorted, 75),
        count: sorted.length
      });
    }

    allPCUs.sort((a, b) => a - b);
    this.overallPercentiles = {
      p50: calculatePercentile(allPCUs, 50),
      p75: calculatePercentile(allPCUs, 75),
      count: allPCUs.length
    };
  }

  getPercentiles(direction = null) {
    if (!this.isInitialized) this.initialize();
    if (direction && this.percentilesByDirection.has(direction.toUpperCase())) {
      return this.percentilesByDirection.get(direction.toUpperCase());
    }
    return this.overallPercentiles;
  }

  /**
   * Forecast for a single direction, date, time and horizon (+5, +10, or +15)
   */
  predictDirectionHorizon(date, time, direction, horizonMinutes) {
    if (!this.isInitialized) this.initialize();
    const dirUpper = direction.toUpperCase();
    const weights = FORECAST_WEIGHTS[horizonMinutes];
    if (!weights) {
      throw new Error(`Unsupported forecast horizon: ${horizonMinutes} min. Must be 5, 10, or 15.`);
    }

    const currentRecord = this.loader.getRecord(date, time, dirUpper);
    if (!currentRecord) {
      return null;
    }

    const targetTime = addMinutesToTime(time, horizonMinutes);
    if (!targetTime) {
      return null;
    }

    // Historical target PCU: average PCU at target future timestamp on training dates
    const historicalTargetPCU = this.loader.getHistoricalAveragePCU(targetTime, dirUpper, TRAINING_DATES);
    if (historicalTargetPCU === null) {
      return null;
    }

    const currentPCU = currentRecord.pcu;
    const predictedPCU = weights.historical * historicalTargetPCU + weights.current * currentPCU;

    return {
      date,
      time,
      targetTime,
      direction: dirUpper,
      horizonMinutes,
      currentPCU,
      historicalTargetPCU,
      predictedPCU
    };
  }

  /**
   * Predict all 4 directions for a given date and time, including anomaly detection and congestion risk
   */
  predictAll(date, time) {
    if (!this.isInitialized) this.initialize();

    const results = {};
    for (const dir of SUPPORTED_DIRECTIONS) {
      const rec = this.loader.getRecord(date, time, dir);
      const currentPCU = rec ? rec.pcu : null;

      // Historical baseline at CURRENT time for anomaly detection
      const expectedHistoricalPCU = this.loader.getHistoricalAveragePCU(time, dir, TRAINING_DATES);

      // Anomaly detection
      const anomaly = (currentPCU !== null && expectedHistoricalPCU !== null)
        ? detectAnomaly(currentPCU, expectedHistoricalPCU)
        : { status: 'N/A', deviationPercent: null, expectedPCU: null, observedPCU: null };

      // Forecasts for 5, 10, 15 min
      const forecasts = {};
      const congestionRisks = {};
      const historicalTargets = {};
      const percentiles = this.getPercentiles(dir);

      for (const h of FORECAST_HORIZONS) {
        const pred = this.predictDirectionHorizon(date, time, dir, h);
        if (pred && pred.predictedPCU !== null) {
          forecasts[`min${h}`] = pred.predictedPCU;
          historicalTargets[`min${h}`] = pred.historicalTargetPCU;
          congestionRisks[`min${h}`] = evaluateCongestionRisk(pred.predictedPCU, percentiles);
        } else {
          forecasts[`min${h}`] = null;
          historicalTargets[`min${h}`] = null;
          congestionRisks[`min${h}`] = 'N/A';
        }
      }

      // Current congestion risk
      const currentRisk = (currentPCU !== null)
        ? evaluateCongestionRisk(currentPCU, percentiles)
        : 'N/A';

      results[dir] = {
        direction: dir,
        currentPCU,
        expectedHistoricalPCU,
        anomaly,
        forecasts,
        historicalTargets,
        congestionRisks,
        currentRisk,
        percentiles
      };
    }

    return {
      date,
      time,
      directions: results,
      meta: {
        trainingDates: TRAINING_DATES,
        weights: FORECAST_WEIGHTS
      }
    };
  }

  /**
   * Evaluates validation metrics (MAE, WAPE, samples) for a given validation date.
   * Compares predictions using training dates (Jan 11-16) against actual observed values on validation date.
   */
  validateDate(validationDate) {
    if (!this.isInitialized) this.initialize();

    if (!VALIDATION_DATES.includes(validationDate)) {
      throw new Error(`Date ${validationDate} is not a designated validation date (${VALIDATION_DATES.join(', ')})`);
    }

    const availableTimes = this.loader.getAvailableTimes();
    const metricsByHorizon = {};

    for (const h of FORECAST_HORIZONS) {
      let sumAbsDiff = 0.0;
      let sumActual = 0.0;
      let sampleCount = 0;

      for (const time of availableTimes) {
        const targetTime = addMinutesToTime(time, h);
        if (!targetTime) continue;

        for (const dir of SUPPORTED_DIRECTIONS) {
          const currentRec = this.loader.getRecord(validationDate, time, dir);
          const actualTargetRec = this.loader.getRecord(validationDate, targetTime, dir);

          // We need both the current observation to forecast AND the actual observation at targetTime to validate
          if (!currentRec || !actualTargetRec) continue;

          // Forecast uses training baseline
          const historicalTargetPCU = this.loader.getHistoricalAveragePCU(targetTime, dir, TRAINING_DATES);
          if (historicalTargetPCU === null) continue;

          const weights = FORECAST_WEIGHTS[h];
          const predicted = weights.historical * historicalTargetPCU + weights.current * currentRec.pcu;
          const actual = actualTargetRec.pcu;

          const absDiff = Math.abs(actual - predicted);
          sumAbsDiff += absDiff;
          sumActual += Math.abs(actual);
          sampleCount++;
        }
      }

      const mae = sampleCount > 0 ? (sumAbsDiff / sampleCount) : null;
      const wape = sumActual > 0 ? ((sumAbsDiff / sumActual) * 100) : null;

      metricsByHorizon[h] = {
        horizonMinutes: h,
        mae: mae !== null ? Number(mae.toFixed(4)) : null,
        wape: wape !== null ? Number(wape.toFixed(4)) : null,
        samples: sampleCount
      };
    }

    return {
      validationDate,
      trainingDates: TRAINING_DATES,
      horizons: metricsByHorizon
    };
  }
}

const defaultPredictor = new TrafficPredictor();

module.exports = {
  TrafficPredictor,
  defaultPredictor,
  TRAINING_DATES,
  VALIDATION_DATES,
  SUPPORTED_DIRECTIONS,
  FORECAST_HORIZONS,
  FORECAST_WEIGHTS,
  addMinutesToTime
};
