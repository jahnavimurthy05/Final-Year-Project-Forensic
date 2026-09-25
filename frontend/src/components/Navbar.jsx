import { Link, useNavigate } from 'react-router-dom';

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
    <nav className="glass-panel sticky top-0 z-50 py-4 px-8 flex justify-between items-center text-white">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-cyberBlue rounded-full shadow-[0_0_15px_#00d2ff]" />
        <Link to={token ? '/home' : '/login'} className="text-xl font-bold tracking-wider uppercase neon-text">
          Forensic.AI
        </Link>
      </div>

      {/* Nav links — only shown when logged in */}
      {token && (
        <div className="flex gap-6 items-center font-medium">
          <Link to="/home"      className="hover:text-cyberBlue transition-colors">Home</Link>
          <Link to="/dna-input" className="hover:text-cyberBlue transition-colors">DNA &amp; Traits</Link>
          <Link to="/generate"  className="hover:text-cyberBlue transition-colors">Generate</Link>
          <Link to="/dashboard" className="hover:text-cyberBlue transition-colors text-cyberPurple font-semibold">Dashboard</Link>
          <Link to="/ethics"    className="hover:text-cyberBlue transition-colors">Ethics</Link>
        </div>
      )}

      {/* Right side: user info + logout OR login button */}
      <div className="flex items-center gap-4">
        {token ? (
          <>
            <span className="text-sm text-gray-400 font-mono">
              👤 <span className="text-cyberBlue">{user?.username || user?.email || 'Agent'}</span>
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-red-500/50 text-red-400 rounded hover:bg-red-500/10 transition-all text-sm font-semibold"
            >
              Logout
            </button>
          </>
        ) : (
          <Link
            to="/login"
            className="px-4 py-2 border border-cyberBlue text-cyberBlue rounded hover:bg-cyberBlue hover:text-darkBg transition-all shadow-[0_0_10px_#00d2ff_inset] text-sm font-semibold"
          >
            Login / Register
          </Link>
        )}
      </div>
    </nav>
  );
}
