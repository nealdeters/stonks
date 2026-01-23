import React, { useState, useEffect } from 'react';

export default function NewsView({ theme }) {
  const tc = theme.color;
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNews() {
      try {
        const response = await fetch('/.netlify/functions/fetch-news');
        const data = await response.json();
        setNews(data.news || []);
      } catch (error) {
        console.error("News Load Error:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchNews();
  }, []);

  if (loading) {
    return (
        <div className="col-span-full p-12 text-center">
            <div className={`inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-${tc}-500 mb-4`}></div>
            <p className={`text-${tc}-300/50 text-xs font-bold uppercase tracking-widest`}>Loading Headlines...</p>
        </div>
    );
  }

  if (news.length === 0) {
    return (
        <div className={`col-span-full p-12 rounded-[2.5rem] bg-${tc}-950/20 border border-${tc}-500/10 text-center`}>
            <div className="text-5xl mb-4 opacity-50 grayscale">📰</div>
            <h3 className="text-lg font-black text-white uppercase tracking-widest mb-2">No News Found</h3>
            <p className={`text-${tc}-300/50 text-xs font-bold uppercase tracking-widest`}>The markets are quiet today.</p>
        </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {news.map((item, i) => (
            <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" className={`group flex flex-col bg-${tc}-950/20 border border-${tc}-500/10 hover:border-${tc}-500/30 hover:bg-${tc}-500/5 transition-all rounded-3xl overflow-hidden h-full`}>
                <div className="p-6 pb-0 flex items-center gap-3">
                    <span className={`bg-${tc}-500/20 text-${tc}-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-${tc}-500/20`}>{item.ticker}</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{item.source}</span>
                </div>
                <div className="p-6 flex flex-col flex-1">
                    <h3 className={`text-lg font-bold text-white mb-3 leading-tight group-hover:text-${tc}-400 transition-colors line-clamp-3`}>{item.headline}</h3>
                    <p className="text-sm text-slate-400 line-clamp-3 mb-4 flex-1">{item.summary}</p>
                    <div className={`flex items-center justify-between mt-auto pt-4 border-t border-${tc}-500/10`}>
                        <span className="text-[10px] text-slate-500 font-mono">{new Date(item.datetime * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        <span className={`text-[10px] font-black uppercase tracking-widest text-${tc}-400 group-hover:translate-x-1 transition-transform`}>Read Story &rarr;</span>
                    </div>
                </div>
            </a>
        ))}
    </div>
  );
}