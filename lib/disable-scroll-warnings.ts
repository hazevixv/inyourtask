// Disable Next.js scroll restoration warnings
if (typeof window !== 'undefined') {
  const callWithSafeScrollBehavior = (
    handler: typeof window.scrollTo,
    context: Window,
    xOrOptions?: number | ScrollToOptions,
    y?: number
  ) => {
    if (typeof xOrOptions === 'number') {
      const withCoordinates = handler as (x: number, y: number) => void;
      withCoordinates.call(context, xOrOptions, y ?? 0);
      return;
    }

    const withOptions = handler as (options?: ScrollToOptions) => void;
    withOptions.call(context, { ...(xOrOptions ?? {}), behavior: 'auto' });
  };

  // Override window.scrollTo to prevent warnings
  const originalScrollTo = window.scrollTo;
  const scrollToOverride = ((xOrOptions?: number | ScrollToOptions, y?: number) => {
    // Silently ignore scroll attempts that might trigger warnings
    try {
      callWithSafeScrollBehavior(originalScrollTo, window, xOrOptions, y);
    } catch {
      // Silently ignore scroll errors
    }
  }) as typeof window.scrollTo;
  window.scrollTo = scrollToOverride;

  // Override scroll methods
  const originalScroll = window.scroll;
  const scrollOverride = ((xOrOptions?: number | ScrollToOptions, y?: number) => {
    try {
      callWithSafeScrollBehavior(originalScroll, window, xOrOptions, y);
    } catch {
      // Silently ignore
    }
  }) as typeof window.scroll;
  window.scroll = scrollOverride;

  // Override scrollBy
  const originalScrollBy = window.scrollBy;
  const scrollByOverride = ((xOrOptions?: number | ScrollToOptions, y?: number) => {
    try {
      callWithSafeScrollBehavior(originalScrollBy, window, xOrOptions, y);
    } catch {
      // Silently ignore
    }
  }) as typeof window.scrollBy;
  window.scrollBy = scrollByOverride;

  // Disable scroll restoration
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
}
