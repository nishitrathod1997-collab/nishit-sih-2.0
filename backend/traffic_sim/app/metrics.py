from dataclasses import dataclass
from typing import Dict, List
import time

@dataclass
class SimulationMetrics:
    timestamp: float
    queue_lengths: Dict[str, int]
    wait_times: List[float]
    throughput: float
    emergency_response_time: float

class MetricsCollector:
    def __init__(self):
        self.metrics_history = []
        
    def collect(self, simulator):
        metrics = SimulationMetrics(
            timestamp=time.time(),
            queue_lengths=simulator._get_queue_lengths(),
            wait_times=self._calculate_wait_times(simulator),
            throughput=self._calculate_throughput(simulator),
            emergency_response_time=self._calculate_emergency_response(simulator)
        )
        self.metrics_history.append(metrics)
        return metrics
        
    def _calculate_wait_times(self, simulator) -> List[float]:
        """Return the current wait time (seconds since arrival) for every queued vehicle."""
        now = time.time()
        wait_times = []
        for vehicle in simulator.vehicles:
            elapsed = now - vehicle.arrival_time
            wait_times.append(max(0.0, elapsed))
        return wait_times

    def _calculate_throughput(self, simulator) -> float:
        """Return throughput in vehicles per minute based on simulator stats."""
        total = simulator.stats.get('total_vehicles', 0)
        if total == 0:
            return 0.0
        # Use the running average wait time as a proxy for elapsed cycle time.
        avg_wait = simulator.stats.get('avg_wait_time', 1.0)
        # cars / (avg_wait seconds) * 60 → cars/min; guard against zero avg_wait
        return (total / max(avg_wait, 1.0)) * 60.0

    def _calculate_emergency_response(self, simulator) -> float:
        """Return mean time-in-system for emergency vehicles currently in the simulation.
        
        Returns 0.0 when there are no emergency vehicles present.
        """
        now = time.time()
        emergency_waits = [
            now - v.arrival_time
            for v in simulator.vehicles
            if v.is_emergency
        ]
        if not emergency_waits:
            return 0.0
        return sum(emergency_waits) / len(emergency_waits)