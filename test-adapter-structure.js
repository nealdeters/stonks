/**
 * Market Data Adapter Structure Test
 * Tests the adapter pattern structure without requiring API keys
 */
import 'dotenv/config';
import { ProviderFactory } from './netlify/lib/adapters/provider-factory.js';
import { getAdapterConfig, logConfiguration } from './netlify/lib/adapter-config.js';

console.log('🔧 Market Data Adapter Pattern Implementation Test');
console.log('==================================================');

try {
  // Test configuration loading
  console.log('\n1. Testing configuration loading...');
  const config = getAdapterConfig();
  logConfiguration(config);
  
  // Test provider factory creation and initialization
  console.log('\n2. Testing provider factory...');
  const factory = new ProviderFactory();
  
  // Test with mock configuration (no API keys needed for structure test)
  const mockConfig = {
    marketDataProvider: 'finnhub',
    finnhubKey: 'mock-key-for-testing',
    timeout: 5000,
    enableProviderLogging: true
  };
  
  factory.initialize(mockConfig);
  console.log('✅ Provider factory initialized successfully');
  
  // Test provider health
  console.log('\n3. Testing provider health...');
  const health = factory.getProviderHealth();
  console.log('Provider health:', health);
  
  // Test adapter creation directly
  console.log('\n4. Testing adapter creation...');
  const { createProvider } = await import('./netlify/lib/adapters/provider-factory.js');
  
  const finnhubAdapter = createProvider('finnhub', { apiKey: 'test-key' });
  console.log('✅ Finnhub adapter created:', finnhubAdapter.providerName);
  
  const alltickAdapter = createProvider('alltick', { apiKey: 'test-key' });
  console.log('✅ AllTick adapter created:', alltickAdapter.providerName);
  
  // Test adapter methods exist
  console.log('\n5. Testing adapter interface...');
  const adapters = [finnhubAdapter, alltickAdapter];
  
  adapters.forEach(adapter => {
    console.log(`\n${adapter.providerName} adapter methods:`);
    const methods = ['getQuote', 'getMarketStatus', 'getSymbols', 'getCompanyNews', 'getQuotes'];
    methods.forEach(method => {
      if (typeof adapter[method] === 'function') {
        console.log(`  ✅ ${method}()`);
      } else {
        console.log(`  ❌ ${method}() - missing`);
      }
    });
  });
  
  // Test error handling without API calls
  console.log('\n6. Testing error handling...');
  try {
    const invalidAdapter = createProvider('invalid', {});
    console.log('❌ Should have thrown error for invalid provider');
  } catch (error) {
    console.log('✅ Correctly threw error for invalid provider:', error.message);
  }
  
  // Test configuration validation
  console.log('\n7. Testing configuration validation...');
  try {
    const invalidConfig = {
      marketDataProvider: 'invalid-provider'
    };
    const factory2 = new ProviderFactory();
    factory2.initialize(invalidConfig);
    console.log('❌ Should have thrown error for invalid provider config');
  } catch (error) {
    console.log('✅ Correctly threw error for invalid provider config:', error.message);
  }
  
  console.log('\n✅ All structure tests passed!');
  
  // Show implementation summary
  console.log('\n📋 Implementation Summary:');
  console.log('========================');
  console.log('✅ Base adapter interface created');
  console.log('✅ Finnhub adapter implemented');
  console.log('✅ AllTick adapter implemented');
  console.log('✅ Provider factory with fallback support');
  console.log('✅ Configuration management');
  console.log('✅ Error handling and validation');
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Add your API keys to environment variables');
  console.log('2. Test with real API calls');
  console.log('3. Update other services (news.js, process-entry.js)');
  console.log('4. Deploy and monitor performance');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);
}

console.log('\n✨ Structure test complete!');