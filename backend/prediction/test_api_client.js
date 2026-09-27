const http = require('http');

function request(path) {
  return new Promise((resolve, reject) => {
    const port = process.env.PORT || 8080;
    http.get(`http://localhost:${port}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('TESTING PHASE 1B PREDICTION API ENDPOINTS');
  console.log('====================================================\n');

  // Test 1: /api/prediction/times?date=2023-01-17
  console.log('1. Testing GET /api/prediction/times?date=2023-01-17');
  const resTimes = await request('/api/prediction/times?date=2023-01-17');
  console.log(`Status: ${resTimes.status}`);
  console.log(`Timestamp count: ${resTimes.body.times?.length}`);
  console.log(`Sample times (first 5): ${resTimes.body.times?.slice(0, 5).join(', ')}`);
  if (resTimes.status !== 200 || !Array.isArray(resTimes.body.times)) {
    throw new Error('Test 1 Failed: /api/prediction/times returned unexpected response');
  }

  // Test 2: /api/prediction/forecast?date=2023-01-17&time=10:00:00
  console.log('\n2. Testing GET /api/prediction/forecast?date=2023-01-17&time=10:00:00');
  const resForecast = await request('/api/prediction/forecast?date=2023-01-17&time=10:00:00');
  console.log(`Status: ${resForecast.status}`);
  console.log('Directions returned:', Object.keys(resForecast.body.directions || {}));
  console.log('Results array count:', resForecast.body.results?.length);
  console.log('\nSample Forecast for UP:');
  console.log(JSON.stringify(resForecast.body.directions?.UP, null, 2));

  // Verify all four directions and +5/+10/+15 forecasts
  const expectedDirs = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
  for (const dir of expectedDirs) {
    const d = resForecast.body.directions?.[dir];
    if (!d) throw new Error(`Missing direction: ${dir}`);
    if (d.forecasts.min5 === undefined || d.forecasts.min10 === undefined || d.forecasts.min15 === undefined) {
      throw new Error(`Missing horizons for direction ${dir}`);
    }
    if (!d.anomaly || !d.anomaly.status) {
      throw new Error(`Missing anomaly status for direction ${dir}`);
    }
  }
  console.log('✓ All four directions and +5/+10/+15 forecasts confirmed.');

  // Test 3: /api/prediction/validation?date=2023-01-17
  console.log('\n3. Testing GET /api/prediction/validation?date=2023-01-17');
  const resVal17 = await request('/api/prediction/validation?date=2023-01-17');
  console.log(`Status: ${resVal17.status}`);
  console.log('Jan 17 Validation Results:');
  console.log(JSON.stringify(resVal17.body, null, 2));

  // Test 4: /api/prediction/validation?date=2023-01-18
  console.log('\n4. Testing GET /api/prediction/validation?date=2023-01-18');
  const resVal18 = await request('/api/prediction/validation?date=2023-01-18');
  console.log(`Status: ${resVal18.status}`);
  console.log('Jan 18 Validation Results:');
  console.log(JSON.stringify(resVal18.body, null, 2));

  // Test 5: Error handling checks
  console.log('\n5. Testing Error Handling');
  const errInvalidDate = await request('/api/prediction/times?date=2099-01-01');
  console.log(`Invalid date status (expect 400): ${errInvalidDate.status}`, errInvalidDate.body);

  const errInvalidValDate = await request('/api/prediction/validation?date=2023-01-15');
  console.log(`Unsupported validation date status (expect 400): ${errInvalidValDate.status}`, errInvalidValDate.body);

  const errInvalidTime = await request('/api/prediction/forecast?date=2023-01-17&time=23:59:59');
  console.log(`Missing time status (expect 400): ${errInvalidTime.status}`, errInvalidTime.body);

  const errMissingParams = await request('/api/prediction/forecast');
  console.log(`Missing params status (expect 400): ${errMissingParams.status}`, errMissingParams.body);

  if (errInvalidDate.status !== 400 || errInvalidValDate.status !== 400 || errInvalidTime.status !== 400 || errMissingParams.status !== 400) {
    throw new Error('Error handling tests failed!');
  }
  console.log('✓ Error handling tests passed.');

  console.log('\n====================================================');
  console.log('ALL PHASE 1B API TESTS PASSED SUCCESSFULLY');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('API Test Error:', err);
  process.exit(1);
});
