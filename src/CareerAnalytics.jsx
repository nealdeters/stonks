import React from 'react';
import { BarChart2 } from 'lucide-react';

export default function CareerAnalytics({ records, selectedPlayer, theme }) {
  const tc = theme.color;
  // Placeholder logic - in a real app you'd aggregate 'records' by user
  return (
    <div className={`bg-${tc}-950/40 p-6 rounded-3xl shadow-xl border border-${tc}-500/20 h-full backdrop-blur-sm`}>
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-2 bg-${tc}-500/10 text-cyan-400 rounded-lg border border-${tc}-500/20`}>
          <BarChart2 size={20} />
        </div>
        <h3 className="font-bold text-lg">Career Analytics</h3>
      </div>
      
      {selectedPlayer ? (
        <div>
            <h4 className="text-xl font-black text-white mb-4">{selectedPlayer.name}</h4>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className={`text-${tc}-400 text-xs uppercase font-bold`}>
                        <tr>
                            <th className="pb-2">Stock</th>
                            <th className="pb-2 text-right">Return</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y divide-${tc}-500/10`}>
                        <tr>
                            <td className="py-2 font-mono text-cyan-400">{selectedPlayer.ticker}</td>
                            <td className="py-2 text-right font-bold text-emerald-500">{selectedPlayer.gainPct?.toFixed(2)}%</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
      ) : (
        <div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className={`text-${tc}-400 text-xs uppercase font-bold`}>
                        <tr>
                            <th className="pb-2">Participant</th>
                            <th className="pb-2 text-right">Total Return</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y divide-${tc}-500/10`}>
                        <tr>
                            <td className={`py-8 text-center text-${tc}-400/50 italic`} colSpan="2">
                                Select a participant from the leaderboard to view detailed career stats.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
      )}
    </div>
  );
}