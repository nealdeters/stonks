/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

  it('renders the form correctly', () => {
    render(<SubmitPick theme={mockTheme} />);
    expect(screen.getByText('Submit Pick')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Submit Entry')).toBeInTheDocument();
  });

  it('shows processing state and handles success', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<SubmitPick theme={mockTheme} />);
    
    fireEvent.change(screen.getByPlaceholderText('John Doe'), { target: { value: 'Neal' } });
    fireEvent.change(screen.getByPlaceholderText('john@example.com'), { target: { value: 'neal@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('AAPL'), { target: { value: 'NVDA' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'secret' } });

    const submitBtn = screen.getByText('Submit Entry');
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
    fireEvent.click(screen.getByText('Submit Entry'));

    await waitFor(() => {
      expect(screen.getByText(/Invalid Secret/i)).toBeInTheDocument();
    });
  });
});