import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';
import * as api from '../api';

jest.mock('../api');

describe('App Component Sync Logic', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should transition from SYNCING to showing a timestamp after load', async () => {
    const mockDate = new Date('2023-10-10T10:00:00Z');
    api.getStonksData.mockResolvedValue({
      sheetData: { contestants: [], benchmarks: [], controls: {} },
      prices: [],
      isMarketOpen: true,
      lastUpdated: mockDate.toISOString()
    });

    render(<App />);

    // Wait for initial load to finish
    await waitFor(() => {
      expect(screen.queryByText(/Loading Market Data.../i)).not.toBeInTheDocument();
    });

    // Check the sync section
    const syncSection = screen.getByText(/SYNC:/i);
    expect(syncSection).toBeInTheDocument();
    expect(syncSection.textContent).toMatch(/SYNC: \d{2}:\d{2}/);
  });

  it('should show SYNCING... during background refreshes', async () => {
    api.getStonksData.mockResolvedValue({
      sheetData: { contestants: [], benchmarks: [], controls: {} },
      prices: [],
      isMarketOpen: true,
      lastUpdated: new Date().toISOString()
    });

    render(<App />);
    await waitFor(() => expect(screen.queryByText(/Loading Market Data.../i)).not.toBeInTheDocument());

    // Trigger the 5-minute interval
    act(() => { jest.advanceTimersByTime(5 * 60 * 1000); });

    // Should show SYNCING... while the background fetch is active
    expect(screen.getByText(/SYNCING.../i)).toBeInTheDocument();
    
    await waitFor(() => expect(screen.getByText(/SYNC:/i)).toBeInTheDocument());
  });
});