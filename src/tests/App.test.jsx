/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
expect.extend(matchers);

import App from '../App';

// Mock fetch
global.fetch = vi.fn();

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollTo = vi.fn();
  });
  afterEach(cleanup);

  it('renders loading state initially', () => {
    fetch.mockImplementationOnce(() => new Promise(() => {})); // Pending promise
    render(<App />);
    expect(screen.getByText(/Loading Market Data.../i)).toBeInTheDocument();
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
      expect(screen.getAllByText('Test User')[0]).toBeInTheDocument();
    }, { timeout: 3000 });
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
      expect(screen.getAllByText('Test User')[0]).toBeInTheDocument();
    });
  });

  it('renders error state on fetch failure', async () => {
    fetch.mockRejectedValue(new Error('API Error'));
    render(<App />);
    await waitFor(() => expect(screen.getByText(/System Error/i)).toBeInTheDocument(), { timeout: 3000 });
  });

  it('handles invalid JSON response gracefully', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: () => { throw new Error('Unexpected token < in JSON at position 0'); }
    });
    render(<App />);
    await waitFor(() => expect(screen.getByText(/System Error/i)).toBeInTheDocument(), { timeout: 3000 });
  });
});