/**
 * GoogleMapsLoader.js
 * Singleton loader for Google Maps JavaScript API
 */

let loadPromise = null;

export function loadGoogleMaps(apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
  // If already available globally on window
  if (window.google && window.google.maps) {
    return Promise.resolve(window.google.maps);
  }

  // Return existing in-flight promise if already loading
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    if (!apiKey) {
      reject(new Error('Google Maps API Key not provided. Set VITE_GOOGLE_MAPS_API_KEY in dashboard/.env'));
      return;
    }

    // Check if script tag already exists in document
    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      if (window.google && window.google.maps) {
        resolve(window.google.maps);
      } else {
        existingScript.addEventListener('load', () => resolve(window.google.maps));
        existingScript.addEventListener('error', (err) => reject(err));
      }
      return;
    }

    const callbackName = `__initGoogleMapsCallback_${Date.now()}`;
    window[callbackName] = () => {
      delete window[callbackName];
      if (window.google && window.google.maps) {
        resolve(window.google.maps);
      } else {
        reject(new Error('Google Maps loaded but window.google.maps is undefined'));
      }
    };

    // Google Maps authentication failure hook
    window.gm_authFailure = () => {
      console.warn('Google Maps API authentication failed. Check API key permissions.');
      // Keep state clean for fallbacks
    };

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.type = 'text/javascript';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${callbackName}&loading=async&libraries=geometry`;
    script.async = true;
    script.defer = true;

    script.onerror = (error) => {
      delete window[callbackName];
      loadPromise = null;
      reject(new Error(`Failed to load Google Maps script: ${error.message || 'Network error'}`));
    };

    // Timeout safety net (12 seconds)
    const timeout = setTimeout(() => {
      if (!window.google || !window.google.maps) {
        delete window[callbackName];
        loadPromise = null;
        reject(new Error('Google Maps API script load timed out. Check internet connection.'));
      }
    }, 12000);

    // Clear timeout on successful resolution
    const originalResolve = resolve;
    resolve = (val) => {
      clearTimeout(timeout);
      originalResolve(val);
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

export function isGoogleMapsLoaded() {
  return !!(window.google && window.google.maps);
}
