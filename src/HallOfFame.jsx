import React from 'react';

const PodiumLink = ({ rank, uuid, name, onPlayerClick, tc, rankColor, emoji }) => {
  const rankLabel = rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd';
  
  if (!name) return (
    <div className={`flex items-center gap-4 p-4 rounded-2xl bg-${tc}-950/40 border border-${tc}-500/20 opacity-50 shadow-lg`}>
      <div className="text-2xl opacity-20">{emoji}</div>
      <div className="overflow-hidden">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{rankLabel} Place</p>
          <p className="text-sm font-bold text-slate-600 truncate">-</p>
      </div>
    </div>
  );

  return (
    <button 
      onClick={() => onPlayerClick(uuid)} 
      className={`flex items-center gap-4 p-4 rounded-2xl bg-${tc}-950/40 border border-${tc}-500/20 hover:border-${rankColor}/50 transition-all group shadow-lg text-left w-full`}
    >
        <div className="text-2xl">{emoji}</div>
        <div className="overflow-hidden">
            <p className={`text-[9px] font-black uppercase tracking-widest text-${rankColor}`}>{rankLabel} Place</p>
            <p className={`text-sm font-bold text-white group-hover:text-${rankColor} transition-colors truncate`}>{name}</p>
        </div>
    </button>
  );
};

export default function HallOfFame({ winners, records, theme, onYearClick, onPlayerClick }) {
  const tc = theme.color;
  const themeIcon = theme.icon;

  if (!winners || winners.length === 0) {
    return (
      <div className="space-y-8">
        <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight mb-8 text-center">Hall of Fame</h2>
        <div className={`bg-${tc}-950/20 border border-${tc}-500/20 rounded-[40px] p-12 text-center my-8`}>
          <div className="text-6xl mb-6">{themeIcon}</div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-3">Season Intermission</h2>
          <p className={`text-${tc}-300/70 max-w-md mx-auto mb-8 font-medium`}>
            The previous contest has concluded and the board has been cleared. Check the Hall of Fame for past winners while we prepare for the next round!
          </p>
        </div>
      </div>
    );
  }

  const allRecords = records || [];
  const totalContests = winners.length;
  
  // Calculate average return across all contests
  const avgContestReturn = allRecords.length > 0 
    ? allRecords.reduce((acc, r) => acc + (parseFloat(r.percent_gain) || 0), 0) / allRecords.length 
    : 0;

  // Calculate best year (highest average return)
  const years = [...new Set(allRecords.map(r => r.year))];
  const yearStats = years.map(y => {
    const yearRecords = allRecords.filter(r => r.year === y);
    const avg = yearRecords.reduce((acc, r) => acc + (parseFloat(r.percent_gain) || 0), 0) / yearRecords.length;
    return { year: y, avg };
  });
  const bestYearObj = yearStats.length > 0 
    ? yearStats.reduce((prev, curr) => (curr.avg > prev.avg ? curr : prev), yearStats[0])
    : { year: 'N/A', avg: 0 };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight mb-8 text-center">Hall of Fame</h2>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className={`bg-${tc}-950/40 border border-${tc}-500/20 p-6 rounded-[2rem] shadow-xl`}>
              <p className={`text-[10px] text-${tc}-300/70 uppercase font-black tracking-widest mb-1`}>Total Contests</p>
              <p className="text-2xl font-black text-white">{totalContests}</p>
          </div>
          <div className={`bg-${tc}-950/40 border border-${tc}-500/20 p-6 rounded-[2rem] shadow-xl`}>
              <p className={`text-[10px] text-${tc}-300/70 uppercase font-black tracking-widest mb-1`}>Avg. Contest Return</p>
              <p className={`text-2xl font-black ${avgContestReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {avgContestReturn >= 0 ? '+' : ''}{avgContestReturn.toFixed(2)}%
              </p>
          </div>
          <div className={`bg-${tc}-950/40 border border-${tc}-500/20 p-6 rounded-[2rem] shadow-xl`}>
              <p className={`text-[10px] text-${tc}-300/70 uppercase font-black tracking-widest mb-1`}>Best Year</p>
              <p className="text-2xl font-black text-white">{bestYearObj.year} ({bestYearObj.avg.toFixed(1)}%)</p>
          </div>
      </div>

      <div className={`leaderboard-card-container bg-${tc}-950/10 border border-${tc}-500/10 shadow-2xl mb-12 overflow-hidden`}>
        <div id="winners-body" className={`divide-y divide-${tc}-500/10`}>
          {winners.map((w, i) => {
            const yearRecords = allRecords.filter(r => r.year === w.year);
            const yearAvg = yearRecords.length > 0 
              ? yearRecords.reduce((acc, r) => acc + (parseFloat(r.percent_gain) || 0), 0) / yearRecords.length 
              : 0;

          return (
            <div key={i} className={`p-8 border-b border-${tc}-500/10 last:border-0 hover:bg-${tc}-500/5 transition-all`}>
                <div className="flex flex-col md:flex-row md:items-center gap-8">
                    <div className="shrink-0 flex flex-col items-center gap-2 w-32">
                        <button onClick={() => onYearClick(w.year)} className={`text-5xl font-black text-white italic tracking-tighter opacity-80 hover:text-${tc}-400 transition-colors underline decoration-${tc}-500/30 underline-offset-8`}>
                          {w.year}
                        </button>
                        <span className={`text-xs font-bold ${yearAvg >= 0 ? 'text-emerald-400' : 'text-red-400'} bg-${tc}-950/40 px-3 py-1 rounded-full border border-${tc}-500/20`}>
                          {yearAvg >= 0 ? '+' : ''}{yearAvg.toFixed(2)}% Avg
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                        <PodiumLink 
                          rank={1} uuid={w.first_user_uuid} name={w.first_user_name} 
                          onPlayerClick={onPlayerClick} tc={tc} rankColor="amber-400" emoji="🥇" 
                        />
                        <PodiumLink 
                          rank={2} uuid={w.second_user_uuid} name={w.second_user_name} 
                          onPlayerClick={onPlayerClick} tc={tc} rankColor="slate-300" emoji="🥈" 
                        />
                        <PodiumLink 
                          rank={3} uuid={w.third_user_uuid} name={w.third_user_name} 
                          onPlayerClick={onPlayerClick} tc={tc} rankColor="orange-400" emoji="🥉" 
                        />
                    </div>
                </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}