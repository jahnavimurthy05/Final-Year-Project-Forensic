import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../services/api';
import { motion } from 'framer-motion';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      return setError('Passwords do not match.');
    }
    if (password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }

    setLoading(true);
    try {
      await registerUser(username, email, password);
      setSuccess(true);
      // Redirect to login after 2s
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      const msg = err?.response?.data?.error || 'Registration failed. Please try again.';
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
          <div className="text-4xl mb-2">🧬</div>
          <h2 className="text-3xl font-bold neon-text">Create Account</h2>
          <p className="text-gray-500 text-sm mt-1">Forensic Face Generation System</p>
        </div>

        {/* Success banner */}
        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-500/10 border border-green-500/40 text-green-400 text-sm px-4 py-3 rounded-lg mb-4 flex items-center gap-2"
          >
            <span>✅</span> Account created! Redirecting to login…
          </motion.div>
        )}

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

        <form onSubmit={handleRegister} className="space-y-5">
          {/* Username */}
          <div>
            <label className="block text-gray-400 text-sm mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="agent_smith"
              className="w-full bg-darkBg border border-gray-700 rounded-lg p-3 text-white placeholder-gray-600 focus:border-cyberPurple focus:outline-none transition-colors"
              required
              autoFocus
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-gray-400 text-sm mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@forensic.gov"
              className="w-full bg-darkBg border border-gray-700 rounded-lg p-3 text-white placeholder-gray-600 focus:border-cyberPurple focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-gray-400 text-sm mb-1">Password <span className="text-gray-600 text-xs">(min 6 characters)</span></label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-darkBg border border-gray-700 rounded-lg p-3 text-white placeholder-gray-600 focus:border-cyberPurple focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-gray-400 text-sm mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className={`w-full bg-darkBg border rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none transition-colors ${
                confirm && confirm !== password
                  ? 'border-red-500 focus:border-red-400'
                  : 'border-gray-700 focus:border-cyberPurple'
              }`}
              required
            />
            {confirm && confirm !== password && (
              <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-3 mt-2 bg-cyberPurple text-white font-bold text-lg rounded-lg shadow-[0_0_15px_rgba(139,92,246,0.4)] hover:scale-[1.02] transition-transform disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin" />
                Creating Account…
              </>
            ) : (
              '🚀 Create Account'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-cyberBlue hover:underline font-semibold">
            Login here
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
