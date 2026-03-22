import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import * as auth from '../../netlify/lib/auth.js';
import { Resend } from 'resend';
import puppeteer from 'puppeteer';
import axios from 'axios';
import { sendReport } from '../../netlify/lib/reports.js';

vi.mock('resend', () => ({ Resend: vi.fn() }));
vi.mock('puppeteer');
vi.mock('axios');

describe('sendReport lib', () => {
    beforeAll(() => {
        process.env.RESEND_API_KEY = 're_test_123';
        process.env.SHEET_ID = 'test_sheet_id';
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@test.com';
        process.env.GOOGLE_PRIVATE_KEY = 'test-key';
        process.env.SITE_URL = 'https://example.com';
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Sends report to manual recipients using query param', async () => {
        const fakeBuffer = Buffer.from('pngdata');

        // Mock fetch-data axios call
        vi.mocked(axios.get).mockResolvedValue({ data: { sheetData: { contestants: [{ email: 'neal@test.com' }], controls: { title: 'Schultz Cup' } } } });

        // Mock puppeteer browser/page
        const page = { setViewport: vi.fn(), goto: vi.fn(), screenshot: vi.fn().mockResolvedValue(fakeBuffer) };
        const browser = { newPage: vi.fn().mockResolvedValue(page), close: vi.fn() };
        vi.mocked(puppeteer.launch).mockResolvedValue(browser);

        const sendSpy = vi.fn().mockResolvedValue({ data: { id: 'ok' } });
        vi.mocked(Resend).mockImplementation(() => ({ emails: { send: sendSpy } }));

        const res = await sendReport({ queryStringParameters: { to: 'neal@test.com' } });

        expect(sendSpy).toHaveBeenCalledTimes(1);
        expect(sendSpy.mock.calls[0][0].to).toEqual(['neal@test.com']);
        expect(res.statusCode).toBe(200);
    });
});