import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../services/api';
import { motion } from 'framer-motion';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await registerUser(username, email, password);
      navigate('/login');
    } catch (err) {
      setError('Failed to request clearance. Email might be in use.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center pt-20 px-4 h-[calc(100vh-100px)]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel p-8 rounded-xl w-full max-w-md"
      >
        <h2 className="text-3xl font-bold mb-6 text-center neon-text">Request Clearance</h2>
        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-gray-400 mb-1">Operative Alias (Username)</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-darkBg border border-gray-700 rounded p-3 text-white focus:border-cyberBlue outline-none"
              required 
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-1">Clearance Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-darkBg border border-gray-700 rounded p-3 text-white focus:border-cyberBlue outline-none"
              required 
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-1">Passcode</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-darkBg border border-gray-700 rounded p-3 text-white focus:border-cyberBlue outline-none"
              required 
            />
          </div>
          <button 
            type="submit"
            className="w-full py-3 mt-4 bg-cyberPurple text-white font-bold rounded shadow-[0_0_15px_#3a7bd5] hover:scale-[1.02] transition-transform"
          >
            Submit Request
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-400">
          Already cleared? <Link to="/login" className="text-cyberBlue hover:underline">Authenticate Here</Link>
        </p>
      </motion.div>
    </div>
  );
}
