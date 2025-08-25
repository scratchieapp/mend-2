// Environment utilities
export {
  setupEnvFallback,
  getEnvVar,
  getRequiredEnvVar,
  validateRequiredEnvVars,
  isDevelopment,
  isProduction,
  createViteDefine,
  type EnvConfig
} from './env.js';

// Re-export existing utilities if they exist
// (This allows for backward compatibility with any existing shared utils)
export { default as cn } from './cn.js';
export * from './date.js';