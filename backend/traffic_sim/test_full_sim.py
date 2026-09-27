import sys
import os
import json

# Add parent directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.simulator import TrafficSimulator
from app.metrics import MetricsCollector
from app.models import VehicleType, Direction

def test_full_simulation():
    print("=" * 60)
    print("[TEST] RUNNING FULL END-TO-END SIMULATION & PCU TEST")
    print("=" * 60)

    simulator = TrafficSimulator()
    metrics_collector = MetricsCollector()

    print("\n1. Running 100 simulation ticks...")
    for step in range(1, 101):
        simulator.step()
        metrics_collector.collect(simulator)
        if step % 25 == 0:
            state = simulator.handle_command('get_state')
            print(f"   Tick {step:3d}: Active Vehicles={len(state['vehicles'])}, PCU Load={state['total_pcu']} PCU, Signal={state['signal']['current']} ({state['signal']['timer']}/{state['signal']['duration']}s)")

    print("\n2. Inspecting Telemetry State Payload (get_state)...")
    state = simulator.handle_command('get_state')
    print(f"   - Signal State: Direction {state['signal']['current']}, Timer: {state['signal']['timer']}/{state['signal']['duration']}s")
    print(f"   - Per-lane PCU Loads: {json.dumps(state['pcu_loads'])}")
    print(f"   - Per-lane Vehicle Queues: {json.dumps(state['queues'])}")
    print(f"   - Total Active PCU: {state['total_pcu']} PCU")
    
    # Check vehicle types in simulation
    vehicle_types_found = set(v['type'] for v in state['vehicles'])
    print(f"   - Vehicle Types Spawned: {list(vehicle_types_found)}")

    # Assertions
    assert 'pcu_loads' in state, "Missing pcu_loads in state"
    assert 'total_pcu' in state, "Missing total_pcu in state"
    assert isinstance(state['signal']['duration'], int), "Signal duration should be an integer"
    assert state['signal']['duration'] >= 15, "Signal duration should be at least 15s"

    print("\n3. Inspecting Metrics Collector Payload (get_metrics)...")
    metrics = simulator.handle_command('get_metrics')
    print(f"   - Total Vehicles Passed: {metrics['total_vehicles']}")
    print(f"   - Total PCU Passed: {round(metrics['total_pcu_passed'], 1)} PCU")
    print(f"   - Average Wait Time: {round(metrics['avg_wait_time'], 2)}s")

    print("\n" + "=" * 60)
    print("[SUCCESS] END-TO-END SIMULATION & PCU TEST PASSED CLEANLY!")
    print("=" * 60)

if __name__ == "__main__":
    test_full_simulation()
