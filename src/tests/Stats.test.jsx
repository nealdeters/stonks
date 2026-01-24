/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
expect.extend(matchers);

import Stats from '../Stats';
import React from 'react';

describe('Stats Component', () => {
  const mockRecords = [
    { user_uuid: '1', name: 'Alice', percent_gain: '10', place: '1', year: '2023', ticker: 'AAPL', capital: '1000', shares: '10', cost: '100' }
  ];
  const mockTheme = { color: 'indigo' };
  const mockOnYearClick = vi.fn();

  it('renders user statistics correctly', () => {
    render(<Stats uuid="1" records={mockRecords} theme={mockTheme} onYearClick={mockOnYearClick} />);
    expect(screen.getByText('Alice Career')).toBeInTheDocument();
    expect(screen.getByText('2023')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    // Check for calculated average return
    expect(screen.getByText('10.00%')).toBeInTheDocument();
  });
});