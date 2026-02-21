/**
 * AllTick Market Data Adapter
 * Implements the MarketDataAdapter interface for AllTick API
 * Provides unified access to stocks, crypto, forex, and commodities
 */
import MarketDataAdapter from './base-adapter.js';

class AllTickAdapter extends MarketDataAdapter {
  constructor(config) {
    super(config);
    this.providerName = 'alltick';
    this.baseUrl = 'https://quote.alltick.io';
    this.requestQueue = [];
    this.lastRequestTime = 0;
    this.minRequestInterval = 250; // 4 requests per second max (250ms between requests)
    
    // Validate required configuration
    this.validateConfig({ apiKey: 'AllTick API key is required' });
  }

  /**
   * Rate limiter: wait if needed before making request
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
   * Get current quote for a single ticker
   * AllTick uses different endpoints for different asset types
   * @param {string} ticker - Stock/crypto symbol
   * @returns {Promise<Object>} Standardized price data
   */
  async getQuote(ticker) {
    try {
      // Rate limit check before request
      await this.waitForRateLimit();
      
      // Determine asset type and appropriate endpoint
      const assetType = this.detectAssetType(ticker);
      const endpoint = this.getQuoteEndpoint(assetType);
      
      // Prepare request based on asset type
      const requestData = this.prepareQuoteRequest(ticker, assetType);
      const url = `${this.baseUrl}${endpoint}?token=${this.config.apiKey}&query=${encodeURIComponent(JSON.stringify(requestData))}`;
      
      const data = await this.makeRequest(url);

      // Format response based on asset type
      return this.formatAllTickResponse(data, ticker, assetType);

    } catch (error) {
      return this.handleError(error, `getQuote(${ticker})`);
    }
  }

