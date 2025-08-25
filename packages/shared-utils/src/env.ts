import { loadEnv } from 'vite';
import { resolve } from 'path';
import { existsSync } from 'fs';

/**
 * Environment variable fallback utility for Mend-2 monorepo
 * 
 * This utility implements a fallback mechanism where:
 * 1. Apps first check their local .env files (e.g., /apps/operations/.env.local)
 * 2. If a variable is not found, fall back to the root .env file
 * 
 * Usage in Vite config:
 * import { setupEnvFallback } from '@mend/shared-utils/env';
 * const env = setupEnvFallback(__dirname, mode);
 */

export interface EnvConfig {
  [key: string]: string | undefined;
}

/**
 * Setup environment variable fallback for Vite apps
 * @param appDir - Directory of the current app (use __dirname)
 * @param mode - Vite mode ('development', 'production', etc.)
 * @param rootDir - Optional custom root directory (defaults to monorepo root)
 * @returns Combined environment variables with fallback
 */
export function setupEnvFallback(
  appDir: string,
  mode: string,
  rootDir?: string
): EnvConfig {
  // Determine root directory (2 levels up from app: apps/[app] -> root)
  const monoRepoRoot = rootDir || resolve(appDir, '../..');
  
  // Load root environment variables first (as fallback)
  const rootEnv = loadEnv(mode, monoRepoRoot, ['VITE_', 'NEXT_PUBLIC_', 'PUBLIC_']);
  
  // Load app-specific environment variables (takes precedence)
  const appEnv = loadEnv(mode, appDir, ['VITE_', 'NEXT_PUBLIC_', 'PUBLIC_']);
  
  // Merge with app-specific taking precedence
  const combinedEnv = {
    ...rootEnv,
    ...appEnv
  };
  
  // Log the fallback configuration in development
  if (mode === 'development') {
    logEnvFallback(appDir, monoRepoRoot, combinedEnv);
  }
  
  return combinedEnv;
}

/**
 * Get environment variable with fallback support
 * @param key - Environment variable key
 * @param defaultValue - Default value if not found
 * @param env - Environment object (optional, uses import.meta.env by default)
 * @returns Environment variable value or default
 */
export function getEnvVar(
  key: string,
  defaultValue?: string,
  env?: Record<string, any>
): string | undefined {
  let envSource = env || process.env;
  
  // Try to get import.meta.env if available (browser context)
  try {
    if (typeof window !== 'undefined' && 'import' in window && (window as any).import?.meta?.env) {
      envSource = env || (window as any).import.meta.env || process.env;
    }
  } catch (error) {
    // Fallback to process.env or provided env
  }
  
  return envSource[key] || defaultValue;
}

/**
 * Get required environment variable (throws if not found)
 * @param key - Environment variable key
 * @param env - Environment object (optional)
 * @returns Environment variable value
 * @throws Error if variable is not found
 */
export function getRequiredEnvVar(
  key: string,
  env?: Record<string, any>
): string {
  const value = getEnvVar(key, undefined, env);
  if (!value) {
    throw new Error(`Required environment variable ${key} is not defined`);
  }
  return value;
}

/**
 * Validate required environment variables
 * @param keys - Array of required environment variable keys
 * @param env - Environment object (optional)
 * @throws Error if any required variable is missing
 */
export function validateRequiredEnvVars(
  keys: string[],
  env?: Record<string, any>
): void {
  const missing: string[] = [];
  
  for (const key of keys) {
    if (!getEnvVar(key, undefined, env)) {
      missing.push(key);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Check if we're in development mode
 */
export function isDevelopment(mode?: string): boolean {
  if (mode) return mode === 'development';
  
  // Check if we have access to Vite's import.meta.env (build context)
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    return true;
  }
  
  return false;
}

/**
 * Check if we're in production mode
 */
export function isProduction(mode?: string): boolean {
  if (mode) return mode === 'production';
  
  // Check if we have access to Node.js env variables
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    return true;
  }
  
  return false;
}

/**
 * Log environment fallback configuration (development only)
 */
function logEnvFallback(
  appDir: string,
  rootDir: string,
  env: EnvConfig
): void {
  if (!isDevelopment()) return;
  
  const appName = appDir.split('/').pop() || 'unknown';
  
  console.group(`🔧 Environment Fallback Configuration - ${appName}`);
  console.log('App Directory:', appDir);
  console.log('Root Directory:', rootDir);
  console.log('Environment Files Loaded:');
  
  // Check which env files exist
  const envFiles = [
    { path: resolve(appDir, '.env.local'), name: 'App .env.local', priority: 'High' },
    { path: resolve(appDir, '.env'), name: 'App .env', priority: 'High' },
    { path: resolve(rootDir, '.env.local'), name: 'Root .env.local', priority: 'Low' },
    { path: resolve(rootDir, '.env'), name: 'Root .env', priority: 'Low' }
  ];
  
  envFiles.forEach(file => {
    const exists = existsSync(file.path);
    console.log(`  ${exists ? '✅' : '❌'} ${file.name} (Priority: ${file.priority})`);
  });
  
  // Show resolved environment variables
  const vitePrefixed = Object.keys(env).filter(key => 
    key.startsWith('VITE_') || key.startsWith('NEXT_PUBLIC_') || key.startsWith('PUBLIC_')
  );
  
  if (vitePrefixed.length > 0) {
    console.log('Resolved Environment Variables:');
    vitePrefixed.forEach(key => {
      const value = env[key];
      const maskedValue = key.toLowerCase().includes('secret') || key.toLowerCase().includes('key') 
        ? '***masked***' 
        : value;
      console.log(`  ${key}: ${maskedValue}`);
    });
  }
  
  console.groupEnd();
}

/**
 * Create Vite define object for environment variables
 * @param env - Environment configuration
 * @returns Vite-compatible define object
 */
export function createViteDefine(env: EnvConfig): Record<string, string> {
  const define: Record<string, string> = {};
  
  Object.keys(env).forEach(key => {
    if (key.startsWith('VITE_') || key.startsWith('NEXT_PUBLIC_') || key.startsWith('PUBLIC_')) {
      define[`process.env.${key}`] = JSON.stringify(env[key]);
    }
  });
  
  return define;
}