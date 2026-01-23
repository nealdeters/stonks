/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
expect.extend(matchers);

import CareerAnalytics from '../components/CareerAnalytics.jsx';
import React from 'react';

describe('CareerAnalytics Component', () => {
  const mockRecords = [
    { name: 'Alice', percent_gain: '10' },
    { name: 'Alice', percent_gain: '20' },
    { name: 'Bob', percent_gain: '-5' }
  ];

  it('calculates average return correctly', () => {
    render(<CareerAnalytics records={mockRecords} />);
    
    // Alice: (10 + 20) / 2 = 15.00%
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('15.00%')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // 2 seasons
  });
});