  /**
   * Get quotes for multiple tickers in a single batch request
   * @param {Array<string>} tickers - Array of ticker symbols
   * @returns {Promise<Array<Object>>} Array of standardized price data
   */
  async getQuotes(tickers) {
    try {
      // Group tickers by asset type for batch processing
      const grouped = this.groupTickersByAssetType(tickers);
      const results = [];
      
      // Process each asset type group
      for (const [assetType, typeTickers] of Object.entries(grouped)) {
        const endpoint = this.getBatchQuoteEndpoint(assetType);
        
        // Wait before batch request for rate limiting
        await this.waitForRateLimit();
        
        // Prepare batch request
        const requestData = this.prepareBatchQuoteRequest(typeTickers, assetType);
        const url = `${this.baseUrl}${endpoint}?token=${this.config.apiKey}`;
        
        try {
          const data = await this.makeRequest(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
          });
          
          // Parse batch response
          const parsed = this.parseBatchResponse(data, typeTickers, assetType);
          results.push(...parsed);
        } catch (error) {
          // If batch fails, fall back to individual requests with delay
          console.warn(`[AllTick] Batch request failed for ${assetType}, falling back to individual requests`);
          for (const ticker of typeTickers) {
            // Add extra delay between fallback requests
            await new Promise(resolve => setTimeout(resolve, 500));
            const quote = await this.getQuote(ticker);
            results.push(quote);
          }
        }
      }
      
      return results;
      
    } catch (error) {
      // If batch completely fails, fall back to individual calls with delay
      console.warn(`[AllTick] Batch request failed completely: ${error.message}, falling back to individual requests`);
      const results = [];
      for (const ticker of tickers) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const quote = await this.getQuote(ticker);
        results.push(quote);
      }
      return results;
    }
  }

  /**
   * Group tickers by asset type
   * @param {Array<string>} tickers - Array of ticker symbols
   * @returns {Object} Grouped tickers by asset type
   */
  groupTickersByAssetType(tickers) {
    const groups = {
      'stock-us': [],
      'stock-de': [],
      'stock-hk': [],
      'crypto': [],
      'forex': [],
      'commodity': []
    };
    
    for (const ticker of tickers) {
      const assetType = this.detectAssetType(ticker);
      if (groups[assetType]) {
        groups[assetType].push(ticker);
      } else {
        groups['stock-us'].push(ticker); // Default to US stocks
      }
    }
    
    // Remove empty groups
    return Object.fromEntries(
      Object.entries(groups).filter(([_, tickers]) => tickers.length > 0)
    );
  }

  /**
   * Get batch quote endpoint for asset type
   * @param {string} assetType - Asset type
   * @returns {string} Batch API endpoint path
   */
  getBatchQuoteEndpoint(assetType) {
    switch (assetType) {
      case 'crypto':
      case 'forex':
      case 'commodity':
        return '/quote-b-api/batch-kline';
      case 'stock-us':
      case 'stock-de':
      case 'stock-hk':
      default:
        return '/quote-stock-b-api/batch-kline';
    }
  }

  /**
   * Prepare batch quote request for AllTick API
   * @param {Array<string>} tickers - Array of ticker symbols
   * @param {string} assetType - Asset type
   * @returns {Object} Batch request data object
   */
  prepareBatchQuoteRequest(tickers, assetType) {
    const symbols = tickers.map(ticker => {
      let code = ticker;
      
      if (assetType === 'crypto') {
        if (ticker === 'BTC') code = 'BTCUSDT';
        else if (ticker === 'ETH') code = 'ETHUSDT';
        else if (!ticker.includes('USDT')) code = `${ticker}USDT`;
      } else if (assetType === 'stock-us') {
        // Add .US suffix for US stocks
        if (!ticker.includes('.')) {
          code = `${ticker}.US`;
        }
      }
      
      return { code };
    });
    
    return {
      data: {
        symbol_list: symbols,
        kline_type: '1',
        kline_timestamp_end: '0',
        query_kline_num: '1',
        adjust_type: '0'
      }
    };
  }

  /**
   * Parse batch response from AllTick API
   * @param {Object} data - Raw AllTick batch response
   * @param {Array<string>} tickers - Original ticker symbols
   * @param {string} assetType - Asset type
   * @returns {Array<Object>} Array of standardized price data
   */
  parseBatchResponse(data, tickers, assetType) {
    const results = [];
    
    if (!data || !data.data || !Array.isArray(data.data)) {
      // If response is invalid, return errors for all tickers
      for (const ticker of tickers) {
        results.push(this.formatPriceResponse({ price: 0, dp: 0, timestamp: Date.now(), assetType, raw: null }, ticker));
      }
      return results;
    }
    
    // Map response data back to original tickers
    const responseMap = new Map();
    for (const item of data.data) {
      if (item.code) {
        responseMap.set(item.code, item);
      }
    }
    
    for (const ticker of tickers) {
      // Convert ticker to AllTick format for lookup
      let lookupCode = ticker;
      if (assetType === 'crypto') {
        if (ticker === 'BTC') lookupCode = 'BTCUSDT';
        else if (ticker === 'ETH') lookupCode = 'ETHUSDT';
        else if (!ticker.includes('USDT')) lookupCode = `${ticker}USDT`;
      }
      
      const responseItem = responseMap.get(lookupCode);
      
      if (responseItem && responseItem.kline && responseItem.kline.length > 0) {
        const kline = responseItem.kline[0];
        // Format: [timestamp, open, high, low, close, volume]
        const price = kline[4] || 0;
        const open = kline[1] || 0;
        const dp = open > 0 ? ((price - open) / open) * 100 : 0;
        const timestamp = kline[0] * 1000;
        
        results.push(this.formatPriceResponse({
          price,
          dp,
          timestamp,
          assetType,
          raw: responseItem
        }, ticker));
      } else {
        // No data found for this ticker
        results.push(this.formatPriceResponse({ price: 0, dp: 0, timestamp: Date.now(), assetType, raw: null }, ticker));
      }
    }
    
    return results;
  }

  /**
   * Get market status (open/closed)
   * @param {string} exchange - Exchange code (default: 'US')
   * @returns {Promise<Object>} Market status information
   */
  async getMarketStatus(exchange = 'US') {
    try {
      // AllTick provides market status through their quote endpoints
      // For now, we'll implement based on time and known market hours
      // This can be enhanced with actual market status API calls
      
      const now = new Date();
      const dayOfWeek = now.getDay();
      const hour = now.getHours();
      const minute = now.getMinutes();
      
      // Simple market hours logic (can be enhanced)
      let isOpen = false;
      let holiday = null;
      
      if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
        if (exchange === 'US') {
          // US market hours: 9:30 AM - 4:00 PM EST
          const marketHour = hour - 5; // Convert to EST
          if (marketHour >= 9 && marketHour < 16) {
            isOpen = true;
          } else if (marketHour === 9 && minute >= 30) {
            isOpen = true;
          }
        } else if (exchange === 'DE') {
          // German market hours: 9:00 AM - 5:30 PM CET
          if (hour >= 9 && hour < 17) {
            isOpen = true;
          } else if (hour === 17 && minute <= 30) {
            isOpen = true;
          }
        }
      }

      return {
        isOpen,
        holiday,
        exchange,
        provider: this.providerName,
        timestamp: Date.now(),
        note: 'Market status based on standard trading hours'
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
      // AllTick provides symbol lists through their API
      // For now, return a basic mapping - this can be enhanced
      const exchangeMap = {
        'US': 'US Stocks',
        'DE': 'German Stocks', 
        'HK': 'Hong Kong Stocks'
      };

      // Return basic structure - can be enhanced with actual symbol lookup
      return [{
        symbol: 'EXAMPLE',
        description: `${exchangeMap[exchange] || exchange} Symbol`,
        displaySymbol: 'EXAMPLE',
        type: 'EQUITY',
        mic: exchange,
        currency: this.getExchangeCurrency(exchange),
        provider: this.providerName,
        note: 'Symbol list placeholder - implement actual lookup'
      }];

    } catch (error) {
      return this.handleError(error, `getSymbols(${exchange})`);
    }
  }

  /**
   * Get company news for a ticker
   * AllTick primarily focuses on price data, news may be limited
   * @param {string} ticker - Stock symbol
   * @param {string} fromDate - Start date (YYYY-MM-DD)
   * @param {string} toDate - End date (YYYY-MM-DD)
   * @returns {Promise<Array>} Array of news articles
   */
  async getCompanyNews(ticker, fromDate, toDate) {
    try {
      // AllTick doesn't have a dedicated news endpoint like Finnhub
      // For now, return empty array - can be enhanced with news API integration
      console.warn(`[AllTick] News data not available for ${ticker}. Consider using Finnhub for news.`);
      
      return [];

    } catch (error) {
      return this.handleError(error, `getCompanyNews(${ticker}, ${fromDate}, ${toDate})`);
    }
  }

  /**
   * Detect asset type based on ticker symbol
   * @param {string} ticker - Ticker symbol
   * @returns {string} Asset type (stock, crypto, forex, commodity)
   */
  detectAssetType(ticker) {
    if (!ticker) return 'stock-us';
    const upperTicker = ticker.toUpperCase();
    
    // Crypto detection
    if (upperTicker === 'BTC' || upperTicker === 'ETH' || upperTicker.includes('BTC') || upperTicker.includes('ETH')) {
      return 'crypto';
    }
    
    // German stock detection
    if (upperTicker.includes('.DE')) {
      return 'stock-de';
    }
    
    // Hong Kong stock detection  
    if (upperTicker.includes('.HK')) {
      return 'stock-hk';
    }
    
    // Forex detection
    if (upperTicker.length === 6 && (upperTicker.includes('USD') || upperTicker.includes('EUR') || upperTicker.includes('GBP'))) {
      return 'forex';
    }
    
    // Commodity detection
    if (['GOLD', 'SILVER', 'OIL', 'GAS', 'STEEL'].includes(upperTicker)) {
      return 'commodity';
    }
    
    // Default to US stock
    return 'stock-us';
  }

  /**
   * Get appropriate quote endpoint for asset type
   * @param {string} assetType - Asset type
   * @returns {string} API endpoint path
   */
  getQuoteEndpoint(assetType) {
    switch (assetType) {
      case 'crypto':
        return '/quote-b-api/kline'; // Crypto endpoint
      case 'stock-us':
        return '/quote-stock-b-api/kline'; // US stock endpoint  
      case 'stock-de':
        return '/quote-stock-b-api/kline'; // German stock endpoint
      case 'stock-hk':
        return '/quote-stock-b-api/kline'; // Hong Kong stock endpoint
      case 'forex':
        return '/quote-b-api/kline'; // Forex endpoint
      case 'commodity':
        return '/quote-b-api/kline'; // Commodity endpoint
      default:
        return '/quote-stock-b-api/kline'; // Default to stocks
    }
  }

  /**
   * Prepare quote request for AllTick API
   * @param {string} ticker - Ticker symbol
   * @param {string} assetType - Asset type
   * @returns {Object} Request data object
   */
  prepareQuoteRequest(ticker, assetType) {
    // Convert ticker to AllTick format
    let code = ticker;
    
    if (assetType === 'crypto') {
      // Convert to USDT pair format
      if (ticker === 'BTC') code = 'BTCUSDT';
      else if (ticker === 'ETH') code = 'ETHUSDT';
      else if (!ticker.includes('USDT')) code = `${ticker}USDT`;
    } else if (assetType === 'stock-us') {
      // Add .US suffix for US stocks
      if (!ticker.includes('.')) {
        code = `${ticker}.US`;
      }
    }
    
    return {
      data: {
        code: code,
        kline_type: '1', // 1-minute intervals for real-time
        kline_timestamp_end: '0', // Most recent data
        query_kline_num: '1', // Just get latest
        adjust_type: '0' // No adjustment
      }
    };
  }

  /**
   * Format AllTick response to standard format
   * @param {Object} data - Raw AllTick data
   * @param {string} ticker - Original ticker symbol
   * @param {string} assetType - Asset type
   * @returns {Object} Standardized price data
   */
  formatAllTickResponse(data, ticker, assetType) {
    // AllTick returns kline data - extract latest price
    let price = 0;
    let dp = 0;
    let timestamp = Date.now();

    if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
      const latest = data.data[data.data.length - 1];
      // AllTick kline format: [timestamp, open, high, low, close, volume]
      if (Array.isArray(latest) && latest.length >= 5) {
        price = latest[4]; // Close price
        const open = latest[1];
        if (open > 0) {
          dp = ((price - open) / open) * 100; // Percent change
        }
        timestamp = latest[0] * 1000; // Convert to milliseconds
      }
    }

    return this.formatPriceResponse({
      price,
      dp,
      timestamp,
      assetType,
      raw: data
    }, ticker);
  }

  /**
   * Get exchange currency
   * @param {string} exchange - Exchange code
   * @returns {string} Currency code
   */
  getExchangeCurrency(exchange) {
    const currencyMap = {
      'US': 'USD',
      'DE': 'EUR', 
      'HK': 'HKD',
      'GB': 'GBP',
      'JP': 'JPY'
    };
    return currencyMap[exchange] || 'USD';
  }

  /**
   * Test adapter connectivity
   * @returns {Promise<Object>} Test results
   */
  async test() {
    try {
      const testTickers = ['AAPL', 'ETH', 'TUI1.DE'];
      const start = Date.now();
      
      const results = [];
      for (const ticker of testTickers) {
        try {
          const quote = await this.getQuote(ticker);
          results.push({
            ticker,
            success: quote.price > 0,
            price: quote.price
          });
        } catch (error) {
          results.push({
            ticker,
            success: false,
            error: error.message
          });
        }
      }

      const duration = Date.now() - start;

      return {
        success: results.some(r => r.success),
        provider: this.providerName,
        results,
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

export default AllTickAdapter;