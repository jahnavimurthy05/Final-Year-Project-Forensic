import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalGenerations: 0,
    savedProfiles: 0,
    accuracyScore: 0.0,
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

  // Shadcn-like CSS classes for cards
  const cardClass = "rounded-xl border border-gray-800 bg-darkBg text-white shadow-sm glass-panel";
  const cardHeaderClass = "flex flex-col space-y-1.5 p-6";
  const cardTitleClass = "text-xl font-semibold leading-none tracking-tight";
  const cardContentClass = "p-6 pt-0";

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-4xl font-bold neon-text">Analytics Dashboard</h2>
        <div className="text-sm text-gray-400 bg-gray-900 px-4 py-2 rounded border border-gray-800">
          Operative: <span className="text-cyberBlue font-mono">Agent-X9</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Generations Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={cardClass}>
          <div className={cardHeaderClass}>
            <h3 className={cardTitleClass}>Total Generations</h3>
          </div>
          <div className={`${cardContentClass} flex justify-between items-end`}>
            <div className="text-4xl font-bold text-cyberBlue">{stats.totalGenerations}</div>
            <div className="text-sm text-gray-500">+3 this week</div>
          </div>
        </motion.div>

        {/* Saved Profiles Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={cardClass}>
          <div className={cardHeaderClass}>
            <h3 className={cardTitleClass}>Saved DNA Profiles</h3>
          </div>
          <div className={`${cardContentClass} flex justify-between items-end`}>
            <div className="text-4xl font-bold text-cyberPurple">{stats.savedProfiles}</div>
            <div className="text-sm text-gray-500">Archived securely</div>
          </div>
        </motion.div>

        {/* Accuracy Confidence Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={cardClass}>
          <div className={cardHeaderClass}>
            <h3 className={cardTitleClass}>Avg. Confidence</h3>
          </div>
          <div className={`${cardContentClass} flex justify-between items-end`}>
            <div className="text-4xl font-bold text-green-400">{stats.accuracyScore}%</div>
            <div className="text-sm text-gray-500">Based on CelebA weights</div>
          </div>
        </motion.div>
      </div>

      {/* Recent Generations Table Area */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className={cardClass}>
        <div className={cardHeaderClass}>
          <h3 className={cardTitleClass}>Recent Syntheses Log</h3>
          <p className="text-sm text-gray-400">Your most recent GAN outputs and trait parameters.</p>
        </div>
        <div className={cardContentClass}>
          <div className="w-full overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-400 uppercase bg-gray-900 border-b border-gray-800">
                <tr>
                  <th className="px-6 py-3 rounded-tl-md">Timestamp</th>
                  <th className="px-6 py-3">Hair Color</th>
                  <th className="px-6 py-3">Eye Color</th>
                  <th className="px-6 py-3">Cheekbone</th>
                  <th className="px-6 py-3 text-right rounded-tr-md">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent && stats.recent.length > 0 ? (
                  stats.recent.map((gen, idx) => (
                    <tr key={idx} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs">{gen.timestamp}</td>
                      <td className="px-6 py-4">{gen.hairColor}</td>
                      <td className="px-6 py-4">{gen.eyeColor}</td>
                      <td className="px-6 py-4">{gen.cheekbone}</td>
                      <td className={`px-6 py-4 text-right ${gen.status === 'Success' ? 'text-green-400' : 'text-yellow-400'}`}>
                        {gen.status}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500 italic">
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
