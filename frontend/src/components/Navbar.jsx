import { Link, useNavigate } from 'react-router-dom';
import ThemeTogglerButton from './ui/ThemeTogglerButton';

export default function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user  = (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); }
    catch { return null; }
  })();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login', { replace: true });
  };

  return (
    <nav className="glass-panel sticky top-0 z-50 py-3.5 px-6 sm:px-8 flex justify-between items-center transition-colors duration-300">
      {/* Logo */}
      <Link to={token ? '/home' : '/login'} className="flex items-center gap-3 group">
        <img
          src={`${import.meta.env.BASE_URL}forenai-icon.png`}
          alt="ForenAI Logo"
          className="w-10 h-10 rounded-xl border border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.25)] transition-transform group-hover:scale-105"
        />
        <div className="flex flex-col text-left">
          <span className="text-xl font-black tracking-wider text-slate-900 dark:text-white leading-tight">
            Foren<span className="text-teal-600 dark:text-teal-400">AI</span>
          </span>
          <span className="text-[8px] font-mono tracking-widest text-slate-500 dark:text-gray-400 uppercase">
            DNA &bull; ANALYZE &bull; RECONSTRUCT
          </span>
        </div>
      </Link>

      {/* Nav links — only shown when logged in */}
      {token && (
        <div className="hidden md:flex gap-6 items-center font-medium text-sm text-slate-700 dark:text-slate-300">
          <Link to="/home"      className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Home</Link>
          <Link to="/dna-input" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">DNA &amp; Traits</Link>
          <Link to="/generate"  className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Generate</Link>
          <Link to="/dashboard" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors text-teal-700 dark:text-teal-300 font-semibold">Dashboard</Link>
          <Link to="/ethics"    className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Ethics</Link>
        </div>
      )}

      {/* Right side: Theme Toggler + user info + logout OR login button */}
      <div className="flex items-center gap-3">
        {/* Animated Theme Toggler Button */}
        <ThemeTogglerButton />

        {token ? (
          <>
            <span className="hidden sm:inline text-xs text-slate-500 dark:text-gray-400 font-mono">
              👤 <span className="text-cyan-600 dark:text-cyberBlue font-semibold">{user?.username || user?.email || 'Agent'}</span>
            </span>
            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 border border-red-500/40 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-500/10 transition-all text-xs font-semibold"
            >
              Logout
            </button>
          </>
        ) : (
          <Link
            to="/login"
            className="px-4 py-2 border border-teal-500/60 text-teal-600 dark:text-cyberBlue rounded-lg hover:bg-teal-500/10 dark:hover:bg-cyberBlue/10 transition-all shadow-sm text-xs font-semibold"
          >
            Login / Register
          </Link>
        )}
      </div>
    </nav>
  );
}
