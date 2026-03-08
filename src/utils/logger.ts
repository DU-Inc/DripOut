// Logger utility to control logging throughout the app
const isDevelopment = __DEV__;

// Store original console methods to preserve crash reporting
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug
};

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      originalConsole.log(...args);
    }
  },
  error: (...args: any[]) => {
    // Always allow errors to preserve crash reporting in production
    originalConsole.error(...args);
  },
  warn: (...args: any[]) => {
    if (isDevelopment) {
      originalConsole.warn(...args);
    }
  },
  info: (...args: any[]) => {
    if (isDevelopment) {
      originalConsole.info(...args);
    }
  },
  debug: (...args: any[]) => {
    if (isDevelopment) {
      originalConsole.debug(...args);
    }
  }
};

// Disable non-critical console logs in production, but preserve error reporting
if (!isDevelopment) {
  console.log = () => {};
  // Keep console.error intact for crash reporting systems
  console.warn = () => {};
  console.info = () => {};
  console.debug = () => {};
} 