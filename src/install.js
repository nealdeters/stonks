const initInstall = () => {
     const { color: themeColor } = typeof applyGlobalTheme === 'function' ? applyGlobalTheme() : { color: 'indigo' };
     
     const container = document.getElementById('install-body');
     const siteUrl = window.location.origin;
     if (!container) return;
 
     container.innerHTML = `
         <div class="max-w-3xl mx-auto space-y-12">
             
             <div class="text-center">
                 <div class="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-${themeColor}-500/20 text-4xl border border-${themeColor}-500/30 mb-6 shadow-[0_0_20px_rgba(0,0,0,0.2)]">
                     📲
                 </div>
                 <h1 class="text-3xl md:text-5xl font-black text-white uppercase tracking-tight mb-4">
                     Install App
                 </h1>
                 <p class="text-${themeColor}-200/60 text-lg font-medium leading-relaxed max-w-xl mx-auto">
                     Follow these steps to add the leaderboard directly to your phone's home screen for instant access.
                 </p>
             </div>
 
             <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <!-- iOS -->
                 <div class="bg-${themeColor}-950/20 border border-${themeColor}-500/20 rounded-[2.5rem] p-8 relative overflow-hidden group hover:border-${themeColor}-500/40 transition-all">
                     <div class="absolute -right-6 -top-6 text-9xl opacity-5 grayscale select-none group-hover:opacity-10 transition-opacity">🍎</div>
                     <h2 class="text-xl font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3 relative z-10">
                         <span class="text-${themeColor}-400">iOS</span> iPhone
                     </h2>
                     <ol class="space-y-6 relative z-10">
                         <li class="flex gap-4">
                             <span class="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-${themeColor}-500/20 text-${themeColor}-400 text-[10px] font-black border border-${themeColor}-500/30 mt-0.5">1</span>
                             <div>
                                 <p class="text-white font-bold text-sm mb-1">Open Safari</p>
                                 <p class="text-xs text-slate-400 leading-relaxed">You must use Safari. Chrome on iOS does not support "Add to Home Screen".</p>
                             </div>
                         </li>
                         <li class="flex gap-4">
                             <span class="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-${themeColor}-500/20 text-${themeColor}-400 text-[10px] font-black border border-${themeColor}-500/30 mt-0.5">2</span>
                             <div>
                                 <p class="text-white font-bold text-sm mb-1">Navigate to Site</p>
                                <p class="text-xs text-slate-400 leading-relaxed">Go to <a href="${siteUrl}" class="text-${themeColor}-300 hover:underline">${siteUrl}</a></p>
                             </div>
                         </li>
                         <li class="flex gap-4">
                             <span class="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-${themeColor}-500/20 text-${themeColor}-400 text-[10px] font-black border border-${themeColor}-500/30 mt-0.5">3</span>
                             <div>
                                 <p class="text-white font-bold text-sm mb-1">Tap Share Icon</p>
                                 <p class="text-xs text-slate-400 leading-relaxed">The square button with an upward arrow at the bottom.</p>
                             </div>
                         </li>
                         <li class="flex gap-4">
                             <span class="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-${themeColor}-500/20 text-${themeColor}-400 text-[10px] font-black border border-${themeColor}-500/30 mt-0.5">4</span>
                             <div>
                                 <p class="text-white font-bold text-sm mb-1">Add to Home Screen</p>
                                 <p class="text-xs text-slate-400 leading-relaxed">Scroll down to find this option, then tap "Add" in the top right.</p>
                             </div>
                         </li>
                     </ol>
                 </div>
 
                 <!-- Android -->
                 <div class="bg-${themeColor}-950/20 border border-${themeColor}-500/20 rounded-[2.5rem] p-8 relative overflow-hidden group hover:border-${themeColor}-500/40 transition-all">
                     <div class="absolute -right-6 -top-6 text-9xl opacity-5 grayscale select-none group-hover:opacity-10 transition-opacity">🤖</div>
                     <h2 class="text-xl font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3 relative z-10">
                         <span class="text-${themeColor}-400">Android</span> Chrome
                     </h2>
                     <ol class="space-y-6 relative z-10">
                         <li class="flex gap-4">
                             <span class="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-${themeColor}-500/20 text-${themeColor}-400 text-[10px] font-black border border-${themeColor}-500/30 mt-0.5">1</span>
                             <div>
                                 <p class="text-white font-bold text-sm mb-1">Open Chrome</p>
                                <p class="text-xs text-slate-400 leading-relaxed">Navigate to <a href="${siteUrl}" class="text-${themeColor}-300 hover:underline">${siteUrl}</a></p>
                             </div>
                         </li>
                         <li class="flex gap-4">
                             <span class="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-${themeColor}-500/20 text-${themeColor}-400 text-[10px] font-black border border-${themeColor}-500/30 mt-0.5">2</span>
                             <div>
                                 <p class="text-white font-bold text-sm mb-1">Look for Prompt</p>
                                 <p class="text-xs text-slate-400 leading-relaxed">Tap "Add Schultz Cup to Home Screen" if it appears at the bottom.</p>
                             </div>
                         </li>
                         <li class="flex gap-4">
                             <span class="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-${themeColor}-500/20 text-${themeColor}-400 text-[10px] font-black border border-${themeColor}-500/30 mt-0.5">3</span>
                             <div>
                                 <p class="text-white font-bold text-sm mb-1">Manual Install</p>
                                 <p class="text-xs text-slate-400 leading-relaxed">If no prompt, tap the three dots (Menu) and select "Install app".</p>
                             </div>
                         </li>
                     </ol>
                 </div>
             </div>
 
             <!-- Why Install -->
             <div class="bg-${themeColor}-500/5 border border-${themeColor}-500/10 rounded-3xl p-8">
                 <h3 class="text-center text-white font-black uppercase tracking-widest mb-8 text-sm">Why Install?</h3>
                 <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div class="text-center">
                         <div class="text-2xl mb-3">⚡️</div>
                         <h4 class="text-${themeColor}-300 font-bold text-xs uppercase tracking-wider mb-2">Instant Access</h4>
                         <p class="text-[10px] text-slate-400 leading-relaxed max-w-[150px] mx-auto">No need to type the URL every time; just tap the trophy icon.</p>
                     </div>
                     <div class="text-center">
                         <div class="text-2xl mb-3">📱</div>
                         <h4 class="text-${themeColor}-300 font-bold text-xs uppercase tracking-wider mb-2">Full Screen</h4>
                         <p class="text-[10px] text-slate-400 leading-relaxed max-w-[150px] mx-auto">The app opens in its own window without browser bars.</p>
                     </div>
                     <div class="text-center">
                         <div class="text-2xl mb-3">🔄</div>
                         <h4 class="text-${themeColor}-300 font-bold text-xs uppercase tracking-wider mb-2">Live Updates</h4>
                         <p class="text-[10px] text-slate-400 leading-relaxed max-w-[150px] mx-auto">The app updates itself automatically every time you open it.</p>
                     </div>
                 </div>
             </div>
 
         </div>
     `;
 };
 
 document.addEventListener('DOMContentLoaded', initInstall);
 
 const _safelist = `
     bg-emerald-500/20 text-emerald-400 border-emerald-500/30
     bg-emerald-950/20 border-emerald-500/20 text-emerald-200/60
     text-emerald-300 bg-emerald-500/5 border-emerald-500/10
     hover:border-emerald-500/40
     bg-orange-500/20 text-orange-400 border-orange-500/30
     bg-orange-950/20 border-orange-500/20 text-orange-200/60
     text-orange-300 bg-orange-500/5 border-orange-500/10
     hover:border-orange-500/40
 `;
