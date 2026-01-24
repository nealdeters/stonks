import React from 'react';
import Table from './Table';

export default function HistoryView({ year, records, theme, onPlayerClick }) {
  const tc = theme.color;
  const yearRecords = records.filter(r => r.year == year).sort((a, b) => parseInt(a.place) - parseInt(b.place));

  if (yearRecords.length === 0) {
      return <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest">No records found for {year}</div>;
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight mb-8 text-center">{year} Contest</h2>
        <Table id="history-table" headers={[
            { label: 'Rank', className: 'hidden md:table-cell' },
            { label: 'Participant' },
            { label: 'Stock', className: 'text-center' },
            { label: '% Return', className: 'text-right' }
        ]} themeColor={tc}>
            {yearRecords.map((r, i) => {
                const gain = parseFloat(r.percent_gain) || 0;
                return (
                    <tr key={i} className={`block md:table-row hover:bg-${tc}-500/5 transition-all border-b border-${tc}-500/10 md:border-none group`}>
                        <td className={`hidden md:table-cell px-8 py-4 font-mono font-bold text-${tc}-400`}>#{r.place}</td>
                        <td className="px-8 py-4 block md:table-cell">
                            <div className="flex items-center gap-4">
                                <span className={`md:hidden text-xs font-mono text-${tc}-400 font-bold`}>#{r.place}</span>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => onPlayerClick(r.user_uuid)} className={`text-white font-black hover:text-${tc}-400 transition-all cursor-pointer group flex items-center gap-2 text-left`}>
                                            <span className="text-base md:text-sm tracking-tight">{r.name}</span>
                                            <span className={`text-[8px] opacity-0 group-hover:opacity-100 transform translate-x-[-4px] group-hover:translate-x-0 transition-all bg-${tc}-500/20 px-2 py-0.5 rounded border border-${tc}-500/30 text-${tc}-300 whitespace-nowrap`}>VIEW CAREER</span>
                                        </button>
                                    </div>
                                    {r.place == '1' && <span className="mt-1.5 block w-fit px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-tighter bg-amber-500/20 text-amber-500 border-amber-500/50"><span className="mr-1">🥇</span>Winner</span>}
                                </div>
                            </div>
                        </td>
                        <td className="px-8 py-3 md:py-5 block md:table-cell text-left md:text-center">
                            <span className={`text-${tc}-300/70 text-[10px] uppercase font-black md:hidden pt-1`}>Stock</span>
                            <div className="flex flex-col items-end md:items-center">
                                <span className={`bg-${tc}-500/10 text-${tc}-300 px-2.5 py-1 rounded text-[10px] font-black tracking-widest leading-none`}>{r.ticker}</span>
                            </div>
                        </td>
                        <td className="px-8 py-5 block md:table-cell text-left md:text-right">
                            <span className={`text-${tc}-300/70 text-[10px] uppercase font-black md:hidden`}>% Return</span>
                            <div className="flex flex-col items-end">
                                <p className={`text-lg md:text-sm font-black ${gain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {gain > 0 ? '+' : ''}{gain.toFixed(2)}%
                                </p>
                            </div>
                        </td>
                    </tr>
                );
            })}
        </Table>
    </div>
  );
}