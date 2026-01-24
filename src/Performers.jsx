import React from 'react';
import Table from './Table';

export default function Performers({ records, theme, onPlayerClick }) {
  const tc = theme.color;

  if (!records || records.length === 0) {
    return (
        <div className="w-full max-w-7xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight mb-8 text-center">Career Stats</h2>
            <div className="p-8 text-center">
                <div className={`flex flex-col items-center justify-center p-12 rounded-[2.5rem] bg-${tc}-950/20 border border-${tc}-500/10`}>
                    <div className="text-5xl mb-4 opacity-50 grayscale">📉</div>
                    <h3 className="text-lg font-black text-white uppercase tracking-widest mb-2">No Records Found</h3>
                    <p className={`text-${tc}-300/50 text-xs font-bold uppercase tracking-widest`}>The archives appear to be empty.</p>
                </div>
            </div>
        </div>
    );
  }

  const stats = {};
  records.forEach(row => {
      const uuid = row.user_uuid;
      if (!stats[uuid]) {
          stats[uuid] = { name: row.name, uuid: uuid, seasons: 0, totalReturn: 0, gold: 0, silver: 0, bronze: 0 };
      }
      stats[uuid].seasons += 1;
      stats[uuid].totalReturn += (parseFloat(row.percent_gain) || 0);
      const place = parseInt(row.place);
      if (place === 1) stats[uuid].gold++;
      else if (place === 2) stats[uuid].silver++;
      else if (place === 3) stats[uuid].bronze++;
  });

  const leaderboard = Object.values(stats).map(s => ({
      ...s,
      avgReturn: s.totalReturn / s.seasons
  })).sort((a, b) => b.avgReturn - a.avgReturn);

  const headers = [
    { label: 'Rank', className: 'w-20' },
    { label: 'Participant' },
    { label: 'Contests', className: 'text-center' },
    { label: 'Medals', className: 'text-center' },
    { label: 'Avg Return', className: 'text-right' }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto">
      <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight mb-8 text-center">Career Stats</h2>
      <Table id="performers-table" headers={headers}>
        {leaderboard.map((row, index) => (
            <tr key={index} className={`block md:table-row hover:bg-${tc}-500/5 transition-all border-b border-${tc}-500/10 last:border-0 group`}>
                <td className={`hidden md:table-cell px-8 py-6 font-mono font-bold text-${tc}-400`}>#{index + 1}</td>
                <td className="px-8 py-4 block md:table-cell border-b border-white/5 md:border-none">
                    <div className="flex items-center gap-4">
                        <span className={`md:hidden text-xs font-mono text-${tc}-400 font-bold w-6`}>#{index + 1}</span>
                        <button onClick={() => onPlayerClick(row.uuid)} className={`text-white font-black hover:text-${tc}-400 transition-all cursor-pointer group flex items-center gap-2 text-left`}>
                            <span className="text-lg md:text-base">{row.name}</span>
                            <span className={`text-[8px] opacity-0 group-hover:opacity-100 transform translate-x-[-4px] group-hover:translate-x-0 transition-all bg-${tc}-500/20 px-2 py-0.5 rounded border border-${tc}-500/30 text-${tc}-300 whitespace-nowrap`}>VIEW CAREER</span>
                        </button>
                    </div>
                </td>
                <td className="px-8 py-3 md:py-6 block md:table-cell text-left md:text-center border-b border-white/5 md:border-none">
                    <span className="text-slate-400 text-[10px] uppercase font-black md:hidden pt-1">Seasons</span>
                    <div className="flex flex-col items-end md:block"><div className="font-mono text-slate-300 font-bold">{row.seasons}</div></div>
                </td>
                <td className="px-8 py-3 md:py-6 block md:table-cell text-left md:text-center border-b border-white/5 md:border-none">
                    <span className="text-slate-400 text-[10px] uppercase font-black md:hidden pt-1">Medals</span>
                    <div className="flex flex-col items-end md:block">
                        <div className="flex justify-end md:justify-center gap-2 text-xs font-bold">
                            {row.gold > 0 && <span className="px-2 py-1 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20" title="Gold">🥇 {row.gold}</span>}
                            {row.silver > 0 && <span className="px-2 py-1 bg-slate-500/10 text-slate-300 rounded border border-slate-500/20" title="Silver">🥈 {row.silver}</span>}
                            {row.bronze > 0 && <span className="px-2 py-1 bg-orange-500/10 text-orange-400 rounded border border-orange-500/20" title="Bronze">🥉 {row.bronze}</span>}
                        </div>
                    </div>
                </td>
                <td className="px-8 py-3 md:py-6 block md:table-cell text-left md:text-right border-b border-white/5 md:border-none">
                    <span className="text-slate-400 text-[10px] uppercase font-black md:hidden pt-1">Avg Return</span>
                    <div className="flex flex-col items-end md:block"><div className={`font-mono font-bold ${row.avgReturn >= 0 ? 'text-emerald-400' : 'text-red-400'} text-lg md:text-base`}>{row.avgReturn >= 0 ? '+' : ''}{row.avgReturn.toFixed(2)}%</div></div>
                </td>
            </tr>
        ))}
      </Table>
    </div>
  );
}