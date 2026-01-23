/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
expect.extend(matchers);

import App from './App';

// Mock fetch
global.fetch = vi.fn();

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    fetch.mockImplementationOnce(() => new Promise(() => {})); // Pending promise
    render(<App />);
    expect(screen.getAllByText(/Syncing.../i).length).toBeGreaterThan(0);
  });

  it('renders leaderboard after successful fetch', async () => {
    const mockData = {
      sheetData: { contestants: [{ name: 'Test User', ticker: 'AAPL', cost: '100', shares: '1' }], prizes: [] },
      prices: [{ ticker: 'AAPL', price: 150, dp: 50 }]
    };
    
    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
  });

  it('handles missing prices gracefully', async () => {
    const mockData = {
      sheetData: { contestants: [{ name: 'Test User', ticker: 'AAPL', cost: '100', shares: '1' }], prizes: [] },
      // prices missing
    };
    
    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
  });

  it('renders error state on fetch failure', async () => {
    fetch.mockRejectedValue(new Error('API Error'));
    render(<App />);
    await waitFor(() => expect(screen.getByText(/System Error/i)).toBeInTheDocument());
  });

  it('handles invalid JSON response gracefully', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: () => { throw new Error('Unexpected token < in JSON at position 0'); }
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText(/System Error/i)).toBeInTheDocument());
  });
});