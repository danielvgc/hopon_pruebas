'use client';

/**
 * Global error handler for unhandled errors and rejections
 * Run this early in the app lifecycle
 */
export function initializeGlobalErrorHandler() {
  if (typeof window === 'undefined') return;

  // Handle unhandled errors
  window.addEventListener('error', (event) => {
    console.error('[Global Error Handler] Caught error:', event.error);
    // Don't prevent default for logging purposes, but log it
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Global Error Handler] Unhandled rejection:', event.reason);
    // Prevent default browser behavior of logging to console
    event.preventDefault();
  });

  console.log('[Global Error Handler] Initialized');
}
