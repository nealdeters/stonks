import React, { useState, useEffect } from 'react';
import Leaderboard from './Leaderboard';
import SubmitPick from './SubmitPick';
import InstallView from './Install';
import HistoryView from './History';
import Performers from './Performers';
import NewsView from './News';
import Stats from './Stats';
import HallOfFame from './HallOfFame';
import { getStonksData } from '../api';

const Ticker = ({ prices, theme }) => {
  if (!prices || prices.length === 0) return null;
  const items = [...prices, ...prices, ...prices, ...prices];
  return (
    <div className={`w-full bg-${theme.color}-950/30 border-t border-b border-${theme.color}-500/20 overflow-hidden py-1.5 relative z-40 backdrop-blur-sm`}>
      <div className="animate-marquee inline-block whitespace-nowrap">
        {items.map((p, i) => (
          <span key={i} className="inline-flex items-center gap-2 mx-6 text-xs font-bold font-mono">
            <span className="text-white">{p.ticker}</span>
            <span className={p.dp >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              {p.price.toFixed(2)} ({p.dp >= 0 ? '+' : ''}{p.dp.toFixed(2)}%)
            </span>
          </span>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState('leaderboard');
  const [data, setData] = useState({ 
    sheetData: { contestants: [], prizes: [], benchmarks: [], controls: {}, records: [] }, 
    prices: [], 
    isMarketOpen: false, 
    holidayName: null,
    lastUpdated: null,
    loading: true 
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [viewParams, setViewParams] = useState({});
  const [theme, setTheme] = useState({ color: 'indigo', icon: '🏆' });

  useEffect(() => {
    // Theme Logic
    const month = new Date().getMonth();
    let color = 'indigo';
    let icon = '🏆';
    
    if (month === 11) { // December
        color = 'emerald';
        icon = '🎄';
    } else if (month === 10) { // November
        color = 'orange';
        icon = '🦃';
    }
    
    setTheme({ color, icon });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam) {
      setView(viewParam);
      const uuid = params.get('uuid');
      const year = params.get('year');
      if (uuid || year) {
        setViewParams({ uuid, year });
      }
    }
  }, []);

  const navigate = (newView, params = {}) => {
    setView(newView);
    setViewParams(params);
    const url = new URL(window.location);
    url.searchParams.set('view', newView);
    ['uuid', 'year'].forEach(k => url.searchParams.delete(k));
    Object.entries(params).forEach(([k, v]) => {
      if (v) url.searchParams.set(k, v);
    });
    window.history.pushState({}, '', url);
  };

  useEffect(() => {
    const fetchData = async (isRetry = false) => {
      setIsSyncing(true);
      try {
        // Use the centralized utility which handles cache-busting and JSON parsing
        const result = await getStonksData();
        
        // Process Contestants
        const { sheetData, prices = [], isMarketOpen, holidayName } = result || {};
        const lastUpdated = result?.lastUpdated || new Date().toISOString();
        const rawContestants = sheetData?.contestants || [];
        const processedContestants = rawContestants.map(c => {
            const live = prices.find(p => p.ticker === (c.ticker || '').toUpperCase()) || {};
            const currentPrice = live?.price || 0;
            const cost = parseFloat(c.cost) || 0;
            const shares = parseFloat(c.shares) || 0;

            return {
                ...c,
                name: c.name || "Anonymous",
                currentPrice,
                marketValue: shares * currentPrice,
                gainPct: cost > 0 ? ((currentPrice - cost) / cost) * 100 : 0,
                dailyChange: live?.dp || 0,
                stockname: live?.name || 'Stock'
            };
        }).sort((a, b) => b.gainPct - a.gainPct);

        // Process Prizes
        const prizes = {};
        if (sheetData?.prizes) {
          sheetData.prizes.forEach(p => {
            const rank = p.rank?.toString().toLowerCase();
            if (rank) prizes[rank] = { emoji: p.emoji || '💰', amount: p.amount || '$0.00' };
          });
        }

        setData({ 
          sheetData, 
          prices, 
          lastUpdated, 
          isMarketOpen, 
          holidayName, 
          contestants: processedContestants, 
          prizes, 
          loading: false 
        });
      } catch (error) {
        console.error("Failed to fetch data:", error);
        if (!isRetry && !data.contestants?.length) {
            // Retry quickly (1s) if we have no data yet, instead of waiting 30s
            setTimeout(() => fetchData(true), 1000);
        } else {
            setData(prev => ({ ...prev, loading: false, error: true }));
        }
      } finally {
        setIsSyncing(false);
      }
    };

    fetchData();
    const interval = setInterval(() => fetchData(false), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view, viewParams]);

  useEffect(() => {
    if (data.sheetData?.controls?.title) {
      document.title = data.sheetData.controls.title;
    }
  }, [data.sheetData?.controls?.title]);

  const tc = theme.color;

  // Stats
  const totalCapital = data.contestants?.reduce((acc, c) => acc + (parseFloat(c.cost) * parseFloat(c.shares) || 0), 0) || 0;
  const totalValue = data.contestants?.reduce((acc, c) => acc + (c.marketValue || 0), 0) || 0;
  const totalReturn = totalCapital > 0 ? ((totalValue - totalCapital) / totalCapital) * 100 : 0;
  
  const topMover = data.contestants?.length > 0 
    ? data.contestants.reduce((prev, curr) => (curr.dailyChange > prev.dailyChange ? curr : prev), data.contestants[0])
    : { name: 'N/A', dailyChange: 0 };

  // Benchmarks
  const benchmarks = data.sheetData?.benchmarks || [];
  const benchmarkElements = benchmarks.map(b => {
      const live = data.prices?.find(p => p.ticker === b.ticker);
      const start = parseFloat(b.price);
      if (!live || !start) return null;
      const pct = ((live.price - start) / start) * 100;
      return { ...b, pct, isPos: pct >= 0 };
  }).filter(Boolean);

  if (data.loading) return <div className={`flex justify-center p-10 text-${tc}-400 font-mono animate-pulse`}>Loading Market Data...</div>;
  if (data.error) return <div className="flex justify-center p-10 text-red-500 font-mono">System Error: Unable to load dashboard data.</div>;

  return (
    <div className={`min-h-screen bg-[#020617] text-white selection:bg-${tc}-500/30 font-sans pb-32 flex flex-col`}>
      <header className="main-sticky-header sticky top-0 z-30 bg-[#020617]/80 backdrop-blur-md border-b border-indigo-500/10 flex flex-col">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex justify-between items-center w-full py-4">
            <div className="flex header-branding items-center gap-6 shrink-0 cursor-pointer" onClick={() => navigate('leaderboard')}>
                <img src="icon.png" alt="Stonks Logo" className="h-14 w-14 object-contain shrink-0 rounded-2xl" />
                <div className="flex flex-col items-center md:items-start shrink-0">
                    <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 uppercase leading-none text-center md:text-left">
                        {data.sheetData?.controls?.title || 'Stonks'}
                    </h1>
                    <div id="market-status" className={`flex items-center gap-2 px-3 py-1 mt-2 rounded-full bg-${tc}-950/50 border border-${tc}-500/30 w-fit mx-auto md:mx-0`}>
                        <span id="status-dot" className={`h-2 w-2 rounded-full ${data.isMarketOpen ? 'bg-emerald-500 animate-ping' : 'bg-red-500'}`}></span>
                        <span id="status-text" className={`text-[10px] font-black uppercase tracking-widest text-${tc}-300`}>{isSyncing ? 'Syncing...' : (data.isMarketOpen ? 'Market Open' : (data.holidayName ? `Closed (${data.holidayName})` : 'Market Closed'))}</span>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-4 flex-wrap justify-center shrink-0">
                {data.sheetData?.controls?.payment_url && (
                    <button id="payment-btn" onClick={() => window.location.href = data.sheetData.controls.payment_url} className={`btn-secondary px-4 md:px-6 py-2 rounded-xl bg-${tc}-500/10 hover:bg-${tc}-500/20 border border-${tc}-500/20 text-[10px] font-black uppercase tracking-widest text-${tc}-300 transition-all active:scale-95 whitespace-nowrap`}>
                        {data.sheetData.controls.payment_text || 'Pay Entry Fee'}
                    </button>
                )}
                <button id="add-participant-btn" onClick={() => navigate('submit')} className={`btn-secondary px-4 md:px-6 py-2 rounded-xl bg-${tc}-500/10 hover:bg-${tc}-500/20 border border-${tc}-500/20 text-[10px] font-black uppercase tracking-widest text-${tc}-300 transition-all active:scale-95 whitespace-nowrap`}>
                    Add Participant
                </button>
                <div id="last-updated" className={`text-[10px] text-${tc}-400/70 uppercase tracking-widest font-bold bg-${tc}-950/30 px-4 py-2 rounded-lg border border-${tc}-500/20 whitespace-nowrap`}>
                    {isSyncing ? 'SYNCING...' : (data.lastUpdated ? `SYNC: ${new Date(data.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'SYNCING...')}
                </div>
            </div>
        </div>
        <Ticker prices={data.prices} theme={theme} />
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 pt-8 flex-grow w-full">
        {view === 'leaderboard' ? (
            <>
                <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4 mb-8">
                    <div id="benchmarks-container" className="flex flex-wrap gap-3">
                        {benchmarkElements.map((b, i) => (
                            <div key={i} className={`bg-${tc}-500/5 border border-${tc}-500/10 p-4 rounded-3xl flex items-center gap-4 flex-1 min-w-[140px]`}>
                                <div className={`${b.isPos ? 'bg-emerald-500/20' : 'bg-red-500/20'} p-2.5 rounded-xl text-xs font-black`}>{b.ticker}</div>
                                <div>
                                    <p className={`text-[9px] text-${tc}-300/70 uppercase font-black tracking-widest`}>{b.name}</p>
                                    <div className="flex items-baseline gap-1">
                                        <p className={`text-sm font-bold ${b.isPos ? 'text-emerald-400' : 'text-red-400'}`}>{b.isPos ? '+' : ''}{b.pct.toFixed(2)}%</p>
                                        <span className={`text-[8px] text-${tc}-300/50 font-bold uppercase`}>YTD</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-violet-500/5 border border-violet-500/20 p-4 rounded-3xl flex items-center gap-4 h-full relative overflow-hidden">
                        <div className="bg-violet-500/20 p-2.5 rounded-xl text-xl shrink-0">🚀</div>
                        <div>
                            <p className="text-[9px] text-violet-400 uppercase font-black tracking-widest">Daily Top Mover</p>
                            <p className="text-sm font-bold text-white">{topMover.name} <span className="text-emerald-400">(+{topMover.dailyChange?.toFixed(2)}%)</span></p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                    <div className={`bg-${tc}-950/40 border border-${tc}-500/20 p-5 rounded-3xl shadow-xl backdrop-blur-sm`}>
                        <p className={`text-[10px] text-${tc}-300/70 uppercase font-black tracking-widest mb-1`}>Total Investment</p>
                        <p className="text-xl md:text-2xl font-black text-white">${totalCapital.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                    </div>
                    <div className={`bg-${tc}-950/40 border border-${tc}-500/20 p-5 rounded-3xl shadow-xl backdrop-blur-sm`}>
                        <p className={`text-[10px] text-${tc}-300/70 uppercase font-black tracking-widest mb-1`}>Total Value</p>
                        <p className="text-xl md:text-2xl font-black text-white">${totalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                    </div>
                    <div className={`col-span-2 md:col-span-1 bg-${tc}-900/20 border border-${tc}-500/30 p-5 rounded-3xl shadow-xl relative overflow-hidden backdrop-blur-sm`}>
                        <p className={`text-[10px] text-${tc}-300/70 uppercase font-black tracking-widest mb-1`}>Total % Return</p>
                        <p className={`text-4xl md:text-2xl font-black ${totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
                        </p>
                    </div>
                </div>

                <Leaderboard contestants={data.contestants} prizes={data.prizes} onPlayerClick={(player) => navigate('stats', { uuid: player.user_uuid })} theme={theme} />
            </>
        ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {view === 'halloffame' && <HallOfFame winners={data.sheetData?.winners || data.winners || []} records={data.sheetData?.records || data.records || []} theme={theme} onYearClick={(year) => navigate('history', { year })} onPlayerClick={(uuid) => navigate('stats', { uuid })} />}
                {view === 'stats' && <Stats uuid={viewParams.uuid} records={data.sheetData?.records || data.records || []} theme={theme} onYearClick={(year) => navigate('history', { year })} />}
                {view === 'performers' && <Performers records={data.sheetData?.records || data.records || []} theme={theme} onPlayerClick={(uuid) => navigate('stats', { uuid })} />}
                {view === 'history' && <HistoryView year={viewParams.year} records={data.sheetData?.records || data.records || []} theme={theme} onPlayerClick={(uuid) => navigate('stats', { uuid })} />}
                {view === 'news' && (
                    <div className="w-full max-w-7xl mx-auto">
                        <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight mb-8 text-center">Market News</h2>
                        <NewsView theme={theme} />
                    </div>
                )}
                {view === 'submit' && <SubmitPick theme={theme} />}
                {view === 'install' && <InstallView theme={theme} />}
            </div>
        )}
      </main>

      <footer className="footer-container max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-6 w-full mt-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <button onClick={() => navigate('halloffame')} className={`w-full md:w-auto group flex items-center gap-3 px-5 py-2 rounded-2xl bg-${tc}-500/5 border border-${tc}-500/10 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all`}>
                <span className="text-xl group-hover:scale-110 transition-transform">🏆</span>
                <div className="text-left">
                    <p className={`text-[9px] font-black uppercase tracking-widest text-${tc}-400 group-hover:text-amber-400`}>The Archives</p>
                    <p className="text-xs font-bold text-white uppercase">Hall of Fame</p>
                </div>
            </button>
            <button onClick={() => navigate('performers')} className={`w-full md:w-auto group flex items-center gap-3 px-5 py-2 rounded-2xl bg-${tc}-500/5 border border-${tc}-500/10 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all`}>
                <span className="text-xl group-hover:scale-110 transition-transform">📈</span>
                <div className="text-left">
                    <p className={`text-[9px] font-black uppercase tracking-widest text-${tc}-400 group-hover:text-cyan-400`}>Top Performers</p>
                    <p className="text-xs font-bold text-white uppercase">Career Stats</p>
                </div>
            </button>
            <button onClick={() => navigate('news')} className={`w-full md:w-auto group flex items-center gap-3 px-5 py-2 rounded-2xl bg-${tc}-500/5 border border-${tc}-500/10 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all`}>
                <span className="text-xl group-hover:scale-110 transition-transform">📰</span>
                <div className="text-left">
                    <p className={`text-[9px] font-black uppercase tracking-widest text-${tc}-400 group-hover:text-emerald-400`}>Latest Updates</p>
                    <p className="text-xs font-bold text-white uppercase">Market News</p>
                </div>
            </button>
            <button onClick={() => navigate('install')} className={`w-full md:w-auto group flex items-center gap-3 px-5 py-2 rounded-2xl bg-${tc}-500/5 border border-${tc}-500/10 hover:border-violet-500/50 hover:bg-violet-500/5 transition-all`}>
                <span className="text-xl group-hover:scale-110 transition-transform">📲</span>
                <div className="text-left">
                    <p className={`text-[9px] font-black uppercase tracking-widest text-${tc}-400 group-hover:text-violet-400`}>Instant Access</p>
                    <p className="text-xs font-bold text-white uppercase">Install App</p>
                </div>
            </button>
        </div>
      </footer>
    </div>
  );
}