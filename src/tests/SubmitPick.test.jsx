/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
expect.extend(matchers);

import SubmitPick from '../SubmitPick';
import React from 'react';

// Mock fetch
global.fetch = vi.fn();

describe('SubmitPick Component', () => {
  const mockTheme = { color: 'indigo' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the form correctly', () => {
    render(<SubmitPick theme={mockTheme} />);
    expect(screen.getByText('Submit Pick')).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText('John Doe')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Submit Entry')[0]).toBeInTheDocument();
  });

  it('shows processing state and handles success', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<SubmitPick theme={mockTheme} />);
    
    fireEvent.change(screen.getAllByPlaceholderText('John Doe')[0], { target: { value: 'Neal' } });
    fireEvent.change(screen.getAllByPlaceholderText('john@example.com')[0], { target: { value: 'neal@test.com' } });
    fireEvent.change(screen.getAllByPlaceholderText('AAPL')[0], { target: { value: 'NVDA' } });
    fireEvent.change(screen.getAllByPlaceholderText('••••••••')[0], { target: { value: 'secret' } });

    const submitBtn = screen.getAllByText('Submit Entry')[0];
    fireEvent.click(submitBtn);

    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByText(/Entry submitted successfully/i)).toBeInTheDocument();
    });
  });

  it('handles submission errors', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid Secret' }),
    });

    render(<SubmitPick theme={mockTheme} />);
    
    // Fill form to pass HTML5 validation
    fireEvent.change(screen.getAllByPlaceholderText('John Doe')[0], { target: { value: 'Neal' } });
    fireEvent.change(screen.getAllByPlaceholderText('john@example.com')[0], { target: { value: 'neal@test.com' } });
    fireEvent.change(screen.getAllByPlaceholderText('AAPL')[0], { target: { value: 'NVDA' } });
    fireEvent.change(screen.getAllByPlaceholderText('••••••••')[0], { target: { value: 'wrong' } });

    fireEvent.click(screen.getAllByText('Submit Entry')[0]);

    await waitFor(() => {
      expect(screen.getByText(/Invalid Secret/i)).toBeInTheDocument();
    });
  });
});