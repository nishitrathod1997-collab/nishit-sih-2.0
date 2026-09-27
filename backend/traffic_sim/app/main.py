from .simulator import TrafficSimulator
from .metrics import MetricsCollector
from .config import Config
import time
import json
import sys
import threading

# A lock to protect simulator and metrics access
lock = threading.Lock()

def simulation_loop(simulator, metrics_collector):
    try:
        while True:
            with lock:
                simulator.step()
                metrics_collector.collect(simulator)
            # Sleep duration dynamically adapts to Config.SIMULATION_SPEED
            time.sleep(1 / max(0.1, Config.SIMULATION_SPEED))
    except Exception as e:
        print(f"Simulation error: {e}", file=sys.stderr)

def main():
    simulator = TrafficSimulator()
    metrics_collector = MetricsCollector()
    
    # Start simulation loop in a background thread
    t = threading.Thread(target=simulation_loop, args=(simulator, metrics_collector), daemon=True)
    t.start()
    
    try:
        while True:
            # Read command from Node.js
            command = input().strip()
            
            if command:
                with lock:
                    result = simulator.handle_command(command)
                if result is not None:
                    print(json.dumps(result))
            
    except (KeyboardInterrupt, EOFError):
        sys.exit(0)

if __name__ == "__main__":
    main()