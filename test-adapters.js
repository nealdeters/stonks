/**
 * Market Data Adapter Test Script
 * Tests Finnhub and AllTick adapters with your specific ticker list
 */

import 'dotenv/config';

import { ProviderFactory } from './netlify/lib/adapters/provider-factory.js';
import { getAdapterConfig, logConfiguration } from './netlify/lib/adapter-config.js';

// Your ticker list from the original question
const TEST_TICKERS = [
  'TUI1.DE', 'TEAM', 'TTWO', 'IBATF', 'NFE', 'MU', 'CVX', 'RKLB', 'PLTR', 'MRVL', 
  'RTX', 'RIME', 'SNDK', 'LRCX', 'DIS', 'KTOS', 'GLD', 'BTGO', 'ETH'
];

/**
 * Test adapter with specific tickers
 * @param {ProviderFactory} factory - Provider factory
 * @param {string} providerName - Provider name for logging
 */
async function testAdapter(factory, providerName) {
  console.log(`\n🧪 Testing ${providerName} adapter...`);
  
  try {
    const provider = factory.getProvider();
    console.log(`[Test] Using provider: ${provider.providerName}`);
    
    console.log(`[Test] Fetching market status...`);
    const marketStatus = await factory.getMarketStatus();
    console.log(`[Test] Market status:`, marketStatus);
    
    console.log(`[Test] Fetching quotes for ${TEST_TICKERS.length} tickers...`);
    const startTime = Date.now();
    
    const prices = await factory.getQuotes(TEST_TICKERS);
    const duration = Date.now() - startTime;
    
    console.log(`[Test] Completed in ${duration}ms`);
    
    // Analyze results
    const successful = prices.filter(p => !p.error && p.price > 0);
    const failed = prices.filter(p => p.error || p.price === 0);
    
    console.log(`[Test] Results:`);
    console.log(`  ✅ Successful: ${successful.length}/${TEST_TICKERS.length}`);
    console.log(`  ❌ Failed: ${failed.length}/${TEST_TICKERS.length}`);
    
    if (successful.length > 0) {
      console.log(`\n📈 Sample successful quotes:`);
      successful.slice(0, 5).forEach(price => {
        console.log(`  ${price.ticker}: $${price.price.toFixed(2)} (${price.dp >= 0 ? '+' : ''}${price.dp.toFixed(2)}%) - ${price.name}`);
      });
    }
    
    if (failed.length > 0) {
      console.log(`\n❌ Failed tickers:`);
      failed.forEach(price => {
        console.log(`  ${price.ticker}: ${price.error ? 'Error' : 'Price = 0'}`);
      });
    }
    
    // Test individual quote for comparison
    console.log(`\n[Test] Testing individual quote for TEAM...`);
    const teamQuote = await factory.getQuote('TEAM');
    console.log(`[Test] TEAM individual:`, teamQuote);
    
    return {
      provider: providerName,
      totalTickers: TEST_TICKERS.length,
      successful: successful.length,
      failed: failed.length,
      duration,
      sampleQuotes: successful.slice(0, 3),
      errors: failed.map(p => ({ ticker: p.ticker, error: p.error }))
    };
    
  } catch (error) {
    console.error(`[Test] Error testing ${providerName}:`, error.message);
    return {
      provider: providerName,
      error: error.message,
      totalTickers: TEST_TICKERS.length,
      successful: 0,
      failed: TEST_TICKERS.length
    };
  }
}

/**
 * Compare both providers
 */
async function compareProviders() {
  console.log('🔍 Market Data Adapter Comparison Test');
  console.log('=====================================');
  
  try {
    // Load configuration
    const config = getAdapterConfig();
    logConfiguration(config);

    // Test Finnhub if available
    let finnhubResults = null;
    if (config.hasFinnhubKey) {
      console.log('\n🔄 Testing Finnhub provider...');
      const finnhubFactory = new ProviderFactory();
      finnhubFactory.initialize({ ...config, marketDataProvider: 'finnhub' });
      finnhubResults = await testAdapter(finnhubFactory, 'Finnhub');
    } else {
      console.log('\n⏭️  Skipping Finnhub (no API key configured)');
    }
    
    // Test AllTick if available
    let alltickResults = null;
    if (config.hasAlltickKey) {
      console.log('\n🔄 Testing AllTick provider...');
      const alltickFactory = new ProviderFactory();
      alltickFactory.initialize({ ...config, marketDataProvider: 'alltick' });
      alltickResults = await testAdapter(alltickFactory, 'AllTick');
    } else {
      console.log('\n⏭️  Skipping AllTick (no API key configured)');
    }
    
    // Summary comparison
    console.log('\n📊 Comparison Summary');
    console.log('====================');
    
    if (finnhubResults && alltickResults) {
      console.log('\nBoth providers tested successfully:');
      console.log(`Finnhub: ${finnhubResults.successful}/${finnhubResults.totalTickers} (${((finnhubResults.successful/finnhubResults.totalTickers)*100).toFixed(1)}%) in ${finnhubResults.duration}ms`);
      console.log(`AllTick: ${alltickResults.successful}/${alltickResults.totalTickers} (${((alltickResults.successful/alltickResults.totalTickers)*100).toFixed(1)}%) in ${alltickResults.duration}ms`);
      
      if (finnhubResults.successful > alltickResults.successful) {
        console.log('🏆 Finnhub has better coverage for your ticker list');
      } else if (alltickResults.successful > finnhubResults.successful) {
        console.log('🏆 AllTick has better coverage for your ticker list');
      } else {
        console.log('🤝 Both providers have equal coverage');
      }
    }
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    if (!config.hasFinnhubKey && !config.hasAlltickKey) {
      console.log('❌ No API keys configured. Add FINNHUB_KEY or ALLTICK_KEY to your environment.');
    } else if (config.hasAlltickKey && alltickResults && alltickResults.successful > 0) {
      console.log('✅ AllTick appears to work with your ticker list. Consider switching to AllTick for unified access.');
      console.log('   Set MARKET_DATA_PROVIDER=alltick in your environment.');
    } else if (config.hasFinnhubKey && finnhubResults && finnhubResults.successful > 0) {
      console.log('✅ Finnhub is working well. You can continue using it or test AllTick for comparison.');
    }
    
    if (config.hasFinnhubKey && config.hasAlltickKey) {
      console.log('💡 You have both providers configured. Consider setting FALLBACK_PROVIDER for redundancy.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  console.log('\n✨ Test complete!');
}

// Run the comparison test
compareProviders().catch(console.error);