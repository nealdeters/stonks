/**
 * Stock Data Sync Service with Adapter Pattern
 * Supports multiple market data providers (Finnhub, AllTick)
 * Maintains backward compatibility with existing data contracts
 */
import { Redis } from '@upstash/redis';
import { SHEETS, getRange, parseRows } from '../../src/utils/helpers.js';
import { ProviderFactory } from './adapters/provider-factory.js';
import { getAdapterConfig } from './adapter-config.js';
import { getSheetsClient, validateGoogleEnvVars } from './auth.js';

// Initialize provider factory with configuration
const initializeProviderFactory = () => {
  const factory = new ProviderFactory();
  const config = getAdapterConfig();
  
  factory.initialize(config);
  
  return factory;
};

export const syncStockData = async (event) => {
    console.log("Starting scheduled sync with adapter pattern...");
    
    let providerFactory;
    
    try {
        // Initialize provider factory
        providerFactory = initializeProviderFactory();
        
        const SHEET_ID = process.env.SHEET_ID;
        
        if (!process.env.GOOGLE_PRIVATE_KEY) throw new Error("Missing GOOGLE_PRIVATE_KEY");
        if (!process.env.UPSTASH_REDIS_REST_URL) throw new Error("Missing UPSTASH_REDIS_REST_URL");
        if (!process.env.FINNHUB_KEY && !process.env.ALLTICK_KEY) {
            throw new Error("Missing API key: FINNHUB_KEY or ALLTICK_KEY required");
        }

        const redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });

        validateGoogleEnvVars();
        const sheets = await getSheetsClient();

        const ranges = [
            getRange(SHEETS.CONTESTANTS),
            getRange(SHEETS.BENCHMARKS),
            getRange(SHEETS.CONTROLS),
            getRange(SHEETS.USERS),
            getRange(SHEETS.PRIZES),
            getRange(SHEETS.RECORDS),
        ];

        const response = await sheets.spreadsheets.values.batchGet({
            spreadsheetId: SHEET_ID,
            ranges,
        });
        
        const records = parseRows(response.data.valueRanges[5]);

        const sheetData = {
            contestants: parseRows(response.data.valueRanges[0]),
            benchmarks: parseRows(response.data.valueRanges[1]),
            controls: parseRows(response.data.valueRanges[2])[0] || {},
            users: parseRows(response.data.valueRanges[3]),
            prizes: parseRows(response.data.valueRanges[4]),
            records: records,
            winners: deriveWinners(records),
        };

        sheetData.contestants.forEach(c => delete c.email);
        sheetData.users.forEach(u => delete u.email);

        // Extract unique tickers from contestants and benchmarks only
        // Historical records are stored in Google Sheets and don't need API updates
        const contestantTickers = sheetData.contestants.map(c => c.ticker).filter(Boolean);
        const benchmarkTickers = sheetData.benchmarks.map(b => b.ticker).filter(Boolean);
        
        const allTickers = [...new Set([...contestantTickers, ...benchmarkTickers])];
        
        console.log(`[StockData] Fetching data for ${allTickers.length} tickers using ${providerFactory.getProvider().providerName} provider`);

        // Use adapter pattern to fetch market data with fallback support
        const { isMarketOpen, prices, stockNames } = await fetchMarketData(allTickers, providerFactory);

        const payload = { 
            sheetData, 
            prices, 
            isMarketOpen, 
            stockNames, 
            lastUpdated: Date.now(),
            provider: providerFactory.getProvider().providerName
        };
        
        await redis.set('STOCK_DASHBOARD_DATA', payload, { ex: 900 });

        console.log(`[StockData] Sync complete using ${providerFactory.getProvider().providerName} provider`);
        return { statusCode: 200, body: "Sync complete" };

    } catch (err) {
        console.error("[StockData] Sync Error:", err);
        
        // Log provider information if available
        if (providerFactory) {
            console.error("[StockData] Provider health:", providerFactory.getProviderHealth());
        }
        
        return { 
            statusCode: 500, 
            body: JSON.stringify({ 
                error: err.message, 
                stack: err.stack,
                provider: providerFactory?.getProvider()?.providerName || 'unknown'
            }) 
        };
    }
};

/**
 * Fetch market data using adapter pattern with provider chain
 * @param {Array<string>} tickers - Array of ticker symbols
 * @param {ProviderFactory} providerFactory - Provider factory instance
 * @returns {Promise<Object>} Market data results
 */
async function fetchMarketData(tickers, providerFactory) {
    try {
        // Get current market status - uses primary provider (no chain)
        const marketStatus = await providerFactory.getMarketStatus();
        
        // Get quotes - provider chain handles fallback automatically
        let prices = await providerFactory.getQuotes(tickers);
        
        // Build stock names mapping from successful quotes
        const stockNames = {};
        prices.forEach(price => {
            if (price.ticker && price.name && price.name !== price.ticker) {
                stockNames[price.ticker] = price.name;
            }
        });

        // Filter out error responses
        const validPrices = prices.filter(price => !price.error && price.price > 0);
        
        // Log any failed tickers
        const stillFailed = prices.filter(price => price.error || price.price === 0);
        if (stillFailed.length > 0) {
            console.warn(`[StockData] Failed to fetch data for ${stillFailed.length} tickers:`, 
                stillFailed.map(p => p.ticker || 'unknown'));
        }

        console.log(`[StockData] Successfully fetched data for ${validPrices.length}/${tickers.length} tickers`);

        return {
            isMarketOpen: marketStatus.isOpen || false,
            prices: validPrices,
            stockNames
        };

    } catch (error) {
        console.error("[StockData] Market data fetch failed:", error);
        
        // Return fallback data to prevent complete failure
        return {
            isMarketOpen: false,
            prices: tickers.map(ticker => ({
                ticker,
                price: 0,
                dp: 0,
                name: ticker,
                provider: providerFactory.getProvider().providerName,
                error: true
            })),
            stockNames: {}
        };
    }
}

/**
 * Derive winners from contest records
 * @param {Array<Object>} records - Contest records
 * @returns {Array<Object>} Winners by year
 */
function deriveWinners(records) {
    const winnersMap = {};
    
    records.forEach(record => {
        const year = record.year;
        if (!year) return;
        
        if (!winnersMap[year]) winnersMap[year] = { year };
        
        const place = parseInt(record.place);
        if (place === 1) {
            winnersMap[year].first_user_name = record.name;
            winnersMap[year].first_user_uuid = record.user_uuid;
            winnersMap[year].ticker = record.ticker;
            winnersMap[year].return = record.percent_gain;
        } else if (place === 2) {
            winnersMap[year].second_user_name = record.name;
            winnersMap[year].second_user_uuid = record.user_uuid;
        } else if (place === 3) {
            winnersMap[year].third_user_name = record.name;
            winnersMap[year].third_user_uuid = record.user_uuid;
        }
    });
    
    return Object.values(winnersMap).sort((a, b) => b.year - a.year);
}