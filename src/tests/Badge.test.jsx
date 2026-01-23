/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
expect.extend(matchers);

import Badge from '../components/Badge.jsx';
import React from 'react';

describe('Badge Component', () => {
  it('renders correct medal for rank 1', () => {
    render(<Badge rank={1} />);
    expect(screen.getByTitle('1st Place')).toBeInTheDocument();
  });
});