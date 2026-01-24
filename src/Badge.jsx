import React from 'react';

export default function Badge({ rank }) {
  const medals = {
    1: { icon: '🥇', label: '1st Place' },
    2: { icon: '🥈', label: '2nd Place' },
    3: { icon: '🥉', label: '3rd Place' }
  };

  const medal = medals[rank];
  if (!medal) return null;

  return <span title={medal.label} className="text-2xl md:text-3xl">{medal.icon}</span>;
}