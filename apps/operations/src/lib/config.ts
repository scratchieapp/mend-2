// Import first, then re-export
import { 
  getBaseUrl as _getBaseUrl, 
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

// Re-export all functions
export { 
  getClerkRedirectUrl, 
  isProduction,
  getEnvironment,
  getEnvironmentConfig,
  getOperationsUrl,
  getMarketingUrl,
  buildOperationsUrl,
  buildMarketingUrl,
  logEnvironmentConfig
};

// Export getBaseUrl and create APP_URL
export const getBaseUrl = _getBaseUrl;
export const APP_URL = _getBaseUrl();