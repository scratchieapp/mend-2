import { useState, useEffect } from 'react';

interface UseGoogleMapsOptions {
  libraries?: ("drawing" | "geometry" | "localContext" | "places" | "visualization" | "marker")[];
}

// Default libraries to always load
// - places: for PlaceAutocompleteElement (new API)
// - marker: for AdvancedMarkerElement (new API)
const DEFAULT_LIBRARIES: UseGoogleMapsOptions['libraries'] = ['places', 'marker'];

export const useGoogleMaps = (options: UseGoogleMapsOptions = {}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Merge default libraries with any additional ones requested
  const libraries = [...new Set([...DEFAULT_LIBRARIES, ...(options.libraries || [])])];

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.warn('Google Maps API key not found in VITE_GOOGLE_MAPS_API_KEY');
      setError(new Error('Google Maps API key not found'));
      return;
    }

    // Check if Google Maps is already loaded with required libraries
    // Note: We still check for the old APIs as fallbacks, but prefer new ones
    const isFullyLoaded = () => {
      return window.google?.maps?.Map && 
        (window.google?.maps?.marker?.AdvancedMarkerElement || window.google?.maps?.Marker) &&
        (window.google?.maps?.places?.PlaceAutocompleteElement || window.google?.maps?.places?.Autocomplete);
    };

    if (isFullyLoaded()) {
      console.log('Google Maps already loaded');
      setIsLoaded(true);
      return;
    }

    // Check for existing script
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      console.log('Google Maps script exists, waiting for load...');
      const checkLoaded = () => {
        if (isFullyLoaded()) {
          console.log('Google Maps fully loaded');
          setIsLoaded(true);
        } else if (window.google?.maps?.Map && window.google?.maps?.importLibrary) {
          // Try to import required libraries dynamically
          console.log('Loading libraries dynamically...');
          Promise.all([
            window.google.maps.importLibrary('places'),
            window.google.maps.importLibrary('marker'),
          ]).then(() => {
            console.log('Libraries loaded dynamically');
            setIsLoaded(true);
          }).catch(err => {
            console.error('Failed to load libraries:', err);
            setTimeout(checkLoaded, 200);
          });
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
      console.log('Google Maps callback fired');
      const checkReady = () => {
        if (isFullyLoaded()) {
          console.log('Google Maps with all libraries ready');
          setIsLoaded(true);
          delete (window as any)[callbackName];
        } else {
          setTimeout(checkReady, 50);
        }
      };
      checkReady();
    };

    // Construct script URL with libraries
    const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${libraries.join(',')}&loading=async&callback=${callbackName}`;
    console.log('Loading Google Maps with libraries:', libraries.join(','));

    // Load script
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.defer = true;
    script.onerror = (e) => {
      console.error('Failed to load Google Maps script', e);
      setError(new Error('Failed to load Google Maps'));
      delete (window as any)[callbackName];
    };
    document.head.appendChild(script);
  }, [libraries.join(',')]); // Re-run if libraries change

  return { isLoaded, error };
};
