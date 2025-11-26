import { useState, useEffect } from 'react';

interface UseGoogleMapsOptions {
  libraries?: ("drawing" | "geometry" | "localContext" | "places" | "visualization")[];
}

export const useGoogleMaps = (options: UseGoogleMapsOptions = {}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.warn('Google Maps API key not found');
      setError(new Error('Google Maps API key not found'));
      return;
    }

    // Check if Google Maps is already loaded
    if (window.google?.maps?.Map && window.google?.maps?.Marker) {
      setIsLoaded(true);
      return;
    }

    // Check for existing script
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      const checkLoaded = () => {
        if (window.google?.maps?.Map) {
          setIsLoaded(true);
        } else {
          setTimeout(checkLoaded, 100);
        }
      };
      checkLoaded();
      return;
    }

    // Create a callback function name
    const callbackName = `initGoogleMaps_${Date.now()}`;
    
    // Set up the callback on window
    (window as any)[callbackName] = () => {
      const checkReady = () => {
        if (window.google?.maps?.Map) {
          setIsLoaded(true);
          delete (window as any)[callbackName];
        } else {
          setTimeout(checkReady, 50);
        }
      };
      checkReady();
    };

    // Construct script URL with libraries
    let scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&callback=${callbackName}`;
    if (options.libraries && options.libraries.length > 0) {
      scriptUrl += `&libraries=${options.libraries.join(',')}`;
    }

    // Load script
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.defer = true;
    script.onerror = (e) => {
      console.error('Failed to load Google Maps', e);
      setError(new Error('Failed to load Google Maps'));
      delete (window as any)[callbackName];
    };
    document.head.appendChild(script);
  }, [JSON.stringify(options.libraries)]); // Re-run if libraries change (though ideally shouldn't change)

  return { isLoaded, error };
};
