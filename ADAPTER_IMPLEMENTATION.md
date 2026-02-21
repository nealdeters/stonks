# Market Data Adapter Implementation

This document describes the new adapter pattern implementation for market data providers, allowing seamless switching between Finnhub and AllTick APIs.

## Overview

The adapter pattern provides a unified interface for accessing market data from multiple providers while maintaining backward compatibility with the existing Finnhub implementation.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Provider Factory                         │
│  ┌───────────────────────────────────────────────────────┐   │
│  │              Market Data Adapter                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │   │
│  │  │   Finnhub   │  │   AllTick   │  │   Future    │   │   │
│  │  │   Adapter   │  │   Adapter   │  │  Adapters   │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘   │   │
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
├── finnhub-adapter.js       # Finnhub API implementation (backward compatible)
├── alltick-adapter.js       # AllTick API implementation (unified)
├── provider-factory.js      # Factory for creating and managing providers
└── index.js                 # Export all adapters

netlify/lib/
├── adapter-config.js        # Configuration management
└── stock-data.js           # Updated to use adapter pattern
```

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Provider Selection (NEW)
MARKET_DATA_PROVIDER=alltick      # Options: finnhub, alltick
FALLBACK_PROVIDER=finnhub        # Optional fallback provider
ENABLE_PROVIDER_FALLBACK=true      # Enable automatic fallback
PROVIDER_TIMEOUT=8000             # Request timeout in milliseconds

# Provider API Keys
FINNHUB_KEY=your-finnhub-key      # Required for finnhub
ALLTICK_KEY=your-alltick-key      # Required for alltick (get at alltick.co)

# Feature Flags
ENABLE_PROVIDER_LOGGING=true       # Detailed logging
ENABLE_PROVIDER_METRICS=false      # Performance metrics
```

### Configuration Validation

The system validates:
- Valid provider selection (finnhub, alltick)
- Required API keys for selected providers
- Timeout values (1000-30000ms)
- Fallback provider compatibility

## Usage

### Basic Usage

The stock data service automatically uses the configured provider:

```javascript
// No code changes needed - uses configured provider automatically
const result = await syncStockData(event);
```

### Manual Provider Selection

```javascript
import { ProviderFactory, getAdapterConfig } from './lib/adapter-config.js';

const factory = new ProviderFactory();
const config = getAdapterConfig();
factory.initialize(config);

// Get current provider
const provider = factory.getProvider();
console.log(`Using provider: ${provider.providerName}`);

// Fetch data with automatic fallback
const quote = await factory.getQuote('TEAM');
const marketStatus = await factory.getMarketStatus();
const quotes = await factory.getQuotes(['TEAM', 'ETH', 'TUI1.DE']);
```

### Switching Providers at Runtime

```javascript
// Switch to AllTick
factory.setProvider('alltick');

// Switch back to Finnhub
factory.setProvider('finnhub');
```

## Data Formats

### Price Data (Standardized)

```javascript
{
  ticker: "TEAM",
  price: 245.67,
  dp: 2.34,              // Daily percent change
  name: "Atlassian Corp",
  timestamp: 1640995200,
  provider: "alltick"    // Source tracking
}
```

### Market Status (Standardized)

```javascript
{
  isOpen: true,
  holiday: null,
  exchange: "US",
  provider: "alltick",
  timestamp: 1640995200
}
```

## Provider Comparison

| Feature | Finnhub | AllTick |
|---------|---------|---------|
| **Coverage** | US stocks, crypto | US, HK, German stocks, crypto, forex |
| **Real-time** | ✅ | ✅ |
| **German stocks (.DE)** | ❌ | ✅ |
| **Unified API** | ❌ | ✅ |
| **News data** | ✅ | ❌ |
| **Rate limits** | 60 calls/min | Generous free tier |
| **Cost** | Free tier | Free tier + affordable paid |

## Migration Guide

### Step 1: Add Configuration

1. Copy `.env.adapter-example` to your `.env` file
2. Add your API keys (FINNHUB_KEY and/or ALLTICK_KEY)
3. Set MARKET_DATA_PROVIDER to your preferred provider

### Step 2: Test Configuration

```bash
# Test the adapter structure (no API calls)
node test-adapter-structure-simple.js

# Test with real API calls (requires API keys)
node test-adapters.js
```

### Step 3: Deploy and Monitor

1. Deploy your updated application
2. Monitor the logs for provider switching messages
3. Test fallback functionality by temporarily invalidating API keys

## Testing

### Structure Test (No API Keys Required)
```bash
node test-adapter-structure-simple.js
```

### Full Test (Requires API Keys)
```bash
node test-adapters.js
```

### Test Results Interpretation

- ✅ **Successful**: Provider returned valid price data
- ❌ **Failed**: Provider returned error or zero price
- 🏆 **Recommendation**: Best provider for your ticker list

## Troubleshooting

### Common Issues

1. **"FINNHUB_KEY is required"**
   - Add `FINNHUB_KEY=your-key` to your `.env` file

2. **"ALLTICK_KEY is required"**
   - Add `ALLTICK_KEY=your-key` to your `.env` file
   - Get free key at: https://alltick.co/

3. **"Invalid provider"**
   - Use only `finnhub` or `alltick` for MARKET_DATA_PROVIDER

4. **Provider fallback not working**
   - Ensure `ENABLE_PROVIDER_FALLBACK=true`
   - Set valid `FALLBACK_PROVIDER`

### Debug Mode

Enable detailed logging:
```bash
ENABLE_PROVIDER_LOGGING=true node your-script.js
```

## Performance Considerations

- **Timeouts**: Set appropriate PROVIDER_TIMEOUT (default: 8s)
- **Batch Requests**: Use `getQuotes()` for multiple tickers
- **Caching**: Redis caching still applies to adapter results
- **Fallback**: Enable fallback for production reliability

## Future Enhancements

- **Additional Providers**: Easy to add more providers (Yahoo, Alpha Vantage, etc.)
- **WebSocket Support**: Real-time streaming for supported providers
- **Metrics Collection**: Provider performance monitoring
- **Smart Provider Selection**: Automatic provider selection based on ticker types

## Backward Compatibility

✅ **Fully backward compatible** - existing Finnhub implementation continues to work
✅ **Zero frontend changes** - same API contracts maintained
✅ **Gradual migration** - switch providers without deployment
✅ **Fallback support** - automatic failover for reliability