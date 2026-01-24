/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
expect.extend(matchers);

import Performers from '../Performers';
import React from 'react';

describe('Performers Component', () => {
  const mockRecords = [
    { user_uuid: '1', name: 'Alice', percent_gain: '10', place: '1' },
    { user_uuid: '2', name: 'Bob', percent_gain: '5', place: '2' }
  ];
  const mockTheme = { color: 'indigo' };
  const mockOnPlayerClick = vi.fn();

  it('renders the table with correct data', () => {
    render(<Performers records={mockRecords} theme={mockTheme} onPlayerClick={mockOnPlayerClick} />);
    expect(screen.getByText('Career Stats')).toBeInTheDocument();
    expect(screen.getAllByText('Alice')[0]).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('calls onPlayerClick when a name is clicked', () => {
    render(<Performers records={mockRecords} theme={mockTheme} onPlayerClick={mockOnPlayerClick} />);
    fireEvent.click(screen.getAllByText('Alice')[0]);
    expect(mockOnPlayerClick).toHaveBeenCalledWith('1');
  });
});