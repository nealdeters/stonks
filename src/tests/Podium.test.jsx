/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
expect.extend(matchers);

import Podium from '../components/Podium.jsx';
import React from 'react';

describe('Podium Component', () => {
  const mockYearData = {
    year: '2023',
    first_user_name: 'Alice',
    second_user_name: 'Bob',
    third_user_name: 'Charlie'
  };

  it('renders the podium correctly', () => {
    render(<Podium yearData={mockYearData} />);
    expect(screen.getByText('2023')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });
});