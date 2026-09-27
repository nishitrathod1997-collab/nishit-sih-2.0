const { HistoricalTrafficLoader, defaultLoader, PCU_WEIGHTS } = require('./historicalTrafficLoader');
const { TrafficPredictor, defaultPredictor } = require('./trafficPredictor');
const { detectAnomaly, evaluateCongestionRisk, calculatePercentile } = require('./anomalyDetector');

console.log('====================================================');
console.log('RUNNING PHASE 1A PREDICTION MODULE TEST SUITE');
console.log('====================================================\n');

// 1. Test Data Loader
console.log('--- 1. Testing HistoricalTrafficLoader ---');
const records = defaultLoader.load();
console.log(`Loaded total rows: ${records.length}`);
console.log(`Available dates (${defaultLoader.getAvailableDates().length}): ${defaultLoader.getAvailableDates().join(', ')}`);
console.log(`Available directions: ${defaultLoader.getAvailableDirections().join(', ')}`);
console.log(`Available timestamps count: ${defaultLoader.getAvailableTimes().length}`);
console.log(`Sample timestamp range: ${defaultLoader.getAvailableTimes()[0]} to ${defaultLoader.getAvailableTimes()[defaultLoader.getAvailableTimes().length - 1]}`);

// Check PCU weights calculation on sample row
const sampleRec = records[0];
console.log('\nSample record 0:');
console.log(`Date: ${sampleRec.date}, Time: ${sampleRec.time}, Dir: ${sampleRec.direction}`);
console.log(`Car: ${sampleRec.car}, Motorbike: ${sampleRec.motorbike}, Bus: ${sampleRec.bus}, Truck: ${sampleRec.truck}`);
const expectedPCU = sampleRec.car * 1.0 + sampleRec.motorbike * 0.5 + sampleRec.bus * 2.5 + sampleRec.truck * 2.5;
console.log(`Computed PCU: ${sampleRec.pcu}, Expected: ${expectedPCU}`);
if (Math.abs(sampleRec.pcu - expectedPCU) > 1e-6) {
  throw new Error('PCU calculation mismatch!');
}
console.log('✓ PCU weights verified.');

// 2. Test Predictor
console.log('\n--- 2. Testing TrafficPredictor ---');
defaultPredictor.initialize();

// Test percentiles per direction
for (const dir of ['UP', 'DOWN', 'LEFT', 'RIGHT']) {
  const p = defaultPredictor.getPercentiles(dir);
  console.log(`Percentiles for ${dir}: p50 = ${p.p50.toFixed(2)}, p75 = ${p.p75.toFixed(2)} (samples: ${p.count})`);
}

// Test sample prediction on Jan 17 at 09:30:00
console.log('\n--- 3. Testing Sample Prediction (Jan 17, 09:30:00) ---');
const samplePred = defaultPredictor.predictAll('2023-01-17', '09:30:00');
console.log(JSON.stringify(samplePred, null, 2));

// 3. Test Anomaly Detection
console.log('\n--- 4. Testing Anomaly Detector ---');
const tNormal = detectAnomaly(20, 22);
console.log('Normal test (obs: 20, exp: 22):', tNormal.status, `(${tNormal.deviationPercent.toFixed(1)}%)`);
const tModerate = detectAnomaly(32, 22);
console.log('Moderate test (obs: 32, exp: 22):', tModerate.status, `(${tModerate.deviationPercent.toFixed(1)}%)`);
const tAbnormal = detectAnomaly(50, 22);
console.log('Abnormal test (obs: 50, exp: 22):', tAbnormal.status, `(${tAbnormal.deviationPercent.toFixed(1)}%)`);

// 4. Run Jan 17 Validation
console.log('\n====================================================');
console.log('JANUARY 17, 2023 VALIDATION RESULTS');
console.log('====================================================');
const valJan17 = defaultPredictor.validateDate('2023-01-17');
console.log(JSON.stringify(valJan17, null, 2));

// 5. Run Jan 18 Validation
console.log('\n====================================================');
console.log('JANUARY 18, 2023 VALIDATION RESULTS');
console.log('====================================================');
const valJan18 = defaultPredictor.validateDate('2023-01-18');
console.log(JSON.stringify(valJan18, null, 2));

console.log('\n====================================================');
console.log('ALL PHASE 1A TESTS COMPLETED SUCCESSFULLY');
console.log('====================================================');
