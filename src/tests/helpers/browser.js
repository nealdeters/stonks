import puppeteer from 'puppeteer';

export async function launchBrowser() {
    return await puppeteer.launch({
        executablePath: puppeteer.executablePath(),
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--single-process',
            '--no-zygote'
        ],
        headless: 'new'
    });
}