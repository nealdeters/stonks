import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import fs from 'fs';
import puppeteer from 'puppeteer';
import axios from 'axios';
import { runCapture } from '../capture.js';

describe('Capture Script (Puppeteer)', () => {
    beforeAll(() => {
        process.env.SITE_URL = 'https://stonks-test.netlify.app';
    });

    beforeEach(() => {
        process.argv = ['node', 'src/capture.js'];
        vi.clearAllMocks();
    });

    it('Successfully takes a screenshot when contest is active', async () => {
        vi.spyOn(axios, 'get').mockResolvedValue({
            data: {
                sheetData: {
                    controls: { end: '2099-12-31' }
                }
            }
        });

        const screenshotSpy = vi.fn(async () => Buffer.from('fake-png-data'));
        const gotoSpy = vi.fn(async () => ({}));
        
        vi.spyOn(puppeteer, 'launch').mockResolvedValue({
            newPage: async () => ({
                setViewport: async () => {},
                goto: gotoSpy,
                screenshot: screenshotSpy
            }),
            close: async () => {}
        });

        vi.spyOn(fs, 'existsSync').mockReturnValue(true);
        vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
        const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

        await runCapture();

        expect(gotoSpy).toHaveBeenCalledTimes(1);
        expect(gotoSpy).toHaveBeenCalledWith(process.env.SITE_URL, expect.anything());
        expect(screenshotSpy).toHaveBeenCalledTimes(1);
    });

    test('Skips screenshot when contest has ended', async (t) => {
        t.mock.method(axios, 'get', async () => ({
            data: {
                sheetData: {
                    controls: { end: '2020-01-01' }
                }
            }
        }));

        const logSpy = t.mock.method(console, 'log');
        const launchSpy = t.mock.method(puppeteer, 'launch');

        await runCapture();

        assert.ok(
            logSpy.mock.calls.some(c => c.arguments[0].includes('Contest has ended')),
            "Expected 'Contest has ended' log message was not found"
        );
        
        assert.strictEqual(launchSpy.mock.callCount(), 0, "Puppeteer should not have launched");
    });
});