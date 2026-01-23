import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getStonksData } from '../api';

describe('getStonksData', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('should fetch data successfully with correct headers', async () => {
    const mockData = { stocks: [] };
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const result = await getStonksData();

    expect(global.fetch).toHaveBeenCalledWith('/.netlify/functions/fetch-data', expect.objectContaining({
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    }));
    expect(result).toEqual(mockData);
  });

  it('should throw an error if the response is not ok', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    await expect(getStonksData()).rejects.toThrow('Failed to fetch data: 500 Internal Server Error');
  });
});