import axios from 'axios';
import { BACKEND_ORIGIN } from './backendUrl';

const BASE_URL = `${BACKEND_ORIGIN}/api/simulation`;

// Create axios instance with base configuration
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 6000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// API endpoints
export const getState = async () => {
  try {
    const response = await api.get('/state');
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch state: ${error.message}`);
  }
};

export const getMetrics = async () => {
  try {
    const response = await api.get('/metrics');
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch metrics: ${error.message}`);
  }
};

export const startSimulation = async () => {
  try {
    const response = await api.post('/start');
    return response.data;
  } catch (error) {
    throw new Error(`Failed to start simulation: ${error.message}`);
  }
};

export const stopSimulation = async () => {
  try {
    const response = await api.post('/stop');
    return response.data;
  } catch (error) {
    throw new Error(`Failed to stop simulation: ${error.message}`);
  }
};

export const setSimulationSpeed = async (speed) => {
  try {
    const response = await api.post('/speed', { speed });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to set simulation speed: ${error.message}`);
  }
};

export const setBackendWeather = async (weather) => {
  try {
    const response = await api.post('/weather', { weather });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to set simulation weather: ${error.message}`);
  }
};

export const resetBackendSimulation = async () => {
  try {
    const response = await api.post('/reset');
    return response.data;
  } catch (error) {
    throw new Error(`Failed to reset simulation: ${error.message}`);
  }
};

// Export the axios instance for custom requests
export default api;

// Example backend response formats for reference:
/*
GET /state response:
{
  "signal": "NS",
  "queues": {"N": 3, "S": 2, "E": 1, "W": 0},
  "cars": {
    "N": [{"id": 1, "position": 45, "speed": 2.5}],
    "S": [{"id": 2, "position": 30, "speed": 3.0}],
    "E": [],
    "W": []
  },
  "cars_passed": 42,
  "avg_wait_time": 12.3,
  "signal_timer": 15,
  "signal_duration": 30
}

GET /metrics response:
{
  "total_cars": 120,
  "avg_trip_time": 35.7,
  "throughput": 8.2,
  "queue_history": [...],
  "wait_time_history": [...]
}
*/