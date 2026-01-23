import React from 'react';

export default function Table({ id, headers, children, className = "", themeColor = "indigo" }) {
  const tc = themeColor;
  return (
    <div className={`leaderboard-card-container bg-${tc}-950/10 border border-${tc}-500/10 shadow-2xl overflow-visible ${className}`}>
      <table id={id} className="w-full text-left border-separate border-spacing-0 block md:table stonks-table">
        <thead className="text-slate-300 text-[10px] uppercase font-black tracking-widest bg-[#020617] hidden md:table-header-group">
          <tr>
            {headers.map((header, i) => (
              <th 
                key={i} 
                className={`px-8 py-6 ${header.className || ''}`}
              >
                {header.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="block md:table-row-group">
          {children}
        </tbody>
      </table>
    </div>
  );
}