/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
expect.extend(matchers);

import HallOfFame from '../HallOfFame';
import React from 'react';

describe('HallOfFame Component', () => {
  const mockWinners = [
    { year: '2023', first_user_name: 'Alice', ticker: 'AAPL', return: '15.5' }
  ];
  const mockRecords = [
    { year: '2023', name: 'Alice', percent_gain: '15.5', place: '1' }
  ];
  const mockTheme = { color: 'indigo', icon: '🏆' };

  afterEach(cleanup);

  it('renders winners correctly', () => {
    const onYearClick = vi.fn();
    const onPlayerClick = vi.fn();
    
    render(<HallOfFame winners={mockWinners} records={mockRecords} theme={mockTheme} onYearClick={onYearClick} onPlayerClick={onPlayerClick} />);
    
    expect(screen.getByText('Hall of Fame')).toBeInTheDocument();
    expect(screen.getByText('2023')).toBeInTheDocument();
    
    const aliceLink = screen.getByText('Alice');
    expect(aliceLink).toBeInTheDocument();
    
    // Check for summary stats
    expect(screen.getByText('Total Contests')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Total contests

    fireEvent.click(screen.getByText('2023'));
    expect(onYearClick).toHaveBeenCalledWith('2023');

    fireEvent.click(aliceLink);
    expect(onPlayerClick).toHaveBeenCalled();
  });

  it('renders empty state', () => {
    render(<HallOfFame winners={[]} theme={mockTheme} />);
    expect(screen.getByText('Hall of Fame')).toBeInTheDocument();
    expect(screen.getByText(/Season Intermission/i)).toBeInTheDocument();
  });
});