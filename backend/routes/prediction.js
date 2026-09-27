const express = require('express');
const router = express.Router();
const { defaultLoader } = require('../prediction/historicalTrafficLoader');
const { defaultPredictor, VALIDATION_DATES, SUPPORTED_DIRECTIONS } = require('../prediction/trafficPredictor');

// Ensure predictor and loader are initialized
defaultPredictor.initialize();

/**
 * GET /api/prediction/times?date=YYYY-MM-DD
 * Returns available timestamps for the specified date.
 */
router.get('/times', (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: "Query parameter 'date' is required." });
    }

    const availableDates = defaultLoader.getAvailableDates();
    if (!availableDates.includes(date)) {
      return res.status(400).json({
        error: `Date '${date}' not found in dataset. Available dates: ${availableDates.join(', ')}`
      });
    }

    const times = defaultLoader.getAvailableTimesForDate(date);
    return res.json({
      date,
      times
    });
  } catch (err) {
    console.error('Error fetching prediction times:', err);
    return res.status(500).json({ error: 'Internal server error while fetching prediction timestamps.' });
  }
});

/**
 * GET /api/prediction/forecast?date=YYYY-MM-DD&time=HH:MM:SS
 * Returns +5, +10, +15 min forecasts, anomaly status, and congestion risk for all four directions.
 */
router.get('/forecast', (req, res) => {
  try {
    const { date, time } = req.query;
    if (!date || !time) {
      return res.status(400).json({ error: "Query parameters 'date' and 'time' are required." });
    }

    const availableDates = defaultLoader.getAvailableDates();
    if (!availableDates.includes(date)) {
      return res.status(400).json({
        error: `Date '${date}' not found in dataset. Available dates: ${availableDates.join(', ')}`
      });
    }

    const availableTimes = defaultLoader.getAvailableTimesForDate(date);
    if (!availableTimes.includes(time)) {
      return res.status(400).json({
        error: `Timestamp '${time}' not found for date '${date}'. Available range: ${availableTimes[0]} to ${availableTimes[availableTimes.length - 1]}`
      });
    }

    const prediction = defaultPredictor.predictAll(date, time);

    const directions = {};
    const results = [];

    for (const dir of SUPPORTED_DIRECTIONS) {
      const dirData = prediction.directions[dir] || {};
      const forecasts = dirData.forecasts || {};
      const anomaly = dirData.anomaly || {};

      const formatted = {
        direction: dir,
        currentPCU: typeof dirData.currentPCU === 'number' ? Number(dirData.currentPCU.toFixed(2)) : null,
        forecasts: {
          min5: typeof forecasts.min5 === 'number' ? Number(forecasts.min5.toFixed(2)) : null,
          min10: typeof forecasts.min10 === 'number' ? Number(forecasts.min10.toFixed(2)) : null,
          min15: typeof forecasts.min15 === 'number' ? Number(forecasts.min15.toFixed(2)) : null
        },
        anomaly: {
          status: anomaly.status || 'N/A',
          deviationPercent: typeof anomaly.deviationPercent === 'number' ? Number(anomaly.deviationPercent.toFixed(2)) : null,
          expectedPCU: typeof anomaly.expectedPCU === 'number' ? Number(anomaly.expectedPCU.toFixed(2)) : null,
          observedPCU: typeof anomaly.observedPCU === 'number' ? Number(anomaly.observedPCU.toFixed(2)) : null
        },
        congestionRisk: dirData.congestionRisks?.min5 || dirData.currentRisk || 'LOW'
      };

      directions[dir] = formatted;
      results.push(formatted);
    }

    return res.json({
      date,
      time,
      directions,
      results
    });
  } catch (err) {
    console.error('Error generating traffic forecast:', err);
    return res.status(500).json({ error: 'Internal server error while generating forecast.' });
  }
});

/**
 * GET /api/prediction/validation?date=YYYY-MM-DD
 * Returns real dynamic validation metrics (MAE, WAPE, samples) for held-out dates (Jan 17 and Jan 18 only).
 */
router.get('/validation', (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: "Query parameter 'date' is required." });
    }

    if (!VALIDATION_DATES.includes(date)) {
      return res.status(400).json({
        error: `Unsupported validation date '${date}'. Only ${VALIDATION_DATES.join(' and ')} are supported for validation.`
      });
    }

    const val = defaultPredictor.validateDate(date);
    const results = [
      {
        horizonMinutes: 5,
        mae: val.horizons[5].mae,
        wape: val.horizons[5].wape,
        samples: val.horizons[5].samples
      },
      {
        horizonMinutes: 10,
        mae: val.horizons[10].mae,
        wape: val.horizons[10].wape,
        samples: val.horizons[10].samples
      },
      {
        horizonMinutes: 15,
        mae: val.horizons[15].mae,
        wape: val.horizons[15].wape,
        samples: val.horizons[15].samples
      }
    ];

    return res.json({
      date,
      results
    });
  } catch (err) {
    console.error('Error calculating validation metrics:', err);
    return res.status(500).json({ error: 'Internal server error while calculating validation metrics.' });
  }
});

/**
 * GET /api/prediction/actual?date=YYYY-MM-DD&time=HH:MM:SS
 * Returns empirical vehicle counts and calculated PCU from the cleaned Pune dataset.
 */
router.get('/actual', (req, res) => {
  try {
    const { date, time } = req.query;
    if (!date || !time) {
      return res.status(400).json({ error: "Query parameters 'date' and 'time' are required." });
    }

    const availableDates = defaultLoader.getAvailableDates();
    if (!availableDates.includes(date)) {
      return res.status(400).json({
        error: `Date '${date}' not found in dataset. Available dates: ${availableDates.join(', ')}`
      });
    }

    const availableTimes = defaultLoader.getAvailableTimesForDate(date);
    if (!availableTimes.includes(time)) {
      return res.status(400).json({
        error: `Timestamp '${time}' not found for date '${date}'. Available range: ${availableTimes[0]} to ${availableTimes[availableTimes.length - 1]}`
      });
    }

    const directions = {};

    for (const dir of SUPPORTED_DIRECTIONS) {
      const rec = defaultLoader.getRecord(date, time, dir);
      if (rec) {
        const car = typeof rec.car === 'number' ? rec.car : 0;
        const motorbike = typeof rec.motorbike === 'number' ? rec.motorbike : 0;
        const bus = typeof rec.bus === 'number' ? rec.bus : 0;
        const truck = typeof rec.truck === 'number' ? rec.truck : 0;
        const vehicleCount = car + motorbike + bus + truck;
        const totalPCU = typeof rec.pcu === 'number' ? Number(rec.pcu.toFixed(2)) : 0;

        directions[dir] = {
          car,
          motorbike,
          bus,
          truck,
          vehicleCount,
          totalPCU
        };
      } else {
        directions[dir] = {
          car: 0,
          motorbike: 0,
          bus: 0,
          truck: 0,
          vehicleCount: 0,
          totalPCU: 0
        };
      }
    }

    return res.json({
      date,
      time,
      directions
    });
  } catch (err) {
    console.error('Error fetching actual traffic demand:', err);
    return res.status(500).json({ error: 'Internal server error while fetching actual demand.' });
  }
});

module.exports = router;

