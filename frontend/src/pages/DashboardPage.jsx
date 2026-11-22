import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalGenerations: 0,
    savedProfiles: 0,
    accuracyScore: 0.0,
    predictedCorrect: 0,
    recent: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/dashboard/stats')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setStats(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch stats", err);
        setLoading(false);
      });
  }, []);

  // Dynamic CSS classes for cards in both light and dark mode
  const cardClass = "rounded-2xl border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white shadow-sm glass-panel transition-all";
  const cardHeaderClass = "flex flex-col space-y-1.5 p-6";
  const cardTitleClass = "text-lg font-semibold leading-none tracking-tight text-slate-800 dark:text-gray-200";
  const cardContentClass = "p-6 pt-0";

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl sm:text-4xl font-extrabold neon-text text-slate-900 dark:text-white">
            Analytics Dashboard
          </h2>
          <p className="text-xs font-mono text-slate-500 dark:text-gray-400 mt-1">
            ForenAI Synthesis Telemetry &amp; Confidence Tracking
          </p>
        </div>
        <div className="text-xs text-slate-600 dark:text-gray-400 bg-slate-100 dark:bg-gray-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-gray-800">
          Operative: <span className="text-teal-600 dark:text-cyberBlue font-mono font-bold">Agent-X9</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        {/* Total Generations Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={cardClass}>
          <div className={cardHeaderClass}>
            <h3 className={cardTitleClass}>Total Generations</h3>
          </div>
          <div className={`${cardContentClass} flex justify-between items-end`}>
            <div className="text-4xl font-black text-teal-600 dark:text-cyberBlue">{stats.totalGenerations}</div>
            <div className="text-xs text-slate-500 dark:text-gray-500">+3 this week</div>
          </div>
        </motion.div>

        {/* Saved Profiles Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={cardClass}>
          <div className={cardHeaderClass}>
            <h3 className={cardTitleClass}>Saved DNA Profiles</h3>
          </div>
          <div className={`${cardContentClass} flex justify-between items-end`}>
            <div className="text-4xl font-black text-purple-600 dark:text-cyberPurple">{stats.savedProfiles}</div>
            <div className="text-xs text-slate-500 dark:text-gray-500">Archived securely</div>
          </div>
        </motion.div>

        {/* Accuracy Confidence Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={cardClass}>
          <div className={cardHeaderClass}>
            <h3 className={cardTitleClass}>Avg. Confidence</h3>
          </div>
          <div className={`${cardContentClass} flex justify-between items-end`}>
            <div className="text-4xl font-black text-emerald-600 dark:text-green-400">{stats.accuracyScore}%</div>
            <div className="text-xs text-slate-500 dark:text-gray-500">Based on CelebA weights</div>
          </div>
        </motion.div>

        {/* Predicted Correct Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className={cardClass}>
          <div className={cardHeaderClass}>
            <h3 className={cardTitleClass}>Predicted Correct</h3>
          </div>
          <div className={`${cardContentClass} flex justify-between items-end`}>
            <div className="text-4xl font-black text-amber-500 dark:text-yellow-400">{stats.predictedCorrect}</div>
            <div className="text-xs text-slate-500 dark:text-gray-500">Confidence &gt; 85%</div>
          </div>
        </motion.div>
      </div>

      {/* Recent Generations Table Area */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className={cardClass}>
        <div className={cardHeaderClass}>
          <h3 className={cardTitleClass}>Recent Syntheses Log</h3>
          <p className="text-xs text-slate-500 dark:text-gray-400">Your most recent GAN outputs and trait parameters.</p>
        </div>
        <div className={cardContentClass}>
          <div className="w-full overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-600 dark:text-gray-400 uppercase bg-slate-100 dark:bg-gray-900 border-b border-slate-200 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-3 rounded-tl-md">Timestamp</th>
                  <th className="px-6 py-3">Hair Color</th>
                  <th className="px-6 py-3">Eye Color</th>
                  <th className="px-6 py-3">Confidence</th>
                  <th className="px-6 py-3 text-right rounded-tr-md">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent && stats.recent.length > 0 ? (
                  stats.recent.map((gen, idx) => (
                    <tr key={idx} className="border-b border-slate-100 dark:border-gray-800 hover:bg-slate-100/60 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs">{gen.timestamp}</td>
                      <td className="px-6 py-4 capitalize">{gen.hairColor}</td>
                      <td className="px-6 py-4 capitalize">{gen.eyeColor}</td>
                      <td className="px-6 py-4 text-slate-700 dark:text-gray-300 font-mono">{gen.confidence > 0 ? `${gen.confidence}%` : '—'}</td>
                      <td className={`px-6 py-4 text-right font-semibold ${gen.status === 'Success' ? 'text-emerald-600 dark:text-green-400' : 'text-amber-500 dark:text-yellow-400'}`}>
                        {gen.status}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-slate-400 dark:text-gray-500 italic">
                      {loading ? "Loading telemetry..." : "No recent generations found. Initialize a synthesis to populate logs."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
