# Market Data Adapter Implementation

This document describes the adapter pattern implementation for market data providers, supporting a chain of providers with automatic fallback.

## Overview

The adapter pattern provides a unified interface for accessing market data from multiple providers. The system uses a **provider chain** - it tries each provider in order until one succeeds.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Provider Factory                         │
│  ┌───────────────────────────────────────────────────────┐   │
│  │              Provider Chain (in order)                │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐              │   │
│  │  │  Yahoo  │──│ Finnhub │──│ AllTick │──▶ ...      │   │
│  │  │ (free)  │  │         │  │         │              │   │
│  │  └─────────┘  └─────────┘  └─────────┘              │   │
│  └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   Stock Data      │
                    │   Service         │
                    └───────────────────┘
```

## File Structure

```
netlify/lib/adapters/
├── base-adapter.js          # Base interface all adapters must implement
├── finnhub-adapter.js       # Finnhub API implementation
├── alltick-adapter.js       # AllTick API implementation
├── yahoo-adapter.js        # Yahoo Finance API (free, no key needed)
├── provider-factory.js      # Factory for creating and managing provider chain
└── index.js                 # Export all adapters

netlify/lib/
├── adapter-config.js        # Configuration management
└── stock-data.js           # Updated to use adapter pattern
```

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Provider Chain (order matters - tried left to right)
# Default: yahoo,finnhub,alltick
# Yahoo is free and used by default - no API key needed
PROVIDER_CHAIN=yahoo,finnhub,alltick

# Request timeout in milliseconds
PROVIDER_TIMEOUT=8000

# Provider API Keys (only needed if provider is in the chain)
FINNHUB_KEY=your-finnhub-key      # Optional
ALLTICK_KEY=your-alltick-key      # Optional

# Feature Flags
ENABLE_PROVIDER_LOGGING=true       # Detailed logging
ENABLE_PROVIDER_METRICS=false      # Performance metrics
```

### Configuration Validation

The system validates:
- Valid providers in chain (yahoo, finnhub, alltick)
- Optional API keys (only required if provider is in chain)
- Timeout values (1000-30000ms)

## Usage

### Basic Usage

The stock data service automatically uses the configured provider chain:

```javascript
// No code changes needed - uses chain automatically
const result = await syncStockData(event);
```

### Manual Provider Selection

```javascript
import { ProviderFactory, getAdapterConfig } from './lib/adapter-config.js';

const factory = new ProviderFactory();
const config = getAdapterConfig();
factory.initialize(config);

// Get primary provider
const provider = factory.getProvider();
console.log(`Primary provider: ${provider.providerName}`);

// Get full chain
const chain = factory.getProviderChain();
console.log(`Provider chain: ${chain.map(p => p.providerName).join(' → ')}`);

// Fetch data - chain handles fallback automatically
const quote = await factory.getQuote('AAPL');
const marketStatus = await factory.getMarketStatus();
const quotes = await factory.getQuotes(['AAPL', 'GOOGL', 'MSFT']);
```

## Data Formats

### Price Data (Standardized)

```javascript
{
  ticker: "AAPL",
  price: 245.67,
  dp: 2.34,              // Daily percent change
  name: "Apple Inc.",
  timestamp: 1640995200,
  provider: "yahoo"      // Source tracking
}
```

### Market Status (Standardized)

```javascript
{
  isOpen: true,
  holiday: null,
  exchange: "US",
  provider: "yahoo",
  timestamp: 1640995200
}
```

## Provider Comparison

| Feature | Yahoo | Finnhub | AllTick |
|---------|-------|---------|---------|
| **Coverage** | US + Intl | US stocks, crypto | US, HK, DE, crypto, forex |
| **API Key Required** | ❌ No | ✅ Yes | ✅ Yes |
| **Real-time** | ✅ | ✅ | ✅ |
| **German stocks (.DE)** | ✅ | ❌ | ✅ |
| **Batch requests** | ✅ | ❌ | ✅ |
| **Rate limits** | Strict | 60/min | Generous |
| **Cost** | Free | Free tier | Free tier |

## Migration Guide

### Step 1: Update Configuration

No changes needed - Yahoo is the default and works without an API key:

```bash
# Default chain (recommended)
PROVIDER_CHAIN=yahoo,finnhub,alltick

# Or customize order
PROVIDER_CHAIN=yahoo,alltick,finnhub
```

### Step 2: Test Configuration

```bash
# Test the adapter structure (no API calls)
node test-adapter-structure-simple.js

# Test with real API calls
node test-adapters.js
```

### Step 3: Deploy and Monitor

1. Deploy your updated application
2. Monitor logs for provider chain messages
3. Test fallback by checking logs

## How It Works

1. **Initialization**: Factory reads `PROVIDER_CHAIN` env var
2. **Primary Provider**: First provider in chain is used by default
3. **Fallback**: If primary fails, next provider in chain is tried
4. **Success**: First provider to return valid data is used
5. **All Failed**: If all providers fail, error is logged

### Example Log Output

```
[ProviderFactory] Added yahoo to provider chain
[ProviderFactory] Added finnhub to provider chain
[ProviderFactory] Added alltick to provider chain
[ProviderFactory] Trying yahoo...
[Yahoo] Batch request failed, falling back to individual requests
[ProviderFactory] Success with yahoo
```

## Troubleshooting

### Common Issues

1. **"No providers available"**
   - Check PROVIDER_CHAIN contains valid providers
   - Valid: yahoo, finnhub, alltick

2. **All providers returning errors**
   - Check API keys if using finnhub/alltick
   - Yahoo should work without any key
   - Check rate limiting

3. **Slow responses**
   - Reduce PROVIDER_TIMEOUT (default: 8000ms)
   - Reorder chain - put fastest providers first

### Debug Mode

Enable detailed logging:
```bash
ENABLE_PROVIDER_LOGGING=true node your-script.js
```

## Performance Considerations

- **Timeouts**: Set appropriate PROVIDER_TIMEOUT (default: 8s)
- **Chain Order**: Put most reliable providers first
- **Batch Requests**: Use `getQuotes()` for multiple tickers
- **Caching**: Redis caching still applies to adapter results
- **Rate Limiting**: AllTick adapter includes built-in rate limiting

## Future Enhancements

- **Additional Providers**: Easy to add more providers (Alpha Vantage, Polygon, etc.)
- **WebSocket Support**: Real-time streaming for supported providers
- **Metrics Collection**: Provider performance monitoring
- **Smart Selection**: Automatic provider selection based on ticker types
