// Conditional logging utility - controlled by environment variables
const isDev = process.env.NODE_ENV === 'development';
const disableConsole = process.env.DISABLE_CONSOLE_LOGS === 'true';
const enableDebug = process.env.ENABLE_DEBUG_LOGS === 'true';

export const logger = {
  log: (...args: any[]) => {
    if (isDev && !disableConsole) console.log(...args);
  },
  
  info: (...args: any[]) => {
    if (isDev && !disableConsole) console.info(...args);
  },
  
  warn: (...args: any[]) => {
    if (isDev && !disableConsole) console.warn(...args);
  },
  
  error: (...args: any[]) => {
    // Always log errors, even in production (unless explicitly disabled)
    if (!disableConsole) console.error(...args);
  },
  
  debug: (...args: any[]) => {
    if (isDev && enableDebug && !disableConsole) console.debug(...args);
  },
  
  // Performance timing
  time: (label: string) => {
    if (isDev && !disableConsole) console.time(label);
  },
  
  timeEnd: (label: string) => {
    if (isDev && !disableConsole) console.timeEnd(label);
  }
};

// Silent logger for production
export const silent = {
  log: () => {},
  info: () => {},
  warn: () => {},
  error: () => {}, // Even errors are silent
  debug: () => {},
  time: () => {},
  timeEnd: () => {}
};