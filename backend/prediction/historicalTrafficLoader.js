const fs = require('fs');
const path = require('path');

// Standard PCU weights matching the project's PCU configuration
const PCU_WEIGHTS = Object.freeze({
  car: 1.0,
  motorbike: 0.5,
  bus: 2.5,
  truck: 2.5
});

const DEFAULT_CSV_PATH = path.join(__dirname, '../data/pune_jehangir_j3_5min_clean.csv');

class HistoricalTrafficLoader {
  constructor(csvPath = DEFAULT_CSV_PATH) {
    this.csvPath = csvPath;
    this.records = [];
    this.byKey = new Map(); // key: "YYYY-MM-DD|HH:MM:SS|DIRECTION"
    this.historicalByTimeDir = new Map(); // key: "HH:MM:SS|DIRECTION" -> array of records across training dates
    this.dates = new Set();
    this.times = new Set();
    this.directions = new Set();
    this.isLoaded = false;
  }

  load() {
    if (this.isLoaded) {
      return this.records;
    }

    if (!fs.existsSync(this.csvPath)) {
      throw new Error(`Dataset not found at: ${this.csvPath}`);
    }

    const content = fs.readFileSync(this.csvPath, 'utf8');
    const lines = content.split(/\r?\n/);
    if (lines.length === 0) {
      throw new Error('Dataset file is empty');
    }

    const header = lines[0].split(',').map(h => h.trim());
    const expectedHeaders = ['intersection', 'camera', 'date', 'time', 'direction', 'car', 'motorbike', 'bus', 'truck'];
    
    // Quick validation of header
    for (const exp of expectedHeaders) {
      if (!header.includes(exp)) {
        throw new Error(`Missing expected column '${exp}' in CSV header: ${lines[0]}`);
      }
    }

    const colIndex = {};
    header.forEach((name, idx) => {
      colIndex[name] = idx;
    });

    const records = [];
    const byKey = new Map();
    const dates = new Set();
    const times = new Set();
    const directions = new Set();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(',').map(c => c.trim());
      if (cols.length < expectedHeaders.length) {
        // Skip malformed rows safely
        continue;
      }

      const intersection = cols[colIndex.intersection] || '';
      const camera = cols[colIndex.camera] || '';
      const date = cols[colIndex.date] || '';
      const time = cols[colIndex.time] || '';
      const direction = (cols[colIndex.direction] || '').toUpperCase();

      const car = parseFloat(cols[colIndex.car]) || 0.0;
      const motorbike = parseFloat(cols[colIndex.motorbike]) || 0.0;
      const bus = parseFloat(cols[colIndex.bus]) || 0.0;
      const truck = parseFloat(cols[colIndex.truck]) || 0.0;

      // Calculate PCU using standard weights
      const pcu = (
        car * PCU_WEIGHTS.car +
        motorbike * PCU_WEIGHTS.motorbike +
        bus * PCU_WEIGHTS.bus +
        truck * PCU_WEIGHTS.truck
      );

      const record = {
        intersection,
        camera,
        date,
        time,
        direction,
        car,
        motorbike,
        bus,
        truck,
        pcu
      };

      records.push(record);

      const key = `${date}|${time}|${direction}`;
      byKey.set(key, record);

      dates.add(date);
      times.add(time);
      directions.add(direction);
    }

    this.records = records;
    this.byKey = byKey;
    this.dates = dates;
    this.times = times;
    this.directions = directions;
    this.isLoaded = true;

    return this.records;
  }

  getRecord(date, time, direction) {
    if (!this.isLoaded) this.load();
    const key = `${date}|${time}|${direction.toUpperCase()}`;
    return this.byKey.get(key) || null;
  }

  getRecordsForDates(allowedDates) {
    if (!this.isLoaded) this.load();
    const dateSet = new Set(allowedDates);
    return this.records.filter(r => dateSet.has(r.date));
  }

  getHistoricalPCUsAtTime(time, direction, trainingDates) {
    if (!this.isLoaded) this.load();
    const pcus = [];
    const dirUpper = direction.toUpperCase();
    for (const d of trainingDates) {
      const rec = this.getRecord(d, time, dirUpper);
      if (rec !== null && typeof rec.pcu === 'number' && !isNaN(rec.pcu)) {
        pcus.push(rec.pcu);
      }
    }
    return pcus;
  }

  getHistoricalAveragePCU(time, direction, trainingDates) {
    const pcus = this.getHistoricalPCUsAtTime(time, direction, trainingDates);
    if (pcus.length === 0) return null;
    const sum = pcus.reduce((acc, val) => acc + val, 0);
    return sum / pcus.length;
  }

  getAvailableDates() {
    if (!this.isLoaded) this.load();
    return Array.from(this.dates).sort();
  }

  getAvailableTimesForDate(date) {
    if (!this.isLoaded) this.load();
    const times = new Set();
    for (const rec of this.records) {
      if (rec.date === date) {
        times.add(rec.time);
      }
    }
    return Array.from(times).sort();
  }

  getAvailableTimes() {
    if (!this.isLoaded) this.load();
    return Array.from(this.times).sort();
  }

  getAvailableDirections() {
    if (!this.isLoaded) this.load();
    return Array.from(this.directions).sort();
  }
}

// Export singleton instance and class
const defaultLoader = new HistoricalTrafficLoader();

module.exports = {
  HistoricalTrafficLoader,
  defaultLoader,
  PCU_WEIGHTS
};
