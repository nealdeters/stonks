/**
 * Yahoo Finance Market Data Adapter
 * Implements the MarketDataAdapter interface for Yahoo Finance API
 * Provides free access to US and international stock data
 */
import MarketDataAdapter from './base-adapter.js';

class YahooFinanceAdapter extends MarketDataAdapter {
  constructor(config) {
    super(config);
    this.providerName = 'yahoo';
    this.baseUrl = 'https://query1.finance.yahoo.com/v8/finance';
  }

  /**
   * Get current quote for a single ticker
   * @param {string} ticker - Stock/crypto symbol
   * @returns {Promise<Object>} Standardized price data
   */
  async getQuote(ticker) {
    try {
      const url = `${this.baseUrl}/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
      const data = await this.makeRequest(url);

      if (!data?.chart?.result?.[0]) {
        throw new Error(`No data for ${ticker}`);
      }

      const result = data.chart.result[0];
      const meta = result.meta;
      const quote = result.indicators?.quote?.[0];

      if (!meta || !quote) {
        return this.formatPriceResponse({ price: 0, dp: 0 }, ticker);
      }

      const price = meta.regularMarketPrice || 0;
      const prevClose = meta.chartPreviousClose || meta.previousClose || meta.regularMarketPreviousClose || price;
      const dp = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;

      return this.formatPriceResponse({
        price,
        dp,
        timestamp: meta.regularMarketTime * 1000,
        name: meta.shortName || meta.symbol || ticker
      }, ticker);

    } catch (error) {
      return this.handleError(error, `getQuote(${ticker})`);
    }
  }

  /**
   * Get quotes for multiple tickers using Yahoo's batch endpoint
   * @param {Array<string>} tickers - Array of ticker symbols
   * @returns {Promise<Array<Object>>} Array of price data objects
   */
  async getQuotes(tickers) {
    try {
      // Yahoo supports batch quotes via quotes endpoint
      const symbols = tickers.join(',');
      const url = `${this.baseUrl}/quotes?symbols=${encodeURIComponent(symbols)}`;
      const data = await this.makeRequest(url);

      if (!data?.quoteResponse?.result) {
        // Fall back to individual requests
        return this.getQuotesIndividual(tickers);
      }

      const results = [];
      for (const ticker of tickers) {
        const quote = data.quoteResponse.result.find(q => q.symbol === ticker);
        if (quote && !quote.quoteType?.startsWith('INDEX')) {
          const price = quote.regularMarketPrice || 0;
          const prevClose = quote.regularMarketPreviousClose || quote.chartPreviousClose || price;
          const dp = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;

          results.push(this.formatPriceResponse({
            price,
            dp,
            timestamp: (quote.regularMarketTime || Date.now() / 1000) * 1000,
            name: quote.shortName || quote.longName || ticker
          }, ticker));
        } else {
          results.push(this.formatPriceResponse({ price: 0, dp: 0 }, ticker));
        }
      }

      return results;

    } catch (error) {
      console.warn(`[Yahoo] Batch request failed, falling back to individual requests`);
      return this.getQuotesIndividual(tickers);
    }
  }

  /**
   * Fallback: get quotes individually
   */
  async getQuotesIndividual(tickers) {
    const results = [];
    for (const ticker of tickers) {
      await this.waitForRateLimit();
      const quote = await this.getQuote(ticker);
      results.push(quote);
    }
    return results;
  }

  /**
   * Rate limiter for individual requests
   */
  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
      );
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Get market status (open/closed)
   * @param {string} exchange - Exchange code (default: 'US')
   * @returns {Promise<Object>} Market status information
   */
  async getMarketStatus(exchange = 'US') {
    try {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const hour = now.getHours();
      const minute = now.getMinutes();

      let isOpen = false;

      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        if (exchange === 'US') {
          const estHour = (hour - 5 + 24) % 24;
          if (estHour >= 9 && estHour < 16) {
            isOpen = true;
          } else if (estHour === 9 && minute >= 30) {
            isOpen = true;
          }
        }
      }

      return {
        isOpen,
        exchange,
        provider: this.providerName,
        timestamp: Date.now()
      };

    } catch (error) {
      return this.handleError(error, `getMarketStatus(${exchange})`);
    }
  }

  /**
   * Get available symbols for an exchange
   */
  async getSymbols(exchange = 'US') {
    return [];
  }

  /**
   * Get company news for a ticker
   */
  async getCompanyNews(ticker, fromDate, toDate) {
    return [];
  }

  /**
   * Test adapter connectivity
   */
  async test() {
    try {
      const testTicker = 'AAPL';
      const start = Date.now();
      
      const quote = await this.getQuote(testTicker);
      const duration = Date.now() - start;

      return {
        success: quote.price > 0,
        provider: this.providerName,
        testTicker,
        quote: quote.price > 0 ? 'OK' : 'FAILED',
        duration: `${duration}ms`,
        timestamp: Date.now()
      };

    } catch (error) {
      return {
        success: false,
        provider: this.providerName,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }
}

export default YahooFinanceAdapter;
