import React from 'react';

export default function InstallView({ theme }) {
  const tc = theme.color;
  const siteUrl = window.location.origin;

  return (
    <div className="max-w-3xl mx-auto space-y-12">
      <div className="text-center">
        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-${tc}-500/20 text-4xl border border-${tc}-500/30 mb-6 shadow-[0_0_20px_rgba(0,0,0,0.2)]`}>
          📲
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight mb-4">
          Install App
        </h1>
        <p className={`text-${tc}-200/60 text-lg font-medium leading-relaxed max-w-xl mx-auto`}>
          Follow these steps to add the leaderboard directly to your phone's home screen for instant access.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* iOS */}
        <div className={`bg-${tc}-950/20 border border-${tc}-500/20 rounded-[2.5rem] p-8 relative overflow-hidden group hover:border-${tc}-500/40 transition-all`}>
          <div className="absolute -right-6 -top-6 text-9xl opacity-5 grayscale select-none group-hover:opacity-10 transition-opacity">🍎</div>
          <h2 className="text-xl font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3 relative z-10">
            <span className={`text-${tc}-400`}>iOS</span> iPhone
          </h2>
          <ol className="space-y-6 relative z-10">
            <li className="flex gap-4">
              <span className={`shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-${tc}-500/20 text-${tc}-400 text-[10px] font-black border border-${tc}-500/30 mt-0.5`}>1</span>
              <div>
                <p className="text-white font-bold text-sm mb-1">Open Safari</p>
                <p className="text-xs text-slate-400 leading-relaxed">You must use Safari. Chrome on iOS does not support "Add to Home Screen".</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className={`shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-${tc}-500/20 text-${tc}-400 text-[10px] font-black border border-${tc}-500/30 mt-0.5`}>2</span>
              <div>
                <p className="text-white font-bold text-sm mb-1">Navigate to Site</p>
                <p className="text-xs text-slate-400 leading-relaxed">Go to <a href={siteUrl} className={`text-${tc}-300 hover:underline`}>{siteUrl}</a></p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className={`shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-${tc}-500/20 text-${tc}-400 text-[10px] font-black border border-${tc}-500/30 mt-0.5`}>3</span>
              <div>
                <p className="text-white font-bold text-sm mb-1">Tap Share Icon</p>
                <p className="text-xs text-slate-400 leading-relaxed">The square button with an upward arrow at the bottom.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className={`shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-${tc}-500/20 text-${tc}-400 text-[10px] font-black border border-${tc}-500/30 mt-0.5`}>4</span>
              <div>
                <p className="text-white font-bold text-sm mb-1">Add to Home Screen</p>
                <p className="text-xs text-slate-400 leading-relaxed">Scroll down to find this option, then tap "Add" in the top right.</p>
              </div>
            </li>
          </ol>
        </div>

        {/* Android */}
        <div className={`bg-${tc}-950/20 border border-${tc}-500/20 rounded-[2.5rem] p-8 relative overflow-hidden group hover:border-${tc}-500/40 transition-all`}>
          <div className="absolute -right-6 -top-6 text-9xl opacity-5 grayscale select-none group-hover:opacity-10 transition-opacity">🤖</div>
          <h2 className="text-xl font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3 relative z-10">
            <span className={`text-${tc}-400`}>Android</span> Chrome
          </h2>
          <ol className="space-y-6 relative z-10">
            <li className="flex gap-4">
              <span className={`shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-${tc}-500/20 text-${tc}-400 text-[10px] font-black border border-${tc}-500/30 mt-0.5`}>1</span>
              <div>
                <p className="text-white font-bold text-sm mb-1">Open Chrome</p>
                <p className="text-xs text-slate-400 leading-relaxed">Navigate to <a href={siteUrl} className={`text-${tc}-300 hover:underline`}>{siteUrl}</a></p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className={`shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-${tc}-500/20 text-${tc}-400 text-[10px] font-black border border-${tc}-500/30 mt-0.5`}>2</span>
              <div>
                <p className="text-white font-bold text-sm mb-1">Look for Prompt</p>
                <p className="text-xs text-slate-400 leading-relaxed">Tap "Add to Home Screen" if it appears at the bottom.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className={`shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-${tc}-500/20 text-${tc}-400 text-[10px] font-black border border-${tc}-500/30 mt-0.5`}>3</span>
              <div>
                <p className="text-white font-bold text-sm mb-1">Manual Install</p>
                <p className="text-xs text-slate-400 leading-relaxed">If no prompt, tap the three dots (Menu) and select "Install app".</p>
              </div>
            </li>
          </ol>
        </div>
      </div>

      {/* Why Install */}
      <div className={`bg-${tc}-500/5 border border-${tc}-500/10 rounded-3xl p-8`}>
        <h3 className="text-center text-white font-black uppercase tracking-widest mb-8 text-sm">Why Install?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl mb-3">⚡️</div>
            <h4 className={`text-${tc}-300 font-bold text-xs uppercase tracking-wider mb-2`}>Instant Access</h4>
            <p className="text-[10px] text-slate-400 leading-relaxed max-w-[150px] mx-auto">No need to type the URL every time; just tap the trophy icon.</p>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-3">📱</div>
            <h4 className={`text-${tc}-300 font-bold text-xs uppercase tracking-wider mb-2`}>Full Screen</h4>
            <p className="text-[10px] text-slate-400 leading-relaxed max-w-[150px] mx-auto">The app opens in its own window without browser bars.</p>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-3">🔄</div>
            <h4 className={`text-${tc}-300 font-bold text-xs uppercase tracking-wider mb-2`}>Live Updates</h4>
            <p className="text-[10px] text-slate-400 leading-relaxed max-w-[150px] mx-auto">The app updates itself automatically every time you open it.</p>
          </div>
        </div>
      </div>
    </div>
  );
}