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
    // Provider chain: tried in order until one succeeds
    // Default: yahoo -> finnhub -> alltick
    providerChain: process.env.PROVIDER_CHAIN 
      ? process.env.PROVIDER_CHAIN.split(',').map(p => p.trim().toLowerCase())
      : ['yahoo', 'finnhub', 'alltick'],
    
    // Common settings
    timeout: parseInt(process.env.PROVIDER_TIMEOUT) || 8000,
    
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
  const validProviders = ['finnhub', 'alltick', 'yahoo'];
  
  // Validate provider chain
  for (const provider of config.providerChain) {
    if (!validProviders.includes(provider)) {
      throw new Error(`Invalid provider in PROVIDER_CHAIN: ${provider}. Valid options: ${validProviders.join(', ')}`);
    }
  }
  
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
      name: 'PROVIDER_CHAIN',
      description: 'Comma-separated list of providers in fallback order',
      default: 'yahoo,finnhub,alltick',
      required: false,
      example: 'yahoo,finnhub,alltick'
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
      description: 'Finnhub API key (optional - used if in provider chain)',
      default: 'null',
      required: 'conditional',
      example: 'your-finnhub-api-key'
    },
    {
      name: 'ALLTICK_KEY',
      description: 'AllTick API key (optional - used if in provider chain)',
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
    providerChain: config.providerChain,
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
