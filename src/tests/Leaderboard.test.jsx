/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
expect.extend(matchers);
import Leaderboard from '../Leaderboard';
import React from 'react';

describe('Leaderboard Component - Prize Badges', () => {
  const mockTheme = { color: 'indigo' };
  const mockPrizes = {
    '1': { emoji: '🥇', amount: '$100' },
    'last': { emoji: '💩', amount: 'Participation' }
  };

  it('renders amber badge for first place even if they are also last (single contestant)', () => {
    const contestants = [
      { name: 'Solo Player', ticker: 'AAPL', gainPct: 10, capital: 1000, shares: 10, cost: 100 }
    ];
    
    render(<Leaderboard contestants={contestants} prizes={mockPrizes} theme={mockTheme} onPlayerClick={() => {}} />);
    
    const badge = screen.getByText('$100').closest('span');
    expect(badge).toHaveClass('bg-amber-500/20');
    expect(badge).toHaveClass('text-amber-500');
    expect(badge).not.toHaveClass('bg-red-500/20');
  });

  it('renders red badge for the last player in a multi-player list', () => {
    const contestants = [
      { name: 'Winner', ticker: 'AAPL', gainPct: 20, capital: 1000, shares: 10, cost: 100 },
      { name: 'Loser', ticker: 'TSLA', gainPct: -10, capital: 1000, shares: 10, cost: 100 }
    ];
    
    render(<Leaderboard contestants={contestants} prizes={mockPrizes} theme={mockTheme} onPlayerClick={() => {}} />);
    
    const winnerBadge = screen.getByText('$100').closest('span');
    expect(winnerBadge).toHaveClass('bg-amber-500/20');

    const loserBadge = screen.getByText('Participation').closest('span');
    expect(loserBadge).toHaveClass('bg-red-500/20');
    expect(loserBadge).toHaveClass('text-red-400');
  });
});