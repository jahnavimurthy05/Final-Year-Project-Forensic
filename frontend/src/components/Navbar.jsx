import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="glass-panel sticky top-0 z-50 py-4 px-8 flex justify-between items-center text-white">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-cyberBlue rounded-full shadow-[0_0_15px_#00d2ff]"></div>
        <Link to="/" className="text-xl font-bold tracking-wider uppercase neon-text">Forensic.AI</Link>
      </div>
      <div className="flex gap-6 items-center font-medium">
        <Link to="/" className="hover:text-cyberBlue transition-colors">Home</Link>
        <Link to="/dna-input" className="hover:text-cyberBlue transition-colors">DNA & Traits</Link>
        <Link to="/generate" className="hover:text-cyberBlue transition-colors">Generate Suspect</Link>
        <Link to="/dashboard" className="hover:text-cyberBlue transition-colors text-cyberPurple font-semibold">Dashboard</Link>
        <Link to="/ethics" className="hover:text-cyberBlue transition-colors">Ethics</Link>
      </div>
      <div className="flex gap-4">
        <Link to="/login" className="px-4 py-2 border border-cyberBlue text-cyberBlue rounded hover:bg-cyberBlue hover:text-darkBg transition-all shadow-[0_0_10px_#00d2ff_inset]">
          Login / Register
        </Link>
      </div>
    </nav>
  );
}
