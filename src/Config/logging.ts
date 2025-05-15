// Logging configuration
export const LOG_CONFIG = {
  enabled: __DEV__, // Only enable logs in development
  levels: {
    error: true,    // Always show errors
    warn: true,     // Show warnings
    info: true,     // Show info messages
    debug: true,    // Show debug messages
    log: true       // Show general logs
  },
  // Add specific modules or features to disable logging for
  disabledModules: [
    // 'network',
    // 'navigation',
    // 'state'
  ]
}; 