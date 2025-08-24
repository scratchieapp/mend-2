// Import and re-export everything from environment config
export * from './config/environment';

// Import getOperationsUrl for APP_URL
import { getOperationsUrl } from './config/environment';

// Legacy export for backward compatibility - use operations URL
export const APP_URL = getOperationsUrl();