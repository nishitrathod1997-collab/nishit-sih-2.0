from dataclasses import dataclass
from typing import List, Optional
from enum import Enum
import time

class Direction(Enum):
    NORTH = 'N'
    SOUTH = 'S'
    EAST = 'E'
    WEST = 'W'

class VehicleType(Enum):
    BIKE = 'bike'
    CAR = 'car'
    HEAVY = 'heavy'

    @property
    def pcu(self) -> float:
        weights = {
            VehicleType.BIKE: 0.5,
            VehicleType.CAR: 1.0,
            VehicleType.HEAVY: 2.5
        }
        return weights[self]

@dataclass
class Vehicle:
    id: str
    direction: Direction
    arrival_time: float
    vehicle_type: VehicleType = VehicleType.CAR
    is_emergency: bool = False
    position: float = 0.0

    @property
    def pcu(self) -> float:
        return self.vehicle_type.pcu
    
class TrafficSignal:
    # Configured PCU loads per direction
    FIXED_PCU_CONFIG = {
        Direction.NORTH: 10.0, # 30s duration
        Direction.SOUTH: 20.0, # 45s duration
        Direction.EAST: 5.0,   # 22s duration
        Direction.WEST: 30.0   # 60s duration
    }

    def __init__(self, custom_pcu_config: Optional[dict] = None):
        self.pcu_config = custom_pcu_config if custom_pcu_config else self.FIXED_PCU_CONFIG.copy()
        self.current_direction = Direction.NORTH
        self.timer = 0
        # Initialize duration for North
        self.duration = self._calculate_duration_for_pcu(self.pcu_config.get(Direction.NORTH, 10.0))
        
    def _calculate_duration_for_pcu(self, pcu: float) -> int:
        # Formula: 15s base + (PCU * 1.5s), min 15s, max 65s
        return max(15, min(65, round(15 + pcu * 1.5)))

    def update(self, pcu_loads: Optional[dict] = None, emergency_direction: Optional[Direction] = None):
        # If an emergency vehicle is waiting in another direction, switch signal immediately
        if emergency_direction and emergency_direction != self.current_direction:
            self.current_direction = emergency_direction
            self.timer = 0
            self.duration = 45  # Extended green for emergency clearance
            return

        self.timer += 1
        if self.timer >= self.duration:
            self._switch_signal(pcu_loads)
            
    def _switch_signal(self, pcu_loads: Optional[dict] = None):
        directions = list(Direction)
        current_idx = directions.index(self.current_direction)
        next_direction = directions[(current_idx + 1) % len(directions)]
        self.current_direction = next_direction
        self.timer = 0
        
        # Use fixed configured PCU load for this direction if pcu_loads not dynamically provided
        if pcu_loads and next_direction in pcu_loads:
            pcu_val = pcu_loads[next_direction]
        else:
            pcu_val = self.pcu_config.get(next_direction, 10.0)

        self.duration = self._calculate_duration_for_pcu(pcu_val)