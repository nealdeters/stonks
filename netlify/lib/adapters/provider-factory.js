/**
 * Market Data Provider Factory
 * Creates and manages market data provider adapters
 * Supports chained fallback: tries providers in order until one succeeds
 */
import FinnhubAdapter from './finnhub-adapter.js';
import AllTickAdapter from './alltick-adapter.js';
import YahooFinanceAdapter from './yahoo-adapter.js';

class ProviderFactory {
  constructor(config = {}) {
    this.config = config;
    this.providers = new Map();
    this.providerChain = [];
  }

  /**
   * Create a provider adapter instance
   * @param {string} type - Provider type ('finnhub', 'alltick', 'yahoo')
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

      case 'yahoo':
        return new YahooFinanceAdapter({
          timeout: config.timeout || 8000,
          ...config
        });

      default:
        throw new Error(`Unknown provider type: ${type}. Supported: finnhub, alltick, yahoo`);
    }
  }

  /**
   * Initialize the factory with configuration
   * @param {Object} config - Factory configuration
   */
  initialize(config) {
    this.config = { ...this.config, ...config };
    
    // Set up provider chain: yahoo -> finnhub -> alltick
    const chain = config.providerChain || ['yahoo', 'finnhub', 'alltick'];
    this.setProviderChain(chain);
  }

  /**
   * Set the provider chain order
   * @param {Array<string>} chain - Array of provider types in priority order
   */
  setProviderChain(chain) {
    this.providerChain = [];
    
    for (const type of chain) {
      try {
        const provider = ProviderFactory.createProvider(type, this.config);
        this.providers.set(type, provider);
        this.providerChain.push(provider);
        console.log(`[ProviderFactory] Added ${type} to provider chain`);
      } catch (error) {
        console.warn(`[ProviderFactory] Skipping unavailable provider ${type}:`, error.message);
      }
    }
    
    if (this.providerChain.length === 0) {
      throw new Error('No providers available in chain');
    }
  }

  /**
   * Get the primary (first) provider
   * @returns {Object} Primary provider adapter
   */
  getProvider() {
    return this.providerChain[0];
  }

  /**
   * Get all providers in chain
   * @returns {Array<Object>} Array of provider adapters
   */
  getProviderChain() {
    return this.providerChain;
  }

  /**
   * Execute operation with chained fallback
   * Tries each provider in order until one succeeds
   * @param {Function} operation - Async function to execute (provider => result)
   * @param {string} operationName - Name for logging
   * @returns {Promise<any>} Operation result
   */
  async executeWithChain(operation, operationName = 'operation') {
    const errors = [];
    
    for (const provider of this.providerChain) {
      try {
        console.log(`[ProviderFactory] Trying ${provider.providerName}...`);
        const result = await operation(provider);
        
        // Debug: log result structure
        if (Array.isArray(result)) {
          console.log(`[ProviderFactory] ${provider.providerName} returned ${result.length} items, first item:`, JSON.stringify(result[0]));
        } else {
          console.log(`[ProviderFactory] ${provider.providerName} returned:`, JSON.stringify(result));
        }
        
        // Check if result has valid data
        const hasValidData = this.checkResultValidity(result);
        if (hasValidData) {
          console.log(`[ProviderFactory] Success with ${provider.providerName}`);
          return result;
        }
        
        console.log(`[ProviderFactory] ${provider.providerName} returned no valid data, trying next...`);
        errors.push({ provider: provider.providerName, error: 'No data returned' });
        
      } catch (error) {
        console.error(`[ProviderFactory] ${provider.providerName} failed:`, error.message);
        errors.push({ provider: provider.providerName, error: error.message });
      }
    }
    
    // All providers failed
    throw new Error(`All providers failed: ${errors.map(e => `${e.provider}: ${e.error}`).join('; ')}`);
  }

  /**
   * Check if result has valid data
   */
  checkResultValidity(result) {
    if (!result) return false;
    
    if (Array.isArray(result)) {
      if (result.length === 0) return false;
      // Check if at least one item has meaningful data
      return result.some(r => r && !r.error && r.price > 0 && r.ticker);
    }
    if (result && typeof result === 'object') {
      return !result.error && result.price > 0 && result.ticker;
    }
    return false;
  }

  /**
   * Test all configured providers
   * @returns {Promise<Object>} Test results for all providers
   */
  async testProviders() {
    const results = {};
    
    for (const provider of this.providerChain) {
      try {
        results[provider.providerName] = await provider.test();
      } catch (error) {
        results[provider.providerName] = {
          success: false,
          provider: provider.providerName,
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
    return {
      primaryProvider: this.providerChain[0]?.providerName || null,
      providerChain: this.providerChain.map(p => p.providerName),
      availableProviders: this.providerChain.length,
      timestamp: Date.now()
    };
  }

  /**
   * Convenience method: get quote with chain fallback
   * @param {string} ticker - Ticker symbol
   * @returns {Promise<Object>} Price data
   */
  async getQuote(ticker) {
    return this.executeWithChain(
      provider => provider.getQuote(ticker),
      `getQuote(${ticker})`
    );
  }

  /**
   * Convenience method: get market status
   * Uses primary provider only (no chain fallback needed for status)
   * @param {string} exchange - Exchange code
   * @returns {Promise<Object>} Market status
   */
  async getMarketStatus(exchange = 'US') {
    return this.getProvider().getMarketStatus(exchange);
  }

  /**
   * Convenience method: get quotes with chain fallback
   * @param {Array<string>} tickers - Array of tickers
   * @returns {Promise<Array<Object>>} Array of price data
   */
  async getQuotes(tickers) {
    return this.executeWithChain(
      provider => provider.getQuotes(tickers),
      `getQuotes(${tickers.length} tickers)`
    );
  }

  /**
   * Convenience method: get company news with chain fallback
   * @param {string} ticker - Ticker symbol
   * @param {string} fromDate - Start date
   * @param {string} toDate - End date
   * @returns {Promise<Array<Object>>} Array of news articles
   */
  async getCompanyNews(ticker, fromDate, toDate) {
    return this.executeWithChain(
      provider => provider.getCompanyNews(ticker, fromDate, toDate),
      `getCompanyNews(${ticker}, ${fromDate}, ${toDate})`
    );
  }
}

// Export factory methods for direct use
export { ProviderFactory };
export const createProvider = ProviderFactory.createProvider;
export default ProviderFactory;
