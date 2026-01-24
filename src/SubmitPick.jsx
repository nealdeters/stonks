import React, { useState } from 'react';

export default function SubmitPick({ theme }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const tc = theme.color;

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevents page refresh
    setLoading(true);
    setStatus(null);

    const formData = new FormData(e.target);
    const payload = {
      name: formData.get('name'),
      email: formData.get('email'),
      ticker: formData.get('ticker')?.toUpperCase(),
      secret: formData.get('secret')
    };

    try {
      const response = await fetch('/.netlify/functions/process-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Submission failed');

      setStatus({ type: 'success', message: 'Entry submitted successfully! Good luck!' });
      e.target.reset();
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight mb-8 text-center">Submit Pick</h2>
      
      <div className={`bg-${tc}-950/20 border border-${tc}-500/20 p-8 md:p-12 rounded-[2.5rem] shadow-2xl backdrop-blur-xl relative overflow-hidden`}>
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-${tc}-500/50 to-transparent`}></div>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest text-${tc}-400 ml-1`}>Full Name</label>
              <input 
                name="name" 
                required 
                placeholder="John Doe"
                className={`w-full bg-[#020617] border border-${tc}-500/20 rounded-2xl px-5 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-${tc}-500/50 transition-all`}
              />
            </div>
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest text-${tc}-400 ml-1`}>Email Address</label>
              <input 
                name="email" 
                type="email" 
                required 
                placeholder="john@example.com"
                className={`w-full bg-[#020617] border border-${tc}-500/20 rounded-2xl px-5 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-${tc}-500/50 transition-all`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest text-${tc}-400 ml-1`}>Stock Ticker</label>
              <input 
                name="ticker" 
                required 
                placeholder="AAPL"
                className={`w-full bg-[#020617] border border-${tc}-500/20 rounded-2xl px-5 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-${tc}-500/50 transition-all font-mono uppercase`}
              />
            </div>
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest text-${tc}-400 ml-1`}>Access Secret</label>
              <input 
                name="secret" 
                type="password" 
                required 
                placeholder="••••••••"
                className={`w-full bg-[#020617] border border-${tc}-500/20 rounded-2xl px-5 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-${tc}-500/50 transition-all`}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-5 rounded-2xl bg-${tc}-500 text-white font-black uppercase tracking-widest hover:bg-${tc}-400 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-${tc}-500/20`}
          >
            {loading ? 'Processing...' : 'Submit Entry'}
          </button>
        </form>

        {status && (
          <div className={`mt-8 p-5 rounded-2xl text-center font-bold animate-in zoom-in-95 duration-300 ${
            status.type === 'success' 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {status.type === 'success' ? '🚀 ' : '⚠️ '}{status.message}
          </div>
        )}
      </div>
    </div>
  );
}