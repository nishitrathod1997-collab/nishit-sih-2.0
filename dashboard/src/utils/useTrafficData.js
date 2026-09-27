import { useSimulation } from '../context/SimulationContext';

/**
 * useTrafficData: Compatibility hook wrapper reading from shared SimulationContext.
 * Guarantees existing hook consumers (Dashboard, LiveIntersection, Analytics) continue
 * to work with 100% backward compatibility while using the single shared simulation session.
 */
export function useTrafficData() {
  return useSimulation();
}

export default useTrafficData;
