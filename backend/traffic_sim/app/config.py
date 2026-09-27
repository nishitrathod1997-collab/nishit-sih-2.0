class Config:
    SIMULATION_SPEED = 1.0
    WEATHER_MODE = 'normal'
    WEATHER_CLEARANCE_MULTIPLIER = {
        'normal': 1.0,
        'rain': 1.2,
        'fog': 1.4
    }
    MAX_VEHICLES = 100
    INTERSECTION_SIZE = 4
    SIGNAL_TIMING = {
        'min_duration': 20,
        'max_duration': 60,
        'default_duration': 30
    }
    
    # API configurations
    API_HOST = 'localhost'
    API_PORT = 8080