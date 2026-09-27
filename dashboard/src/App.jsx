import { useState } from 'react';
import { SimulationProvider } from './context/SimulationContext';
import { LanguageProvider } from './context/LanguageContext';
import MainLayout from './layout/MainLayout';
import Dashboard from './pages/Dashboard';
import TrafficIntelligence from './pages/TrafficIntelligence';
import Analytics from './pages/Analytics';
import About from './pages/About';
import LogisticsSimulationPage from './pages/LogisticsSimulationPage';
import SoundToggle from './components/SoundToggle';
import './index.css';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  return (
    <LanguageProvider>
      <SimulationProvider>
        <MainLayout currentPage={currentPage} onNavigate={setCurrentPage}>
          {currentPage === 'dashboard' && <Dashboard onNavigate={setCurrentPage} />}
          {currentPage === 'logistics-simulation' && <LogisticsSimulationPage onNavigate={setCurrentPage} />}
          {currentPage === 'traffic-intelligence' && <TrafficIntelligence onNavigate={setCurrentPage} />}
          {currentPage === 'analytics' && <Analytics onNavigate={setCurrentPage} />}
          {currentPage === 'about' && <About onNavigate={setCurrentPage} />}
        </MainLayout>
        <SoundToggle />
      </SimulationProvider>
    </LanguageProvider>
  );
}

export default App;

