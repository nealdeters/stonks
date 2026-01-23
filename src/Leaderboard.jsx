import React from 'react';
import Table from './Table';

export default function Leaderboard({ contestants, prizes, onPlayerClick, theme }) {
  const tc = theme.color;
  const getPrizeBadge = (index, total) => {
    const rankKey = (index + 1).toString();
    let prize = prizes[rankKey];
    
    // Check for last place prize
    if (index === total - 1 && !prize && prizes['last']) {
        prize = prizes['last'];
    }

    if (!prize) return null;

    let styleClass = `bg-${tc}-300/20 text-${tc}-300 border-${tc}-300/50`;
    if (index === total - 1) styleClass = "bg-red-500/20 text-red-400 border-red-500/50";
    if (index === 0) styleClass = "bg-amber-500/20 text-amber-500 border-amber-500/50";
    if (index === 1) styleClass = "bg-slate-300/20 text-slate-300 border-slate-300/50";
    if (index === 2) styleClass = "bg-orange-600/20 text-orange-400 border-orange-600/50";

    return (
      <span className={`mt-1.5 block w-fit px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-tighter ${styleClass}`}>
        <span className="mr-1">{prize.emoji}</span>{prize.amount}
      </span>
    );
  };

  if (!contestants || contestants.length === 0) {
    return <div className={`text-center p-10 text-${tc}-400/50 font-mono`}>No active contestants found.</div>;
  }

  const headers = [
    { label: 'Rank' },
    { label: 'Participant' },
    { label: 'Stock', className: 'text-center' },
    { label: 'Investment', className: 'text-right' },
    { label: 'Value', className: 'text-right' },
    { label: '% Return', className: 'text-right' }
  ];

  return (
    <Table id="leaderboard-table" headers={headers} className="mb-8">
            {contestants.map((c, idx) => (
              <tr key={idx} className={`block md:table-row hover:bg-${tc}-500/10 transition-all border-b border-${tc}-500/10 last:border-0 md:border-none`}>
                <td className={`hidden md:table-cell px-8 py-4 font-mono font-bold text-${tc}-400`}>#{idx + 1}</td>
                <td className="px-8 py-4 block md:table-cell border-b border-white/5 md:border-none">
                    <div className="flex items-center gap-4">
                        <span className={`md:hidden text-xs font-mono text-${tc}-400 font-bold w-6`}>#{idx + 1}</span>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                                <button onClick={() => onPlayerClick(c)} className="text-white font-black hover:text-cyan-400 transition-all cursor-pointer group flex items-center gap-2 text-left">
                                    <span className="text-base md:text-sm tracking-tight">{c.name}</span>
                                    <span className={`text-[8px] opacity-0 group-hover:opacity-100 transform translate-x-[-4px] group-hover:translate-x-0 transition-all bg-${tc}-500/20 px-2 py-0.5 rounded border border-${tc}-500/30 text-${tc}-300 whitespace-nowrap`}>
                                        VIEW CAREER
                                    </span>
                                </button>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                {getPrizeBadge(idx, contestants.length)}
                            </div>
                        </div>
                    </div>
                </td>
                <td className="px-8 py-3 md:py-5 block md:table-cell text-left md:text-center border-b border-white/5 md:border-none">
                    <span className="text-slate-400 text-[10px] uppercase font-black md:hidden pt-1">Stock</span>
                    <div className="flex flex-col items-end md:items-center">
                        <span className={`bg-${tc}-500/20 text-${tc}-200 px-2.5 py-1 rounded text-[10px] font-black tracking-widest border border-${tc}-500/30`}>{c.ticker}</span>
                        <span className="text-[9px] text-slate-300 mt-2 font-bold uppercase tracking-widest">{c.stockname}</span>
                    </div>
                </td>
                <td className="px-8 py-3 md:py-5 block md:table-cell text-left md:text-right border-b border-white/5 md:border-none">
                    <span className="text-slate-400 text-[10px] uppercase font-black md:hidden">Investment</span>
                    <div className="flex flex-col items-end">
                        <p className="text-xs font-bold text-white">${(parseFloat(c.capital) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{(parseFloat(c.shares) || 0).toFixed(3)} @ ${(parseFloat(c.cost) || 0).toFixed(2)}</p>
                    </div>
                </td>
                <td className="px-8 py-3 md:py-5 block md:table-cell text-left md:text-right border-b border-white/5 md:border-none">
                    <span className="text-slate-400 text-[10px] uppercase font-black md:hidden">Value</span>
                    <div className="flex flex-col items-end">
                        <p className="text-xs font-black text-white">${(c.marketValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p className="text-[10px] text-slate-400 font-mono">${(c.currentPrice || 0).toFixed(2)}</p>
                    </div>
                </td>
                <td className="px-8 py-5 block md:table-cell text-left md:text-right border-b border-white/5 md:border-none">
                    <span className="text-slate-400 text-[10px] uppercase font-black md:hidden">% Return</span>
                    <div className="flex flex-col items-end">
                        <p className={`text-lg md:text-sm font-black ${c.gainPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {c.gainPct >= 0 ? '+' : ''}{c.gainPct.toFixed(2)}%
                        </p>
                    </div>
                </td>
              </tr>
            ))}
    </Table>
  );
}