from .models import Vehicle, VehicleType, Direction, TrafficSignal
from .config import Config
import random
import time

class TrafficSimulator:
    def __init__(self):
        self.vehicles = []
        self.signal = TrafficSignal()
        self.stats = {
            'total_vehicles': 0,
            'total_pcu_passed': 0.0,
            'avg_wait_time': 0,
            'emergency_count': 0
        }
        
    def step(self):
        # Generate new vehicles
        self._generate_vehicles()
        
        # Check for emergency vehicles waiting
        emergency_vehicles = [v for v in self.vehicles if v.is_emergency and v.position < 100]
        emergency_dir = emergency_vehicles[0].direction if emergency_vehicles else None

        # Update signal with dynamic PCU timing and emergency override
        pcu_loads = self._get_pcu_loads()
        self.signal.update(pcu_loads, emergency_direction=emergency_dir)
        
        # Move vehicles
        self._update_vehicles()
        
    def _generate_vehicles(self):
        spawn_probs = {Direction.EAST: 0.10, Direction.NORTH: 0.20, Direction.SOUTH: 0.40, Direction.WEST: 0.60}
        queue_caps = {Direction.EAST: 6, Direction.NORTH: 12, Direction.SOUTH: 23, Direction.WEST: 34}

        for direction in Direction:
            current_queue = len([v for v in self.vehicles if v.direction == direction])
            if current_queue >= queue_caps[direction]:
                continue

            if random.random() < spawn_probs[direction]:
                # Vehicle type distribution: 45% Bike, 45% Car, 10% Heavy
                r = random.random()
                if r < 0.45:
                    v_type = VehicleType.BIKE
                elif r < 0.90:
                    v_type = VehicleType.CAR
                else:
                    v_type = VehicleType.HEAVY

                is_emergency = False

                vehicle = Vehicle(
                    id=f"{time.time()}_{direction.value}",
                    direction=direction,
                    arrival_time=time.time(),
                    vehicle_type=v_type,
                    is_emergency=is_emergency
                )
                self.vehicles.append(vehicle)
                
    def _update_vehicles(self):
        updated_vehicles = []
        current_time = time.time()
        
        for vehicle in self.vehicles:
            # Move vehicles if they have green light or are emergency vehicles
            if (vehicle.direction == self.signal.current_direction or 
                vehicle.is_emergency):
                vehicle.position += 1
                
                # Vehicle passes through intersection
                if vehicle.position >= 100:
                    # Update statistics
                    self.stats['total_vehicles'] += 1
                    self.stats['total_pcu_passed'] += vehicle.pcu
                    wait_time = current_time - vehicle.arrival_time
                    self.stats['avg_wait_time'] = (
                        (self.stats['avg_wait_time'] * (self.stats['total_vehicles'] - 1) + 
                         wait_time) / self.stats['total_vehicles']
                    )
                    continue
                    
            updated_vehicles.append(vehicle)
        
        self.vehicles = updated_vehicles
    
    def _get_queue_lengths(self):
        return {d: len([v for v in self.vehicles if v.direction == d]) 
                for d in Direction}

    def _get_pcu_loads(self):
        return {d: sum(v.pcu for v in self.vehicles if v.direction == d) 
                for d in Direction}
    
    def handle_command(self, command):
        if command == 'get_state':
            pcu_loads = self._get_pcu_loads()
            return {
                'vehicles': [{
                    'id': v.id,
                    'direction': v.direction.value,
                    'type': v.vehicle_type.value,
                    'pcu': v.pcu,
                    'arrival_time': v.arrival_time,
                    'is_emergency': v.is_emergency,
                    'position': v.position
                } for v in self.vehicles],
                'signal': {
                    'current': self.signal.current_direction.value,
                    'timer': self.signal.timer,
                    'duration': self.signal.duration
                },
                'queues': {d.value: len([v for v in self.vehicles if v.direction == d]) for d in Direction},
                'pcu_loads': {d.value: round(pcu_loads[d], 1) for d in Direction},
                'total_pcu': round(sum(pcu_loads.values()), 1),
                'current_weather': Config.WEATHER_MODE,
                'effective_weather_mode': Config.WEATHER_MODE,
                'weather_clearance_supported': False,
                'weather_notice': 'Legacy Python backend lacks explicit clearance phase transitions; weather clearance scaling is disabled in this mode.'
            }
        elif command == 'get_metrics':
            return self.stats
        elif command.startswith('set_speed'):
            speed = float(command.split()[1])
            Config.SIMULATION_SPEED = speed
        elif command.startswith('set_weather'):
            parts = command.split()
            if len(parts) > 1:
                mode = parts[1].lower()
                if mode in ['normal', 'rain', 'fog']:
                    Config.WEATHER_MODE = mode
        elif command == 'reset':
            self.__init__()