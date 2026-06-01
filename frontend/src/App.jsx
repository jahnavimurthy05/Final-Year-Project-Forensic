import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import DnaInputPage from './pages/DnaInputPage';
import GenerationPage from './pages/GenerationPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import EthicsPage from './pages/EthicsPage';
import EthicalBanner from './components/EthicalBanner';
import Navbar from './components/Navbar';

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dna-input" element={<DnaInputPage />} />
            <Route path="/generate" element={<GenerationPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/ethics" element={<EthicsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
