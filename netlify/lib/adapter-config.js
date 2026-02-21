/**
 * Market Data Adapter Configuration
 * Centralized configuration management for market data providers
 */

/**
 * Get market data adapter configuration from environment variables
 * @returns {Object} Configuration object for provider factory
 */
function getAdapterConfig() {
  const config = {
    // Provider selection (default to finnhub for backward compatibility)
    marketDataProvider: process.env.MARKET_DATA_PROVIDER || 'finnhub',
    
    // Fallback provider configuration
    fallbackProvider: process.env.FALLBACK_PROVIDER || null,
    enableProviderFallback: process.env.ENABLE_PROVIDER_FALLBACK === 'true',
    
    // Common settings
    timeout: parseInt(process.env.PROVIDER_TIMEOUT) || 8000, // 8 seconds default
    
    // Provider-specific API keys
    finnhubKey: process.env.FINNHUB_KEY,
    alltickKey: process.env.ALLTICK_KEY,
    
    // Feature flags
    enableProviderLogging: process.env.ENABLE_PROVIDER_LOGGING !== 'false',
    enableProviderMetrics: process.env.ENABLE_PROVIDER_METRICS === 'true'
  };

  // Validate configuration
  validateConfig(config);
  
  // Add computed properties
  config.hasFinnhubKey = !!config.finnhubKey;
  config.hasAlltickKey = !!config.alltickKey;
  
  return config;
}

/**
 * Validate adapter configuration
 * @param {Object} config - Configuration object
 * @throws {Error} If configuration is invalid
 */
function validateConfig(config) {
  // Validate provider selection
  const validProviders = ['finnhub', 'alltick'];
  if (!validProviders.includes(config.marketDataProvider)) {
    throw new Error(`Invalid MARKET_DATA_PROVIDER: ${config.marketDataProvider}. Valid options: ${validProviders.join(', ')}`);
  }
  
  if (config.fallbackProvider && !validProviders.includes(config.fallbackProvider)) {
    throw new Error(`Invalid FALLBACK_PROVIDER: ${config.fallbackProvider}. Valid options: ${validProviders.join(', ')}`);
  }
  
  // Validate API keys based on selected providers
  if (config.marketDataProvider === 'finnhub' && !config.finnhubKey) {
    throw new Error('FINNHUB_KEY is required when using finnhub provider');
  }
  
  if (config.marketDataProvider === 'alltick' && !config.alltickKey) {
    throw new Error('ALLTICK_KEY is required when using alltick provider');
  }
  
  // Fallback provider key is optional - will only be used if needed
  // (removed strict validation for fallback provider keys)

  // Validate timeout
  if (config.timeout < 1000 || config.timeout > 30000) {
    throw new Error(`PROVIDER_TIMEOUT must be between 1000ms and 30000ms, got: ${config.timeout}`);
  }
}

/**
 * Get provider-specific configuration
 * @param {string} provider - Provider name
 * @param {Object} baseConfig - Base configuration
 * @returns {Object} Provider-specific configuration
 */
function getProviderConfig(provider, baseConfig) {
  const providerConfig = {
    ...baseConfig,
    apiKey: baseConfig[`${provider}Key`],
    timeout: baseConfig.timeout,
    enableLogging: baseConfig.enableProviderLogging,
    enableMetrics: baseConfig.enableProviderMetrics
  };

  // Remove provider-specific keys to avoid confusion
  delete providerConfig.finnhubKey;
  delete providerConfig.alltickKey;
  
  return providerConfig;
}

/**
 * Get environment variable documentation
 * @returns {Array<Object>} Array of environment variable documentation
 */
function getEnvironmentDocumentation() {
  return [
    {
      name: 'MARKET_DATA_PROVIDER',
      description: 'Primary market data provider (finnhub, alltick)',
      default: 'finnhub',
      required: false,
      example: 'alltick'
    },
    {
      name: 'FALLBACK_PROVIDER',
      description: 'Fallback provider if primary fails (finnhub, alltick)',
      default: 'null',
      required: false,
      example: 'finnhub'
    },
    {
      name: 'ENABLE_PROVIDER_FALLBACK',
      description: 'Enable automatic fallback to backup provider',
      default: 'false',
      required: false,
      example: 'true'
    },
    {
      name: 'PROVIDER_TIMEOUT',
      description: 'Request timeout in milliseconds (1000-30000)',
      default: '8000',
      required: false,
      example: '10000'
    },
    {
      name: 'FINNHUB_KEY',
      description: 'Finnhub API key (required if using finnhub provider)',
      default: 'null',
      required: 'conditional',
      example: 'your-finnhub-api-key'
    },
    {
      name: 'ALLTICK_KEY',
      description: 'AllTick API key (required if using alltick provider)',
      default: 'null',
      required: 'conditional',
      example: 'your-alltick-api-key'
    },
    {
      name: 'ENABLE_PROVIDER_LOGGING',
      description: 'Enable detailed provider logging',
      default: 'true',
      required: false,
      example: 'false'
    },
    {
      name: 'ENABLE_PROVIDER_METRICS',
      description: 'Enable provider performance metrics',
      default: 'false',
      required: false,
      example: 'true'
    }
  ];
}

/**
 * Create a sample .env configuration
 * @returns {string} Sample environment configuration
 */
function createSampleEnvConfig() {
  const docs = getEnvironmentDocumentation();
  
  let sample = '# Market Data Adapter Configuration\n';
  sample += '# ================================\n\n';
  
  docs.forEach(doc => {
    sample += `# ${doc.description}\n`;
    sample += `# Required: ${doc.required}\n`;
    sample += `# Default: ${doc.default}\n`;
    if (doc.example) {
      sample += `# Example: ${doc.example}\n`;
    }
    sample += `${doc.name}=${doc.default === 'null' ? '' : doc.default}\n\n`;
  });
  
  return sample;
}

/**
 * Log current configuration (sanitized)
 * @param {Object} config - Configuration object
 */
function logConfiguration(config) {
  const sanitized = {
    marketDataProvider: config.marketDataProvider,
    fallbackProvider: config.fallbackProvider,
    enableProviderFallback: config.enableProviderFallback,
    timeout: config.timeout,
    enableProviderLogging: config.enableProviderLogging,
    enableProviderMetrics: config.enableProviderMetrics,
    // Include API key presence but not actual values
    hasFinnhubKey: !!config.finnhubKey,
    hasAlltickKey: !!config.alltickKey
  };
  
  console.log('[AdapterConfig] Current configuration:', JSON.stringify(sanitized, null, 2));
}

export {
  getAdapterConfig,
  getProviderConfig,
  getEnvironmentDocumentation,
  createSampleEnvConfig,
  logConfiguration
};