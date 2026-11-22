import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { loginUser } from '../services/api';
import { motion } from 'framer-motion';
import LiquidButton from '../components/ui/LiquidButton';
import { ShieldCheck, LogIn } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();
  // After login, go to where the user was heading (or /home as default)
  const destination = location.state?.from?.pathname || '/home';

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await loginUser(email, password);
      // Store token + user info
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate(destination, { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.error || 'Login failed. Check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center px-4 min-h-[80vh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-8 rounded-xl w-full max-w-md border border-gray-700"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <img
            src={`${import.meta.env.BASE_URL}forenai-icon.png`}
            alt="ForenAI"
            className="w-16 h-16 mx-auto mb-3 rounded-2xl shadow-[0_0_20px_rgba(20,184,166,0.35)] border border-teal-500/30"
          />
          <h2 className="text-3xl font-extrabold tracking-wider text-white">
            Foren<span className="text-cyan-400">AI</span>
          </h2>
          <p className="text-gray-400 font-mono text-xs mt-1 tracking-widest uppercase">
            DNA &bull; Analyze &bull; Reconstruct
          </p>
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-red-500/10 border border-red-500/40 text-red-400 text-sm px-4 py-3 rounded-lg mb-4 flex items-center gap-2"
          >
            <span>⚠️</span> {error}
          </motion.div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-slate-700 dark:text-gray-300 text-xs font-mono mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@forensic.gov"
              className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-gray-700 rounded-xl p-3 text-slate-900 dark:text-white placeholder-gray-500 focus:border-teal-500 focus:outline-none transition-colors text-sm"
              required
              autoFocus
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-slate-700 dark:text-gray-300 text-xs font-mono mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-gray-700 rounded-xl p-3 text-slate-900 dark:text-white placeholder-gray-500 focus:border-teal-500 focus:outline-none transition-colors text-sm"
              required
            />
          </div>

          {/* Submit with Liquid Button */}
          <div className="pt-2">
            <LiquidButton
              type="submit"
              disabled={loading}
              variant="teal"
              className="w-full py-3.5 shadow-[0_0_20px_rgba(20,184,166,0.3)] text-base"
              icon={<LogIn className="w-4 h-4 text-teal-400" />}
            >
              {loading ? 'Authenticating Operative...' : 'Access Platform'}
            </LiquidButton>
          </div>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Don't have an account?{' '}
          <Link to="/register" className="text-cyberBlue hover:underline font-semibold">
            Register here
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
