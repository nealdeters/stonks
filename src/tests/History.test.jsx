/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
expect.extend(matchers);

import HistoryView from '../History';
import React from 'react';

describe('HistoryView Component', () => {
  const mockRecords = [
    { year: '2023', place: '1', name: 'Alice', ticker: 'AAPL', percent_gain: '15.5', user_uuid: 'u1' },
    { year: '2023', place: '2', name: 'Bob', ticker: 'TSLA', percent_gain: '10.2', user_uuid: 'u2' },
  ];
  const mockTheme = { color: 'indigo' };
  const mockOnPlayerClick = vi.fn();

  it('renders the correct year title', () => {
    render(<HistoryView year="2023" records={mockRecords} theme={mockTheme} onPlayerClick={mockOnPlayerClick} />);
    expect(screen.getByText('2023 Contest')).toBeInTheDocument();
  });

  it('renders records for the specified year', () => {
    render(<HistoryView year="2023" records={mockRecords} theme={mockTheme} onPlayerClick={mockOnPlayerClick} />);
    expect(screen.getAllByText('Alice')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Bob')[0]).toBeInTheDocument();
    expect(screen.getAllByText('AAPL')[0]).toBeInTheDocument();
    expect(screen.getAllByText('TSLA')[0]).toBeInTheDocument();
  });

  it('calls onPlayerClick when a participant is clicked', () => {
    render(<HistoryView year="2023" records={mockRecords} theme={mockTheme} onPlayerClick={mockOnPlayerClick} />);
    // Click the button containing the name
    fireEvent.click(screen.getAllByText('Alice')[0].closest('button'));
    expect(mockOnPlayerClick).toHaveBeenCalledWith('u1');
  });

  it('renders empty state when no records found', () => {
    render(<HistoryView year="2024" records={mockRecords} theme={mockTheme} onPlayerClick={mockOnPlayerClick} />);
    expect(screen.getByText(/No records found for 2024/i)).toBeInTheDocument();
  });
});