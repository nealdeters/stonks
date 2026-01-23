import React from 'react';
import { TrendingUp } from 'lucide-react';

export default function TopPerformers({ records, theme }) {
  const tc = theme.color;
  return (
    <div className={`bg-${tc}-950/40 p-6 rounded-3xl shadow-xl border border-${tc}-500/20 h-full backdrop-blur-sm`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
          <TrendingUp size={20} />
        </div>
        <h3 className="font-bold text-lg">All-Time Best Trades</h3>
      </div>

      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-${tc}-500/20`}>
            <div className="flex items-center gap-3">
              <span className={`font-mono text-${tc}-500/50 font-bold`}>0{i}</span>
              <div>
                <p className="font-bold text-sm">NVDA Call</p>
                <p className={`text-xs text-${tc}-400/60`}>2023 Season</p>
              </div>
            </div>
            <div className="text-emerald-500 font-black text-sm">+240%</div>
          </div>
        ))}
      </div>
    </div>
  );
}