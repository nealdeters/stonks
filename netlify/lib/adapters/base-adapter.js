/**
 * Base adapter interface for market data providers
 * All providers must implement these methods to ensure consistent data contracts
 */
class MarketDataAdapter {
  constructor(config = {}) {
    this.config = config;
    this.providerName = 'base';
    this.timeout = config.timeout || 8000; // 8 second default timeout
  }

  /**
   * Get current quote for a single ticker
   * @param {string} ticker - Stock/crypto symbol (e.g., 'TEAM', 'ETH', 'TUI1.DE')
   * @returns {Promise<Object>} Standardized price data
   */
  async getQuote(ticker) {
    throw new Error('getQuote() must be implemented by provider adapter');
  }

  /**
   * Get market status (open/closed)
   * @param {string} exchange - Exchange code (default: 'US')
   * @returns {Promise<Object>} Market status information
   */
  async getMarketStatus(exchange = 'US') {
    throw new Error('getMarketStatus() must be implemented by provider adapter');
  }

  /**
   * Get available symbols for an exchange
   * @param {string} exchange - Exchange code (default: 'US')
   * @returns {Promise<Array>} Array of symbol objects
   */
  async getSymbols(exchange = 'US') {
    throw new Error('getSymbols() must be implemented by provider adapter');
  }

  /**
   * Get company news for a ticker
   * @param {string} ticker - Stock symbol
   * @param {string} fromDate - Start date (YYYY-MM-DD)
   * @param {string} toDate - End date (YYYY-MM-DD)
   * @returns {Promise<Array>} Array of news articles
   */
  async getCompanyNews(ticker, fromDate, toDate) {
    throw new Error('getCompanyNews() must be implemented by provider adapter');
  }

  /**
   * Get quotes for multiple tickers (batch request)
   * Default implementation makes individual calls - override for provider-specific batching
   * @param {Array<string>} tickers - Array of ticker symbols
   * @returns {Promise<Array<Object>>} Array of price data objects
   */
  async getQuotes(tickers) {
    const promises = tickers.map(ticker => this.getQuote(ticker));
    return Promise.all(promises);
  }

  /**
   * Format price response to standard format
   * @param {Object} data - Raw provider data
   * @param {string} ticker - Ticker symbol
   * @returns {Object} Standardized price data
   */
  formatPriceResponse(data, ticker) {
    return {
      ticker,
      price: data.price || 0,
      dp: data.dp || 0,
      name: data.name || ticker,
      timestamp: data.timestamp || Date.now(),
      provider: this.providerName
    };
  }

  /**
   * Format news response to standard format
   * @param {Object} article - Raw news article
   * @param {string} ticker - Ticker symbol
   * @returns {Object} Standardized news data
   */
  formatNewsResponse(article, ticker) {
    return {
      headline: article.headline || article.title || '',
      summary: article.summary || article.description || '',
      url: article.url || article.link || '',
      datetime: article.datetime || article.publishedAt || Date.now(),
      source: article.source || article.sourceName || 'Unknown',
      ticker,
      provider: this.providerName
    };
  }

  /**
   * Handle API errors consistently
   * @param {Error} error - The error object
   * @param {string} context - Context for the error
   * @returns {Object} Standardized error response
   */
  handleError(error, context = '') {
    console.error(`[${this.providerName}] Error in ${context}:`, error.message);
    
    return {
      error: true,
      message: error.message,
      context,
      provider: this.providerName,
      timestamp: Date.now()
    };
  }

  /**
   * Make HTTP requests with timeout and error handling
   * @param {string} url - Request URL
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} Response data
   */
  async makeRequest(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Validate adapter configuration
   * @param {Object} requiredConfig - Required configuration keys
   * @throws {Error} If required config is missing
   */
  validateConfig(requiredConfig = {}) {
    const missing = Object.keys(requiredConfig).filter(key => !this.config[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required config: ${missing.join(', ')}`);
    }
  }
}

export default MarketDataAdapter;