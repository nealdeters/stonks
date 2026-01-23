/** @vitest-environment jsdom */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
expect.extend(matchers);

import InstallView from '../Install';
import React from 'react';

describe('InstallView Component', () => {
  const mockTheme = { color: 'indigo' };

  afterEach(() => {
    cleanup();
  });

  it('renders installation instructions', () => {
    render(<InstallView theme={mockTheme} />);
    expect(screen.getAllByText(/Install App/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/iOS/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Android/i).length).toBeGreaterThan(0);
  });
});