/**
 * Market Data Adapters Index
 * Centralized exports for all market data provider adapters
 */

const MarketDataAdapter = require('./base-adapter');
const FinnhubAdapter = require('./finnhub-adapter');
const AllTickAdapter = require('./alltick-adapter');
const { ProviderFactory, createProvider } = require('./provider-factory');

export {
  MarketDataAdapter,
  FinnhubAdapter,
  AllTickAdapter,
  ProviderFactory,
  createProvider
};