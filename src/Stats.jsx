import React from 'react';
import Table from './Table';

export default function Stats({ uuid, records, theme, onYearClick }) {
  const tc = theme.color;
  const userRecords = records.filter(r => r.user_uuid === uuid).sort((a, b) => b.year - a.year);

  if (userRecords.length === 0) return <div className="text-center p-10">No records found for this user.</div>;

  const name = userRecords[0].name;
  const seasons = userRecords.length;
  let totalReturn = 0;
  let gold = 0, silver = 0, bronze = 0;

  userRecords.forEach(r => {
      totalReturn += (parseFloat(r.percent_gain) || 0);
      if (r.place == '1') gold++;
      if (r.place == '2') silver++;
      if (r.place == '3') bronze++;
  });

  const avgReturn = seasons > 0 ? totalReturn / seasons : 0;

  return (
    <div>
        <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight mb-8 text-center">{name} Career</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
            <div className="bg-indigo-950/40 border border-indigo-500/20 p-6 rounded-[2rem] shadow-xl">
                <p className="text-[10px] text-indigo-300/70 uppercase font-black tracking-widest mb-1">Contests</p>
                <p className="text-2xl font-black text-white">{seasons}</p>
            </div>
            <div className="bg-indigo-950/40 border border-indigo-500/20 p-6 rounded-[2rem] shadow-xl">
                <p className="text-[10px] text-indigo-300/70 uppercase font-black tracking-widest mb-1">Avg. Return</p>
                <p className={`text-2xl font-black ${avgReturn > 0 ? 'text-emerald-400' : (avgReturn < 0 ? 'text-red-400' : 'text-white')}`}>{avgReturn.toFixed(2)}%</p>
            </div>
            <div className="bg-indigo-950/40 border border-amber-500/30 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group">
                <div className="absolute -right-2 -top-2 text-4xl opacity-10 group-hover:scale-110 transition-transform">🥇</div>
                <p className="text-[10px] text-amber-500/70 uppercase font-black tracking-widest mb-1">Gold</p>
                <p className="text-2xl font-black text-amber-400">{gold}</p>
            </div>
            <div className="bg-indigo-950/40 border border-slate-300/30 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group">
                <div className="absolute -right-2 -top-2 text-4xl opacity-10 group-hover:scale-110 transition-transform">🥈</div>
                <p className="text-[10px] text-slate-300/70 uppercase font-black tracking-widest mb-1">Silver</p>
                <p className="text-2xl font-black text-slate-200">{silver}</p>
            </div>
            <div className="bg-indigo-950/40 border border-orange-500/30 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group">
                <div className="absolute -right-2 -top-2 text-4xl opacity-10 group-hover:scale-110 transition-transform">🥉</div>
                <p className="text-[10px] text-orange-400/70 uppercase font-black tracking-widest mb-1">Bronze</p>
                <p className="text-2xl font-black text-orange-400">{bronze}</p>
            </div>
        </div>

        <Table id="stats-table" headers={[
            { label: 'Year' },
            { label: 'Stock' },
            { label: 'Place', className: 'text-center' },
            { label: 'Investment', className: 'text-right' },
            { label: 'Value', className: 'text-right' },
            { label: '% Return', className: 'text-right' }
        ]} className="mb-20">
            {userRecords.map((r, i) => {
                const gain = parseFloat(r.percent_gain) || 0;
                const capital = parseFloat(r.capital) || 0;
                const marketValue = capital * (1 + (gain / 100));
                return (
                    <tr key={i} className="block md:table-row hover:bg-indigo-500/5 transition-all border-b border-indigo-500/10 last:border-0 md:border-none group">
                        <td className="px-8 py-4 block md:table-cell border-b border-white/5 md:border-none"><span className="text-indigo-300/70 text-[10px] uppercase font-black md:hidden">Year</span><div className="flex flex-col items-end md:items-start"><button onClick={() => onYearClick(r.year)} className={`font-black text-white hover:text-${tc}-400 transition-colors underline decoration-${tc}-500/30 underline-offset-4`}>{r.year}</button></div></td>
                        <td className="px-8 py-4 block md:table-cell border-b border-white/5 md:border-none"><span className="text-indigo-300/70 text-[10px] uppercase font-black md:hidden">Stock</span><div className="flex flex-col items-end md:items-start"><span className={`bg-${tc}-500/10 text-${tc}-300 px-2.5 py-1 rounded text-[10px] font-black tracking-widest leading-none`}>{r.ticker}</span></div></td>
                        <td className="px-8 py-4 block md:table-cell md:text-center border-b border-white/5 md:border-none"><span className="text-indigo-300/70 text-[10px] uppercase font-black md:hidden">Place</span><div className="flex flex-col items-end md:items-center"><span className="font-bold text-white">{r.place} <span className="text-lg">{r.place == '1' ? '🥇' : (r.place == '2' ? '🥈' : (r.place == '3' ? '🥉' : ''))}</span></span></div></td>
                        <td className="px-8 py-4 block md:table-cell text-left md:text-right border-b border-white/5 md:border-none"><span className="text-indigo-300/70 text-[10px] uppercase font-black md:hidden">Investment</span><div className="flex flex-col items-end"><p className="text-xs font-bold text-white">${capital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p><p className="text-[10px] text-slate-400 font-mono">{(parseFloat(r.shares) || 0).toFixed(3)} @ ${(parseFloat(r.cost) || 0).toFixed(2)}</p></div></td>
                        <td className="px-8 py-4 block md:table-cell text-left md:text-right border-b border-white/5 md:border-none"><span className="text-indigo-300/70 text-[10px] uppercase font-black md:hidden">Value</span><div className="flex flex-col items-end"><p className="text-xs font-black text-white">${marketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div></td>
                        <td className="px-8 py-4 block md:table-cell text-left md:text-right border-b border-white/5 md:border-none"><span className="text-indigo-300/70 text-[10px] uppercase font-black md:hidden">% Return</span><div className="flex flex-col items-end"><span className={`font-black ${gain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{gain > 0 ? '+' : ''}{gain.toFixed(2)}%</span></div></td>
                    </tr>
                );
            })}
        </Table>
    </div>
  );
}