/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
expect.extend(matchers);

import InstallView from '../Install';
import React from 'react';

describe('InstallView Component', () => {
  const mockTheme = { color: 'indigo' };

  it('renders installation instructions', () => {
    render(<InstallView theme={mockTheme} />);
    expect(screen.getAllByText(/Install App/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/iOS/i)).toBeInTheDocument();
    expect(screen.getByText(/Android/i)).toBeInTheDocument();
  });
});