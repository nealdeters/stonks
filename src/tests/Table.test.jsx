/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
expect.extend(matchers);

import Table from '../Table';
import React from 'react';

describe('Table Component', () => {
  it('renders headers and children correctly', () => {
    const headers = [{ label: 'Name' }, { label: 'Score' }];
    render(
      <Table id="test-table" headers={headers}>
        <tr>
          <td>Alice</td>
          <td>100</td>
        </tr>
      </Table>
    );

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });
});