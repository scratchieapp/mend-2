// Re-export from the new environment configuration
export { 
  getBaseUrl, 
  getClerkRedirectUrl, 
  isProduction,
  getEnvironment,
  getEnvironmentConfig,
  getOperationsUrl,
  getMarketingUrl,
  buildOperationsUrl,
  buildMarketingUrl,
  logEnvironmentConfig
} from './config/environment';

// Legacy export for backward compatibility
export const APP_URL = getBaseUrl();