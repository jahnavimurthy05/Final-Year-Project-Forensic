import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DnaProvider } from './context/DnaContext';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import DnaInputPage from './pages/DnaInputPage';
import GenerationPage from './pages/GenerationPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import EthicsPage from './pages/EthicsPage';
import Navbar from './components/Navbar';

function App() {
  return (
    <DnaProvider>
      <Router>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              {/* ── Public routes — no login needed ─────────────────────── */}
              <Route path="/login"    element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* ── Root: redirect to login (login will redirect to /home after auth) */}
              <Route path="/" element={<Navigate to="/login" replace />} />

              {/* ── Protected routes — require a valid JWT token ─────────── */}
              <Route path="/home" element={
                <ProtectedRoute><LandingPage /></ProtectedRoute>
              } />
              <Route path="/dna-input" element={
                <ProtectedRoute><DnaInputPage /></ProtectedRoute>
              } />
              <Route path="/generate" element={
                <ProtectedRoute><GenerationPage /></ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute><DashboardPage /></ProtectedRoute>
              } />
              <Route path="/ethics" element={
                <ProtectedRoute><EthicsPage /></ProtectedRoute>
              } />

              {/* ── Catch-all: send unknown URLs to login ────────────────── */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </DnaProvider>
  );
}

export default App;
