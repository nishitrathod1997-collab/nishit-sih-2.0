import sys
import os

# Add parent directory to path so imports work smoothly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.models import TrafficSignal, Direction
from app.simulator import TrafficSimulator

def test_traffic_signal():
    print("=" * 55)
    print("[TEST] TESTING PER-DIRECTION FIXED PCU SIGNAL TIMINGS")
    print("=" * 55)
    
    signal = TrafficSignal()
    print(f"Initial State (NORTH): PCU=10.0 -> Duration={signal.duration}s (Expected: 30s)")
    assert signal.duration == 30, f"Expected 30, got {signal.duration}"

    # Cycle to SOUTH (20 PCU -> 45s)
    print("\n--- Cycle to SOUTH (20 PCU) ---")
    for _ in range(30):
        signal.update()
    print(f"Switched to Direction={signal.current_direction.value}, Duration={signal.duration}s (Expected: 45s)")
    assert signal.current_direction == Direction.SOUTH
    assert signal.duration == 45, f"Expected 45, got {signal.duration}"

    # Cycle to EAST (5 PCU -> 22s)
    print("\n--- Cycle to EAST (5 PCU) ---")
    for _ in range(45):
        signal.update()
    print(f"Switched to Direction={signal.current_direction.value}, Duration={signal.duration}s (Expected: 22s)")
    assert signal.current_direction == Direction.EAST
    assert signal.duration == 22, f"Expected 22, got {signal.duration}"

    # Cycle to WEST (30 PCU -> 60s)
    print("\n--- Cycle to WEST (30 PCU) ---")
    for _ in range(22):
        signal.update()
    print(f"Switched to Direction={signal.current_direction.value}, Duration={signal.duration}s (Expected: 60s)")
    assert signal.current_direction == Direction.WEST
    assert signal.duration == 60, f"Expected 60, got {signal.duration}"

    # Test Emergency Override
    print("\n--- Test: Emergency Vehicle Override ---")
    emergency_dir = Direction.NORTH
    signal.update(emergency_direction=emergency_dir)
    print(f"AFTER Emergency Override -> Direction={signal.current_direction.value}, Duration={signal.duration}s (Expected: 45s)")
    assert signal.current_direction == Direction.NORTH
    assert signal.duration == 45

    print("\n" + "=" * 55)
    print("[SUCCESS] ALL PER-DIRECTION FIXED PCU TESTS PASSED!")
    print("=" * 55)

if __name__ == "__main__":
    test_traffic_signal()
