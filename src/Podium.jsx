import React from 'react';
import Badge from './Badge';

export default function Podium({ yearData, onPlayerClick }) {
  const { 
    year, 
    first_user_name, first_user_uuid, ticker, return: gain,
    second_user_name, second_user_uuid,
    third_user_name, third_user_uuid 
  } = yearData;

  return (
    <div className="flex flex-col items-center w-full">
      <div className="text-center mb-10">
        <h3 className="text-3xl font-black text-white uppercase tracking-widest border-b-4 border-indigo-500/30 pb-2 inline-block">{year}</h3>
      </div>
      
      <div className="flex items-end justify-center gap-2 md:gap-8 w-full max-w-3xl px-4">
        {/* 2nd Place */}
        <div className="flex flex-col items-center flex-1 group">
          <button onClick={() => onPlayerClick(second_user_uuid)} className="mb-3 text-xs md:text-sm font-bold text-slate-300 hover:text-indigo-400 transition-colors truncate w-full text-center">
            {second_user_name || '-'}
          </button>
          <div className="w-full bg-slate-400/10 border border-slate-400/20 rounded-t-3xl h-28 md:h-36 flex flex-col items-center justify-center gap-2 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-400/5 to-transparent"></div>
            <Badge rank={2} />
          </div>
        </div>

        {/* 1st Place */}
        <div className="flex flex-col items-center flex-1 group">
          <button onClick={() => onPlayerClick(first_user_uuid)} className="mb-3 text-sm md:text-lg font-black text-white hover:text-amber-400 transition-colors truncate w-full text-center">
            {first_user_name}
          </button>
          <div className="w-full bg-amber-500/10 border border-amber-500/30 rounded-t-3xl h-40 md:h-56 flex flex-col items-center justify-center gap-2 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 to-transparent"></div>
            <Badge rank={1} />
            <div className="flex flex-col items-center">
              <span className="text-[10px] md:text-xs font-black text-cyan-400 font-mono">{ticker}</span>
              <span className="text-xs md:text-sm font-black text-emerald-500">{gain}</span>
            </div>
          </div>
        </div>

        {/* 3rd Place */}
        <div className="flex flex-col items-center flex-1 group">
          <button onClick={() => onPlayerClick(third_user_uuid)} className="mb-3 text-xs md:text-sm font-bold text-slate-400 hover:text-indigo-400 transition-colors truncate w-full text-center">
            {third_user_name || '-'}
          </button>
          <div className="w-full bg-orange-600/10 border border-orange-600/20 rounded-t-3xl h-20 md:h-28 flex flex-col items-center justify-center gap-2 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-orange-600/5 to-transparent"></div>
            <Badge rank={3} />
          </div>
        </div>
      </div>
    </div>
  );
}