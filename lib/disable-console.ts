// Completely disable all console output for clean browser console
if (typeof window !== 'undefined') {
  // Override all console methods in browser
  const noop = () => {};
  
  // console.log = noop;
  // console.info = noop;
  // console.warn = noop;
  // console.error = noop;
  // console.debug = noop;
  console.trace = noop;
  console.group = noop;
  console.groupCollapsed = noop;
  console.groupEnd = noop;
  console.time = noop;
  console.timeEnd = noop;
  console.timeLog = noop;
  console.count = noop;
  console.countReset = noop;
  console.clear = noop;
  console.table = noop;
  console.dir = noop;
  console.dirxml = noop;
  console.assert = noop;
}

// Also disable server-side console in development
if (process.env.NODE_ENV === 'development') {
  const noop = () => {};
  
  // console.log = noop;
  // console.info = noop;
  // console.warn = noop;
  // console.debug = noop;
  console.trace = noop;
  console.group = noop;
  console.groupCollapsed = noop;
  console.groupEnd = noop;
  console.time = noop;
  console.timeEnd = noop;
  console.timeLog = noop;
  console.count = noop;
  console.countReset = noop;
  console.clear = noop;
  console.table = noop;
  console.dir = noop;
  console.dirxml = noop;
  console.assert = noop;
  
  // Keep only critical errors (optional)
  // console.error = console.error;
  // console.error = noop; // Uncomment this to disable ALL console output
}