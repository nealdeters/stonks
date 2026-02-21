/**
 * Market Data Provider Factory
 * Creates and manages market data provider adapters
 * Supports runtime switching between providers
 */
import FinnhubAdapter from './finnhub-adapter.js';
import AllTickAdapter from './alltick-adapter.js';

class ProviderFactory {
  constructor(config = {}) {
    this.config = config;
    this.providers = new Map();
    this.currentProvider = null;
    this.fallbackProvider = null;
  }

  /**
   * Create a provider adapter instance
   * @param {string} type - Provider type ('finnhub', 'alltick')
   * @param {Object} config - Provider-specific configuration
   * @returns {Object} Provider adapter instance
   */
  static createProvider(type, config) {
    switch (type.toLowerCase()) {
      case 'finnhub':
        return new FinnhubAdapter({
          apiKey: config.finnhubKey || config.apiKey,
          timeout: config.timeout || 8000,
          ...config
        });

      case 'alltick':
        return new AllTickAdapter({
          apiKey: config.alltickKey || config.apiKey,
          timeout: config.timeout || 8000,
          ...config
        });

      default:
        throw new Error(`Unknown provider type: ${type}. Supported: finnhub, alltick`);
    }
  }

  /**
   * Initialize the factory with configuration
   * @param {Object} config - Factory configuration
   */
  initialize(config) {
    this.config = { ...this.config, ...config };
    
    // Set current provider
    const primaryProvider = this.config.marketDataProvider || 'finnhub';
    this.setProvider(primaryProvider);

    // Set fallback provider if configured
    if (this.config.fallbackProvider) {
      this.setFallbackProvider(this.config.fallbackProvider);
    }
  }

  /**
   * Set the current provider
   * @param {string} type - Provider type
   */
  setProvider(type) {
    try {
      if (this.providers.has(type)) {
        this.currentProvider = this.providers.get(type);
      } else {
        const provider = ProviderFactory.createProvider(type, this.config);
        this.providers.set(type, provider);
        this.currentProvider = provider;
      }
      
      console.log(`[ProviderFactory] Switched to ${type} provider`);
    } catch (error) {
      console.error(`[ProviderFactory] Failed to set provider ${type}:`, error.message);
      throw error;
    }
  }

  /**
   * Set fallback provider (lazy init - only creates when actually used)
   * @param {string} type - Provider type
   */
  setFallbackProvider(type) {
    // Store the type for lazy initialization
    this.fallbackProviderType = type;
    console.log(`[ProviderFactory] Set fallback provider: ${type} (lazy init)`);
  }

  /**
   * Get fallback provider, creating it lazily if needed
   * @returns {Object|null} Fallback provider or null
   */
  getFallbackProvider() {
    if (!this.fallbackProviderType) return null;
    
    if (!this.fallbackProvider) {
      try {
        this.fallbackProvider = ProviderFactory.createProvider(this.fallbackProviderType, this.config);
        console.log(`[ProviderFactory] Created fallback provider: ${this.fallbackProviderType}`);
      } catch (error) {
        console.error(`[ProviderFactory] Failed to create fallback provider ${this.fallbackProviderType}:`, error.message);
        return null;
      }
    }
    
    return this.fallbackProvider;
  }

  /**
   * Get current provider instance
   * @returns {Object} Current provider adapter
   */
  getProvider() {
    if (!this.currentProvider) {
      throw new Error('No provider configured. Call initialize() first.');
    }
    return this.currentProvider;
  }

  /**
   * Execute a function with automatic fallback
   * @param {Function} operation - Async function to execute
   * @param {string} operationName - Name for logging
   * @returns {Promise<any>} Operation result
   */
  async executeWithFallback(operation, operationName = 'operation') {
    const provider = this.getProvider();
    
    try {
      return await operation(provider);
    } catch (error) {
      console.error(`[ProviderFactory] ${operationName} failed with ${provider.providerName}:`, error.message);
      
      // Try fallback provider if available
      if (this.fallbackProvider && this.fallbackProvider !== provider) {
        console.log(`[ProviderFactory] Trying fallback provider: ${this.fallbackProvider.providerName}`);
        
        try {
          return await operation(this.fallbackProvider);
        } catch (fallbackError) {
          console.error(`[ProviderFactory] Fallback provider also failed:`, fallbackError.message);
          throw fallbackError;
        }
      }
      
      throw error;
    }
  }

  /**
   * Test all configured providers
   * @returns {Promise<Object>} Test results for all providers
   */
  async testProviders() {
    const results = {};
    
    for (const [name, provider] of this.providers) {
      try {
        results[name] = await provider.test();
      } catch (error) {
        results[name] = {
          success: false,
          provider: name,
          error: error.message,
          timestamp: Date.now()
        };
      }
    }
    
    return results;
  }

  /**
   * Get provider statistics and health
   * @returns {Object} Provider health information
   */
  getProviderHealth() {
    const current = this.currentProvider;
    const fallback = this.fallbackProvider;
    
    return {
      currentProvider: current ? current.providerName : null,
      fallbackProvider: fallback ? fallback.providerName : null,
      availableProviders: Array.from(this.providers.keys()),
      totalProviders: this.providers.size,
      timestamp: Date.now()
    };
  }

  /**
   * Convenience method: get quote with fallback
   * @param {string} ticker - Ticker symbol
   * @returns {Promise<Object>} Price data
   */
  async getQuote(ticker) {
    return this.executeWithFallback(
      provider => provider.getQuote(ticker),
      `getQuote(${ticker})`
    );
  }

  /**
   * Convenience method: get market status with fallback
   * @param {string} exchange - Exchange code
   * @returns {Promise<Object>} Market status
   */
  async getMarketStatus(exchange = 'US') {
    return this.executeWithFallback(
      provider => provider.getMarketStatus(exchange),
      `getMarketStatus(${exchange})`
    );
  }

  /**
   * Convenience method: get quotes with fallback
   * @param {Array<string>} tickers - Array of tickers
   * @returns {Promise<Array<Object>>} Array of price data
   */
  async getQuotes(tickers) {
    return this.executeWithFallback(
      provider => provider.getQuotes(tickers),
      `getQuotes(${tickers.length} tickers)`
    );
  }

  /**
   * Convenience method: get company news with fallback
   * @param {string} ticker - Ticker symbol
   * @param {string} fromDate - Start date
   * @param {string} toDate - End date
   * @returns {Promise<Array<Object>>} Array of news articles
   */
  async getCompanyNews(ticker, fromDate, toDate) {
    return this.executeWithFallback(
      provider => provider.getCompanyNews(ticker, fromDate, toDate),
      `getCompanyNews(${ticker}, ${fromDate}, ${toDate})`
    );
  }
}

// Export factory methods for direct use
export { ProviderFactory };
export const createProvider = ProviderFactory.createProvider;
export default ProviderFactory;