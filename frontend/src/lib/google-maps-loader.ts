/**
 * Global Google Maps API loader
 * Ensures the API is only loaded once, even if multiple components request it
 */

let loadPromise: Promise<void> | null = null;
let isLoaded = false;

export function useGoogleMapsLoader(apiKey: string | undefined): {
  isReady: boolean;
  error: string | null;
} {
  if (!apiKey) {
    return { isReady: false, error: "API key not configured" };
  }

  if (isLoaded && window.google?.maps?.places) {
    return { isReady: true, error: null };
  }

  if (!loadPromise) {
    loadPromise = loadGoogleMapsScript(apiKey);
  }

  // This is a synchronous check - the actual loading happens in the effect
  const isReady = isLoaded && !!window.google?.maps?.places;
  return { isReady, error: isReady ? null : "Loading Google Maps..." };
}

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.google?.maps?.places) {
      isLoaded = true;
      resolve();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector(
      `script[src*="maps.googleapis.com"][src*="${apiKey}"]`
    );
    if (existingScript) {
      // Wait for it to load
      const checkInterval = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(checkInterval);
          isLoaded = true;
          resolve();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.google?.maps?.places) {
          isLoaded = true; // Mark as loaded to prevent infinite retries
          reject(new Error("Google Maps script failed to load"));
        }
      }, 5000);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;

    const handleLoad = () => {
      // Add small delay to ensure google object is ready
      setTimeout(() => {
        if (window.google?.maps?.places) {
          isLoaded = true;
          resolve();
        } else {
          isLoaded = true;
          reject(new Error("Google Maps object not available"));
        }
      }, 100);
    };

    const handleError = () => {
      isLoaded = true;
      reject(new Error("Failed to load Google Maps script"));
    };

    script.addEventListener("load", handleLoad);
    script.addEventListener("error", handleError);
    document.head.appendChild(script);
  });
}

export function initializeGoogleMapsLoader(apiKey: string | undefined) {
  if (!apiKey || isLoaded) {
    return Promise.resolve();
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = loadGoogleMapsScript(apiKey).catch((err) => {
    console.error("[Google Maps] Failed to load:", err);
    // Don't rethrow - we'll handle it in components
  });

  return loadPromise;
}
