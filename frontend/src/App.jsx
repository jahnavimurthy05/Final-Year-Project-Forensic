import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DnaProvider } from './context/DnaContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import DnaInputPage from './pages/DnaInputPage';
import GenerationPage from './pages/GenerationPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import EthicsPage from './pages/EthicsPage';
import Navbar from './components/Navbar';
import GlyphBackground from './components/backgrounds/GlyphBackground';
import GravityStarsBackground from './components/backgrounds/GravityStarsBackground';
import ForensicDoodles from './components/backgrounds/ForensicDoodles';

function BackgroundRenderer() {
  const { bgEffect } = useTheme();
  return (
    <>
      {bgEffect === 'glyph' ? <GlyphBackground /> : <GravityStarsBackground />}
      <ForensicDoodles />
    </>
  );
}

function AppContent() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <div className="relative flex flex-col min-h-screen z-10">
        <BackgroundRenderer />
        <Navbar />
        <main className="flex-grow relative z-10">
          <Routes>
            {/* ── Public routes — no login needed ─────────────────────── */}
            <Route path="/login"    element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* ── Root: redirect to login ─────────────────────────────── */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* ── Protected routes ────────────────────────────────────── */}
            <Route path="/home" element={<ProtectedRoute><LandingPage /></ProtectedRoute>} />
            <Route path="/dna-input" element={<ProtectedRoute><DnaInputPage /></ProtectedRoute>} />
            <Route path="/generate" element={<ProtectedRoute><GenerationPage /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/ethics" element={<ProtectedRoute><EthicsPage /></ProtectedRoute>} />

            {/* ── Catch-all ───────────────────────────────────────────── */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider>
      <DnaProvider>
        <AppContent />
      </DnaProvider>
    </ThemeProvider>
  );
}

export default App;
