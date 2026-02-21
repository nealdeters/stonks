/**
 * Finnhub Market Data Adapter
 * Implements the MarketDataAdapter interface for Finnhub API
 * Maintains backward compatibility with existing implementation
 */
import MarketDataAdapter from './base-adapter.js';

class FinnhubAdapter extends MarketDataAdapter {
  constructor(config) {
    super(config);
    this.providerName = 'finnhub';
    this.baseUrl = 'https://finnhub.io/api/v1';
    
    // Validate required configuration
    this.validateConfig({ apiKey: 'Finnhub API key is required' });
  }

  /**
   * Get current quote for a single ticker
   * @param {string} ticker - Stock/crypto symbol
   * @returns {Promise<Object>} Standardized price data
   */
  async getQuote(ticker) {
    try {
      const url = `${this.baseUrl}/quote?symbol=${ticker}&token=${this.config.apiKey}`;
      const data = await this.makeRequest(url);

      // Finnhub returns: { c: current, dp: percent_change, h: high, l: low, o: open, pc: previous_close, t: timestamp }
      return this.formatPriceResponse({
        price: data.c || 0,
        dp: data.dp || 0,
        timestamp: data.t * 1000, // Convert to milliseconds
        raw: data // Store raw data for debugging
      }, ticker);

    } catch (error) {
      return this.handleError(error, `getQuote(${ticker})`);
    }
  }

  /**
   * Get market status (open/closed)
   * @param {string} exchange - Exchange code (default: 'US')
   * @returns {Promise<Object>} Market status information
   */
  async getMarketStatus(exchange = 'US') {
    try {
      const url = `${this.baseUrl}/stock/market-status?exchange=${exchange}&token=${this.config.apiKey}`;
      const data = await this.makeRequest(url);

      return {
        isOpen: data.isOpen || false,
        holiday: data.holiday || null,
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
   * @param {string} exchange - Exchange code (default: 'US')
   * @returns {Promise<Array>} Array of symbol objects
   */
  async getSymbols(exchange = 'US') {
    try {
      const url = `${this.baseUrl}/stock/symbol?exchange=${exchange}&token=${this.config.apiKey}`;
      const data = await this.makeRequest(url);

      // Finnhub returns array of { symbol, description, displaySymbol, type, mic, currency }
      return data.map(item => ({
        symbol: item.symbol,
        description: item.description || item.displaySymbol || item.symbol,
        displaySymbol: item.displaySymbol,
        type: item.type,
        mic: item.mic,
        currency: item.currency,
        provider: this.providerName
      }));

    } catch (error) {
      return this.handleError(error, `getSymbols(${exchange})`);
    }
  }

  /**
   * Get company news for a ticker
   * @param {string} ticker - Stock symbol
   * @param {string} fromDate - Start date (YYYY-MM-DD)
   * @param {string} toDate - End date (YYYY-MM-DD)
   * @returns {Promise<Array>} Array of news articles
   */
  async getCompanyNews(ticker, fromDate, toDate) {
    try {
      const url = `${this.baseUrl}/company-news?symbol=${ticker}&from=${fromDate}&to=${toDate}&token=${this.config.apiKey}`;
      const articles = await this.makeRequest(url);

      // Finnhub returns array of news articles
      return articles.map(article => this.formatNewsResponse(article, ticker));

    } catch (error) {
      return this.handleError(error, `getCompanyNews(${ticker}, ${fromDate}, ${toDate})`);
    }
  }

  /**
   * Override formatPriceResponse to handle Finnhub-specific data
   * @param {Object} data - Raw Finnhub data
   * @param {string} ticker - Ticker symbol
   * @returns {Object} Standardized price data
   */
  formatPriceResponse(data, ticker) {
    // Get name from symbol lookup if available, otherwise use ticker
    const name = data.name || this.getCachedName(ticker) || ticker;

    return {
      ticker,
      price: data.price || 0,
      dp: data.dp || 0,
      name,
      timestamp: data.timestamp || Date.now(),
      provider: this.providerName,
      raw: data.raw || data // Store raw for debugging
    };
  }

  /**
   * Get cached stock name (helper method)
   * @param {string} ticker - Ticker symbol
   * @returns {string|null} Stock name or null
   */
  getCachedName(ticker) {
    // This can be extended to use a proper cache
    // For now, return null to use ticker as fallback
    return null;
  }

  /**
   * Get quotes for multiple tickers using Finnhub's batch endpoint if available
   * @param {Array<string>} tickers - Array of ticker symbols
   * @returns {Promise<Array<Object>>} Array of price data objects
   */
  async getQuotes(tickers) {
    try {
      // First, fetch company names for US tickers
      const symbolMap = await this.fetchSymbolNames(tickers);
      
      // Fetch quotes for all tickers
      const promises = tickers.map(async (ticker) => {
        try {
          const quote = await this.getQuote(ticker);
          // Attach company name if available
          if (symbolMap.has(ticker)) {
            quote.name = symbolMap.get(ticker);
          }
          return quote;
        } catch (error) {
          console.error(`[Finnhub] Failed to get quote for ${ticker}:`, error.message);
          return this.formatPriceResponse({ price: 0, dp: 0 }, ticker);
        }
      });

      return Promise.all(promises);
    } catch (error) {
      return this.handleError(error, `getQuotes(${tickers.length} tickers)`);
    }
  }

  /**
   * Fetch company names for tickers using Finnhub symbol lookup
   * @param {Array<string>} tickers - Array of ticker symbols
   * @returns {Promise<Map<string, string>>} Map of ticker to company name
   */
  async fetchSymbolNames(tickers) {
    const symbolMap = new Map();
    const usTickers = tickers.filter(t => !t.includes('.') && !t.includes('-'));
    
    if (usTickers.length === 0) return symbolMap;
    
    try {
      // Fetch all US symbols and filter to our tickers
      const url = `${this.baseUrl}/stock/symbol?exchange=US&token=${this.config.apiKey}`;
      const data = await this.makeRequest(url);
      
      if (Array.isArray(data)) {
        for (const ticker of usTickers) {
          const match = data.find(s => s.symbol === ticker);
          if (match?.description) {
            symbolMap.set(ticker, match.description);
          }
        }
      }
    } catch (error) {
      console.warn(`[Finnhub] Failed to fetch symbol names:`, error.message);
    }
    
    return symbolMap;
  }

  /**
   * Test adapter connectivity
   * @returns {Promise<Object>} Test results
   */
  async test() {
    try {
      const testTicker = 'AAPL';
      const start = Date.now();
      
      const [quote, status] = await Promise.all([
        this.getQuote(testTicker),
        this.getMarketStatus()
      ]);

      const duration = Date.now() - start;

      return {
        success: true,
        provider: this.providerName,
        testTicker,
        quote: quote.price > 0 ? 'OK' : 'FAILED',
        marketStatus: status.isOpen !== undefined ? 'OK' : 'FAILED',
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

export default FinnhubAdapter;