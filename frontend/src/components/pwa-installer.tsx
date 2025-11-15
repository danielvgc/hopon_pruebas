'use client';

import { useEffect } from 'react';

export default function PWAInstaller() {
  useEffect(() => {
    // Register service worker for offline support
    if ('serviceWorker' in navigator && typeof window !== 'undefined') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered successfully:', registration);
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error);
        });
    }

    // Listen for app install prompt
    let deferredPrompt;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      console.log('PWA install prompt available');
      // You could show an install button here
    });

    window.addEventListener('appinstalled', () => {
      console.log('App installed successfully');
      deferredPrompt = null;
    });
  }, []);

  return null;
}
